import { PIANO_MAX_MIDI, PIANO_MIN_MIDI } from "./schemas";

export interface StereoBuffer {
  readonly left: Float32Array;
  readonly right: Float32Array;
  readonly sampleRate: number;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

/** Equal-temperament concert pitch (A4 = MIDI 69 = 440 Hz). */
export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Inverse of midiToFrequency. */
export function frequencyToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

/** Human-readable scientific pitch name, e.g. 60 -> "C4", 69 -> "A4". */
export function midiToNoteName(midi: number): string {
  const rounded = Math.round(midi);
  const pitchClass = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  return `${NOTE_NAMES[pitchClass] ?? "C"}${octave}`;
}

/**
 * Pianist-perspective stereo panning across the 88-key range:
 * A0 (MIDI 21) -> -0.65 (left), C8 (MIDI 108) -> +0.65 (right).
 */
export function midiToPan(midi: number): number {
  const normalized = (midi - PIANO_MIN_MIDI) / (PIANO_MAX_MIDI - PIANO_MIN_MIDI);
  const clamped = Math.min(1, Math.max(0, normalized));
  return (clamped * 2 - 1) * 0.65;
}

/** Equal-power pan gains for pan in [-1, 1]. */
export function equalPowerPanGains(pan: number): { left: number; right: number } {
  const clamped = Math.min(1, Math.max(-1, pan));
  const angle = ((clamped + 1) * Math.PI) / 4;
  return {
    left: Math.cos(angle),
    right: Math.sin(angle),
  };
}

/** Deterministic PRNG (Mulberry32) for reproducible hammer/woodblock transients. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Mix a stereo buffer down to mono using average (preserving peak <= 1.0). */
export function mixToMono(stereo: StereoBuffer): Float32Array {
  const length = Math.min(stereo.left.length, stereo.right.length);
  const mono = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    mono[i] = ((stereo.left[i] ?? 0) + (stereo.right[i] ?? 0)) * 0.5;
  }
  return mono;
}

/**
 * Transparent safety limiter ensuring peak amplitude never exceeds maxPeak (<= 1.0).
 * Only attenuates when peak exceeds threshold; linear scaling below threshold preserves timbre.
 */
export function normalizePeakIfNeeded(buffer: Float32Array, maxPeak = 0.95): void {
  let peak = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    const abs = Math.abs(buffer[i] ?? 0);
    if (abs > peak) peak = abs;
  }
  if (peak <= maxPeak || peak === 0) return;
  const scale = maxPeak / peak;
  for (let i = 0; i < buffer.length; i += 1) {
    buffer[i] = (buffer[i] ?? 0) * scale;
  }
}

/** Normalize both channels of a stereo buffer jointly to preserve stereo image. */
export function normalizeStereoPeakIfNeeded(stereo: StereoBuffer, maxPeak = 0.95): void {
  let peak = 0;
  for (let i = 0; i < stereo.left.length; i += 1) {
    const absL = Math.abs(stereo.left[i] ?? 0);
    const absR = Math.abs(stereo.right[i] ?? 0);
    if (absL > peak) peak = absL;
    if (absR > peak) peak = absR;
  }
  if (peak <= maxPeak || peak === 0) return;
  const scale = maxPeak / peak;
  for (let i = 0; i < stereo.left.length; i += 1) {
    stereo.left[i] = (stereo.left[i] ?? 0) * scale;
    stereo.right[i] = (stereo.right[i] ?? 0) * scale;
  }
}

/** Apply a one-pole lowpass filter in-place (zero phase distortion artifacts for gentle damping). */
export function applyOnePoleLowpassInPlace(
  buffer: Float32Array,
  cutoffHz: number,
  sampleRate: number,
): void {
  const clampedCutoff = Math.min(sampleRate * 0.45, Math.max(40, cutoffHz));
  const rc = 1 / (2 * Math.PI * clampedCutoff);
  const dt = 1 / sampleRate;
  const alpha = dt / (rc + dt);
  let y = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    y += alpha * ((buffer[i] ?? 0) - y);
    buffer[i] = y;
  }
}

/** Remove tiny DC offset via highpass mean subtraction. */
export function removeDcOffsetInPlace(buffer: Float32Array): void {
  if (buffer.length === 0) return;
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    sum += buffer[i] ?? 0;
  }
  const mean = sum / buffer.length;
  if (Math.abs(mean) < 1e-7) return;
  for (let i = 0; i < buffer.length; i += 1) {
    buffer[i] = (buffer[i] ?? 0) - mean;
  }
}
