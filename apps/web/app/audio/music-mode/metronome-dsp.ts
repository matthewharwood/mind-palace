import {
  createSeededRandom,
  equalPowerPanGains,
  normalizePeakIfNeeded,
  normalizeStereoPeakIfNeeded,
  removeDcOffsetInPlace,
  type StereoBuffer,
} from "./dsp-core";
import {
  DEFAULT_SAMPLE_RATE,
  type MetronomeConfig,
  type MetronomeConfigInput,
  MetronomeConfigSchema,
  type MetronomeScheduledPulse,
  type MetronomeVoiceKind,
  MetronomeVoiceKindSchema,
  type TimeSignature,
  TimeSignatureSchema,
} from "./schemas";

interface TimeSignatureSpec {
  readonly numerator: number;
  readonly denominator: number;
  readonly mainBeats: number;
  readonly subdivisionsPerBeat: number;
  readonly isCompound: boolean;
}

const TIME_SIGNATURE_SPECS: Record<TimeSignature, TimeSignatureSpec> = {
  "2/4": { numerator: 2, denominator: 4, mainBeats: 2, subdivisionsPerBeat: 1, isCompound: false },
  "3/4": { numerator: 3, denominator: 4, mainBeats: 3, subdivisionsPerBeat: 1, isCompound: false },
  "4/4": { numerator: 4, denominator: 4, mainBeats: 4, subdivisionsPerBeat: 1, isCompound: false },
  "6/8": { numerator: 6, denominator: 8, mainBeats: 2, subdivisionsPerBeat: 3, isCompound: true },
  "9/8": { numerator: 9, denominator: 8, mainBeats: 3, subdivisionsPerBeat: 3, isCompound: true },
  "12/8": { numerator: 12, denominator: 8, mainBeats: 4, subdivisionsPerBeat: 3, isCompound: true },
};

export function getTimeSignatureSpec(timeSignature: TimeSignature): TimeSignatureSpec {
  return TIME_SIGNATURE_SPECS[timeSignature];
}

/** Convert an object-form time signature (from ScorePassage) to the metronome enum. */
export function formatTimeSignature(input: {
  numerator: number;
  denominator: number;
}): TimeSignature {
  const candidate = `${input.numerator}/${input.denominator}`;
  const parsed = TimeSignatureSchema.safeParse(candidate);
  return parsed.success ? parsed.data : "4/4";
}

/**
 * Duration of one full bar in seconds.
 * In simple meters (x/4), BPM is quarter-note pulses per minute.
 * In compound meters (6/8, 9/8, 12/8), BPM is dotted-quarter main pulses per minute.
 */
export function getBarDurationSeconds(bpm: number, timeSignature: TimeSignature): number {
  const spec = getTimeSignatureSpec(timeSignature);
  const secondsPerMainBeat = 60 / bpm;
  return spec.mainBeats * secondsPerMainBeat;
}

function getCrossPulseFractions(config: MetronomeConfig, mainBeats: number): number[] {
  if (config.polyrhythm === "none") return [];

  let crossPulsesPerBar: number;
  if (config.polyrhythm === "2:3") {
    // 2:3 per half-bar in 4/4 (6 cross pulses), or 3 across the bar in 2/4, 3/4, 6/8
    crossPulsesPerBar = mainBeats === 4 ? 6 : 3;
  } else if (config.polyrhythm === "3:4") {
    // True 3-against-4 cross-rhythm: if meter already has 4 main beats, place 3 cross pulses; else 4
    crossPulsesPerBar = mainBeats === 4 ? 3 : 4;
  } else {
    // 4:3 cross-rhythm
    crossPulsesPerBar = mainBeats === 3 ? 4 : 3;
  }

  const fractions: number[] = [];
  for (let k = 1; k < crossPulsesPerBar; k += 1) {
    const frac = k / crossPulsesPerBar;
    // Skip exact overlap with main beat 0 (already anchored by downbeat accent)
    if (frac > 1e-6 && frac < 1 - 1e-6) {
      fractions.push(frac);
    }
  }
  return fractions;
}

/**
 * Compute all sorted pulses (main beats, optional compound subdivisions, and polyrhythm cross-cues)
 * for a single bar as fractions in [0, 1).
 */
