import {
  applyOnePoleLowpassInPlace,
  createSeededRandom,
  equalPowerPanGains,
  midiToFrequency,
  midiToPan,
  normalizePeakIfNeeded,
  normalizeStereoPeakIfNeeded,
  removeDcOffsetInPlace,
  type StereoBuffer,
} from "./dsp-core";
import {
  PIANO_MAX_MIDI,
  PIANO_MIN_MIDI,
  type PianoChordOptionsInput,
  PianoChordOptionsSchema,
  type PianoNoteOptionsInput,
  PianoNoteOptionsSchema,
} from "./schemas";

interface PartialSpec {
  readonly frequency: number;
  readonly amplitude: number;
  readonly decayFactor: number;
}

/**
 * Compute concert grand piano partial bank for a MIDI key & velocity.
 * Inharmonicity is normalized at k = 1 so the fundamental frequency is exact f0 (0.0 cents error)
 * while upper partials exhibit realistic stretched string shimmer.
 */
function buildPianoPartials(
  f0: number,
  midi: number,
  velocity: number,
  sampleRate: number,
): PartialSpec[] {
  const reg = (midi - PIANO_MIN_MIDI) / (PIANO_MAX_MIDI - PIANO_MIN_MIDI);
  // Realistic grand piano inharmonicity coefficient B (bass ~8e-5, treble ~4.2e-4)
  const inharmonicityB = 0.000_08 + reg * reg * 0.000_34;
  let maxPartials = 6;
  if (reg < 0.35) {
    maxPartials = 11;
  } else if (reg < 0.7) {
    maxPartials = 9;
  }
  const nyquistGuard = sampleRate * 0.44;
  // Register-dependent base decay time constant (seconds)
  const baseTau = 2.8 - reg * 2.25;

  const partials: PartialSpec[] = [];
  for (let k = 1; k <= maxPartials; k += 1) {
    const stretch = Math.sqrt((1 + inharmonicityB * k * k) / (1 + inharmonicityB));
    const freq = k * f0 * stretch;
    if (freq >= nyquistGuard) break;

    // Fundamental strong for clear pitch & warm iPad speaker presence; upper partials velocity-shaped
    const baseWeight = k === 1 ? 1.0 : 0.72 / k ** (1.18 + reg * 0.25);
    // Subtle even-partial warmth characteristic of grand piano strike point (~1/7 string length)
    const strikePointShaping = k === 7 ? 0.35 : 1.0;
    const velocityBrightness = k === 1 ? 1.0 : velocity ** (0.28 + 0.14 * (k - 1));
    const amplitude = baseWeight * strikePointShaping * velocityBrightness;

    // Higher partials decay faster than the fundamental
    const partialTau = Math.max(0.06, baseTau / (1 + 0.36 * (k - 1) ** 1.25));
    const decayFactor = Math.exp(-1 / (partialTau * sampleRate));

    partials.push({
      frequency: freq,
      amplitude,
      decayFactor,
    });
  }

  return partials;
}

/** Add a short, velocity-sensitive felt-hammer strike transient to the mono buffer. */
function addHammerTransient(
  mono: Float32Array,
  midi: number,
  velocity: number,
  sampleRate: number,
): void {
  const reg = (midi - PIANO_MIN_MIDI) / (PIANO_MAX_MIDI - PIANO_MIN_MIDI);
  const hammerDurationSec = 0.009 - reg * 0.004; // 9ms in bass -> 5ms in treble
  const hammerSamples = Math.min(
    mono.length,
    Math.max(32, Math.floor(hammerDurationSec * sampleRate)),
  );
  const rng = createSeededRandom(midi * 7919 + Math.round(velocity * 1000));
  const hammerLevel = 0.14 * velocity ** 1.35;
  const bodyFreq = 180 + reg * 620;
  const omega = (2 * Math.PI * bodyFreq) / sampleRate;

  let lp = 0;
  const lpAlpha = 0.22 + reg * 0.25;
  for (let i = 0; i < hammerSamples; i += 1) {
    const t = i / hammerSamples;
    const env = Math.sin(Math.PI * t) * Math.exp(-4.5 * t);
    const white = rng() * 2 - 1;
    lp += lpAlpha * (white - lp);
    const thump = Math.sin(omega * i) * 0.35;
    mono[i] = (mono[i] ?? 0) + (lp * 0.65 + thump) * env * hammerLevel;
  }
}

/** Apply smooth attack ramp, optional damper release, and click-free tail fade. */
function applyPianoEnvelope(
  mono: Float32Array,
  midi: number,
  releaseAtSeconds: number | undefined,
  sustainPedal: boolean,
  sampleRate: number,
): void {
  const reg = (midi - PIANO_MIN_MIDI) / (PIANO_MAX_MIDI - PIANO_MIN_MIDI);
  const attackSeconds = 0.0035 - reg * 0.0015; // 3.5ms bass -> 2.0ms treble
  const attackSamples = Math.max(16, Math.floor(attackSeconds * sampleRate));

  for (let i = 0; i < attackSamples && i < mono.length; i += 1) {
    const gain = 0.5 * (1 - Math.cos((Math.PI * i) / attackSamples));
    mono[i] = (mono[i] ?? 0) * gain;
  }

  if (releaseAtSeconds !== undefined && !sustainPedal) {
    const releaseStart = Math.max(attackSamples, Math.floor(releaseAtSeconds * sampleRate));
    const damperTau = 0.055 + (1 - reg) * 0.055; // 110ms bass -> 55ms treble
    const damperDecay = Math.exp(-1 / (damperTau * sampleRate));
    let damperGain = 1;
    for (let i = releaseStart; i < mono.length; i += 1) {
      damperGain *= damperDecay;
      mono[i] = (mono[i] ?? 0) * damperGain;
    }
  }

  // Always apply a short 6ms fade-out at buffer end to prevent clicks
  const endFadeSamples = Math.min(mono.length, Math.max(32, Math.floor(0.006 * sampleRate)));
  const fadeStart = mono.length - endFadeSamples;
  for (let i = 0; i < endFadeSamples; i += 1) {
    const gain = 0.5 * (1 + Math.cos((Math.PI * i) / endFadeSamples));
    mono[fadeStart + i] = (mono[fadeStart + i] ?? 0) * gain;
  }
}

