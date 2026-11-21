import * as z from "zod";
import { computeFFT, computeRMS, type FftSpectrum } from "./analysis";
import { frequencyToMidi, midiToFrequency, midiToNoteName } from "./dsp-core";
import { MidiNoteSchema, PIANO_MAX_MIDI, PIANO_MIN_MIDI } from "./schemas";

export const MIC_MIN_MIDI = 36; // C2 (65.41 Hz)
export const MIC_MAX_MIDI = 96; // C7 (2093.00 Hz)

export const MicListenerStatusSchema = z.enum([
  "idle",
  "requesting",
  "listening",
  "denied",
  "unsupported",
  "error",
]);
export type MicListenerStatus = z.infer<typeof MicListenerStatusSchema>;

export const MicDetectionConfigSchema = z.object({
  minMidi: z.number().int().min(PIANO_MIN_MIDI).max(PIANO_MAX_MIDI).default(MIC_MIN_MIDI),
  maxMidi: z.number().int().min(PIANO_MIN_MIDI).max(PIANO_MAX_MIDI).default(MIC_MAX_MIDI),
  fftSize: z.number().int().min(2048).max(32_768).default(8192),
  noiseFloorRms: z.number().min(0).max(1).default(0.008),
  onsetRmsMultiplier: z.number().min(1).max(20).default(2.2),
  minRms: z.number().min(0.0001).max(0.5).default(0.012),
  confidenceThreshold: z.number().min(0.1).max(1).default(0.55),
  polyphonic: z.boolean().default(true),
  maxPolyphony: z.number().int().min(1).max(6).default(4),
  minHoldFrames: z.number().int().min(1).max(10).default(2),
  retriggerCooldownMs: z.number().min(20).max(1000).default(140),
  releaseRatio: z.number().min(0.05).max(0.95).default(0.35),
  reattackRmsRatio: z.number().min(1.05).max(5).default(1.65),
});
export type MicDetectionConfig = z.infer<typeof MicDetectionConfigSchema>;
export type MicDetectionConfigInput = z.input<typeof MicDetectionConfigSchema>;

export const DetectedNoteSchema = z.object({
  midi: MidiNoteSchema,
  noteName: z.string(),
  frequencyHz: z.number().positive(),
  confidence: z.number().min(0).max(1),
  centsOff: z.number(),
  amplitude: z.number().nonnegative(),
});
export type DetectedNote = z.infer<typeof DetectedNoteSchema>;

export const MicNoteOnEventSchema = z.object({
  midi: MidiNoteSchema,
  noteName: z.string(),
  confidence: z.number().min(0).max(1),
  centsOff: z.number(),
  rms: z.number().nonnegative(),
  timestampMs: z.number().nonnegative(),
});
export type MicNoteOnEvent = z.infer<typeof MicNoteOnEventSchema>;

export const MicPitchFrameSchema = z.object({
  rms: z.number().nonnegative(),
  level: z.number().min(0).max(1),
  aboveNoiseFloor: z.boolean(),
  primaryNote: DetectedNoteSchema.nullable(),
  activeNotes: z.array(DetectedNoteSchema),
  timestampMs: z.number().nonnegative(),
});
export type MicPitchFrame = z.infer<typeof MicPitchFrameSchema>;

export const NoiseFloorEstimateSchema = z.object({
  noiseFloorRms: z.number().nonnegative(),
  peakRms: z.number().nonnegative(),
  recommendedMinRms: z.number().nonnegative(),
  frameCount: z.number().int().nonnegative(),
});
export type NoiseFloorEstimate = z.infer<typeof NoiseFloorEstimateSchema>;

export type MicNoteOnListener = (event: MicNoteOnEvent) => void;

export type MicPitchFrameListener = (frame: MicPitchFrame) => void;

export type MicStatusListener = (status: MicListenerStatus) => void;

type WebkitAudioWindow = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

const HARMONIC_COUNT = 6;
const MIN_PEAK_TO_MEDIAN_RATIO = 5.5;

/** Map linear RMS amplitude to a perceptual 0..1 VU meter level (-56 dB .. -6 dB). */
export function rmsToVuLevel(rms: number): number {
  if (!Number.isFinite(rms) || rms <= 1e-6) return 0;
  const db = 20 * Math.log10(rms);
  const normalized = (db + 56) / 50;
  return Math.max(0, Math.min(1, normalized));
}

/**
 * Estimate ambient room noise floor from a sequence of quiet microphone frames.
 * Uses the 75th-percentile frame RMS so isolated bumps do not skew calibration.
 */
