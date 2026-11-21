import {
  type Accidental,
  type BlackKeyCluster,
  type ChopinIdiomAnalysis,
  ChopinIdiomAnalysisSchema,
  type ChordInversion,
  type ChordQuality,
  type ChordShape,
  ChordShapeSchema,
  type Clef,
  type FingerNumber,
  type Hand,
  type Interval,
  type IntervalDirection,
  type IntervalQuality,
  IntervalSchema,
  type IntervalVisualShape,
  type KeySignature,
  type KeySignatureId,
  KeySignatureSchema,
  type LandmarkNote,
  LandmarkNoteSchema,
  type LandmarkReading,
  LandmarkReadingSchema,
  type Pitch,
  type PitchLetter,
  PitchSchema,
  type TactileHandFrame,
  TactileHandFrameSchema,
  type TactileKeyFeel,
} from "./schemas";

// ---------------------------------------------------------------------------
// Core Pitch Math & Enharmonic Spelling
// ---------------------------------------------------------------------------

const LETTERS: readonly PitchLetter[] = ["C", "D", "E", "F", "G", "A", "B"];

const LETTER_TO_SEMITONE: Record<PitchLetter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const LETTER_TO_INDEX: Record<PitchLetter, number> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
};

const ACCIDENTAL_TO_OFFSET: Record<Accidental, number> = {
  bb: -2,
  b: -1,
  "": 0,
  "#": 1,
  "##": 2,
};

const OFFSET_TO_ACCIDENTAL: Record<number, Accidental> = {
  [-2]: "bb",
  [-1]: "b",
  0: "",
  1: "#",
  2: "##",
};

const SHARP_ORDER: readonly PitchLetter[] = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER: readonly PitchLetter[] = ["B", "E", "A", "D", "G", "C", "F"];

export function createPitch(letter: PitchLetter, accidental: Accidental, octave: number): Pitch {
  const midi = (octave + 1) * 12 + LETTER_TO_SEMITONE[letter] + ACCIDENTAL_TO_OFFSET[accidental];
  return PitchSchema.parse({ letter, accidental, octave, midi });
}

export function formatPitch(pitch: Pitch): string {
  return `${pitch.letter}${pitch.accidental}${pitch.octave}`;
}

export function formatPitchUnicode(pitch: Pitch): string {
  const symbolMap: Record<Accidental, string> = {
    bb: "𝄫",
    b: "♭",
    "": "",
    "#": "♯",
    "##": "𝄪",
  };
  return `${pitch.letter}${symbolMap[pitch.accidental]}${pitch.octave}`;
}

export function pitchToDiatonicStep(pitch: Pitch): number {
  return pitch.octave * 7 + LETTER_TO_INDEX[pitch.letter];
}

