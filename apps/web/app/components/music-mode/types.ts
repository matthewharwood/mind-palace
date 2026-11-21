import * as z from "zod";

export const PitchLetterSchema = z.enum(["C", "D", "E", "F", "G", "A", "B"]);
export type PitchLetter = z.infer<typeof PitchLetterSchema>;

export const PitchAccidentalSchema = z.enum(["bb", "b", "", "#", "##"]);
export type PitchAccidental = z.infer<typeof PitchAccidentalSchema>;

export const PitchSchema = z.object({
  letter: PitchLetterSchema,
  accidental: PitchAccidentalSchema,
  octave: z.int().min(0).max(8),
  midi: z.int().min(21).max(108),
});
export type Pitch = z.infer<typeof PitchSchema>;

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

export const ClefSchema = z.enum(["treble", "bass"]);
export type Clef = z.infer<typeof ClefSchema>;

export const ArticulationSchema = z.enum([
  "none",
  "staccato",
  "tenuto",
  "accent",
  "fermata",
  "arpeggio",
]);
export type Articulation = z.infer<typeof ArticulationSchema>;

export const DynamicMarkSchema = z.enum(["ppp", "pp", "p", "mp", "mf", "f", "ff", "fff", "sfz"]);
export type DynamicMark = z.infer<typeof DynamicMarkSchema>;

export const PedalMarkSchema = z.enum(["down", "up", "change"]);
export type PedalMark = z.infer<typeof PedalMarkSchema>;

export const NoteEventStatusSchema = z.enum(["idle", "active", "correct", "wrong"]);
export type NoteEventStatus = z.infer<typeof NoteEventStatusSchema>;

export const NoteEventSchema = z.object({
  id: z.string().min(1),
  pitches: z.array(PitchSchema),
  beatStart: z.number().min(0),
  duration: NoteDurationSchema,
  durationBeats: z.number().positive(),
  staff: ClefSchema,
  voice: z.int().min(1).max(4).optional(),
  isRest: z.boolean().optional(),
  tiedToNext: z.boolean().optional(),
  articulation: ArticulationSchema.optional(),
  dynamic: DynamicMarkSchema.optional(),
  finger: z.int().min(1).max(5).optional(),
  intervalLabel: z.string().min(1).optional(),
  romanNumeral: z.string().min(1).optional(),
  pedal: PedalMarkSchema.optional(),
  beamGroup: z.string().min(1).optional(),
  status: NoteEventStatusSchema.optional(),
});
export type NoteEvent = z.infer<typeof NoteEventSchema>;

export const HandFrameSchema = z.object({
  rh: z.string().min(1).optional(),
  lh: z.string().min(1).optional(),
});
export type HandFrame = z.infer<typeof HandFrameSchema>;

export const MeasureSchema = z.object({
  number: z.int().min(1),
  events: z.array(NoteEventSchema),
  harmonyLabel: z.string().min(1).optional(),
  isHardestBar: z.boolean().optional(),
  landmarkNote: z.string().min(1).optional(),
  handFrame: HandFrameSchema.optional(),
  rehearsalMark: z.string().min(1).optional(),
});
export type Measure = z.infer<typeof MeasureSchema>;

export const KeySignatureSchema = z.object({
  id: z.string().min(1),
  tonic: z.string().min(1),
  mode: z.enum(["major", "minor"]),
  fifths: z.int().min(-7).max(7),
  label: z.string().min(1),
  relativeId: z.string().min(1),
});
export type KeySignature = z.infer<typeof KeySignatureSchema>;

export const TimeSignatureSchema = z.object({
  numerator: z.int().min(1).max(12),
  denominator: z.union([z.literal(2), z.literal(4), z.literal(8), z.literal(16)]),
});
export type TimeSignature = z.infer<typeof TimeSignatureSchema>;

export const PolyrhythmRatioSchema = z.enum(["none", "2:3", "3:4"]);
export type PolyrhythmRatio = z.infer<typeof PolyrhythmRatioSchema>;

export const TimingRatingSchema = z.enum([
  "on-beat",
  "slightly-early",
  "slightly-late",
  "early",
  "late",
]);
export type TimingRating = z.infer<typeof TimingRatingSchema>;

export const TimingHitSchema = z.object({
  id: z.string().min(1),
  hand: z.enum(["LH", "RH", "single"]),
  slotIndex: z.int().min(0),
  /** Signed timing error in milliseconds: negative = early, positive = late. */
  offsetMs: z.number(),
  rating: TimingRatingSchema,
  timestampMs: z.number(),
});
export type TimingHit = z.infer<typeof TimingHitSchema>;