export function estimateNoiseFloor(frames: readonly Float32Array[]): NoiseFloorEstimate {
  if (frames.length === 0) {
    return NoiseFloorEstimateSchema.parse({
      noiseFloorRms: 0.008,
      peakRms: 0,
      recommendedMinRms: 0.018,
      frameCount: 0,
    });
  }

  const rmsValues: number[] = [];
  let peakRms = 0;
  for (const frame of frames) {
    const r = computeRMS(frame);
    rmsValues.push(r);
    if (r > peakRms) peakRms = r;
  }

  rmsValues.sort((a, b) => a - b);
  const p75Index = Math.min(rmsValues.length - 1, Math.floor(rmsValues.length * 0.75));
  const noiseFloorRms = rmsValues[p75Index] ?? 0;
  const recommendedMinRms = Math.max(0.01, noiseFloorRms * 2.5);

  return NoiseFloorEstimateSchema.parse({
    noiseFloorRms,
    peakRms,
    recommendedMinRms,
    frameCount: frames.length,
  });
}

/** Parabolic interpolation around a discrete extremum at index k. */
function parabolicVertexOffset(yPrev: number, yCurr: number, yNext: number): number {
  const denom = yPrev - 2 * yCurr + yNext;
  if (Math.abs(denom) < 1e-12) return 0;
  return Math.max(-0.5, Math.min(0.5, (0.5 * (yPrev - yNext)) / denom));
}

/** Effective RMS gate combining absolute floor and ambient room noise floor. */
function getEffectiveMinRms(config: MicDetectionConfig): number {
  return Math.max(config.minRms, config.noiseFloorRms * config.onsetRmsMultiplier);
}

/** Compute median magnitude in [minHz, maxHz] to estimate broadband spectral noise floor. */
function computeSpectralMedian(spectrum: FftSpectrum, minHz: number, maxHz: number): number {
  const minBin = Math.max(1, Math.floor(minHz / spectrum.binHz));
  const maxBin = Math.min(spectrum.magnitudes.length - 1, Math.ceil(maxHz / spectrum.binHz));
  if (maxBin <= minBin) return 0;

  const stride = Math.max(1, Math.floor((maxBin - minBin) / 256));
  const sampled: number[] = [];
  for (let b = minBin; b <= maxBin; b += stride) {
    sampled.push(spectrum.magnitudes[b] ?? 0);
  }
  sampled.sort((a, b) => a - b);
  return sampled[Math.floor(sampled.length / 2)] ?? 0;
}

/** Find the strongest bin and parabolic-refined frequency around targetHz. */
function findPeakInRange(
  magnitudes: Float32Array,
  binHz: number,
  targetHz: number,
  toleranceCents: number,
): { bin: number; magnitude: number; refinedHz: number } {
  const ratio = 2 ** (toleranceCents / 1200);
  const lowBin = Math.max(1, Math.floor(targetHz / ratio / binHz));
  const highBin = Math.min(magnitudes.length - 2, Math.ceil((targetHz * ratio) / binHz));

  let bestBin = lowBin;
  let bestMag = 0;
  for (let b = lowBin; b <= highBin; b += 1) {
    const mag = magnitudes[b] ?? 0;
    if (mag > bestMag) {
      bestMag = mag;
      bestBin = b;
    }
  }

  if (bestMag <= 0) {
    return { bin: bestBin, magnitude: 0, refinedHz: targetHz };
  }

  const yPrev = Math.log((magnitudes[bestBin - 1] ?? 0) + 1e-12);
  const yCurr = Math.log((magnitudes[bestBin] ?? 0) + 1e-12);
  const yNext = Math.log((magnitudes[bestBin + 1] ?? 0) + 1e-12);
  const offset = parabolicVertexOffset(yPrev, yCurr, yNext);
  return {
    bin: bestBin,
    magnitude: bestMag,
    refinedHz: (bestBin + offset) * binHz,
  };
}

/** Acoustic grand piano inharmonicity stretch for partial k at MIDI note. */
function pianoPartialFrequency(midi: number, harmonicIndex: number): number {
  const f0 = midiToFrequency(midi);
  const reg = (midi - PIANO_MIN_MIDI) / (PIANO_MAX_MIDI - PIANO_MIN_MIDI);
  const inharmonicityB = 0.000_08 + reg * reg * 0.000_34;
  const stretch = Math.sqrt(
    (1 + inharmonicityB * harmonicIndex * harmonicIndex) / (1 + inharmonicityB),
  );
  return harmonicIndex * f0 * stretch;
}