const PITCH_FULL_REGEX = /^([A-G])(bb|b|##|#)?([0-8])$/;
const PITCH_NAME_REGEX = /^([A-G])(bb|b|##|#)?$/;

export function parsePitch(spelled: string): Pitch {
  const match = PITCH_FULL_REGEX.exec(spelled.trim());
  if (!match) {
    throw new Error(`Invalid pitch string: "${spelled}"`);
  }
  const letter = match[1] as PitchLetter;
  const accidental = (match[2] ?? "") as Accidental;
  const octave = Number(match[3]);
  return createPitch(letter, accidental, octave);
}

function splitPitchName(name: string): { letter: PitchLetter; accidental: Accidental } {
  const match = PITCH_NAME_REGEX.exec(name.trim());
  if (!match) {
    throw new Error(`Invalid pitch name: "${name}"`);
  }
  return {
    letter: match[1] as PitchLetter,
    accidental: (match[2] ?? "") as Accidental,
  };
}

function accidentalForLetterInFifths(letter: PitchLetter, fifths: number): Accidental {
  if (fifths > 0) {
    return SHARP_ORDER.slice(0, fifths).includes(letter) ? "#" : "";
  }
  if (fifths < 0) {
    return FLAT_ORDER.slice(0, -fifths).includes(letter) ? "b" : "";
  }
  return "";
}

function buildScaleSpelling(tonicName: string, fifths: number): string[] {
  const { letter } = splitPitchName(tonicName);
  const startIndex = LETTER_TO_INDEX[letter];
  const scale: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const stepLetter = LETTERS[(startIndex + i) % 7] ?? "C";
    const acc = accidentalForLetterInFifths(stepLetter, fifths);
    scale.push(`${stepLetter}${acc}`);
  }
  return scale;
}

// ---------------------------------------------------------------------------
// All 24 Major / Minor Keys (+ Enharmonic Equivalents = 30 Key Signatures)
// ---------------------------------------------------------------------------

interface KeySeed {
  id: KeySignatureId;
  tonic: string;
  mode: "major" | "minor";
  fifths: number;
  relativeId: KeySignatureId;
  tier: number;
  chopinWorks: string[];
}

const KEY_SEEDS: readonly KeySeed[] = [
  // Major keys (Circle of Fifths)
  {
    id: "C-major",
    tonic: "C",
    mode: "major",
    fifths: 0,
    relativeId: "A-minor",
    tier: 1,
    chopinWorks: ["Prelude Op. 28 No. 1", "Etude Op. 10 No. 1"],
  },
  {
    id: "G-major",
    tonic: "G",
    mode: "major",
    fifths: 1,
    relativeId: "E-minor",
    tier: 1,
    chopinWorks: ["Prelude Op. 28 No. 3", "Nocturne Op. 37 No. 2"],
  },
  {
    id: "F-major",
    tonic: "F",
    mode: "major",
    fifths: -1,
    relativeId: "D-minor",
    tier: 1,
    chopinWorks: ["Prelude Op. 28 No. 23", "Ballade No. 2 Op. 38"],
  },
  {
    id: "D-major",
    tonic: "D",
    mode: "major",
    fifths: 2,
    relativeId: "B-minor",
    tier: 2,
    chopinWorks: ["Prelude Op. 28 No. 5"],
  },
  {
    id: "Bb-major",
    tonic: "Bb",
    mode: "major",
    fifths: -2,
    relativeId: "G-minor",
    tier: 2,
    chopinWorks: ["Mazurka Op. 7 No. 1", "Prelude Op. 28 No. 21"],
  },
  {
    id: "A-major",
    tonic: "A",
    mode: "major",
    fifths: 3,
    relativeId: "F#-minor",
    tier: 2,
    chopinWorks: ["Prelude Op. 28 No. 7", "Polonaise Op. 40 No. 1"],
  },
  {
    id: "Eb-major",
    tonic: "Eb",
    mode: "major",
    fifths: -3,
    relativeId: "C-minor",
    tier: 2,
    chopinWorks: ["Nocturne Op. 9 No. 2", "Grande Valse Brillante Op. 18"],
  },
  {
    id: "E-major",
    tonic: "E",
    mode: "major",
    fifths: 4,
    relativeId: "C#-minor",
    tier: 3,
    chopinWorks: ["Etude Op. 10 No. 3", "Prelude Op. 28 No. 9"],
  },
  {
    id: "Ab-major",
    tonic: "Ab",
    mode: "major",
    fifths: -4,
    relativeId: "F-minor",
    tier: 3,
    chopinWorks: ["Ballade No. 3 Op. 47", "Polonaise Op. 53"],
  },
  {
    id: "B-major",
    tonic: "B",
    mode: "major",
    fifths: 5,
    relativeId: "G#-minor",
    tier: 4,
    chopinWorks: ["Nocturne Op. 32 No. 1", "Prelude Op. 28 No. 11"],
  },
  {
    id: "Db-major",
    tonic: "Db",
    mode: "major",
    fifths: -5,
    relativeId: "Bb-minor",
    tier: 4,
    chopinWorks: [
      "Prelude Op. 28 No. 15 (Raindrop)",
      "Nocturne Op. 27 No. 2",
      "Minute Waltz Op. 64 No. 1",
    ],
  },
  {
    id: "F#-major",
    tonic: "F#",
    mode: "major",
    fifths: 6,
    relativeId: "D#-minor",
    tier: 5,
    chopinWorks: ["Barcarolle Op. 60", "Nocturne Op. 15 No. 2", "Prelude Op. 28 No. 13"],
  },
  {
    id: "Gb-major",
    tonic: "Gb",
    mode: "major",
    fifths: -6,
    relativeId: "Eb-minor",
    tier: 5,
    chopinWorks: ["Etude Op. 10 No. 5 (Black Keys)", "Etude Op. 25 No. 9"],
  },
  {
    id: "C#-major",
    tonic: "C#",
    mode: "major",
    fifths: 7,
    relativeId: "A#-minor",
    tier: 5,
    chopinWorks: ["Fantasie-Impromptu Op. 66 (Middle Section Enharmonic)"],
  },
  {
    id: "Cb-major",
    tonic: "Cb",
    mode: "major",
    fifths: -7,
    relativeId: "Ab-minor",
    tier: 5,
    chopinWorks: ["Nocturne Op. 27 No. 2 (Modulatory Passage)"],
  },

  // Minor keys (Circle of Fifths)
  {
    id: "A-minor",
    tonic: "A",
    mode: "minor",
    fifths: 0,
    relativeId: "C-major",
    tier: 1,
    chopinWorks: ["Waltz in A minor B. 150", "Prelude Op. 28 No. 2"],
  },
  {
    id: "E-minor",
    tonic: "E",
    mode: "minor",
    fifths: 1,
    relativeId: "G-major",
    tier: 1,
    chopinWorks: ["Prelude Op. 28 No. 4", "Piano Concerto No. 1 Op. 11"],
  },
  {
    id: "D-minor",
    tonic: "D",
    mode: "minor",
    fifths: -1,
    relativeId: "F-major",
    tier: 1,
    chopinWorks: ["Prelude Op. 28 No. 24"],
  },
  {
    id: "B-minor",
    tonic: "B",
    mode: "minor",
    fifths: 2,
    relativeId: "D-major",
    tier: 2,
    chopinWorks: ["Prelude Op. 28 No. 6", "Sonata No. 3 Op. 58"],
  },
  {
    id: "G-minor",
    tonic: "G",
    mode: "minor",
    fifths: -2,
    relativeId: "Bb-major",
    tier: 2,
    chopinWorks: ["Ballade No. 1 Op. 23", "Nocturne Op. 15 No. 3"],
  },
  {
    id: "F#-minor",
    tonic: "F#",
    mode: "minor",
    fifths: 3,
    relativeId: "A-major",
    tier: 3,
    chopinWorks: ["Prelude Op. 28 No. 8", "Polonaise Op. 44"],
  },
  {
    id: "C-minor",
    tonic: "C",
    mode: "minor",
    fifths: -3,
    relativeId: "Eb-major",
    tier: 2,
    chopinWorks: [
      "Prelude Op. 28 No. 20",
      "Nocturne Op. 48 No. 1",
      "Revolutionary Etude Op. 10 No. 12",
    ],
  },
  {
    id: "C#-minor",
    tonic: "C#",
    mode: "minor",
    fifths: 4,
    relativeId: "E-major",
    tier: 3,
    chopinWorks: ["Nocturne Op. posth.", "Waltz Op. 64 No. 2", "Fantasie-Impromptu Op. 66"],
  },
  {
    id: "F-minor",
    tonic: "F",
    mode: "minor",
    fifths: -4,
    relativeId: "Ab-major",
    tier: 3,
    chopinWorks: ["Ballade No. 4 Op. 52", "Nocturne Op. 55 No. 1"],
  },
  {
    id: "G#-minor",
    tonic: "G#",
    mode: "minor",
    fifths: 5,
    relativeId: "B-major",
    tier: 4,
    chopinWorks: ["Prelude Op. 28 No. 12", "Etude Op. 25 No. 6"],
  },
  {
    id: "Bb-minor",
    tonic: "Bb",
    mode: "minor",
    fifths: -5,
    relativeId: "Db-major",
    tier: 4,
    chopinWorks: ["Nocturne Op. 9 No. 1", "Sonata No. 2 Op. 35", "Scherzo No. 2 Op. 31"],
  },
  {
    id: "D#-minor",
    tonic: "D#",
    mode: "minor",
    fifths: 6,
    relativeId: "F#-major",
    tier: 5,
    chopinWorks: ["Prelude Op. 28 No. 14 (Enharmonic)", "Etude Op. 10 No. 6 (Modulation)"],
  },
  {
    id: "Eb-minor",
    tonic: "Eb",
    mode: "minor",
    fifths: -6,
    relativeId: "Gb-major",
    tier: 5,
    chopinWorks: ["Prelude Op. 28 No. 14", "Etude Op. 10 No. 6", "Polonaise Op. 26 No. 2"],
  },
  {
    id: "A#-minor",
    tonic: "A#",
    mode: "minor",
    fifths: 7,
    relativeId: "C#-major",
    tier: 5,
    chopinWorks: ["Chromatic Modulation Study"],
  },
  {
    id: "Ab-minor",
    tonic: "Ab",
    mode: "minor",
    fifths: -7,
    relativeId: "Cb-major",
    tier: 5,
    chopinWorks: ["Mazurka Op. 50 No. 3 (Middle Modulation)"],
  },
];

function hydrateKeySignature(seed: KeySeed): KeySignature {
  let accidentalType: "none" | "sharp" | "flat" = "none";
  let accidentals: PitchLetter[] = [];
  if (seed.fifths > 0) {
    accidentalType = "sharp";
    accidentals = [...SHARP_ORDER.slice(0, seed.fifths)];
  } else if (seed.fifths < 0) {
    accidentalType = "flat";
    accidentals = [...FLAT_ORDER.slice(0, -seed.fifths)];
  }
  return KeySignatureSchema.parse({
    id: seed.id,
    tonic: seed.tonic,
    mode: seed.mode,
    fifths: seed.fifths,
    label: `${seed.tonic} ${seed.mode === "major" ? "Major" : "minor"}`,
    relativeId: seed.relativeId,
    accidentalType,
    accidentals,
    tier: seed.tier,
    scaleSpelled: buildScaleSpelling(seed.tonic, seed.fifths),
    chopinWorks: seed.chopinWorks,
  });
}

export const KEY_SIGNATURES: Record<KeySignatureId, KeySignature> = Object.fromEntries(
  KEY_SEEDS.map((seed) => [seed.id, hydrateKeySignature(seed)]),
) as Record<KeySignatureId, KeySignature>;

/** The canonical 24 major & minor keys (Chopin Preludes Op. 28 order & standard repertoire). */
export const CORE_24_KEY_IDS: readonly KeySignatureId[] = [
  "C-major",
  "A-minor",
  "G-major",
  "E-minor",
  "D-major",
  "B-minor",
  "A-major",
  "F#-minor",
  "E-major",
  "C#-minor",
  "B-major",
  "G#-minor",
  "F#-major",
  "Eb-minor",
  "Db-major",
  "Bb-minor",
  "Ab-major",
  "F-minor",
  "Eb-major",
  "C-minor",
  "Bb-major",
  "G-minor",
  "F-major",
  "D-minor",
];

export function getKeySignature(id: KeySignatureId): KeySignature {
  return KEY_SIGNATURES[id];
}

export function getKeysByTier(maxTier: number): KeySignature[] {
  return CORE_24_KEY_IDS.map((id) => KEY_SIGNATURES[id]).filter(
    (key) => (key.tier ?? 1) <= maxTier,
  );
}

function shiftAccidental(acc: Accidental, delta: number): Accidental {
  const next = ACCIDENTAL_TO_OFFSET[acc] + delta;
  const resolved = OFFSET_TO_ACCIDENTAL[next];
  if (resolved === undefined) {
    throw new Error(`Accidental overflow: ${acc} + ${delta}`);
  }
  return resolved;
}

/**
 * Spells a 7-note scale in the given key with accurate enharmonics
 * (e.g., F## in G# harmonic minor, E# in F# major/harmonic minor).
 */
export function spellScale(
  keyId: KeySignatureId,
  variant: "natural" | "harmonic" | "melodic" = "natural",
  startOctave = 4,
): Pitch[] {
  const key = getKeySignature(keyId);
  const spelledNames = key.scaleSpelled ?? buildScaleSpelling(key.tonic, key.fifths);
  const pitches: Pitch[] = [];
  let currentOctave = startOctave;
  let prevLetterIdx = -1;

  for (let i = 0; i < 7; i += 1) {
    const rawName = spelledNames[i] ?? "C";
    const parsed = splitPitchName(rawName);
    let accidental = parsed.accidental;

    const raiseForMinor =
      key.mode === "minor" &&
      ((variant === "harmonic" && i === 6) || (variant === "melodic" && (i === 5 || i === 6)));
    if (raiseForMinor) {
      accidental = shiftAccidental(accidental, 1);
    }

    const letterIdx = LETTER_TO_INDEX[parsed.letter];
    if (prevLetterIdx >= 0 && letterIdx < prevLetterIdx) {
      currentOctave += 1;
    }
    prevLetterIdx = letterIdx;
    pitches.push(createPitch(parsed.letter, accidental, currentOctave));
  }

  return pitches;
}

const CHROMATIC_SHARP_SPELLING: readonly { letter: PitchLetter; accidental: Accidental }[] = [
  { letter: "C", accidental: "" },
  { letter: "C", accidental: "#" },
  { letter: "D", accidental: "" },
  { letter: "D", accidental: "#" },
  { letter: "E", accidental: "" },
  { letter: "F", accidental: "" },
  { letter: "F", accidental: "#" },
  { letter: "G", accidental: "" },
  { letter: "G", accidental: "#" },
  { letter: "A", accidental: "" },
  { letter: "A", accidental: "#" },
  { letter: "B", accidental: "" },
];

const CHROMATIC_FLAT_SPELLING: readonly { letter: PitchLetter; accidental: Accidental }[] = [
  { letter: "C", accidental: "" },
  { letter: "D", accidental: "b" },
  { letter: "D", accidental: "" },
  { letter: "E", accidental: "b" },
  { letter: "E", accidental: "" },
  { letter: "F", accidental: "" },
  { letter: "G", accidental: "b" },
  { letter: "G", accidental: "" },
  { letter: "A", accidental: "b" },
  { letter: "A", accidental: "" },
  { letter: "B", accidental: "b" },
  { letter: "B", accidental: "" },
];

/**
 * Spells a MIDI note (21-108) with proper enharmonic spelling for `keyId`.
 * Respects diatonic pitches first (including E# in F# major, Cb in Gb/Cb major,
 * raised leading tone in minor keys such as F## in G# minor), then chooses
 * sharp vs flat chromatic spelling based on the key's circle-of-fifths side.
 */
export function midiToPitchInKey(midi: number, keyId: KeySignatureId): Pitch {
  const pc = ((midi % 12) + 12) % 12;
  const key = getKeySignature(keyId);

  // 1. Try diatonic scale degrees (and harmonic leading tone for minor keys)
  const naturalScale = spellScale(keyId, "natural", 4);
  const candidates =
    key.mode === "minor"
      ? [...naturalScale, spellScale(keyId, "harmonic", 4)[6]].filter(
          (p): p is Pitch => p !== undefined,
        )
      : naturalScale;

  for (const candidate of candidates) {
    const candidatePc = ((candidate.midi % 12) + 12) % 12;
    if (candidatePc === pc) {
      const naturalBase =
        LETTER_TO_SEMITONE[candidate.letter] + ACCIDENTAL_TO_OFFSET[candidate.accidental];
      const octave = Math.round((midi - naturalBase) / 12) - 1;
      return createPitch(candidate.letter, candidate.accidental, octave);
    }
  }

  // 2. Fall back to key-consistent chromatic spelling
  const useFlats = key.fifths < 0;
  const table = useFlats ? CHROMATIC_FLAT_SPELLING : CHROMATIC_SHARP_SPELLING;
  const entry = table[pc] ?? { letter: "C" as PitchLetter, accidental: "" as Accidental };
  const base = LETTER_TO_SEMITONE[entry.letter] + ACCIDENTAL_TO_OFFSET[entry.accidental];
  const octave = Math.round((midi - base) / 12) - 1;
  return createPitch(entry.letter, entry.accidental, octave);
}

// ---------------------------------------------------------------------------
// Interval & Visual Staff-Shape Engine (2nd through 10th)
// ---------------------------------------------------------------------------

interface IntervalSeed {
  id: string;
  number: number;
  quality: IntervalQuality;
  semitones: number;
  fullName: string;
  earReference: string;
}

const INTERVAL_SEEDS: readonly IntervalSeed[] = [
  {
    id: "P1",
    number: 1,
    quality: "P",
    semitones: 0,
    fullName: "Perfect Unison",
    earReference: "Repeated tone",
  },
  {
    id: "m2",
    number: 2,
    quality: "m",
    semitones: 1,
    fullName: "Minor 2nd",
    earReference: "Chopin Prelude Op. 28 No. 4 sigh / Jaws",
  },
  {
    id: "M2",
    number: 2,
    quality: "M",
    semitones: 2,
    fullName: "Major 2nd",
    earReference: "Scale step / Happy Birthday",
  },
  {
    id: "A2",
    number: 2,
    quality: "A",
    semitones: 3,
    fullName: "Augmented 2nd",
    earReference: "Harmonic minor 6 to #7 leap",
  },
  {
    id: "m3",
    number: 3,
    quality: "m",
    semitones: 3,
    fullName: "Minor 3rd",
    earReference: "Greensleeves / Brahms Lullaby",
  },
  {
    id: "M3",
    number: 3,
    quality: "M",
    semitones: 4,
    fullName: "Major 3rd",
    earReference: "Kumbaya / Major triad bottom",
  },
  {
    id: "P4",
    number: 4,
    quality: "P",
    semitones: 5,
    fullName: "Perfect 4th",
    earReference: "Here Comes the Bride / Chopin Prelude No. 7 pickup",
  },
  {
    id: "A4",
    number: 4,
    quality: "A",
    semitones: 6,
    fullName: "Augmented 4th",
    earReference: "Maria (West Side Story) / Dominant tritone",
  },
  {
    id: "d5",
    number: 5,
    quality: "d",
    semitones: 6,
    fullName: "Diminished 5th",
    earReference: "Tritone inward resolution",
  },
  {
    id: "P5",
    number: 5,
    quality: "P",
    semitones: 7,
    fullName: "Perfect 5th",
    earReference: "Star Wars / Twinkle Twinkle",
  },
  {
    id: "m6",
    number: 6,
    quality: "m",
    semitones: 8,
    fullName: "Minor 6th",
    earReference: "Chopin Waltz Op. 64 No. 2 / The Entertainer",
  },
  {
    id: "M6",
    number: 6,
    quality: "M",
    semitones: 9,
    fullName: "Major 6th",
    earReference: "Chopin Nocturne Op. 9 No. 2 opening leap!",
  },
  {
    id: "m7",
    number: 7,
    quality: "m",
    semitones: 10,
    fullName: "Minor 7th",
    earReference: "There's a Place for Us / Dominant 7th span",
  },
  {
    id: "M7",
    number: 7,
    quality: "M",
    semitones: 11,
    fullName: "Major 7th",
    earReference: "Take On Me / Major 7th shimmer",
  },
  {
    id: "P8",
    number: 8,
    quality: "P",
    semitones: 12,
    fullName: "Perfect Octave",
    earReference: "Somewhere Over the Rainbow",
  },
  {
    id: "m9",
    number: 9,
    quality: "m",
    semitones: 13,
    fullName: "Minor 9th",
    earReference: "Octave + half step tension",
  },
  {
    id: "M9",
    number: 9,
    quality: "M",
    semitones: 14,
    fullName: "Major 9th",
    earReference: "Chopin Nocturne lyric extension",
  },
  {
    id: "m10",
    number: 10,
    quality: "m",
    semitones: 15,
    fullName: "Minor 10th",
    earReference: "Chopin LH open rolled minor 10th",
  },
  {
    id: "M10",
    number: 10,
    quality: "M",
    semitones: 16,
    fullName: "Major 10th",
    earReference: "Chopin LH warm major 10th bass-to-tenor",
  },
];

export function classifyIntervalVisualShape(intervalNumber: number): IntervalVisualShape {
  if (intervalNumber === 1) return "same-position";
  if (intervalNumber === 2) return "adjacent-step";
  return intervalNumber % 2 === 1 ? "line-to-line-or-space-to-space" : "line-to-space";
}

export const INTERVALS: readonly Interval[] = INTERVAL_SEEDS.map((seed) =>
  IntervalSchema.parse({
    id: seed.id,
    number: seed.number,
    quality: seed.quality,
    semitones: seed.semitones,
    diatonicSteps: seed.number - 1,
    shortName: seed.id,
    fullName: seed.fullName,
    direction: "ascending",
    visualShape: classifyIntervalVisualShape(seed.number),
    earReference: seed.earReference,
  }),
);

export function getIntervalById(id: string): Interval | undefined {
  return INTERVALS.find((item) => item.id === id);
}

const MAJOR_OR_PERFECT_SEMITONES: Record<number, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 5,
  5: 7,
  6: 9,
  7: 11,
  8: 12,
  9: 14,
  10: 16,
};

