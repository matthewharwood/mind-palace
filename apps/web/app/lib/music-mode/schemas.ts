import * as z from "zod";

// ---------------------------------------------------------------------------
// Pitch, Clef, Hand & Landmark Primitives
// ---------------------------------------------------------------------------

export const PitchLetterSchema = z.enum(["C", "D", "E", "F", "G", "A", "B"]);
export type PitchLetter = z.infer<typeof PitchLetterSchema>;

export const AccidentalSchema = z.enum(["bb", "b", "", "#", "##"]);
export type Accidental = z.infer<typeof AccidentalSchema>;

export const ClefSchema = z.enum(["treble", "bass"]);
export type Clef = z.infer<typeof ClefSchema>;

export const HandSchema = z.enum(["RH", "LH"]);
export type Hand = z.infer<typeof HandSchema>;

export const FingerNumberSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);
export type FingerNumber = z.infer<typeof FingerNumberSchema>;

export const PitchSchema = z.object({
  letter: PitchLetterSchema,
  accidental: AccidentalSchema,
  octave: z.number().int().min(0).max(8),
  midi: z.number().int().min(21).max(108),
});
export type Pitch = z.infer<typeof PitchSchema>;

export const LandmarkIdSchema = z.enum([
  "bass-c2",
  "bass-c3",
  "bass-f3",
  "middle-c4",
  "treble-g4",
  "treble-c5",
  "treble-c6",
]);

export const LandmarkNoteSchema = z.object({
  id: LandmarkIdSchema,
  label: z.string().min(1),
  clef: ClefSchema,
  staffPosition: z.string().min(1),
  pitch: PitchSchema,
});
export type LandmarkNote = z.infer<typeof LandmarkNoteSchema>;

export const LandmarkReadingSchema = z.object({
  landmark: LandmarkNoteSchema,
  signedSteps: z.number().int(),
  intervalNumber: z.number().int().min(1),
  direction: z.enum(["same", "up", "down"]),
  relativeLabel: z.string().min(1),
});
export type LandmarkReading = z.infer<typeof LandmarkReadingSchema>;

// ---------------------------------------------------------------------------
// Intervals & Visual Shapes
// ---------------------------------------------------------------------------

export const IntervalQualitySchema = z.enum(["P", "M", "m", "A", "d"]);
export type IntervalQuality = z.infer<typeof IntervalQualitySchema>;

export const IntervalDirectionSchema = z.enum(["ascending", "descending", "harmonic"]);
export type IntervalDirection = z.infer<typeof IntervalDirectionSchema>;

export const IntervalVisualShapeSchema = z.enum([
  "same-position",
  "adjacent-step",
  "line-to-line-or-space-to-space",
  "line-to-space",
]);
export type IntervalVisualShape = z.infer<typeof IntervalVisualShapeSchema>;

export const IntervalSchema = z.object({
  id: z.string().min(2),
  number: z.number().int().min(1).max(10),
  quality: IntervalQualitySchema,
  semitones: z.number().int().min(0).max(17),
  diatonicSteps: z.number().int().min(0).max(9),
  shortName: z.string().min(2),
  fullName: z.string().min(3),
  direction: IntervalDirectionSchema,
  visualShape: IntervalVisualShapeSchema,
  earReference: z.string().min(1),
});
export type Interval = z.infer<typeof IntervalSchema>;

// ---------------------------------------------------------------------------
// Key Signatures (all 24 Major / Minor Keys + enharmonic equivalents)
// ---------------------------------------------------------------------------

export const KeyModeSchema = z.enum(["major", "minor"]);

export const KeySignatureIdSchema = z.enum([
  "C-major",
  "G-major",
  "D-major",
  "A-major",
  "E-major",
  "B-major",
  "F#-major",
  "C#-major",
  "F-major",
  "Bb-major",
  "Eb-major",
  "Ab-major",
  "Db-major",
  "Gb-major",
  "Cb-major",
  "A-minor",
  "E-minor",
  "B-minor",
  "F#-minor",
  "C#-minor",
  "G#-minor",
  "D#-minor",
  "A#-minor",
  "D-minor",
  "G-minor",
  "C-minor",
  "F-minor",
  "Bb-minor",
  "Eb-minor",
  "Ab-minor",
]);
export type KeySignatureId = z.infer<typeof KeySignatureIdSchema>;