/**
 * Pure DSP Concert Grand Piano note renderer.
 * Shared between offline mathematical verification (Bun) and real-time Web Audio playback.
 */
export function synthesizePianoNotePCM(input: PianoNoteOptionsInput): StereoBuffer {
  const opts = PianoNoteOptionsSchema.parse(input);
  const { midi, velocity, durationSeconds, releaseAtSeconds, sustainPedal, sampleRate } = opts;
  const totalSamples = Math.max(128, Math.floor(durationSeconds * sampleRate));
  const f0 = midiToFrequency(midi);
  const partials = buildPianoPartials(f0, midi, velocity, sampleRate);

  const mono = new Float32Array(totalSamples);
  let totalAmplitude = 0;
  for (const p of partials) {
    totalAmplitude += p.amplitude;
  }
  const amplitudeNorm = totalAmplitude > 0 ? (0.68 * velocity ** 0.9) / totalAmplitude : 0;

  // Render each partial with a drift-free rotation-matrix oscillator
  for (const partial of partials) {
    const omega = (2 * Math.PI * partial.frequency) / sampleRate;
    const cosStep = Math.cos(omega);
    const sinStep = Math.sin(omega);
    const decay = partial.decayFactor;
    let s = 0;
    let c = 1;
    let amp = partial.amplitude * amplitudeNorm;

    for (let i = 0; i < totalSamples; i += 1) {
      mono[i] = (mono[i] ?? 0) + s * amp;
      const nextS = s * cosStep + c * sinStep;
      const nextC = c * cosStep - s * sinStep;
      s = nextS;
      c = nextC;
      amp *= decay;
    }
  }

  // Velocity-sensitive lowpass filter (warmer at pp, brighter at ff)
  const cutoffHz = Math.max(f0 * 2.4, 240) * (1 + 3.2 * velocity ** 1.35);
  applyOnePoleLowpassInPlace(mono, cutoffHz, sampleRate);

  // Add felt-hammer strike transient before envelope shaping
  addHammerTransient(mono, midi, velocity, sampleRate);

  // Apply smooth attack, optional damper release, and end-of-buffer fade
  applyPianoEnvelope(mono, midi, releaseAtSeconds, sustainPedal, sampleRate);
  removeDcOffsetInPlace(mono);
  normalizePeakIfNeeded(mono, 0.92);

  // Equal-power stereo panning across the 88-key range
  const { left: panL, right: panR } = equalPowerPanGains(midiToPan(midi));
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i += 1) {
    const sample = mono[i] ?? 0;
    left[i] = sample * panL;
    right[i] = sample * panR;
  }

  normalizeStereoPeakIfNeeded({ left, right, sampleRate }, 0.95);
  return { left, right, sampleRate };
}

/**
 * Pure DSP Concert Grand Piano chord / interval renderer with automatic polyphonic headroom.
 */
export function synthesizePianoChordPCM(input: PianoChordOptionsInput): StereoBuffer {
  const opts = PianoChordOptionsSchema.parse(input);
  const {
    notes,
    velocity,
    durationSeconds,
    releaseAtSeconds,
    sustainPedal,
    arpeggiateMs,
    sampleRate,
  } = opts;

  const arpStepSamples = Math.floor((arpeggiateMs / 1000) * sampleRate);
  const maxOffsetSamples = arpStepSamples * (notes.length - 1);
  const noteSamples = Math.max(128, Math.floor(durationSeconds * sampleRate));
  const totalSamples = noteSamples + maxOffsetSamples;

  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);
  const voiceHeadroom = 1 / Math.sqrt(notes.length);

  for (let idx = 0; idx < notes.length; idx += 1) {
    const midi = notes[idx];
    if (midi === undefined) continue;
    const noteBuf = synthesizePianoNotePCM({
      midi,
      velocity,
      durationSeconds,
      releaseAtSeconds,
      sustainPedal,
      sampleRate,
    });
    const offset = idx * arpStepSamples;
    for (let i = 0; i < noteBuf.left.length; i += 1) {
      const targetIdx = offset + i;
      if (targetIdx < totalSamples) {
        left[targetIdx] = (left[targetIdx] ?? 0) + (noteBuf.left[i] ?? 0) * voiceHeadroom;
        right[targetIdx] = (right[targetIdx] ?? 0) + (noteBuf.right[i] ?? 0) * voiceHeadroom;
      }
    }
  }

  const stereo: StereoBuffer = { left, right, sampleRate };
  normalizeStereoPeakIfNeeded(stereo, 0.95);
  return stereo;
}