function isPerfectClass(intervalNumber: number): boolean {
  const simple = ((intervalNumber - 1) % 7) + 1;
  return simple === 1 || simple === 4 || simple === 5;
}

function resolveQualityFromDiff(intervalNumber: number, diff: number): IntervalQuality {
  if (isPerfectClass(intervalNumber)) {
    if (diff === 0) return "P";
    if (diff > 0) return "A";
    return "d";
  }
  if (diff === 0) return "M";
  if (diff === -1) return "m";
  if (diff > 0) return "A";
  return "d";
}

/**
 * Identifies the exact spelled interval between two pitches (supports 1st–10th),
 * distinguishing enharmonic equivalents like A2 vs m3 and A4 vs d5.
 */
export function identifyInterval(
  from: Pitch,
  to: Pitch,
  mode: "melodic" | "harmonic" = "melodic",
): Interval {
  const stepDiff = pitchToDiatonicStep(to) - pitchToDiatonicStep(from);
  const semitoneDiff = to.midi - from.midi;

  let direction: IntervalDirection;
  if (mode === "harmonic") {
    direction = "harmonic";
  } else if (semitoneDiff < 0 || stepDiff < 0) {
    direction = "descending";
  } else {
    direction = "ascending";
  }

  const absSteps = Math.abs(stepDiff);
  const absSemitones = Math.abs(semitoneDiff);
  const intervalNumber = Math.min(10, absSteps + 1);
  const baseSemitones = MAJOR_OR_PERFECT_SEMITONES[intervalNumber] ?? 0;
  const quality = resolveQualityFromDiff(intervalNumber, absSemitones - baseSemitones);
  const id = `${quality}${intervalNumber}`;
  const catalogMatch = getIntervalById(id);

  return IntervalSchema.parse({
    id,
    number: intervalNumber,
    quality,
    semitones: Math.min(17, absSemitones),
    diatonicSteps: Math.min(9, absSteps),
    shortName: id,
    fullName: catalogMatch?.fullName ?? `${quality}${intervalNumber}`,
    direction,
    visualShape: classifyIntervalVisualShape(intervalNumber),
    earReference: catalogMatch?.earReference ?? "Relative interval span",
  });
}

