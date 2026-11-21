import {
  createSeededRandom,
  equalPowerPanGains,
  midiToFrequency,
  normalizeStereoPeakIfNeeded,
  removeDcOffsetInPlace,
  type StereoBuffer,
} from "./dsp-core";
import {
  type RhythmHitAccuracy,
  type SfxRenderOptions,
  type SfxRenderOptionsInput,
  SfxRenderOptionsSchema,
} from "./schemas";

interface BellToneSpec {
  readonly frequency: number;
  readonly startSeconds: number;
  readonly durationSeconds: number;
  readonly decaySeconds: number;
  readonly amplitude: number;
  readonly pan: number;
  readonly harmonic2?: number;
}

function addBellTone(stereo: StereoBuffer, spec: BellToneSpec): void {
  const { sampleRate, left, right } = stereo;
  const startSample = Math.floor(spec.startSeconds * sampleRate);
  const lengthSamples = Math.floor(spec.durationSeconds * sampleRate);
  const attackSamples = Math.max(16, Math.floor(0.006 * sampleRate));
  const omega1 = (2 * Math.PI * spec.frequency) / sampleRate;
  const omega2 = (2 * Math.PI * spec.frequency * 2) / sampleRate;
  const h2 = spec.harmonic2 ?? 0.22;
  const { left: panL, right: panR } = equalPowerPanGains(spec.pan);

  for (let i = 0; i < lengthSamples; i += 1) {
    const idx = startSample + i;
    if (idx >= left.length) break;
    const t = i / sampleRate;
    const attack = i < attackSamples ? 0.5 * (1 - Math.cos((Math.PI * i) / attackSamples)) : 1;
    const env1 = Math.exp(-t / spec.decaySeconds);
    const env2 = Math.exp(-t / (spec.decaySeconds * 0.5));
    const sample =
      (Math.sin(omega1 * i) * env1 + h2 * Math.sin(omega2 * i) * env2) * attack * spec.amplitude;
    left[idx] = (left[idx] ?? 0) + sample * panL;
    right[idx] = (right[idx] ?? 0) + sample * panR;
  }
}

function finalizeSfxBuffer(stereo: StereoBuffer): StereoBuffer {
  const fadeSamples = Math.min(
    stereo.left.length,
    Math.max(24, Math.floor(0.006 * stereo.sampleRate)),
  );
  const fadeStart = stereo.left.length - fadeSamples;
  for (let i = 0; i < fadeSamples; i += 1) {
    const gain = 0.5 * (1 + Math.cos((Math.PI * i) / fadeSamples));
    stereo.left[fadeStart + i] = (stereo.left[fadeStart + i] ?? 0) * gain;
    stereo.right[fadeStart + i] = (stereo.right[fadeStart + i] ?? 0) * gain;
  }
  removeDcOffsetInPlace(stereo.left);
  removeDcOffsetInPlace(stereo.right);
  normalizeStereoPeakIfNeeded(stereo, 0.88);
  return stereo;
}

function renderCorrectInterval(sampleRate: number, reducedMotion: boolean): StereoBuffer {
  const durationSeconds = reducedMotion ? 0.22 : 0.4;
  const totalSamples = Math.floor(durationSeconds * sampleRate);
  const stereo: StereoBuffer = {
    left: new Float32Array(totalSamples),
    right: new Float32Array(totalSamples),
    sampleRate,
  };

  // E5 (MIDI 76) -> B5 (MIDI 83): warm ascending perfect fifth chime
  addBellTone(stereo, {
    frequency: midiToFrequency(76),
    startSeconds: 0,
    durationSeconds: reducedMotion ? 0.2 : 0.34,
    decaySeconds: reducedMotion ? 0.065 : 0.11,
    amplitude: 0.42,
    pan: -0.12,
    harmonic2: 0.18,
  });

  addBellTone(stereo, {
    frequency: midiToFrequency(83),
    startSeconds: reducedMotion ? 0.01 : 0.065,
    durationSeconds: reducedMotion ? 0.2 : 0.33,
    decaySeconds: reducedMotion ? 0.07 : 0.12,
    amplitude: 0.46,
    pan: 0.14,
    harmonic2: 0.16,
  });

  return finalizeSfxBuffer(stereo);
}

function renderGentleMiss(sampleRate: number): StereoBuffer {
  const durationSeconds = 0.2;
  const totalSamples = Math.floor(durationSeconds * sampleRate);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);
  const rng = createSeededRandom(909);
  const attackSamples = Math.max(16, Math.floor(0.005 * sampleRate));

  let phase = 0;
  let noiseLp = 0;
  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    // Soft downward woody membrane pitch glide: 175 Hz -> 112 Hz
    const freq = 112 + 63 * Math.exp(-t / 0.045);
    phase += (2 * Math.PI * freq) / sampleRate;
    const attack = i < attackSamples ? 0.5 * (1 - Math.cos((Math.PI * i) / attackSamples)) : 1;
    const env = Math.exp(-t / 0.052);
    const white = rng() * 2 - 1;
    noiseLp += 0.08 * (white - noiseLp);
    const sample =
      (Math.sin(phase) * 0.85 + noiseLp * 0.22 * Math.exp(-t / 0.018)) * attack * env * 0.55;
    left[i] = sample;
    right[i] = sample;
  }

  return finalizeSfxBuffer({ left, right, sampleRate });
}