export const KeySignatureSchema = z.object({
  id: KeySignatureIdSchema,
  tonic: z.string().min(1),
  mode: KeyModeSchema,
  /** Circle of fifths position: -7 (Cb/Abm) to +7 (C#/A#m) */
  fifths: z.number().int().min(-7).max(7),
  label: z.string().min(1),
  relativeId: KeySignatureIdSchema,
  accidentalType: z.enum(["none", "sharp", "flat"]).optional(),
  accidentals: z.array(PitchLetterSchema).optional(),
  tier: z.number().int().min(1).max(5).optional(),
  scaleSpelled: z.array(z.string().min(1)).length(7).optional(),
  chopinWorks: z.array(z.string()).optional(),
});
export type KeySignature = z.infer<typeof KeySignatureSchema>;

// ---------------------------------------------------------------------------
// Chords & Chopin Harmonic Idioms
// ---------------------------------------------------------------------------

export const ChordQualitySchema = z.enum([
  "major",
  "minor",
  "diminished",
  "augmented",
  "sus2",
  "sus4",
  "dom7",
  "maj7",
  "min7",
  "halfDim7",
  "dim7",
  "minMaj7",
  "dom9",
  "maj9",
  "min9",
  "neapolitan6",
  "itAug6",
  "frAug6",
  "gerAug6",
  "secondaryDom",
]);
export type ChordQuality = z.infer<typeof ChordQualitySchema>;

export const ChordInversionSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
export type ChordInversion = z.infer<typeof ChordInversionSchema>;

export const ChordShapeSchema = z.object({
  root: PitchSchema,
  quality: ChordQualitySchema,
  inversion: ChordInversionSchema,
  pitches: z.array(PitchSchema).min(3),
  symbol: z.string().min(1),
  romanNumeral: z.string().optional(),
  chopinIdiomTag: z.string().optional(),
});
export type ChordShape = z.infer<typeof ChordShapeSchema>;

export const ChopinIdiomAnalysisSchema = z.object({
  idiom: z.enum([
    "neapolitan-bII6",
    "italian-aug6",
    "french-aug6",
    "german-aug6",
    "secondary-dominant",
    "chromatic-mediant",
    "standard-diatonic",
  ]),
  romanNumeral: z.string().min(1),
  explanation: z.string().min(1),
  resolutionHint: z.string().min(1),
});
export type ChopinIdiomAnalysis = z.infer<typeof ChopinIdiomAnalysisSchema>;

// ---------------------------------------------------------------------------
// Tactile Hand-Frame & Blind-Keyboard Topography
// ---------------------------------------------------------------------------

export const BlackKeyClusterSchema = z.enum(["two-black", "three-black"]);
export type BlackKeyCluster = z.infer<typeof BlackKeyClusterSchema>;

export const TactileKeyFeelSchema = z.object({
  pitch: PitchSchema,
  finger: FingerNumberSchema,
  isBlackKey: z.boolean(),
  cluster: BlackKeyClusterSchema,
  landmarkCue: z.string().min(1),
});
export type TactileKeyFeel = z.infer<typeof TactileKeyFeelSchema>;

export const TactileHandFrameSchema = z.object({
  hand: HandSchema,
  anchorPitch: PitchSchema,
  spanSemitones: z.number().int().min(0),
  fitsFiveFingerFrame: z.boolean(),
  keys: z.array(TactileKeyFeelSchema).min(1),
  blindNavigationCue: z.string().min(1),
});
export type TactileHandFrame = z.infer<typeof TactileHandFrameSchema>;

// ---------------------------------------------------------------------------
// Rhythm, Notation & Score Passages
// ---------------------------------------------------------------------------

export const NoteDurationSchema = z.enum([
  "whole",
  "dotted-half",
  "half",
  "dotted-quarter",
  "quarter",
  "dotted-eighth",
  "eighth",
  "sixteenth",
  "triplet-eighth",
  "triplet-quarter",
]);
export type NoteDuration = z.infer<typeof NoteDurationSchema>;