function expectedSemitonesForInterval(number: number, quality: IntervalQuality): number {
  const base = MAJOR_OR_PERFECT_SEMITONES[number];
  if (base === undefined) {
    throw new Error(`Unsupported interval number: ${number}`);
  }
  if (isPerfectClass(number)) {
    if (quality === "P") return base;
    if (quality === "A") return base + 1;
    if (quality === "d") return base - 1;
    throw new Error(`Invalid quality "${quality}" for perfect interval ${number}`);
  }
  if (quality === "M") return base;
  if (quality === "m") return base - 1;
  if (quality === "A") return base + 1;
  if (quality === "d") return base - 2;
  throw new Error(`Invalid quality "${quality}" for imperfect interval ${number}`);
}

/**
 * Transposes a pitch by an exact diatonic interval + quality, preserving
 * theoretical spelling (including E#, Cb, F## when required).
 */
export function transposePitch(
  pitch: Pitch,
  intervalNumber: number,
  quality: IntervalQuality,
  direction: "ascending" | "descending" = "ascending",
): Pitch {
  const sign = direction === "ascending" ? 1 : -1;
  const targetDiatonicStep = pitchToDiatonicStep(pitch) + sign * (intervalNumber - 1);
  const targetOctave = Math.floor(targetDiatonicStep / 7);
  const targetLetterIndex = ((targetDiatonicStep % 7) + 7) % 7;
  const targetLetter = LETTERS[targetLetterIndex] ?? "C";
  const targetMidi = pitch.midi + sign * expectedSemitonesForInterval(intervalNumber, quality);
  const naturalMidi = (targetOctave + 1) * 12 + LETTER_TO_SEMITONE[targetLetter];
  const accOffset = targetMidi - naturalMidi;
  const accidental = OFFSET_TO_ACCIDENTAL[accOffset];

  if (accidental === undefined) {
    throw new Error(
      `Transposition ${formatPitch(pitch)} by ${quality}${intervalNumber} requires >2 accidentals`,
    );
  }
  return createPitch(targetLetter, accidental, targetOctave);
}