const RHYTHM_HIT_FREQ: Record<RhythmHitAccuracy, number> = {
  "on-beat": 1850,
  early: 1560,
  late: 1320,
};

function renderRhythmHit(sampleRate: number, accuracy: RhythmHitAccuracy): StereoBuffer {
  const durationSeconds = 0.052;
  const totalSamples = Math.floor(durationSeconds * sampleRate);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);
  const rng = createSeededRandom(555);
  const baseHz = RHYTHM_HIT_FREQ[accuracy];
  const omega1 = (2 * Math.PI * baseHz) / sampleRate;
  const omega2 = (2 * Math.PI * baseHz * 1.94) / sampleRate;
  const attackSamples = Math.max(8, Math.floor(0.001 * sampleRate));
  const clickSamples = Math.max(12, Math.floor(0.0022 * sampleRate));

  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    const attack = i < attackSamples ? i / attackSamples : 1;
    const env = Math.exp(-t / 0.0085);
    const click = i < clickSamples ? (rng() * 2 - 1) * (1 - i / clickSamples) * 0.24 : 0;
    const sample =
      (Math.sin(omega1 * i) * 0.8 + Math.sin(omega2 * i) * 0.28 + click) * attack * env * 0.65;
    left[i] = sample;
    right[i] = sample;
  }

  return finalizeSfxBuffer({ left, right, sampleRate });
}

function renderPreviewCountdown(sampleRate: number, countdownFinal: boolean): StereoBuffer {
  const durationSeconds = countdownFinal ? 0.36 : 0.24;
  const totalSamples = Math.floor(durationSeconds * sampleRate);
  const stereo: StereoBuffer = {
    left: new Float32Array(totalSamples),
    right: new Float32Array(totalSamples),
    sampleRate,
  };

  if (countdownFinal) {
    // Warm ready chime: A5 (880 Hz) + D6 (1174.66 Hz)
    addBellTone(stereo, {
      frequency: midiToFrequency(81),
      startSeconds: 0,
      durationSeconds: 0.34,
      decaySeconds: 0.11,
      amplitude: 0.36,
      pan: -0.1,
      harmonic2: 0.14,
    });
    addBellTone(stereo, {
      frequency: midiToFrequency(86),
      startSeconds: 0.02,
      durationSeconds: 0.33,
      decaySeconds: 0.12,
      amplitude: 0.42,
      pan: 0.1,
      harmonic2: 0.14,
    });
  } else {
    // Subtle single celesta tick at A5 (880 Hz)
    addBellTone(stereo, {
      frequency: midiToFrequency(81),
      startSeconds: 0,
      durationSeconds: 0.22,
      decaySeconds: 0.068,
      amplitude: 0.42,
      pan: 0,
      harmonic2: 0.12,
    });
  }

  return finalizeSfxBuffer(stereo);
}

function renderStreakMilestone(sampleRate: number, reducedMotion: boolean): StereoBuffer {
  const durationSeconds = reducedMotion ? 0.38 : 0.88;
  const totalSamples = Math.floor(durationSeconds * sampleRate);
  const stereo: StereoBuffer = {
    left: new Float32Array(totalSamples),
    right: new Float32Array(totalSamples),
    sampleRate,
  };

  // Chopin-inspired luminous Cmaj9 harmonic bloom: C5, E5, G5, B5, D6
  const chordMidis = reducedMotion ? [72, 76, 79] : [72, 76, 79, 83, 86];
  const stepSeconds = reducedMotion ? 0.008 : 0.055;
  const decaySeconds = reducedMotion ? 0.12 : 0.24;

  for (let i = 0; i < chordMidis.length; i += 1) {
    const midi = chordMidis[i];
    if (midi === undefined) continue;
    const startSeconds = i * stepSeconds;
    const pan = chordMidis.length > 1 ? ((i / (chordMidis.length - 1)) * 2 - 1) * 0.42 : 0;
    addBellTone(stereo, {
      frequency: midiToFrequency(midi),
      startSeconds,
      durationSeconds: Math.max(0.15, durationSeconds - startSeconds),
      decaySeconds,
      amplitude: 0.32,
      pan,
      harmonic2: 0.16,
    });
  }

  return finalizeSfxBuffer(stereo);
}

/**
 * Pure DSP UI & learning SFX renderer shared by Bun verification and Web Audio playback.
 */
export function synthesizeSfxPCM(input: SfxRenderOptionsInput): StereoBuffer {
  const opts: SfxRenderOptions = SfxRenderOptionsSchema.parse(input);
  switch (opts.kind) {
    case "correctInterval":
      return renderCorrectInterval(opts.sampleRate, opts.reducedMotion);
    case "gentleMiss":
      return renderGentleMiss(opts.sampleRate);
    case "rhythmHit":
      return renderRhythmHit(opts.sampleRate, opts.rhythmAccuracy);
    case "previewCountdown":
      return renderPreviewCountdown(opts.sampleRate, opts.countdownFinal);
    case "streakMilestone":
      return renderStreakMilestone(opts.sampleRate, opts.reducedMotion);
    default: {
      const exhaustive: never = opts.kind;
      throw new Error(`Unsupported Music Mode SFX kind: ${String(exhaustive)}`);
    }
  }
}