export function computeBarSchedule(input: MetronomeConfigInput): MetronomeScheduledPulse[] {
  const config = MetronomeConfigSchema.parse(input);
  const spec = getTimeSignatureSpec(config.timeSignature);
  const pulses: MetronomeScheduledPulse[] = [];

  for (let beat = 0; beat < spec.mainBeats; beat += 1) {
    const isAccent = beat === 0 && config.accentBeatOne;
    pulses.push({
      beatIndex: beat,
      fractionOfBar: beat / spec.mainBeats,
      voice: isAccent ? "accent" : "beat",
      isAccent,
    });

    if (spec.isCompound && config.subdivideCompound) {
      for (let sub = 1; sub < spec.subdivisionsPerBeat; sub += 1) {
        const subFraction = (beat + sub / spec.subdivisionsPerBeat) / spec.mainBeats;
        pulses.push({
          beatIndex: beat,
          fractionOfBar: subFraction,
          voice: "subdivision",
          isAccent: false,
        });
      }
    }
  }

  const crossFractions = getCrossPulseFractions(config, spec.mainBeats);
  for (let i = 0; i < crossFractions.length; i += 1) {
    const frac = crossFractions[i];
    if (frac === undefined) continue;
    pulses.push({
      beatIndex: i,
      fractionOfBar: frac,
      voice: "cross",
      isAccent: false,
    });
  }

  pulses.sort((a, b) => a.fractionOfBar - b.fractionOfBar);
  return pulses;
}

interface WoodblockParams {
  readonly baseHz: number;
  readonly overtoneRatio: number;
  readonly durationSec: number;
  readonly decaySec: number;
  readonly amplitude: number;
  readonly clickAmount: number;
  readonly pan: number;
  readonly seed: number;
}

const VOICE_PARAMS: Record<MetronomeVoiceKind, WoodblockParams> = {
  accent: {
    baseHz: 1480,
    overtoneRatio: 2.02,
    durationSec: 0.048,
    decaySec: 0.011,
    amplitude: 0.85,
    clickAmount: 0.28,
    pan: 0,
    seed: 101,
  },
  beat: {
    baseHz: 980,
    overtoneRatio: 1.98,
    durationSec: 0.04,
    decaySec: 0.0095,
    amplitude: 0.62,
    clickAmount: 0.2,
    pan: 0,
    seed: 202,
  },
  subdivision: {
    baseHz: 1240,
    overtoneRatio: 2.1,
    durationSec: 0.026,
    decaySec: 0.006,
    amplitude: 0.34,
    clickAmount: 0.14,
    pan: 0.15,
    seed: 303,
  },
  cross: {
    baseHz: 660,
    overtoneRatio: 2.42,
    durationSec: 0.045,
    decaySec: 0.011,
    amplitude: 0.58,
    clickAmount: 0.16,
    pan: -0.35,
    seed: 404,
  },
};

/**
 * Pure DSP woodblock / clave synthesizer for metronome clicks.
 * Accent is louder & brighter than beat; cross-rhythm is distinctly pitched & panned left.
 */
export function synthesizeMetronomeClickPCM(
  voiceInput: MetronomeVoiceKind,
  sampleRate = DEFAULT_SAMPLE_RATE,
): StereoBuffer {
  const voice = MetronomeVoiceKindSchema.parse(voiceInput);
  const p = VOICE_PARAMS[voice];
  const totalSamples = Math.max(64, Math.floor(p.durationSec * sampleRate));
  const mono = new Float32Array(totalSamples);
  const rng = createSeededRandom(p.seed);

  const omega1 = (2 * Math.PI * p.baseHz) / sampleRate;
  const omega2 = (2 * Math.PI * p.baseHz * p.overtoneRatio) / sampleRate;
  const attackSamples = Math.max(8, Math.floor(0.0012 * sampleRate));
  const clickSamples = Math.max(12, Math.floor(0.0025 * sampleRate));

  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    const attack = i < attackSamples ? i / attackSamples : 1;
    const env1 = Math.exp(-t / p.decaySec);
    const env2 = Math.exp(-t / (p.decaySec * 0.55));
    const tone = Math.sin(omega1 * i) * env1 + 0.42 * Math.sin(omega2 * i) * env2;

    const click = i < clickSamples ? (rng() * 2 - 1) * (1 - i / clickSamples) * p.clickAmount : 0;
    mono[i] = (tone + click) * attack * p.amplitude;
  }

  removeDcOffsetInPlace(mono);
  normalizePeakIfNeeded(mono, 0.92);

  const { left: panL, right: panR } = equalPowerPanGains(p.pan);
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