// ---------------------------------------------------------------------------
// Chord Builder & Chopin Harmonic Idiom Analyzer
// ---------------------------------------------------------------------------

interface ChordFormula {
  intervals: readonly { number: number; quality: IntervalQuality }[];
  suffix: string;
}

const CHORD_FORMULAS: Record<ChordQuality, ChordFormula> = {
  major: {
    intervals: [
      { number: 3, quality: "M" },
      { number: 5, quality: "P" },
    ],
    suffix: "",
  },
  minor: {
    intervals: [
      { number: 3, quality: "m" },
      { number: 5, quality: "P" },
    ],
    suffix: "m",
  },
  diminished: {
    intervals: [
      { number: 3, quality: "m" },
      { number: 5, quality: "d" },
    ],
    suffix: "dim",
  },
  augmented: {
    intervals: [
      { number: 3, quality: "M" },
      { number: 5, quality: "A" },
    ],
    suffix: "aug",
  },
  sus2: {
    intervals: [
      { number: 2, quality: "M" },
      { number: 5, quality: "P" },
    ],
    suffix: "sus2",
  },
  sus4: {
    intervals: [
      { number: 4, quality: "P" },
      { number: 5, quality: "P" },
    ],
    suffix: "sus4",
  },
  dom7: {
    intervals: [
      { number: 3, quality: "M" },
      { number: 5, quality: "P" },
      { number: 7, quality: "m" },
    ],
    suffix: "7",
  },
  maj7: {
    intervals: [
      { number: 3, quality: "M" },
      { number: 5, quality: "P" },
      { number: 7, quality: "M" },
    ],
    suffix: "maj7",
  },
  min7: {
    intervals: [
      { number: 3, quality: "m" },
      { number: 5, quality: "P" },
      { number: 7, quality: "m" },
    ],
    suffix: "m7",
  },
  halfDim7: {
    intervals: [
      { number: 3, quality: "m" },
      { number: 5, quality: "d" },
      { number: 7, quality: "m" },
    ],
    suffix: "ø7",
  },
  dim7: {
    intervals: [
      { number: 3, quality: "m" },
      { number: 5, quality: "d" },
      { number: 7, quality: "d" },
    ],
    suffix: "°7",
  },
  minMaj7: {
    intervals: [
      { number: 3, quality: "m" },
      { number: 5, quality: "P" },
      { number: 7, quality: "M" },
    ],
    suffix: "m(maj7)",
  },
  dom9: {
    intervals: [
      { number: 3, quality: "M" },
      { number: 5, quality: "P" },
      { number: 7, quality: "m" },
      { number: 9, quality: "M" },
    ],
    suffix: "9",
  },
  maj9: {
    intervals: [
      { number: 3, quality: "M" },
      { number: 5, quality: "P" },
      { number: 7, quality: "M" },
      { number: 9, quality: "M" },
    ],
    suffix: "maj9",
  },
  min9: {
    intervals: [
      { number: 3, quality: "m" },
      { number: 5, quality: "P" },
      { number: 7, quality: "m" },
      { number: 9, quality: "M" },
    ],
    suffix: "m9",
  },
  neapolitan6: {
    intervals: [
      { number: 3, quality: "M" },
      { number: 5, quality: "P" },
    ],
    suffix: " (bII6)",
  },
  itAug6: {
    intervals: [
      { number: 3, quality: "M" },
      { number: 6, quality: "A" },
    ],
    suffix: " It+6",
  },
  frAug6: {
    intervals: [
      { number: 3, quality: "M" },
      { number: 4, quality: "A" },
      { number: 6, quality: "A" },
    ],
    suffix: " Fr+6",
  },
  gerAug6: {
    intervals: [
      { number: 3, quality: "M" },
      { number: 5, quality: "P" },
      { number: 6, quality: "A" },
    ],
    suffix: " Ger+6",
  },
  secondaryDom: {
    intervals: [
      { number: 3, quality: "M" },
      { number: 5, quality: "P" },
      { number: 7, quality: "m" },
    ],
    suffix: "7 (V7/x)",
  },
};