/** Expected relative magnitude of partial k compared to fundamental (k=1) for piano. */
function expectedPianoPartialRatio(midi: number, harmonicIndex: number): number {
  if (harmonicIndex <= 1) return 1;
  const reg = (midi - PIANO_MIN_MIDI) / (PIANO_MAX_MIDI - PIANO_MIN_MIDI);
  const base = 0.72 / harmonicIndex ** (1.18 + reg * 0.25);
  const strikeShaping = harmonicIndex === 7 ? 0.35 : 1.0;
  return base * strikeShaping;
}

/** Compute YIN fundamental frequency and periodicity confidence (0..1). */
function computeYinPitch(
  samples: Float32Array,
  sampleRate: number,
  minHz: number,
  maxHz: number,
): { hz: number; confidence: number } {
  const startSample = samples.length >= sampleRate * 0.14 ? Math.floor(sampleRate * 0.012) : 0;
  const available = samples.length - startSample;
  const maxLag = Math.min(Math.floor(sampleRate / minHz) + 4, Math.floor(available / 2) - 1);
  const minLag = Math.max(4, Math.floor(sampleRate / maxHz) - 2);
  if (maxLag <= minLag + 2) return { hz: 0, confidence: 0 };

  const windowSize = Math.min(2048, available - maxLag);
  if (windowSize < 64) return { hz: 0, confidence: 0 };

  const diff = new Float64Array(maxLag + 1);
  for (let tau = 1; tau <= maxLag; tau += 1) {
    let sum = 0;
    for (let i = 0; i < windowSize; i += 1) {
      const delta = (samples[startSample + i] ?? 0) - (samples[startSample + i + tau] ?? 0);
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  const cmndf = new Float64Array(maxLag + 1);
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= maxLag; tau += 1) {
    runningSum += diff[tau] ?? 0;
    cmndf[tau] = runningSum > 0 ? ((diff[tau] ?? 0) * tau) / runningSum : 1;
  }

  const threshold = 0.15;
  let bestTau = -1;
  for (let tau = minLag; tau < maxLag; tau += 1) {
    if ((cmndf[tau] ?? 1) < threshold) {
      while (tau + 1 < maxLag && (cmndf[tau + 1] ?? 1) < (cmndf[tau] ?? 1)) {
        tau += 1;
      }
      bestTau = tau;
      break;
    }
  }

  if (bestTau === -1) {
    let minVal = Number.POSITIVE_INFINITY;
    for (let tau = minLag; tau < maxLag; tau += 1) {
      const val = cmndf[tau] ?? 1;
      if (val < minVal) {
        minVal = val;
        bestTau = tau;
      }
    }
  }

  if (bestTau <= 0) return { hz: 0, confidence: 0 };
  const bestVal = cmndf[bestTau] ?? 1;
  const offset = parabolicVertexOffset(cmndf[bestTau - 1] ?? 1, bestVal, cmndf[bestTau + 1] ?? 1);
  const refinedTau = bestTau + offset;
  if (refinedTau <= 0) return { hz: 0, confidence: 0 };

  return {
    hz: sampleRate / refinedTau,
    confidence: Math.max(0, Math.min(1, 1 - bestVal)),
  };
}

/** Verify and suppress octave errors on a monophonic pitch estimate using the FFT spectrum. */
function suppressOctaveError(
  coarseHz: number,
  spectrum: FftSpectrum,
  minHz: number,
  maxHz: number,
): { hz: number; amplitude: number } {
  const f1Peak = findPeakInRange(spectrum.magnitudes, spectrum.binHz, coarseHz, 40);
  const f2Peak = findPeakInRange(spectrum.magnitudes, spectrum.binHz, coarseHz * 2, 40);
  const f3Peak = findPeakInRange(spectrum.magnitudes, spectrum.binHz, coarseHz * 3, 45);

  // Check if coarseHz was an octave-up lock (true fundamental is coarseHz / 2)
  const halfHz = coarseHz * 0.5;
  if (halfHz >= minHz) {
    const halfPeak = findPeakInRange(spectrum.magnitudes, spectrum.binHz, halfHz, 40);
    const oddThreeHalf = findPeakInRange(spectrum.magnitudes, spectrum.binHz, halfHz * 3, 45);
    if (
      halfPeak.magnitude > f1Peak.magnitude * 0.45 &&
      oddThreeHalf.magnitude > f1Peak.magnitude * 0.15
    ) {
      return { hz: halfPeak.refinedHz, amplitude: halfPeak.magnitude };
    }
  }

  // Check if coarseHz was an octave-down lock (no energy at coarseHz or odd harmonics)
  const doubleHz = coarseHz * 2;
  if (
    doubleHz <= maxHz &&
    f1Peak.magnitude < f2Peak.magnitude * 0.12 &&
    f3Peak.magnitude < f2Peak.magnitude * 0.12
  ) {
    return { hz: f2Peak.refinedHz, amplitude: f2Peak.magnitude };
  }

  return {
    hz: coarseHz >= 220 && f1Peak.magnitude > 0 ? f1Peak.refinedHz : coarseHz,
    amplitude: f1Peak.magnitude,
  };
}

/**
 * Pure DSP monophonic piano pitch detector (YIN + octave-error suppression + FFT refinement).
 * Returns null if the signal is below noise floor, noisy/unpitched, or outside [minMidi, maxMidi].
 */
export function detectSinglePianoNote(
  samples: Float32Array,
  sampleRate: number,
  configInput?: MicDetectionConfigInput,
): DetectedNote | null {
  const config = MicDetectionConfigSchema.parse(configInput ?? {});
  const rms = computeRMS(samples);
  if (rms < getEffectiveMinRms(config)) return null;

  const minHz = midiToFrequency(config.minMidi - 0.6);
  const maxHz = midiToFrequency(config.maxMidi + 0.6);
  const yin = computeYinPitch(samples, sampleRate, minHz, maxHz);
  if (yin.hz <= 0 || yin.confidence < config.confidenceThreshold) return null;

  const startSample = samples.length >= sampleRate * 0.14 ? Math.floor(sampleRate * 0.012) : 0;
  const fftSize = Math.max(16_384, config.fftSize);
  const spectrum = computeFFT(samples, sampleRate, fftSize, startSample);
  const spectralMedian = computeSpectralMedian(spectrum, minHz, Math.min(sampleRate * 0.44, 5000));

  const verified = suppressOctaveError(yin.hz, spectrum, minHz, maxHz);
  if (verified.amplitude <= spectralMedian * MIN_PEAK_TO_MEDIAN_RATIO) return null;

  const midiFloat = frequencyToMidi(verified.hz);
  const midi = Math.round(midiFloat);
  if (midi < config.minMidi || midi > config.maxMidi) return null;

  const centsOff = (midiFloat - midi) * 100;
  return DetectedNoteSchema.parse({
    midi,
    noteName: midiToNoteName(midi),
    frequencyHz: verified.hz,
    confidence: yin.confidence,
    centsOff,
    amplitude: verified.amplitude,
  });
}

interface CandidateScore {
  readonly midi: number;
  readonly score: number;
  readonly fundamentalMag: number;
  readonly refinedHz: number;
  readonly harmonicSupport: number;
}

/** Return true if bin is a genuine local maximum in the un-modified spectrum (rejects main-lobe skirts). */
function isLocalSpectralPeak(magnitudes: Float32Array, bin: number): boolean {
  if (bin <= 0 || bin >= magnitudes.length - 1) return false;
  const curr = magnitudes[bin] ?? 0;
  const prev = magnitudes[bin - 1] ?? 0;
  const next = magnitudes[bin + 1] ?? 0;
  return curr >= prev && curr >= next && (curr > prev || curr > next);
}

/** Score a candidate MIDI note against the current residual magnitude spectrum. */
function scorePolyphonicCandidate(
  midi: number,
  originalMagnitudes: Float32Array,
  residual: Float32Array,
  binHz: number,
  nyquistGuard: number,
  spectralMedian: number,
  initialMaxMag: number,
): CandidateScore | null {
  const f0 = midiToFrequency(midi);
  const f1Peak = findPeakInRange(residual, binHz, f0, 38);

  // Reject monotonic window-skirt shoulders and artificial subtraction cliffs
  if (!isLocalSpectralPeak(originalMagnitudes, f1Peak.bin)) return null;

  // Fundamental presence gate: prevents sub-harmonic ghosts (e.g. C3 when playing C4 + G4)
  const minFundamental = Math.max(spectralMedian * MIN_PEAK_TO_MEDIAN_RATIO, initialMaxMag * 0.08);
  if (f1Peak.magnitude < minFundamental) return null;

  // Ensure the refined frequency actually belongs to this MIDI semitone (within +/- 46 cents)
  const refinedMidi = frequencyToMidi(f1Peak.refinedHz);
  if (Math.abs(refinedMidi - midi) > 0.46) return null;

  let harmonicBonus = 0;
  let supportedPartials = 1;
  for (let k = 2; k <= HARMONIC_COUNT; k += 1) {
    const partialHz = pianoPartialFrequency(midi, k);
    if (partialHz >= nyquistGuard) break;
    const expectedRatio = expectedPianoPartialRatio(midi, k);
    const pk = findPeakInRange(residual, binHz, partialHz, 42);
    if (pk.magnitude > spectralMedian * 3) {
      const capped = Math.min(pk.magnitude, f1Peak.magnitude * expectedRatio * 1.35);
      harmonicBonus += capped * (0.48 / k ** 0.75);
      if (pk.magnitude >= f1Peak.magnitude * expectedRatio * 0.25) {
        supportedPartials += 1;
      }
    }
  }

  return {
    midi,
    score: f1Peak.magnitude + harmonicBonus,
    fundamentalMag: f1Peak.magnitude,
    refinedHz: f1Peak.refinedHz,
    harmonicSupport: supportedPartials / HARMONIC_COUNT,
  };
}

/** Subtract a detected note's fundamental lobe and expected piano overtones from residual spectrum. */
function subtractNoteHarmonics(
  residual: Float32Array,
  binHz: number,
  midi: number,
  fundamentalMag: number,
  nyquistGuard: number,
): void {
  // 1. Remove the fundamental's main lobe cleanly
  const f0 = midiToFrequency(midi);
  const f0Ratio = 2 ** (38 / 1200);
  const f0Low = Math.max(1, Math.floor(f0 / f0Ratio / binHz));
  const f0High = Math.min(residual.length - 1, Math.ceil((f0 * f0Ratio) / binHz));
  for (let b = f0Low; b <= f0High; b += 1) {
    residual[b] = 0;
  }

  // 2. Subtract bounded expected piano overtones (preserves genuine octaves & fifths!)
  for (let k = 2; k <= HARMONIC_COUNT + 2; k += 1) {
    const partialHz = pianoPartialFrequency(midi, k);
    if (partialHz >= nyquistGuard) break;
    const expectedMag = fundamentalMag * expectedPianoPartialRatio(midi, k) * 1.25;
    const ratio = 2 ** (42 / 1200);
    const lowBin = Math.max(1, Math.floor(partialHz / ratio / binHz));
    const highBin = Math.min(residual.length - 1, Math.ceil((partialHz * ratio) / binHz));
    for (let b = lowBin; b <= highBin; b += 1) {
      const current = residual[b] ?? 0;
      residual[b] = Math.max(0, current - expectedMag);
    }
  }
}

/**
 * Pure DSP polyphonic acoustic piano pitch & chord detector.
 * Uses Hann-windowed FFT + inharmonicity-aware harmonic comb scoring + iterative spectral subtraction
 * to accurately identify single notes (C2..C7), 2-note intervals, and 3-4 note chords/triads.
 */
export function detectActiveMidis(
  samples: Float32Array,
  sampleRate: number,
  configInput?: MicDetectionConfigInput,
): DetectedNote[] {
  const config = MicDetectionConfigSchema.parse(configInput ?? {});
  const rms = computeRMS(samples);
  if (rms < getEffectiveMinRms(config)) return [];

  if (!config.polyphonic) {
    const single = detectSinglePianoNote(samples, sampleRate, config);
    return single ? [single] : [];
  }

  const startSample = samples.length >= sampleRate * 0.14 ? Math.floor(sampleRate * 0.012) : 0;
  const fftSize = Math.max(16_384, config.fftSize);
  const spectrum = computeFFT(samples, sampleRate, fftSize, startSample);
  const minHz = midiToFrequency(config.minMidi - 0.6);
  const nyquistGuard = sampleRate * 0.44;
  const spectralMedian = computeSpectralMedian(spectrum, minHz, Math.min(nyquistGuard, 5000));

  let initialMaxMag = 0;
  const minBin = Math.max(1, Math.floor(minHz / spectrum.binHz));
  const maxBin = Math.min(
    spectrum.magnitudes.length - 1,
    Math.ceil(midiToFrequency(config.maxMidi + 1) / spectrum.binHz),
  );
  for (let b = minBin; b <= maxBin; b += 1) {
    const mag = spectrum.magnitudes[b] ?? 0;
    if (mag > initialMaxMag) initialMaxMag = mag;
  }

  // Broadband noise rejection (white/pink room noise has flat spectrum)
  if (initialMaxMag <= 0 || initialMaxMag < spectralMedian * MIN_PEAK_TO_MEDIAN_RATIO) {
    return [];
  }

  const residual = new Float32Array(spectrum.magnitudes);
  const detected: DetectedNote[] = [];
  const usedMidis = new Set<number>();

  for (let iter = 0; iter < config.maxPolyphony; iter += 1) {
    let best: CandidateScore | null = null;

    for (let midi = config.minMidi; midi <= config.maxMidi; midi += 1) {
      if (usedMidis.has(midi)) continue;
      const candidate = scorePolyphonicCandidate(
        midi,
        spectrum.magnitudes,
        residual,
        spectrum.binHz,
        nyquistGuard,
        spectralMedian,
        initialMaxMag,
      );
      if (candidate && (!best || candidate.score > best.score)) {
        best = candidate;
      }
    }

    if (!best) break;

    const relativeStrength = best.fundamentalMag / initialMaxMag;
    const snrFactor = Math.min(1, best.fundamentalMag / Math.max(1e-9, spectralMedian * 16));
    const confidence = Math.max(
      0,
      Math.min(
        1,
        0.55 * snrFactor + 0.3 * Math.min(1, relativeStrength * 2.5) + 0.15 * best.harmonicSupport,
      ),
    );

    if (confidence < config.confidenceThreshold) break;

    const midiFloat = frequencyToMidi(best.refinedHz);
    const centsOff = (midiFloat - best.midi) * 100;

    detected.push(
      DetectedNoteSchema.parse({
        midi: best.midi,
        noteName: midiToNoteName(best.midi),
        frequencyHz: best.refinedHz,
        confidence,
        centsOff,
        amplitude: best.fundamentalMag,
      }),
    );
    usedMidis.add(best.midi);

    subtractNoteHarmonics(residual, spectrum.binHz, best.midi, best.fundamentalMag, nyquistGuard);
  }

  // Sort ascending by MIDI pitch for deterministic chord representation
  detected.sort((a, b) => a.midi - b.midi);
  return detected;
}

interface TrackedNoteState {
  candidateFrames: number;
  absentFrames: number;
  active: boolean;
  lastTriggerMs: number;
  lastAmplitude: number;
}

/**
 * Pure, browser-independent frame tracker that applies onset gating, hysteresis,
 * and retrigger debouncing so each acoustic piano key strike emits one clean `noteOn`.
 */
export class MicNoteTracker {
  private config: MicDetectionConfig;
  private readonly notes = new Map<number, TrackedNoteState>();
  private previousRms = 0;

  constructor(configInput?: MicDetectionConfigInput) {
    this.config = MicDetectionConfigSchema.parse(configInput ?? {});
  }

  getConfig(): MicDetectionConfig {
    return this.config;
  }

  updateConfig(partial: Partial<MicDetectionConfigInput>): MicDetectionConfig {
    this.config = MicDetectionConfigSchema.parse({
      ...this.config,
      ...partial,
    });
    return this.config;
  }

  setNoiseFloor(noiseFloorRms: number): void {
    this.updateConfig({ noiseFloorRms });
  }

  reset(): void {
    this.notes.clear();
    this.previousRms = 0;
  }

  /** Process one audio frame and return both the pitch frame and any newly triggered noteOn events. */
  processFrame(
    samples: Float32Array,
    sampleRate: number,
    timestampMs: number,
  ): { frame: MicPitchFrame; noteOns: MicNoteOnEvent[] } {
    const rms = computeRMS(samples);
    const level = rmsToVuLevel(rms);
    const aboveNoiseFloor = rms >= getEffectiveMinRms(this.config);
    const activeNotes = aboveNoiseFloor ? detectActiveMidis(samples, sampleRate, this.config) : [];

    const detectedByMidi = new Map<number, DetectedNote>();
    for (const note of activeNotes) {
      detectedByMidi.set(note.midi, note);
    }

    const noteOns: MicNoteOnEvent[] = [];
    const hasGlobalReattack =
      this.previousRms > 0 && rms >= this.previousRms * this.config.reattackRmsRatio;

    for (const note of activeNotes) {
      const state = this.notes.get(note.midi) ?? {
        candidateFrames: 0,
        absentFrames: 0,
        active: false,
        lastTriggerMs: -Infinity,
        lastAmplitude: 0,
      };

      state.absentFrames = 0;
      state.candidateFrames += 1;

      const cooldownElapsed = timestampMs - state.lastTriggerMs >= this.config.retriggerCooldownMs;
      const shouldTriggerFresh =
        !state.active && state.candidateFrames >= this.config.minHoldFrames && cooldownElapsed;
      const shouldRetriggerSameKey =
        state.active &&
        cooldownElapsed &&
        hasGlobalReattack &&
        state.lastAmplitude > 0 &&
        note.amplitude >= state.lastAmplitude * 1.45;

      if (shouldTriggerFresh || shouldRetriggerSameKey) {
        state.active = true;
        state.lastTriggerMs = timestampMs;
        noteOns.push(
          MicNoteOnEventSchema.parse({
            midi: note.midi,
            noteName: note.noteName,
            confidence: note.confidence,
            centsOff: note.centsOff,
            rms,
            timestampMs,
          }),
        );
      }

      state.lastAmplitude = note.amplitude;
      this.notes.set(note.midi, state);
    }

    // Apply release hysteresis for notes absent in this frame
    for (const [midi, state] of this.notes.entries()) {
      if (detectedByMidi.has(midi)) continue;
      state.candidateFrames = 0;
      state.absentFrames += 1;
      if (!aboveNoiseFloor || state.absentFrames >= 2) {
        state.active = false;
        state.lastAmplitude = 0;
      }
      if (!state.active && state.absentFrames > 10) {
        this.notes.delete(midi);
      }
    }

    this.previousRms = rms;

    let primaryNote: DetectedNote | null = null;
    for (const note of activeNotes) {
      if (!primaryNote || note.amplitude > primaryNote.amplitude) {
        primaryNote = note;
      }
    }

    const frame = MicPitchFrameSchema.parse({
      rms,
      level,
      aboveNoiseFloor,
      primaryNote,
      activeNotes,
      timestampMs,
    });

    return { frame, noteOns };
  }
}

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const win = window as WebkitAudioWindow;
  if (typeof win.AudioContext === "function") return win.AudioContext;
  if (typeof win.webkitAudioContext === "function") return win.webkitAudioContext;
  return null;
}