export const PolyrhythmRatioSchema = z.enum(["none", "2:3", "3:4"]);
export type PolyrhythmRatio = z.infer<typeof PolyrhythmRatioSchema>;

export const TimeSignatureSchema = z.object({
  numerator: z.number().int().min(1).max(12),
  denominator: z.union([z.literal(2), z.literal(4), z.literal(8), z.literal(16)]),
});
export type TimeSignature = z.infer<typeof TimeSignatureSchema>;

export const RhythmCellSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  timeSignature: TimeSignatureSchema,
  /** Total duration in quarter-note beats */
  totalQuarterBeats: z.number().positive(),
  /** Onset offsets in quarter-note beats from bar start */
  onsetBeats: z.array(z.number().nonnegative()).min(1),
  /** Optional left-hand polyrhythm onset offsets in quarter-note beats */
  lhOnsetBeats: z.array(z.number().nonnegative()).optional(),
  polyrhythm: PolyrhythmRatioSchema,
  tier: z.number().int().min(1).max(5),
  description: z.string().min(1),
});
export type RhythmCell = z.infer<typeof RhythmCellSchema>;

export const DynamicMarkingSchema = z.enum([
  "ppp",
  "pp",
  "p",
  "mp",
  "mf",
  "f",
  "ff",
  "fff",
  "sfz",
  "cresc",
  "dim",
]);
export type DynamicMarking = z.infer<typeof DynamicMarkingSchema>;

export const ArticulationSchema = z.enum([
  "none",
  "staccato",
  "tenuto",
  "accent",
  "fermata",
  "arpeggio",
]);
export type Articulation = z.infer<typeof ArticulationSchema>;

export const PedalMarkingSchema = z.enum(["down", "up", "change"]);
export type PedalMarking = z.infer<typeof PedalMarkingSchema>;

export const NoteEventSchema = z.object({
  id: z.string().min(1),
  /** Empty array when isRest is true; 1 pitch for melody, 2+ for chord stack */
  pitches: z.array(PitchSchema),
  /** Start beat within the measure (0-based, measured in quarter-note beats) */
  beatStart: z.number().nonnegative(),
  duration: NoteDurationSchema,
  /** Duration in quarter-note beats */
  durationBeats: z.number().positive(),
  staff: ClefSchema,
  voice: z.number().int().min(1).max(4).default(1),
  isRest: z.boolean().default(false),
  tiedToNext: z.boolean().default(false),
  articulation: ArticulationSchema.default("none"),
  dynamic: DynamicMarkingSchema.optional(),
  finger: FingerNumberSchema.optional(),
  intervalLabel: z.string().optional(),
  romanNumeral: z.string().optional(),
  pedal: PedalMarkingSchema.optional(),
});
export type NoteEvent = z.infer<typeof NoteEventSchema>;

export const HandFrameAnnotationSchema = z.object({
  rh: z.string().optional(),
  lh: z.string().optional(),
});

export const MeasureSchema = z.object({
  number: z.number().int().min(1),
  events: z.array(NoteEventSchema),
  harmonyLabel: z.string().optional(),
  isHardestBar: z.boolean().default(false),
  landmarkNote: z.string().optional(),
  handFrame: HandFrameAnnotationSchema.optional(),
  rehearsalMark: z.string().optional(),
});
export type Measure = z.infer<typeof MeasureSchema>;

export const ScoreTierSchema = z.enum([
  "method-book",
  "hymnal-chorale",
  "classical-miniature",
  "romantic-study",
  "chopin-excerpt",
]);
export type ScoreTier = z.infer<typeof ScoreTierSchema>;

export const PreviewNotesSchema = z.object({
  roadmap: z.string().min(1),
  hardestBarNumber: z.number().int().min(1),
  landmarkSummary: z.string().min(1),
  keyCue: z.string().min(1),
});