export function buildChord(
  root: Pitch,
  quality: ChordQuality,
  inversion: ChordInversion = 0,
): ChordShape {
  const formula = CHORD_FORMULAS[quality];
  const basePitches: Pitch[] = [
    root,
    ...formula.intervals.map((iv) => transposePitch(root, iv.number, iv.quality, "ascending")),
  ];

  // Neapolitan bII6 defaults to 1st inversion if inversion === 0
  const effectiveInversion =
    quality === "neapolitan6" && inversion === 0 ? 1 : Math.min(inversion, basePitches.length - 1);

  const rotated: Pitch[] = [];
  for (let i = 0; i < basePitches.length; i += 1) {
    const source = basePitches[(i + effectiveInversion) % basePitches.length];
    if (!source) continue;
    const bumped =
      i + effectiveInversion >= basePitches.length
        ? createPitch(source.letter, source.accidental, source.octave + 1)
        : source;
    rotated.push(bumped);
  }

  const rootName = `${root.letter}${root.accidental}`;
  const bassNote = rotated[0];
  const slash =
    effectiveInversion > 0 && bassNote ? `/${bassNote.letter}${bassNote.accidental}` : "";

  return ChordShapeSchema.parse({
    root,
    quality,
    inversion: effectiveInversion as ChordInversion,
    pitches: rotated,
    symbol: `${rootName}${formula.suffix}${slash}`,
  });
}

/**
 * Builds a signature Chopin harmonic idiom in any of the 24 keys.
 */
export function buildChopinIdiom(
  keyId: KeySignatureId,
  idiom: "neapolitan6" | "itAug6" | "frAug6" | "gerAug6" | "V7/V" | "chromatic-mediant-bVI",
  baseOctave = 3,
): ChordShape {
  const scale = spellScale(keyId, "natural", baseOctave);
  const tonic = scale[0] ?? createPitch("C", "", baseOctave);

  if (idiom === "neapolitan6") {
    const flatTwo = transposePitch(tonic, 2, "m", "ascending");
    const shape = buildChord(flatTwo, "neapolitan6", 1);
    return ChordShapeSchema.parse({
      ...shape,
      romanNumeral: "bII6",
      chopinIdiomTag: "Neapolitan Sixth (Chopin Prelude Op. 28 No. 20 / Ballade No. 1)",
    });
  }

  if (idiom === "itAug6" || idiom === "frAug6" || idiom === "gerAug6") {
    const flatSix = transposePitch(tonic, 6, "m", "ascending");
    const shape = buildChord(flatSix, idiom, 0);
    const labelMap = { itAug6: "It+6", frAug6: "Fr+6", gerAug6: "Ger+6" } as const;
    return ChordShapeSchema.parse({
      ...shape,
      romanNumeral: labelMap[idiom],
      chopinIdiomTag: `Augmented 6th (${labelMap[idiom]}) resolving outward to V`,
    });
  }

  if (idiom === "V7/V") {
    const supertonic = transposePitch(tonic, 2, "M", "ascending");
    const shape = buildChord(supertonic, "dom7", 0);
    return ChordShapeSchema.parse({
      ...shape,
      quality: "secondaryDom",
      romanNumeral: "V7/V",
      chopinIdiomTag: "Secondary Dominant tonicizing V",
    });
  }

  // Chromatic mediant bVI (major triad on lowered 6th)
  const flatSix = transposePitch(tonic, 6, "m", "ascending");
  const shape = buildChord(flatSix, "major", 0);
  return ChordShapeSchema.parse({
    ...shape,
    romanNumeral: "bVI",
    chopinIdiomTag: "Romantic Chromatic Mediant (bVI)",
  });
}