function classifyGetUserMediaError(err: unknown): { status: MicListenerStatus; message: string } {
  if (err instanceof Error) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      return { status: "denied", message: "Microphone permission was denied." };
    }
    if (err.name === "NotFoundError" || err.name === "NotSupportedError") {
      return { status: "unsupported", message: "No compatible microphone input was found." };
    }
    return { status: "error", message: err.message || "Microphone initialization failed." };
  }
  return { status: "error", message: "Microphone initialization failed." };
}

/**
 * Live Browser Acoustic Piano Microphone Listener.
 * Uses raw Web Audio capture (echoCancellation/noiseSuppression/autoGainControl disabled)
 * + AnalyserNode + MicNoteTracker with zero memory leaks on stop().
 */
export class MicPianoListener {
  private readonly tracker: MicNoteTracker;
  private status: MicListenerStatus = "idle";
  private lastError: string | null = null;
  private currentLevel = 0;
  private detectionPaused = false;

  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private timeBuffer: Float32Array<ArrayBuffer> | null = null;
  private rafId: number | null = null;

  private readonly noteOnListeners = new Set<MicNoteOnListener>();
  private readonly pitchFrameListeners = new Set<MicPitchFrameListener>();
  private readonly statusListeners = new Set<MicStatusListener>();

  constructor(configInput?: MicDetectionConfigInput) {
    this.tracker = new MicNoteTracker(configInput);
  }

