import * as z from "zod";

export const DEFAULT_SAMPLE_RATE = 44_100;
export const PIANO_MIN_MIDI = 21; // A0 (27.5 Hz)
export const PIANO_MAX_MIDI = 108; // C8 (4186.01 Hz)

export const MidiNoteSchema = z.number().int().min(PIANO_MIN_MIDI).max(PIANO_MAX_MIDI);

export const AudioPreferencesSchema = z.object({
  muted: z.boolean().default(false),
  masterVolume: z.number().min(0).max(1).default(0.85),
  pianoVolume: z.number().min(0).max(1).default(0.9),
  metronomeVolume: z.number().min(0).max(1).default(0.65),
  sfxVolume: z.number().min(0).max(1).default(0.55),
  respectReducedMotion: z.boolean().default(true),
});
export type AudioPreferences = z.infer<typeof AudioPreferencesSchema>;
export type AudioPreferencesInput = z.input<typeof AudioPreferencesSchema>;

export const PianoNoteOptionsSchema = z.object({
  midi: MidiNoteSchema,
  velocity: z.number().min(0.05).max(1).default(0.75),
  durationSeconds: z.number().min(0.08).max(8).default(1.6),
  releaseAtSeconds: z.number().min(0.03).max(8).optional(),
  sustainPedal: z.boolean().default(false),
  sampleRate: z.number().int().min(16_000).max(96_000).default(DEFAULT_SAMPLE_RATE),
});
export type PianoNoteOptionsInput = z.input<typeof PianoNoteOptionsSchema>;

export const PianoChordOptionsSchema = z.object({
  notes: z.array(MidiNoteSchema).min(1).max(12),
  velocity: z.number().min(0.05).max(1).default(0.75),
  durationSeconds: z.number().min(0.1).max(8).default(1.8),
  releaseAtSeconds: z.number().min(0.03).max(8).optional(),
  sustainPedal: z.boolean().default(false),
  arpeggiateMs: z.number().min(0).max(250).default(0),
  sampleRate: z.number().int().min(16_000).max(96_000).default(DEFAULT_SAMPLE_RATE),
});
export type PianoChordOptionsInput = z.input<typeof PianoChordOptionsSchema>;

export const IntervalPlaybackModeSchema = z.enum(["harmonic", "melodic"]);
export type IntervalPlaybackMode = z.infer<typeof IntervalPlaybackModeSchema>;

export const TimeSignatureSchema = z.enum(["2/4", "3/4", "4/4", "6/8", "9/8", "12/8"]);
export type TimeSignature = z.infer<typeof TimeSignatureSchema>;

export const PolyrhythmSchema = z.enum(["none", "2:3", "3:4", "4:3"]);

export const MetronomeVoiceKindSchema = z.enum(["accent", "beat", "subdivision", "cross"]);
export type MetronomeVoiceKind = z.infer<typeof MetronomeVoiceKindSchema>;

export const MetronomeConfigSchema = z.object({
  bpm: z.number().min(30).max(240).default(80),
  timeSignature: TimeSignatureSchema.default("4/4"),
  polyrhythm: PolyrhythmSchema.default("none"),
  countInBars: z.number().int().min(0).max(4).default(0),
  accentBeatOne: z.boolean().default(true),
  subdivideCompound: z.boolean().default(true),
});
export type MetronomeConfig = z.infer<typeof MetronomeConfigSchema>;
export type MetronomeConfigInput = z.input<typeof MetronomeConfigSchema>;

export const MetronomeScheduledPulseSchema = z.object({
  beatIndex: z.number().int().min(0),
  fractionOfBar: z.number().min(0).lt(1),
  voice: MetronomeVoiceKindSchema,
  isAccent: z.boolean(),
});
export type MetronomeScheduledPulse = z.infer<typeof MetronomeScheduledPulseSchema>;

export const MetronomeTickEventSchema = z.object({
  bar: z.number().int().min(0),
  beat: z.number().int().min(1),
  isCountIn: z.boolean(),
  isAccent: z.boolean(),
  voice: MetronomeVoiceKindSchema,
  fractionOfBar: z.number().min(0).lt(1),
  scheduledTime: z.number().min(0),
});
export type MetronomeTickEvent = z.infer<typeof MetronomeTickEventSchema>;

export const MusicSfxKindSchema = z.enum([
  "correctInterval",
  "gentleMiss",
  "rhythmHit",
  "previewCountdown",
  "streakMilestone",
]);
export type MusicSfxKind = z.infer<typeof MusicSfxKindSchema>;

export const RhythmHitAccuracySchema = z.enum(["early", "on-beat", "late"]);
export type RhythmHitAccuracy = z.infer<typeof RhythmHitAccuracySchema>;

export const SfxRenderOptionsSchema = z.object({
  kind: MusicSfxKindSchema,
  sampleRate: z.number().int().min(16_000).max(96_000).default(DEFAULT_SAMPLE_RATE),
  reducedMotion: z.boolean().default(false),
  countdownFinal: z.boolean().default(false),
  rhythmAccuracy: RhythmHitAccuracySchema.default("on-beat"),
});
export type SfxRenderOptions = z.infer<typeof SfxRenderOptionsSchema>;
export type SfxRenderOptionsInput = z.input<typeof SfxRenderOptionsSchema>;

export const AudioAnalysisResultSchema = z.object({
  sampleRate: z.number().int().positive(),
  durationSeconds: z.number().nonnegative(),
  rms: z.number().nonnegative(),
  peak: z.number().nonnegative(),
  hasNonFinite: z.boolean(),
  dcOffset: z.number(),
  detectedHz: z.number().nonnegative(),
  centsError: z.number().nullable(),
  spectralCentroidHz: z.number().nonnegative(),
  attackPeakSeconds: z.number().nonnegative(),
  earlyRms: z.number().nonnegative(),
  tailRms: z.number().nonnegative(),
  envelopeDecays: z.boolean(),
});
export type AudioAnalysisResult = z.infer<typeof AudioAnalysisResultSchema>;