/**
 * Analyzes a pitch collection in a given key to detect Chopin harmonic idioms
 * (Neapolitan bII6, It+6/Fr+6/Ger+6, V/V secondary dominants, chromatic mediants).
 */
export function analyzeChopinIdiom(
  pitches: readonly Pitch[],
  keyId: KeySignatureId,
): ChopinIdiomAnalysis {
  const scale = spellScale(keyId, "natural", 4);
  const tonicMidi = scale[0]?.midi ?? 60;
  const pcs = new Set(pitches.map((p) => (((p.midi - tonicMidi) % 12) + 12) % 12));
  const sorted = [...pitches].toSorted((a, b) => a.midi - b.midi);
  const bassPc = sorted[0] ? (((sorted[0].midi - tonicMidi) % 12) + 12) % 12 : 0;

  // Neapolitan bII6: pitch classes {1 (b2), 5 (4), 8 (b6)}, typically with 4 in bass
  if (pcs.has(1) && pcs.has(5) && pcs.has(8) && pcs.size === 3) {
    return ChopinIdiomAnalysisSchema.parse({
      idiom: "neapolitan-bII6",
      romanNumeral: bassPc === 5 ? "bII6" : "bII",
      explanation: "Major triad built on the lowered 2nd scale degree (b2-4-b6).",
      resolutionHint:
        "Resolves to V or cadential I6/4 → V, dropping b2 down a diminished 3rd to the leading tone.",
    });
  }

  // Augmented 6th family: contains b6 (8), 1 (0), and #4 (6)
  if (pcs.has(8) && pcs.has(0) && pcs.has(6)) {
    if (pcs.has(3)) {
      return ChopinIdiomAnalysisSchema.parse({
        idiom: "german-aug6",
        romanNumeral: "Ger+6",
        explanation: "German Augmented 6th (b6-1-b3-#4) — rich enharmonic twin of a dominant 7th.",
        resolutionHint:
          "Resolves outward (b6→5, #4→5) through cadential i6/4 to avoid parallel 5ths.",
      });
    }
    if (pcs.has(2)) {
      return ChopinIdiomAnalysisSchema.parse({
        idiom: "french-aug6",
        romanNumeral: "Fr+6",
        explanation: "French Augmented 6th (b6-1-2-#4) — whole-tone tritone bite.",
        resolutionHint: "Resolves outward (b6→5, #4→5) directly to V.",
      });
    }
    return ChopinIdiomAnalysisSchema.parse({
      idiom: "italian-aug6",
      romanNumeral: "It+6",
      explanation: "Italian Augmented 6th (b6-1-#4) — lean 3-note predominant.",
      resolutionHint:
        "Resolves outward by half-step in both outer voices onto the dominant octave.",
    });
  }

  // Secondary dominant V(7)/V: scale degrees 2 (2), #4 (6), 6 (9), optional 1 (0)
  if (pcs.has(2) && pcs.has(6) && pcs.has(9)) {
    return ChopinIdiomAnalysisSchema.parse({
      idiom: "secondary-dominant",
      romanNumeral: pcs.has(0) ? "V7/V" : "V/V",
      explanation: "Applied dominant chord with raised #4 pulling strongly toward the dominant V.",
      resolutionHint: "Raise #4 resolves up to 5; chordal 7th (1) resolves down to 7.",
    });
  }

  // Chromatic mediant bVI (8, 0, 3) in major or III (4, 8, 11) in major
  const key = getKeySignature(keyId);
  if (key.mode === "major" && pcs.has(8) && pcs.has(0) && pcs.has(3) && pcs.size === 3) {
    return ChopinIdiomAnalysisSchema.parse({
      idiom: "chromatic-mediant",
      romanNumeral: "bVI",
      explanation: "Borrowed major triad on b6 sharing the tonic pitch as a common-tone pivot.",
      resolutionHint: "Coloristic Romantic shift; often moves to V or returns smoothly to I.",
    });
  }

  return ChopinIdiomAnalysisSchema.parse({
    idiom: "standard-diatonic",
    romanNumeral: "diatonic",
    explanation: "Standard functional harmony anchored within the home key signature.",
    resolutionHint:
      "Read by harmonic shape (triad/7th inversion) and bass-to-soprano outer-voice counterpoint.",
  });
}

// ---------------------------------------------------------------------------
// Landmark Note System (Interval-from-Landmark Reading)
// ---------------------------------------------------------------------------

export const LANDMARK_NOTES: readonly LandmarkNote[] = [
  LandmarkNoteSchema.parse({
    id: "bass-c2",
    label: "Bass C2",
    clef: "bass",
    staffPosition: "Two ledger lines below bass staff",
    pitch: createPitch("C", "", 2),
  }),
  LandmarkNoteSchema.parse({
    id: "bass-c3",
    label: "Bass C3",
    clef: "bass",
    staffPosition: "2nd space of bass staff",
    pitch: createPitch("C", "", 3),
  }),
  LandmarkNoteSchema.parse({
    id: "bass-f3",
    label: "Bass F3",
    clef: "bass",
    staffPosition: "4th line (between the bass-clef dots)",
    pitch: createPitch("F", "", 3),
  }),
  LandmarkNoteSchema.parse({
    id: "middle-c4",
    label: "Middle C4",
    clef: "treble",
    staffPosition: "Center ledger line between treble and bass",
    pitch: createPitch("C", "", 4),
  }),
  LandmarkNoteSchema.parse({
    id: "treble-g4",
    label: "Treble G4",
    clef: "treble",
    staffPosition: "2nd line (circled by the G-clef curl)",
    pitch: createPitch("G", "", 4),
  }),
  LandmarkNoteSchema.parse({
    id: "treble-c5",
    label: "Treble C5",
    clef: "treble",
    staffPosition: "3rd space of treble staff",
    pitch: createPitch("C", "", 5),
  }),
  LandmarkNoteSchema.parse({
    id: "treble-c6",
    label: "Treble C6",
    clef: "treble",
    staffPosition: "Two ledger lines above treble staff",
    pitch: createPitch("C", "", 6),
  }),
];