export const ALL_24_KEY_SIGNATURES: readonly KeySignature[] = [
  { id: "C-major", tonic: "C", mode: "major", fifths: 0, label: "C major", relativeId: "A-minor" },
  { id: "G-major", tonic: "G", mode: "major", fifths: 1, label: "G major", relativeId: "E-minor" },
  { id: "D-major", tonic: "D", mode: "major", fifths: 2, label: "D major", relativeId: "B-minor" },
  { id: "A-major", tonic: "A", mode: "major", fifths: 3, label: "A major", relativeId: "F#-minor" },
  { id: "E-major", tonic: "E", mode: "major", fifths: 4, label: "E major", relativeId: "C#-minor" },
  { id: "B-major", tonic: "B", mode: "major", fifths: 5, label: "B major", relativeId: "G#-minor" },
  {
    id: "F#-major",
    tonic: "F#",
    mode: "major",
    fifths: 6,
    label: "F♯ major",
    relativeId: "D#-minor",
  },
  {
    id: "Db-major",
    tonic: "Db",
    mode: "major",
    fifths: -5,
    label: "D♭ major",
    relativeId: "Bb-minor",
  },
  {
    id: "Ab-major",
    tonic: "Ab",
    mode: "major",
    fifths: -4,
    label: "A♭ major",
    relativeId: "F-minor",
  },
  {
    id: "Eb-major",
    tonic: "Eb",
    mode: "major",
    fifths: -3,
    label: "E♭ major",
    relativeId: "C-minor",
  },
  {
    id: "Bb-major",
    tonic: "Bb",
    mode: "major",
    fifths: -2,
    label: "B♭ major",
    relativeId: "G-minor",
  },
  { id: "F-major", tonic: "F", mode: "major", fifths: -1, label: "F major", relativeId: "D-minor" },
  { id: "A-minor", tonic: "A", mode: "minor", fifths: 0, label: "A minor", relativeId: "C-major" },
  { id: "E-minor", tonic: "E", mode: "minor", fifths: 1, label: "E minor", relativeId: "G-major" },
  { id: "B-minor", tonic: "B", mode: "minor", fifths: 2, label: "B minor", relativeId: "D-major" },
  {
    id: "F#-minor",
    tonic: "F#",
    mode: "minor",
    fifths: 3,
    label: "F♯ minor",
    relativeId: "A-major",
  },
  {
    id: "C#-minor",
    tonic: "C#",
    mode: "minor",
    fifths: 4,
    label: "C♯ minor",
    relativeId: "E-major",
  },
  {
    id: "G#-minor",
    tonic: "G#",
    mode: "minor",
    fifths: 5,
    label: "G♯ minor",
    relativeId: "B-major",
  },
  {
    id: "Eb-minor",
    tonic: "Eb",
    mode: "minor",
    fifths: -6,
    label: "E♭ minor",
    relativeId: "Gb-major",
  },
  {
    id: "Bb-minor",
    tonic: "Bb",
    mode: "minor",
    fifths: -5,
    label: "B♭ minor",
    relativeId: "Db-major",
  },
  {
    id: "F-minor",
    tonic: "F",
    mode: "minor",
    fifths: -4,
    label: "F minor",
    relativeId: "Ab-major",
  },
  {
    id: "C-minor",
    tonic: "C",
    mode: "minor",
    fifths: -3,
    label: "C minor",
    relativeId: "Eb-major",
  },
  {
    id: "G-minor",
    tonic: "G",
    mode: "minor",
    fifths: -2,
    label: "G minor",
    relativeId: "Bb-major",
  },
  { id: "D-minor", tonic: "D", mode: "minor", fifths: -1, label: "D minor", relativeId: "F-major" },
] as const;

const SHARP_ORDER = ["F♯", "C♯", "G♯", "D♯", "A♯", "E♯", "B♯"] as const;
const FLAT_ORDER = ["B♭", "E♭", "A♭", "D♭", "G♭", "C♭", "F♭"] as const;

export function formatKeySignatureAccidentals(fifths: number): string {
  const count = Math.abs(fifths);
  if (fifths > 0) return `${count}♯ (${SHARP_ORDER.slice(0, count).join(", ")})`;
  if (fifths < 0) return `${count}♭ (${FLAT_ORDER.slice(0, count).join(", ")})`;
  return "No sharps or flats";
}

