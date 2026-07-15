import type { AvaShapeCard, AvaShapeColor, AvaShapeKind } from "@mind-palace/schemas";
import * as z from "zod";

const OscillatorVoiceSchema = z.object({
  frequency: z.number().positive(),
  waveform: z.enum(["sine", "square", "sawtooth", "triangle"]),
  offsetSeconds: z.number().min(0),
  durationSeconds: z.number().positive(),
  gain: z.number().positive().max(1),
});

export const AvaShapeSoundSchema = z.object({
  id: z.string().min(1),
  shapeVoice: OscillatorVoiceSchema,
  colorVoice: OscillatorVoiceSchema,
});
export type AvaShapeSound = z.infer<typeof AvaShapeSoundSchema>;

const SHAPE_VOICES: Record<AvaShapeKind, z.infer<typeof OscillatorVoiceSchema>> = {
  square: {
    frequency: 196,
    waveform: "square",
    offsetSeconds: 0,
    durationSeconds: 0.28,
    gain: 0.055,
  },
  oval: {
    frequency: 220,
    waveform: "sine",
    offsetSeconds: 0,
    durationSeconds: 0.34,
    gain: 0.1,
  },
  rhombus: {
    frequency: 246.94,
    waveform: "sawtooth",
    offsetSeconds: 0,
    durationSeconds: 0.3,
    gain: 0.045,
  },
  circle: {
    frequency: 261.63,
    waveform: "sine",
    offsetSeconds: 0,
    durationSeconds: 0.4,
    gain: 0.1,
  },
  triangle: {
    frequency: 293.66,
    waveform: "triangle",
    offsetSeconds: 0,
    durationSeconds: 0.26,
    gain: 0.09,
  },
};

const COLOR_FREQUENCIES: Record<AvaShapeColor, number> = {
  colorless: 523.25,
  red: 329.63,
  orange: 349.23,
  yellow: 392,
  green: 440,
  blue: 466.16,
  purple: 493.88,
  pink: 587.33,
};

export function getAvaShapeSound(card: AvaShapeCard): AvaShapeSound {
  return AvaShapeSoundSchema.parse({
    id: card.id,
    shapeVoice: SHAPE_VOICES[card.shape],
    colorVoice: {
      frequency: COLOR_FREQUENCIES[card.color],
      waveform: card.color === "colorless" ? "sine" : "triangle",
      offsetSeconds: 0.12,
      durationSeconds: 0.32,
      gain: card.color === "colorless" ? 0.07 : 0.085,
    },
  });
}

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  audioContext ??= new AudioContext();
  return audioContext;
}

export async function playAvaShapeSound(card: AvaShapeCard): Promise<void> {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") await context.resume();

  const sound = getAvaShapeSound(card);
  const startAt = context.currentTime + 0.02;
  playVoice(context, sound.shapeVoice, startAt);
  playVoice(context, sound.colorVoice, startAt);
}

function playVoice(
  context: AudioContext,
  voice: z.infer<typeof OscillatorVoiceSchema>,
  startAt: number,
): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  const voiceStart = startAt + voice.offsetSeconds;
  const voiceEnd = voiceStart + voice.durationSeconds;

  oscillator.type = voice.waveform;
  oscillator.frequency.setValueAtTime(voice.frequency, voiceStart);
  envelope.gain.setValueAtTime(0.0001, voiceStart);
  envelope.gain.exponentialRampToValueAtTime(voice.gain, voiceStart + 0.025);
  envelope.gain.exponentialRampToValueAtTime(0.0001, voiceEnd);
  oscillator.connect(envelope);
  envelope.connect(context.destination);
  oscillator.start(voiceStart);
  oscillator.stop(voiceEnd + 0.02);
}