  getStatus(): MicListenerStatus {
    return this.status;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  getLevel(): number {
    return this.currentLevel;
  }

  getConfig(): MicDetectionConfig {
    return this.tracker.getConfig();
  }

  updateConfig(partial: Partial<MicDetectionConfigInput>): MicDetectionConfig {
    return this.tracker.updateConfig(partial);
  }

  /** Pause/resume noteOn emission (e.g. ducking during metronome/accompaniment spikes). */
  pauseDetection(paused: boolean): void {
    this.detectionPaused = paused;
    if (paused) {
      this.tracker.reset();
    }
  }

  isDetectionPaused(): boolean {
    return this.detectionPaused;
  }

  /** Adjust minimum RMS gate threshold dynamically for noisy rooms or speaker bleed. */
  setGateThreshold(minRms: number): MicDetectionConfig {
    const clamped = Math.max(0.0001, Math.min(0.5, minRms));
    return this.tracker.updateConfig({ minRms: clamped });
  }

  onNoteOn(listener: MicNoteOnListener): () => void {
    this.noteOnListeners.add(listener);
    return () => {
      this.noteOnListeners.delete(listener);
    };
  }

  onPitchFrame(listener: MicPitchFrameListener): () => void {
    this.pitchFrameListeners.add(listener);
    return () => {
      this.pitchFrameListeners.delete(listener);
    };
  }

  onStatusChange(listener: MicStatusListener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(next: MicListenerStatus, errorMessage: string | null = null): void {
    this.status = MicListenerStatusSchema.parse(next);
    this.lastError = errorMessage;
    for (const listener of this.statusListeners) {
      listener(this.status);
    }
  }

  /** Request microphone access and start real-time acoustic piano pitch/chord detection. */
  async start(): Promise<MicListenerStatus> {
    if (this.status === "listening" || this.status === "requesting") {
      return this.status;
    }

    const AudioCtx = getAudioContextConstructor();
    if (
      typeof navigator === "undefined" ||
      typeof navigator.mediaDevices?.getUserMedia !== "function" ||
      !AudioCtx
    ) {
      this.setStatus("unsupported", "Microphone capture is not supported in this browser.");
      return this.status;
    }

    this.setStatus("requesting", null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // Handle stop() called while permission prompt was pending
      if (this.getStatus() !== "requesting") {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        return this.getStatus();
      }

      const audioContext = new AudioCtx();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const sourceNode = audioContext.createMediaStreamSource(stream);
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = this.tracker.getConfig().fftSize;
      analyserNode.smoothingTimeConstant = 0;

      // Connect source -> analyser only (never to destination, avoiding acoustic feedback)
      sourceNode.connect(analyserNode);

      this.stream = stream;
      this.audioContext = audioContext;
      this.sourceNode = sourceNode;
      this.analyserNode = analyserNode;
      this.timeBuffer = new Float32Array(new ArrayBuffer(analyserNode.fftSize * 4));
      this.tracker.reset();

      this.setStatus("listening", null);
      this.scheduleNextFrame();
      return this.status;
    } catch (err) {
      const classified = classifyGetUserMediaError(err);
      this.cleanupResources();
      this.setStatus(classified.status, classified.message);
      return this.status;
    }
  }

  /** Stop listening and release all microphone tracks, Web Audio nodes, and rAF timers. */
  stop(): void {
    this.cleanupResources();
    this.currentLevel = 0;
    this.tracker.reset();
    if (this.status !== "idle") {
      this.setStatus("idle", null);
    }
  }

  /** Sample ambient room noise for durationMs while listening and apply the calibrated floor. */
  async calibrateNoiseFloor(durationMs = 600): Promise<NoiseFloorEstimate | null> {
    if (this.status !== "listening" || !this.analyserNode || !this.timeBuffer) {
      return null;
    }
    const clampedMs = Math.max(150, Math.min(3000, durationMs));
    const samples: Float32Array[] = [];
    const endAt = performance.now() + clampedMs;

    await new Promise<void>((resolve) => {
      const capture = () => {
        if (this.status !== "listening" || !this.analyserNode || !this.timeBuffer) {
          resolve();
          return;
        }
        this.analyserNode.getFloatTimeDomainData(this.timeBuffer);
        samples.push(new Float32Array(this.timeBuffer));
        if (performance.now() >= endAt) {
          resolve();
          return;
        }
        window.setTimeout(capture, 35);
      };
      capture();
    });

    if (samples.length === 0) return null;
    const estimate = estimateNoiseFloor(samples);
    this.tracker.setNoiseFloor(estimate.noiseFloorRms);
    return estimate;
  }

  private scheduleNextFrame(): void {
    if (this.status !== "listening" || typeof requestAnimationFrame !== "function") return;
    this.rafId = requestAnimationFrame((timestampMs) => {
      this.rafId = null;
      if (
        this.status !== "listening" ||
        !this.analyserNode ||
        !this.timeBuffer ||
        !this.audioContext
      ) {
        return;
      }

      this.analyserNode.getFloatTimeDomainData(this.timeBuffer);
      const { frame, noteOns } = this.tracker.processFrame(
        this.timeBuffer,
        this.audioContext.sampleRate,
        timestampMs,
      );
      // Light exponential smoothing for responsive, jitter-free VU meter dot
      this.currentLevel = this.currentLevel * 0.45 + frame.level * 0.55;

      for (const listener of this.pitchFrameListeners) {
        listener(frame);
      }
      if (!this.detectionPaused) {
        for (const event of noteOns) {
          for (const listener of this.noteOnListeners) {
            listener(event);
          }
        }
      }

      this.scheduleNextFrame();
    });
  }

  private cleanupResources(): void {
    if (this.rafId !== null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // Ignore already-disconnected node errors
      }
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      try {
        this.analyserNode.disconnect();
      } catch {
        // Ignore already-disconnected node errors
      }
      this.analyserNode = null;
    }

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }

    if (this.audioContext) {
      const ctx = this.audioContext;
      this.audioContext = null;
      if (ctx.state !== "closed") {
        void ctx.close();
      }
    }

    this.timeBuffer = null;
  }
}

/** Factory helper for creating a Zod-configured acoustic piano microphone listener. */
export function createMicPianoListener(config?: MicDetectionConfigInput): MicPianoListener {
  return new MicPianoListener(config);
}