export const ScorePassageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  composer: z.string().min(1),
  opus: z.string().optional(),
  tier: ScoreTierSchema,
  difficulty: z.number().int().min(1).max(10),
  dayUnlock: z.number().int().min(1).max(30).default(1),
  keySignature: KeySignatureSchema,
  timeSignature: TimeSignatureSchema,
  tempoBpm: z.number().int().min(30).max(220),
  polyrhythm: PolyrhythmRatioSchema.default("none"),
  measures: z.array(MeasureSchema).min(1),
  previewNotes: PreviewNotesSchema,
  harmonicSummary: z.string().min(1),
  tags: z.array(z.string()).default([]),
});
export type ScorePassage = z.infer<typeof ScorePassageSchema>;

// ---------------------------------------------------------------------------
// FSRS Spaced Repetition & Adaptive Flow Engine
// ---------------------------------------------------------------------------

export const FSRSStateSchema = z.enum(["new", "learning", "review", "relearning"]);
export type FSRSState = z.infer<typeof FSRSStateSchema>;

export const FSRSRatingSchema = z.enum(["again", "hard", "good", "easy"]);
export type FSRSRating = z.infer<typeof FSRSRatingSchema>;

export const FSRSCardCategorySchema = z.enum([
  "interval",
  "chord-quality",
  "inversion",
  "key-signature",
  "rhythm-cell",
  "landmark-chunk",
  "chopin-idiom",
  "score-passage",
]);
export type FSRSCardCategory = z.infer<typeof FSRSCardCategorySchema>;

export const FSRSCardSchema = z.object({
  id: z.string().min(1),
  category: FSRSCardCategorySchema,
  promptKey: z.string().min(1),
  prompt: z.string().min(1).optional(),
  answer: z.string().min(1).optional(),
  difficultyLevel: z.number().int().min(1).max(10).default(1),
  state: FSRSStateSchema.default("new"),
  stability: z.number().nonnegative().default(0),
  difficulty: z.number().min(1).max(10).default(5),
  elapsedDays: z.number().nonnegative().default(0),
  scheduledDays: z.number().nonnegative().default(0),
  reps: z.number().int().nonnegative().default(0),
  lapses: z.number().int().nonnegative().default(0),
  dueAt: z.number().int().nonnegative().default(0),
  lastReviewedAt: z.number().int().nonnegative().nullable().default(null),
});
export type FSRSCard = z.infer<typeof FSRSCardSchema>;

export const FSRSReviewLogSchema = z.object({
  cardId: z.string().min(1),
  rating: FSRSRatingSchema,
  reviewedAt: z.number().int().nonnegative(),
  latencyMs: z.number().int().nonnegative(),
  accuracy: z.number().min(0).max(1),
  prevStability: z.number().nonnegative(),
  nextStability: z.number().nonnegative(),
});
export type FSRSReviewLog = z.infer<typeof FSRSReviewLogSchema>;

export const FlowMetricSampleSchema = z.object({
  timestamp: z.number().int().nonnegative(),
  correct: z.boolean(),
  responseMs: z.number().int().nonnegative(),
  difficultyLevel: z.number().int().min(1).max(10),
});
export type FlowMetricSample = z.infer<typeof FlowMetricSampleSchema>;

export const FlowAdjustmentSchema = z.enum(["none", "dropped", "promoted"]);

export const AdaptiveFlowStateSchema = z.object({
  currentDifficulty: z.number().int().min(1).max(10),
  rollingWindow: z.array(FlowMetricSampleSchema),
  rollingAccuracy: z.number().min(0).max(1),
  avgResponseMs: z.number().nonnegative(),
  consecutiveDrops: z.number().int().nonnegative(),
  consecutivePromotions: z.number().int().nonnegative(),
  lastAdjustment: FlowAdjustmentSchema,
  lastAdjustmentReason: z.string(),
});
export type AdaptiveFlowState = z.infer<typeof AdaptiveFlowStateSchema>;

// ---------------------------------------------------------------------------
// 30-Day x 4-Hour Curriculum & Exercise Engine
// ---------------------------------------------------------------------------

export const ExerciseKindSchema = z.enum([
  "interval-flash",
  "shape-chunk",
  "ear-interval",
  "ear-chord",
  "ear-cadence",
  "ear-dictation",
  "rhythm-isolation",
  "polyrhythm-tap",
  "tactile-blind-frame",
  "sight-reading-ritual",
]);
export type ExerciseKind = z.infer<typeof ExerciseKindSchema>;