/**
 * Standard Gould *Behind Bars* diatonic step positions (C4 = 0) for key signatures.
 */
export const TREBLE_SHARP_STEPS = [10, 7, 11, 8, 5, 9, 6] as const;
export const BASS_SHARP_STEPS = [-4, -7, -3, -6, -9, -5, -8] as const;
export const TREBLE_FLAT_STEPS = [6, 9, 5, 8, 4, 7, 3] as const;
export const BASS_FLAT_STEPS = [-8, -5, -9, -6, -10, -7, -11] as const;

const LETTER_STEPS: Record<PitchLetter, number> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
};

const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);
const SHARP_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"] as const;
const FLAT_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"] as const;

/**
 * Diatonic staff step where Middle C (C4) = 0.
 * Treble lines: E4=2, G4=4, B4=6, D5=8, F5=10.
 * Bass lines: G2=-10, B2=-8, D3=-6, F3=-4, A3=-2.
 */
export function pitchToDiatonicStep(pitch: Pick<Pitch, "letter" | "octave">): number {
  return (pitch.octave - 4) * 7 + LETTER_STEPS[pitch.letter];
}

export function isBlackKeyMidi(midi: number): boolean {
  return BLACK_PITCH_CLASSES.has(((midi % 12) + 12) % 12);
}

export function midiToNoteName(midi: number, preferFlats = false): string {
  const octave = Math.floor(midi / 12) - 1;
  const pitchClass = ((midi % 12) + 12) % 12;
  const name = preferFlats ? (FLAT_NAMES[pitchClass] ?? "C") : (SHARP_NAMES[pitchClass] ?? "C");
  return `${name}${octave}`;
}

/**
 * Returns the diatonic steps where ledger lines must be drawn for a note on a given clef.
 */
export function getLedgerLineSteps(step: number, clef: Clef): number[] {
  const minLine = clef === "treble" ? 2 : -10;
  const maxLine = clef === "treble" ? 10 : -2;
  const lines: number[] = [];

  if (step < minLine) {
    for (let s = minLine - 2; s >= step; s -= 2) {
      lines.push(s);
    }
  } else if (step > maxLine) {
    for (let s = maxLine + 2; s <= step; s += 2) {
      lines.push(s);
    }
  }
  return lines;
}

/**
 * Returns true if the pitch matches one of the classic piano sight-reading landmark anchors:
 * Bass C2/C3, Bass F3, Middle C4, Treble G4, Treble C5/C6.
 */
export function isLandmarkMidi(midi: number): boolean {
  return (
    midi === 36 || // C2
    midi === 48 || // C3
    midi === 53 || // F3 (Bass F clef line)
    midi === 60 || // C4 (Middle C)
    midi === 67 || // G4 (Treble G clef line)
    midi === 72 || // C5
    midi === 84 // C6
  );
}

export function isDottedDuration(duration: NoteDuration): boolean {
  return (
    duration === "dotted-half" || duration === "dotted-quarter" || duration === "dotted-eighth"
  );
}

export function isHollowDuration(duration: NoteDuration): boolean {
  return duration === "whole" || duration === "half" || duration === "dotted-half";
}

export function hasStemDuration(duration: NoteDuration): boolean {
  return duration !== "whole";
}

export function beamCountForDuration(duration: NoteDuration): number {
  if (duration === "sixteenth") return 2;
  if (duration === "eighth" || duration === "dotted-eighth" || duration === "triplet-eighth") {
    return 1;
  }
  return 0;
}

export function classifyTimingOffset(offsetMs: number): TimingRating {
  const abs = Math.abs(offsetMs);
  if (abs <= 25) return "on-beat";
  if (abs <= 55) return offsetMs < 0 ? "slightly-early" : "slightly-late";
  return offsetMs < 0 ? "early" : "late";
}

const ACCIDENTAL_SEMITONES: Record<PitchAccidental, number> = {
  bb: -2,
  b: -1,
  "": 0,
  "#": 1,
  "##": 2,
};

const LETTER_BASE_MIDI: Record<PitchLetter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export function makePitch(
  letter: PitchLetter,
  octave: number,
  accidental: PitchAccidental = "",
): Pitch {
  const midi = (octave + 1) * 12 + LETTER_BASE_MIDI[letter] + ACCIDENTAL_SEMITONES[accidental];
  return { letter, accidental, octave, midi };
}