function ordinalInterval(n: number): string {
  if (n === 1) return "unison";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

/**
 * Finds the nearest landmark note and describes the target pitch by relative
 * interval steps (never single-letter rote memorization).
 */
export function readRelativeToLandmark(pitch: Pitch, preferredClef?: Clef): LandmarkReading {
  const pool = preferredClef
    ? LANDMARK_NOTES.filter((lm) => lm.clef === preferredClef || lm.id === "middle-c4")
    : LANDMARK_NOTES;

  const targetStep = pitchToDiatonicStep(pitch);
  let best = pool[0] ?? LANDMARK_NOTES[0];
  if (!best) {
    throw new Error("LANDMARK_NOTES is empty");
  }
  let bestAbs = Math.abs(targetStep - pitchToDiatonicStep(best.pitch));

  for (const candidate of pool) {
    const abs = Math.abs(targetStep - pitchToDiatonicStep(candidate.pitch));
    if (abs < bestAbs) {
      best = candidate;
      bestAbs = abs;
    }
  }

  const signedSteps = targetStep - pitchToDiatonicStep(best.pitch);
  const intervalNumber = Math.abs(signedSteps) + 1;
  let direction: "same" | "up" | "down" = "same";
  if (signedSteps > 0) {
    direction = "up";
  } else if (signedSteps < 0) {
    direction = "down";
  }
  const directionWord = direction === "up" ? "above" : "below";
  const relativeLabel =
    direction === "same"
      ? `On ${best.label}`
      : `${ordinalInterval(intervalNumber)} ${directionWord} ${best.label}`;

  return LandmarkReadingSchema.parse({
    landmark: best,
    signedSteps,
    intervalNumber,
    direction,
    relativeLabel,
  });
}

// ---------------------------------------------------------------------------
// Tactile Hand-Frame Mapper (Blind Keyboard Awareness)
// ---------------------------------------------------------------------------

const BLACK_KEY_PCS = new Set([1, 3, 6, 8, 10]);

export function isBlackKeyMidi(midi: number): boolean {
  return BLACK_KEY_PCS.has(((midi % 12) + 12) % 12);
}

export function getBlackKeyCluster(midi: number): BlackKeyCluster {
  const pc = ((midi % 12) + 12) % 12;
  return pc <= 4 ? "two-black" : "three-black";
}

function describeTactileLandmark(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const cues: Record<number, string> = {
    0: "White key immediately left of the 2-black group",
    1: "Left black key of the 2-black group",
    2: "White key nestled inside the 2-black group",
    3: "Right black key of the 2-black group",
    4: "White key immediately right of the 2-black group",
    5: "White key immediately left of the 3-black group",
    6: "Left black key of the 3-black group",
    7: "White key between 1st & 2nd keys of the 3-black group",
    8: "Center black key of the 3-black group",
    9: "White key between 2nd & 3rd keys of the 3-black group",
    10: "Right black key of the 3-black group",
    11: "White key immediately right of the 3-black group",
  };
  return cues[pc] ?? "Feel the nearest black-key group";
}

function assignFingers(sortedPitches: readonly Pitch[], hand: Hand): FingerNumber[] {
  const count = sortedPitches.length;
  if (count === 1) return [hand === "RH" ? 1 : 5];
  if (count === 2) {
    const [low, high] = sortedPitches;
    if (!low || !high) return hand === "RH" ? [1, 5] : [5, 1];
    const span = high.midi - low.midi;
    if (span <= 2) return hand === "RH" ? [1, 2] : [2, 1];
    if (span <= 4) return hand === "RH" ? [1, 3] : [3, 1];
    return hand === "RH" ? [1, 5] : [5, 1];
  }
  if (count === 3) {
    return hand === "RH" ? [1, 3, 5] : [5, 3, 1];
  }
  if (count === 4) {
    return hand === "RH" ? [1, 2, 3, 5] : [5, 3, 2, 1];
  }
  return sortedPitches.map((_, idx) => {
    const clamped = Math.min(5, Math.max(1, idx + 1));
    const rhFinger = clamped as FingerNumber;
    const lhFinger = (6 - clamped) as FingerNumber;
    return hand === "RH" ? rhFinger : lhFinger;
  });
}

/**
 * Maps a pitch or chord to a 5-finger tactile hand frame with blind-keyboard
 * black-key cluster cues so learners navigate by touch instead of peeking.
 */
export function mapToTactileHandFrame(pitches: readonly Pitch[], hand: Hand): TactileHandFrame {
  if (pitches.length === 0) {
    throw new Error("mapToTactileHandFrame requires at least one pitch");
  }
  const sorted = [...pitches].toSorted((a, b) => a.midi - b.midi);
  const lowest = sorted[0];
  const highest = sorted.at(-1);
  if (!lowest || !highest) {
    throw new Error("mapToTactileHandFrame requires at least one pitch");
  }
  const spanSemitones = highest.midi - lowest.midi;
  const diatonicSpan = pitchToDiatonicStep(highest) - pitchToDiatonicStep(lowest);
  const fitsFiveFingerFrame = diatonicSpan <= 4 && spanSemitones <= 8;
  const fingers = assignFingers(sorted, hand);

  const keys: TactileKeyFeel[] = sorted.map((pitch, idx) => ({
    pitch,
    finger: fingers[idx] ?? 1,
    isBlackKey: isBlackKeyMidi(pitch.midi),
    cluster: getBlackKeyCluster(pitch.midi),
    landmarkCue: describeTactileLandmark(pitch.midi),
  }));

  const anchorPitch = hand === "RH" ? lowest : highest;
  const anchorCluster = getBlackKeyCluster(anchorPitch.midi);
  const clusterLabel = anchorCluster === "two-black" ? "2-black" : "3-black";
  const fingerLabel = hand === "RH" ? "RH thumb (1)" : "LH thumb (1)";
  const blindNavigationCue = fitsFiveFingerFrame
    ? `Anchor ${fingerLabel} via the ${clusterLabel} group (${describeTactileLandmark(anchorPitch.midi)}); keep all 5 fingers resting on keys.`
    : `Open hand span (${spanSemitones} semitones): locate ${clusterLabel} group first, then open smoothly without peeking.`;

  return TactileHandFrameSchema.parse({
    hand,
    anchorPitch,
    spanSemitones,
    fitsFiveFingerFrame,
    keys,
    blindNavigationCue,
  });
}