export const SightReadingStepSchema = z.enum([
  "preview-30s",
  "rhythm-isolate",
  "look-ahead-play",
  "review-weakest-bar",
  "fsrs-rate",
]);
export type SightReadingStep = z.infer<typeof SightReadingStepSchema>;

export const DailySprintSchema = z.object({
  index: z.number().int().min(0).max(7),
  hour: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  title: z.string().min(1),
  focusMinutes: z.number().int().min(1).max(60),
  breakMinutes: z.number().int().min(0).max(15),
  exerciseKind: ExerciseKindSchema,
  targetKeys: z.array(z.string()),
  targetPassages: z.array(z.string()),
  habitCue: z.string().min(1),
  drillTip: z.string().min(1).optional(),
});
export type DailySprint = z.infer<typeof DailySprintSchema>;

export const DailyBlockSchema = z.object({
  hour: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  theme: z.string().min(1),
  pillar: z.enum(["interval-fsrs", "active-ear", "rhythm-tactile", "sight-reading-ritual"]),
  totalMinutes: z.number().int().min(30).max(90),
  sprints: z.array(DailySprintSchema).length(2),
});
export type DailyBlock = z.infer<typeof DailyBlockSchema>;

export const CurriculumPhaseSchema = z.enum([
  "foundations",
  "keys-and-chorales",
  "romantic-fluency",
  "chopin-mastery",
]);
export type CurriculumPhase = z.infer<typeof CurriculumPhaseSchema>;

export const DayPlanSchema = z.object({
  day: z.number().int().min(1).max(30),
  phase: CurriculumPhaseSchema,
  title: z.string().min(1),
  theme: z.string().min(1),
  keysIntroduced: z.array(KeySignatureIdSchema),
  targetBpmRange: z.tuple([z.number().int().min(30), z.number().int().max(220)]),
  sprints: z.array(DailySprintSchema).length(8),
  blocks: z.array(DailyBlockSchema).length(4),
  milestone: z.string().min(1),
});
export type DayPlan = z.infer<typeof DayPlanSchema>;

// ---------------------------------------------------------------------------
// Persisted Music Mode State / Progress (IDB singleton "music-mode")
// ---------------------------------------------------------------------------

export const MusicModePreferencesSchema = z.object({
  blindKeyboard: z.boolean().default(true),
  lookAheadMasking: z.boolean().default(true),
  showIntervalsOverlay: z.boolean().default(true),
  showRomanNumerals: z.boolean().default(false),
  metronomeBpmOffset: z.number().int().min(-40).max(40).default(0),
  volume: z.number().min(0).max(1).default(0.8),
  muted: z.boolean().default(false),
  sustainPedal: z.boolean().default(true),
  habitIdentityCue: z
    .string()
    .default("I read intervals and shapes ahead of my hands, one bar at a time."),
});

export const MusicModeStateSchema = z.object({
  id: z.literal("music-mode"),
  currentDay: z.number().int().min(1).max(30).default(1),
  activeSprintIndex: z.number().int().min(0).max(7).default(0),
  ritualStep: SightReadingStepSchema.default("preview-30s"),
  adaptiveDifficulty: z.number().int().min(1).max(10).default(1),
  rollingAccuracy: z.number().min(0).max(1).default(0.85),
  streakDays: z.number().int().nonnegative().default(0),
  lastPracticeDate: z.string().nullable().default(null),
  totalMinutesPracticed: z.number().int().nonnegative().default(0),
  completedSprintsByDay: z.record(z.string(), z.array(z.number().int().min(0).max(7))).default({}),
  cards: z.record(z.string(), FSRSCardSchema).default({}),
  reviewLogs: z.array(FSRSReviewLogSchema).default([]),
  flowState: AdaptiveFlowStateSchema.optional(),
  preferences: MusicModePreferencesSchema.default(() => MusicModePreferencesSchema.parse({})),
});
export type MusicModeState = z.infer<typeof MusicModeStateSchema>;
