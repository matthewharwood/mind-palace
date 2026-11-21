import {
  type Articulation,
  type Clef,
  type DynamicMarking,
  type FingerNumber,
  type KeySignatureId,
  type Measure,
  MeasureSchema,
  type NoteDuration,
  type NoteEvent,
  NoteEventSchema,
  type PedalMarking,
  type PolyrhythmRatio,
  type RhythmCell,
  RhythmCellSchema,
  type ScorePassage,
  ScorePassageSchema,
  type ScoreTier,
  type TimeSignature,
} from "./schemas";
import { formatPitch, getKeySignature, midiToPitchInKey, parsePitch, spellScale } from "./theory";

// ---------------------------------------------------------------------------
// Duration & Measure Beat Helpers
// ---------------------------------------------------------------------------

export const DURATION_TO_QUARTER_BEATS: Record<NoteDuration, number> = {
  whole: 4,
  "dotted-half": 3,
  half: 2,
  "dotted-quarter": 1.5,
  quarter: 1,
  "dotted-eighth": 0.75,
  eighth: 0.5,
  sixteenth: 0.25,
  "triplet-eighth": 1 / 3,
  "triplet-quarter": 2 / 3,
};

export function measureQuarterBeats(ts: TimeSignature): number {
  return (ts.numerator * 4) / ts.denominator;
}

interface EventInput {
  id: string;
  pitches: readonly string[];
  beatStart: number;
  duration: NoteDuration;
  staff: Clef;
  voice?: number;
  isRest?: boolean;
  tiedToNext?: boolean;
  articulation?: Articulation;
  dynamic?: DynamicMarking;
  finger?: FingerNumber;
  intervalLabel?: string;
  romanNumeral?: string;
  pedal?: PedalMarking;
}

function evt(input: EventInput): NoteEvent {
  return NoteEventSchema.parse({
    id: input.id,
    pitches: input.isRest ? [] : input.pitches.map(parsePitch),
    beatStart: input.beatStart,
    duration: input.duration,
    durationBeats: DURATION_TO_QUARTER_BEATS[input.duration],
    staff: input.staff,
    voice: input.voice ?? 1,
    isRest: input.isRest ?? false,
    tiedToNext: input.tiedToNext ?? false,
    articulation: input.articulation ?? "none",
    ...(input.dynamic !== undefined ? { dynamic: input.dynamic } : {}),
    ...(input.finger !== undefined ? { finger: input.finger } : {}),
    ...(input.intervalLabel !== undefined ? { intervalLabel: input.intervalLabel } : {}),
    ...(input.romanNumeral !== undefined ? { romanNumeral: input.romanNumeral } : {}),
    ...(input.pedal !== undefined ? { pedal: input.pedal } : {}),
  });
}

function buildLinearVoice(
  prefix: string,
  staff: Clef,
  items: readonly {
    pitches: readonly string[];
    duration: NoteDuration;
    finger?: FingerNumber;
    dynamic?: DynamicMarking;
    articulation?: Articulation;
    romanNumeral?: string;
    pedal?: PedalMarking;
    tiedToNext?: boolean;
    intervalLabel?: string;
  }[],
): NoteEvent[] {
  let cursor = 0;
  return items.map((item, idx) => {
    const isRest = item.pitches.length === 0;
    const event = evt({
      id: `${prefix}-${staff}-${idx + 1}`,
      pitches: item.pitches,
      beatStart: Math.round(cursor * 10000) / 10000,
      duration: item.duration,
      staff,
      isRest,
      ...(item.finger !== undefined ? { finger: item.finger } : {}),
      ...(item.dynamic !== undefined ? { dynamic: item.dynamic } : {}),
      ...(item.articulation !== undefined ? { articulation: item.articulation } : {}),
      ...(item.romanNumeral !== undefined ? { romanNumeral: item.romanNumeral } : {}),
      ...(item.pedal !== undefined ? { pedal: item.pedal } : {}),
      ...(item.tiedToNext !== undefined ? { tiedToNext: item.tiedToNext } : {}),
      ...(item.intervalLabel !== undefined ? { intervalLabel: item.intervalLabel } : {}),
    });
    cursor += DURATION_TO_QUARTER_BEATS[item.duration];
    return event;
  });
}

// ---------------------------------------------------------------------------
// Rhythm Cells Catalog (Method -> Polyrhythms)
// ---------------------------------------------------------------------------

export const RHYTHM_CELLS: readonly RhythmCell[] = [
  RhythmCellSchema.parse({
    id: "pulse-quarters-4-4",
    name: "Steady Quarter Pulse",
    timeSignature: { numerator: 4, denominator: 4 },
    totalQuarterBeats: 4,
    onsetBeats: [0, 1, 2, 3],
    polyrhythm: "none",
    tier: 1,
    description: "Internalize an unshakeable 4/4 quarter-note pulse before adding pitch.",
  }),
  RhythmCellSchema.parse({
    id: "waltz-oom-pah-3-4",
    name: "Waltz 3/4 Accent on Beat 1",
    timeSignature: { numerator: 3, denominator: 4 },
    totalQuarterBeats: 3,
    onsetBeats: [0, 1, 2],
    lhOnsetBeats: [0, 1, 2],
    polyrhythm: "none",
    tier: 1,
    description: "Warm bass downbeat followed by two feather-light chord taps.",
  }),
  RhythmCellSchema.parse({
    id: "dotted-quarter-eighth",
    name: "Dotted Quarter + Eighth Flow",
    timeSignature: { numerator: 4, denominator: 4 },
    totalQuarterBeats: 4,
    onsetBeats: [0, 1.5, 2, 3.5],
    polyrhythm: "none",
    tier: 2,
    description: "Subdivide in eighths mentally so the 'and of 2' lands dead-center.",
  }),
  RhythmCellSchema.parse({
    id: "compound-6-8-lilt",
    name: "Compound 6/8 Barcarolle Lilt",
    timeSignature: { numerator: 6, denominator: 8 },
    totalQuarterBeats: 3,
    onsetBeats: [0, 0.5, 1, 1.5, 2, 2.5],
    lhOnsetBeats: [0, 1.5],
    polyrhythm: "none",
    tier: 2,
    description: "Feel two broad dotted-quarter pulses subdivided into flowing triplets.",
  }),
  RhythmCellSchema.parse({
    id: "mazurka-dotted-snap",
    name: "Chopin Mazurka Dotted-Eighth Snap",
    timeSignature: { numerator: 3, denominator: 4 },
    totalQuarterBeats: 3,
    onsetBeats: [0, 0.75, 1, 2],
    lhOnsetBeats: [0, 1, 2],
    polyrhythm: "none",
    tier: 3,
    description: "Crisp dotted-eighth + sixteenth on beat 1 with subtle lift on beat 2.",
  }),
  RhythmCellSchema.parse({
    id: "chopin-2-against-3",
    name: "Chopin 2:3 Cross-Rhythm (Nocturne)",
    timeSignature: { numerator: 4, denominator: 4 },
    totalQuarterBeats: 2,
    onsetBeats: [0, 2 / 3, 4 / 3],
    lhOnsetBeats: [0, 1],
    polyrhythm: "2:3",
    tier: 4,
    description: "Say 'Nice cup of tea' — RH triplets glide independently over steady LH duplets.",
  }),
  RhythmCellSchema.parse({
    id: "chopin-3-against-4",
    name: "Chopin 3:4 Cross-Rhythm (Fantasie-Impromptu)",
    timeSignature: { numerator: 4, denominator: 4 },
    totalQuarterBeats: 1,
    onsetBeats: [0, 0.25, 0.5, 0.75],
    lhOnsetBeats: [0, 1 / 3, 2 / 3],
    polyrhythm: "3:4",
    tier: 5,
    description:
      "Say 'Pass the god-damn but-ter' — four RH sixteenths floating across three LH triplets.",
  }),
  RhythmCellSchema.parse({
    id: "nocturne-12-8-bel-canto",
    name: "Nocturne 12/8 Bel-Canto Accompaniment",
    timeSignature: { numerator: 12, denominator: 8 },
    totalQuarterBeats: 6,
    onsetBeats: [0, 1.5, 3, 4.5],
    lhOnsetBeats: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5],
    polyrhythm: "none",
    tier: 4,
    description: "Four expansive compound beats supporting cantabile right-hand melody.",
  }),
];

// ---------------------------------------------------------------------------
// Curated 5-Tier Score Library (Method -> Hymnal -> Classical -> Romantic -> Chopin)
// ---------------------------------------------------------------------------

const TS_4_4: TimeSignature = { numerator: 4, denominator: 4 };
const TS_3_4: TimeSignature = { numerator: 3, denominator: 4 };
const TS_12_8: TimeSignature = { numerator: 12, denominator: 8 };

const METHOD_C_LANDMARKS: ScorePassage = ScorePassageSchema.parse({
  id: "method-c-landmarks-walk",
  title: "Landmark 5-Finger Walk",
  composer: "Mind Palace Method",
  tier: "method-book",
  difficulty: 1,
  dayUnlock: 1,
  keySignature: getKeySignature("C-major"),
  timeSignature: TS_4_4,
  tempoBpm: 72,
  polyrhythm: "none",
  harmonicSummary:
    "C major 5-finger position (I – V6 – I) anchored on Middle C4, Treble G4, and Bass F3.",
  tags: ["landmarks", "5-finger", "steps", "tier-1"],
  previewNotes: {
    roadmap: "4 bars in C major; both hands stay inside a C-to-G 5-finger frame without moving.",
    hardestBarNumber: 3,
    landmarkSummary: "Starts on Middle C4 (RH) and Bass C3 (LH), peaking at Treble G4.",
    keyCue: "No sharps or flats — feel the 2-black group to anchor both thumbs on C.",
  },
  measures: [
    MeasureSchema.parse({
      number: 1,
      harmonyLabel: "I",
      landmarkNote: "Middle C4",
      handFrame: { rh: "C4–G4 (1–5)", lh: "C3–G3 (5–1)" },
      events: [
        ...buildLinearVoice("mc1", "treble", [
          { pitches: ["C4"], duration: "quarter", finger: 1, dynamic: "mp", intervalLabel: "C4" },
          { pitches: ["D4"], duration: "quarter", finger: 2, intervalLabel: "+2nd" },
          { pitches: ["E4"], duration: "quarter", finger: 3, intervalLabel: "+2nd" },
          { pitches: ["F4"], duration: "quarter", finger: 4, intervalLabel: "+2nd" },
        ]),
        ...buildLinearVoice("mc1", "bass", [
          { pitches: ["C3", "G3"], duration: "half", romanNumeral: "I" },
          { pitches: ["C3", "G3"], duration: "half" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 2,
      harmonyLabel: "I",
      landmarkNote: "Treble G4",
      events: [
        ...buildLinearVoice("mc2", "treble", [
          { pitches: ["G4"], duration: "half", finger: 5, intervalLabel: "G4" },
          { pitches: ["E4"], duration: "quarter", finger: 3, intervalLabel: "-3rd" },
          { pitches: ["C4"], duration: "quarter", finger: 1, intervalLabel: "-3rd" },
        ]),
        ...buildLinearVoice("mc2", "bass", [
          { pitches: ["C3", "E3", "G3"], duration: "whole", romanNumeral: "I" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 3,
      harmonyLabel: "V6",
      isHardestBar: true,
      landmarkNote: "Bass F3",
      events: [
        ...buildLinearVoice("mc3", "treble", [
          { pitches: ["D4"], duration: "quarter", finger: 2, intervalLabel: "+2nd" },
          { pitches: ["F4"], duration: "quarter", finger: 4, intervalLabel: "+3rd" },
          { pitches: ["G4"], duration: "quarter", finger: 5, intervalLabel: "+2nd" },
          { pitches: ["F4"], duration: "quarter", finger: 4, intervalLabel: "-2nd" },
        ]),
        ...buildLinearVoice("mc3", "bass", [
          { pitches: ["B2", "G3"], duration: "half", romanNumeral: "V6" },
          { pitches: ["D3", "F3", "G3"], duration: "half", romanNumeral: "V4/3" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 4,
      harmonyLabel: "I",
      events: [
        ...buildLinearVoice("mc4", "treble", [
          { pitches: ["E4"], duration: "half", finger: 3, intervalLabel: "-2nd" },
          { pitches: ["C4"], duration: "half", finger: 1, intervalLabel: "-3rd" },
        ]),
        ...buildLinearVoice("mc4", "bass", [
          { pitches: ["C3", "E3", "G3"], duration: "whole", romanNumeral: "I" },
        ]),
      ],
    }),
  ],
});

const METHOD_G_THIRDS: ScorePassage = ScorePassageSchema.parse({
  id: "method-g-parallel-thirds",
  title: "G Major Waltz in 3rds",
  composer: "Mind Palace Method",
  tier: "method-book",
  difficulty: 2,
  dayUnlock: 3,
  keySignature: getKeySignature("G-major"),
  timeSignature: TS_3_4,
  tempoBpm: 84,
  polyrhythm: "none",
  harmonicSummary: "G major waltz focusing on line-to-line 3rds and F# tactile awareness.",
  tags: ["3rds", "waltz", "G-major", "tier-1"],
  previewNotes: {
    roadmap:
      "4-bar waltz in G major; watch the single F# in bar 3 (left black key of 3-black group).",
    hardestBarNumber: 3,
    landmarkSummary: "RH begins on Treble G4; LH anchors on Bass G2/D3.",
    keyCue: "One sharp (F#) — rest LH thumb near D3 and feel F# with finger 2.",
  },
  measures: [
    MeasureSchema.parse({
      number: 1,
      harmonyLabel: "I",
      landmarkNote: "Treble G4",
      handFrame: { rh: "G4–D5 (1–5)", lh: "G2–D3 (5–1)" },
      events: [
        ...buildLinearVoice("mg1", "treble", [
          { pitches: ["G4"], duration: "quarter", finger: 1, dynamic: "mf" },
          { pitches: ["B4"], duration: "quarter", finger: 3, intervalLabel: "+3rd" },
          { pitches: ["D5"], duration: "quarter", finger: 5, intervalLabel: "+3rd" },
        ]),
        ...buildLinearVoice("mg1", "bass", [
          { pitches: ["G2"], duration: "quarter", romanNumeral: "I" },
          { pitches: ["B2", "D3"], duration: "quarter" },
          { pitches: ["B2", "D3"], duration: "quarter" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 2,
      harmonyLabel: "IV",
      events: [
        ...buildLinearVoice("mg2", "treble", [
          { pitches: ["C5"], duration: "half", finger: 4, intervalLabel: "-2nd" },
          { pitches: ["A4"], duration: "quarter", finger: 2, intervalLabel: "-3rd" },
        ]),
        ...buildLinearVoice("mg2", "bass", [
          { pitches: ["C3"], duration: "quarter", romanNumeral: "IV" },
          { pitches: ["E3", "G3"], duration: "quarter" },
          { pitches: ["E3", "G3"], duration: "quarter" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 3,
      harmonyLabel: "V7",
      isHardestBar: true,
      events: [
        ...buildLinearVoice("mg3", "treble", [
          { pitches: ["F#4"], duration: "quarter", finger: 2, intervalLabel: "-3rd" },
          { pitches: ["A4"], duration: "quarter", finger: 3, intervalLabel: "+3rd" },
          { pitches: ["C5"], duration: "quarter", finger: 5, intervalLabel: "+3rd" },
        ]),
        ...buildLinearVoice("mg3", "bass", [
          { pitches: ["D3"], duration: "quarter", romanNumeral: "V7" },
          { pitches: ["F#3", "C4"], duration: "half" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 4,
      harmonyLabel: "I",
      events: [
        ...buildLinearVoice("mg4", "treble", [
          { pitches: ["B4"], duration: "half", finger: 3, intervalLabel: "-2nd" },
          { pitches: ["G4"], duration: "quarter", finger: 1, intervalLabel: "-3rd" },
        ]),
        ...buildLinearVoice("mg4", "bass", [
          { pitches: ["G2", "D3", "G3"], duration: "dotted-half", romanNumeral: "I" },
        ]),
      ],
    }),
  ],
});

const METHOD_F_BLIND_FRAME: ScorePassage = ScorePassageSchema.parse({
  id: "method-f-blind-frame",
  title: "F Major Blind-Keyboard Frame",
  composer: "Mind Palace Method",
  tier: "method-book",
  difficulty: 2,
  dayUnlock: 5,
  keySignature: getKeySignature("F-major"),
  timeSignature: TS_4_4,
  tempoBpm: 76,
  polyrhythm: "none",
  harmonicSummary: "F major 5-finger frame placing RH finger 4 naturally on the Bb black key.",
  tags: ["tactile", "blind-keyboard", "F-major", "tier-1"],
  previewNotes: {
    roadmap:
      "4 bars in F major; never look down — let finger 4 feel the rightmost black key of the 3-black group (Bb4).",
    hardestBarNumber: 2,
    landmarkSummary: "LH anchored on Bass F3; RH on F4–C5.",
    keyCue: "One flat (Bb) — your built-in tactile anchor.",
  },
  measures: [
    MeasureSchema.parse({
      number: 1,
      harmonyLabel: "I",
      landmarkNote: "Bass F3",
      handFrame: { rh: "F4–C5 (1–5)", lh: "F2–C3 (5–1)" },
      events: [
        ...buildLinearVoice("mf1", "treble", [
          { pitches: ["F4"], duration: "quarter", finger: 1, dynamic: "mp" },
          { pitches: ["A4"], duration: "quarter", finger: 3, intervalLabel: "+3rd" },
          { pitches: ["C5"], duration: "half", finger: 5, intervalLabel: "+3rd" },
        ]),
        ...buildLinearVoice("mf1", "bass", [
          { pitches: ["F3", "A3"], duration: "half", romanNumeral: "I" },
          { pitches: ["F3", "C4"], duration: "half" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 2,
      harmonyLabel: "IV",
      isHardestBar: true,
      events: [
        ...buildLinearVoice("mf2", "treble", [
          { pitches: ["Bb4"], duration: "dotted-quarter", finger: 4, intervalLabel: "-2nd" },
          { pitches: ["A4"], duration: "eighth", finger: 3 },
          { pitches: ["G4"], duration: "half", finger: 2 },
        ]),
        ...buildLinearVoice("mf2", "bass", [
          { pitches: ["Bb2", "F3"], duration: "half", romanNumeral: "IV" },
          { pitches: ["C3", "E3", "Bb3"], duration: "half", romanNumeral: "V7" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 3,
      harmonyLabel: "V7",
      events: [
        ...buildLinearVoice("mf3", "treble", [
          { pitches: ["A4"], duration: "quarter", finger: 3 },
          { pitches: ["Bb4"], duration: "quarter", finger: 4 },
          { pitches: ["G4"], duration: "quarter", finger: 2 },
          { pitches: ["E4"], duration: "quarter", finger: 1 },
        ]),
        ...buildLinearVoice("mf3", "bass", [
          { pitches: ["C3", "G3"], duration: "half", romanNumeral: "V" },
          { pitches: ["C3", "Bb3"], duration: "half", romanNumeral: "V7" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 4,
      harmonyLabel: "I",
      events: [
        ...buildLinearVoice("mf4", "treble", [{ pitches: ["F4", "A4", "C5"], duration: "whole" }]),
        ...buildLinearVoice("mf4", "bass", [
          { pitches: ["F2", "C3", "F3"], duration: "whole", romanNumeral: "I" },
        ]),
      ],
    }),
  ],
});

const HYMNAL_G_CHORALE: ScorePassage = ScorePassageSchema.parse({
  id: "hymnal-g-old-hundredth",
  title: "4-Part Hymnal Chorale in G",
  composer: "Traditional / Bourgeois Style",
  tier: "hymnal-chorale",
  difficulty: 3,
  dayUnlock: 6,
  keySignature: getKeySignature("G-major"),
  timeSignature: TS_4_4,
  tempoBpm: 72,
  polyrhythm: "none",
  harmonicSummary: "Classic SATB hymnal harmonization (I – V – vi – iii – IV – I6 – V7 – I).",
  tags: ["4-part", "hymnal", "SATB", "chord-shapes", "tier-2"],
  previewNotes: {
    roadmap:
      "4 bars of pure 4-part chordal sight-reading — read vertical chord shapes from the bass up!",
    hardestBarNumber: 3,
    landmarkSummary: "Soprano centers on Treble G4–B4; Bass walks G2–D3.",
    keyCue: "G major (1 sharp: F#). Keep inner voices smooth by step.",
  },
  measures: [
    MeasureSchema.parse({
      number: 1,
      harmonyLabel: "I – V",
      events: [
        ...buildLinearVoice("hg1", "treble", [
          { pitches: ["D4", "G4"], duration: "half", dynamic: "mf" },
          { pitches: ["D4", "F#4"], duration: "half" },
        ]),
        ...buildLinearVoice("hg1", "bass", [
          { pitches: ["G2", "B3"], duration: "half", romanNumeral: "I" },
          { pitches: ["D3", "A3"], duration: "half", romanNumeral: "V" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 2,
      harmonyLabel: "vi – iii",
      events: [
        ...buildLinearVoice("hg2", "treble", [
          { pitches: ["E4", "G4"], duration: "half" },
          { pitches: ["D4", "F#4"], duration: "half" },
        ]),
        ...buildLinearVoice("hg2", "bass", [
          { pitches: ["E3", "B3"], duration: "half", romanNumeral: "vi" },
          { pitches: ["B2", "B3"], duration: "half", romanNumeral: "iii" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 3,
      harmonyLabel: "IV – I6 – V7",
      isHardestBar: true,
      events: [
        ...buildLinearVoice("hg3", "treble", [
          { pitches: ["E4", "G4"], duration: "quarter" },
          { pitches: ["D4", "G4"], duration: "quarter" },
          { pitches: ["C4", "F#4"], duration: "half" },
        ]),
        ...buildLinearVoice("hg3", "bass", [
          { pitches: ["C3", "C4"], duration: "quarter", romanNumeral: "IV" },
          { pitches: ["B2", "B3"], duration: "quarter", romanNumeral: "I6" },
          { pitches: ["D3", "A3"], duration: "half", romanNumeral: "V7" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 4,
      harmonyLabel: "I",
      events: [
        ...buildLinearVoice("hg4", "treble", [
          { pitches: ["D4", "G4"], duration: "whole", articulation: "fermata" },
        ]),
        ...buildLinearVoice("hg4", "bass", [
          { pitches: ["G2", "B3"], duration: "whole", romanNumeral: "I", articulation: "fermata" },
        ]),
      ],
    }),
  ],
});

const HYMNAL_EM_CHORALE: ScorePassage = ScorePassageSchema.parse({
  id: "hymnal-em-bach-chorale",
  title: "4-Part Minor Chorale in E Minor",
  composer: "Bach Chorale Style",
  tier: "hymnal-chorale",
  difficulty: 4,
  dayUnlock: 9,
  keySignature: getKeySignature("E-minor"),
  timeSignature: TS_4_4,
  tempoBpm: 68,
  polyrhythm: "none",
  harmonicSummary:
    "Minor-mode SATB voice leading featuring harmonic leading tone D# and ii°6 – V7 – i.",
  tags: ["4-part", "chorale", "minor", "D#-leading-tone", "tier-2"],
  previewNotes: {
    roadmap: "4 bars in E minor; spot the raised D#4 leading tone in bars 1 and 3 before playing.",
    hardestBarNumber: 3,
    landmarkSummary: "Soprano opens on B4 (3rd above Treble G4); Bass opens on E3.",
    keyCue: "E minor (1 sharp: F# + accidental D# on dominant chords).",
  },
  measures: [
    MeasureSchema.parse({
      number: 1,
      harmonyLabel: "i – V6",
      events: [
        ...buildLinearVoice("he1", "treble", [
          { pitches: ["G4", "B4"], duration: "half", dynamic: "mf" },
          { pitches: ["F#4", "B4"], duration: "half" },
        ]),
        ...buildLinearVoice("he1", "bass", [
          { pitches: ["E3", "B3"], duration: "half", romanNumeral: "i" },
          { pitches: ["D#3", "B3"], duration: "half", romanNumeral: "V6" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 2,
      harmonyLabel: "i – iv",
      events: [
        ...buildLinearVoice("he2", "treble", [
          { pitches: ["G4", "B4"], duration: "half" },
          { pitches: ["E4", "A4"], duration: "half" },
        ]),
        ...buildLinearVoice("he2", "bass", [
          { pitches: ["E3", "E4"], duration: "half", romanNumeral: "i" },
          { pitches: ["A2", "C4"], duration: "half", romanNumeral: "iv" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 3,
      harmonyLabel: "ii°6 – V7",
      isHardestBar: true,
      events: [
        ...buildLinearVoice("he3", "treble", [
          { pitches: ["F#4", "A4"], duration: "half" },
          { pitches: ["D#4", "F#4"], duration: "half" },
        ]),
        ...buildLinearVoice("he3", "bass", [
          { pitches: ["A2", "C4"], duration: "half", romanNumeral: "ii°6" },
          { pitches: ["B2", "A3"], duration: "half", romanNumeral: "V7" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 4,
      harmonyLabel: "i",
      events: [
        ...buildLinearVoice("he4", "treble", [
          { pitches: ["E4", "G4"], duration: "whole", articulation: "fermata" },
        ]),
        ...buildLinearVoice("he4", "bass", [
          { pitches: ["E2", "B3"], duration: "whole", romanNumeral: "i", articulation: "fermata" },
        ]),
      ],
    }),
  ],
});

const CLASSICAL_D_MINUET: ScorePassage = ScorePassageSchema.parse({
  id: "classical-d-alberti-minuet",
  title: "Galant Minuet in D Major",
  composer: "Classical Miniature Study",
  tier: "classical-miniature",
  difficulty: 5,
  dayUnlock: 11,
  keySignature: getKeySignature("D-major"),
  timeSignature: TS_3_4,
  tempoBpm: 104,
  polyrhythm: "none",
  harmonicSummary: "Mozartian galant phrase with broken-chord LH accompaniment and dotted melody.",
  tags: ["classical", "minuet", "D-major", "broken-chords", "tier-3"],
  previewNotes: {
    roadmap: "4-bar symmetrical antecedent phrase in D major; LH outlines I – V6/5 – I – V.",
    hardestBarNumber: 2,
    landmarkSummary: "RH opens on F#4–A4–D5 triad; LH walks D3–C#3–D3.",
    keyCue: "D major (2 sharps: F#, C#).",
  },
  measures: [
    MeasureSchema.parse({
      number: 1,
      harmonyLabel: "I",
      events: [
        ...buildLinearVoice("cd1", "treble", [
          { pitches: ["D5"], duration: "dotted-quarter", finger: 5, dynamic: "mf" },
          { pitches: ["A4"], duration: "eighth", finger: 2 },
          { pitches: ["F#4"], duration: "quarter", finger: 1, articulation: "staccato" },
        ]),
        ...buildLinearVoice("cd1", "bass", [
          { pitches: ["D3"], duration: "eighth", romanNumeral: "I" },
          { pitches: ["A3"], duration: "eighth" },
          { pitches: ["F#3"], duration: "eighth" },
          { pitches: ["A3"], duration: "eighth" },
          { pitches: ["D3"], duration: "eighth" },
          { pitches: ["A3"], duration: "eighth" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 2,
      harmonyLabel: "V6/5",
      isHardestBar: true,
      events: [
        ...buildLinearVoice("cd2", "treble", [
          { pitches: ["G4"], duration: "quarter", finger: 2 },
          { pitches: ["E4"], duration: "quarter", finger: 1 },
          { pitches: ["A4"], duration: "quarter", finger: 3 },
        ]),
        ...buildLinearVoice("cd2", "bass", [
          { pitches: ["C#3"], duration: "eighth", romanNumeral: "V6/5" },
          { pitches: ["A3"], duration: "eighth" },
          { pitches: ["G3"], duration: "eighth" },
          { pitches: ["A3"], duration: "eighth" },
          { pitches: ["C#3"], duration: "eighth" },
          { pitches: ["A3"], duration: "eighth" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 3,
      harmonyLabel: "I6 – IV",
      events: [
        ...buildLinearVoice("cd3", "treble", [
          { pitches: ["F#4"], duration: "quarter", finger: 1 },
          { pitches: ["A4"], duration: "quarter", finger: 3 },
          { pitches: ["B4"], duration: "quarter", finger: 4 },
        ]),
        ...buildLinearVoice("cd3", "bass", [
          { pitches: ["D3"], duration: "half", romanNumeral: "I" },
          { pitches: ["G2", "G3"], duration: "quarter", romanNumeral: "IV" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 4,
      harmonyLabel: "V",
      events: [
        ...buildLinearVoice("cd4", "treble", [
          { pitches: ["A4"], duration: "half", finger: 3 },
          { pitches: [], duration: "quarter" },
        ]),
        ...buildLinearVoice("cd4", "bass", [
          { pitches: ["A2", "E3", "A3"], duration: "half", romanNumeral: "V" },
          { pitches: [], duration: "quarter" },
        ]),
      ],
    }),
  ],
});

const ROMANTIC_DB_POLYRHYTHM: ScorePassage = ScorePassageSchema.parse({
  id: "romantic-db-polyrhythm-nocturne",
  title: "Db Major 2:3 Nocturne Study",
  composer: "Mind Palace Romantic Etude",
  tier: "romantic-study",
  difficulty: 7,
  dayUnlock: 18,
  keySignature: getKeySignature("Db-major"),
  timeSignature: TS_4_4,
  tempoBpm: 66,
  polyrhythm: "2:3",
  harmonicSummary:
    "Db major black-key comfort with singing RH triplets over steady LH duplets (2:3).",
  tags: ["polyrhythm-2:3", "Db-major", "nocturne", "5-flats", "tier-4"],
  previewNotes: {
    roadmap:
      "4 bars in Db major (5 flats = almost all black keys!). Isolate the 2:3 cross-rhythm in bar 2 first.",
    hardestBarNumber: 2,
    landmarkSummary: "LH anchors on Db2/Ab2; RH sings from F4–Db5.",
    keyCue: "Db major (Bb, Eb, Ab, Db, Gb) — Chopin's favorite ergonomic key for the hand.",
  },
  measures: [
    MeasureSchema.parse({
      number: 1,
      harmonyLabel: "I",
      events: [
        ...buildLinearVoice("rdb1", "treble", [
          { pitches: ["F4"], duration: "half", dynamic: "p", finger: 2 },
          { pitches: ["Ab4"], duration: "quarter", finger: 3 },
          { pitches: ["Db5"], duration: "quarter", finger: 5 },
        ]),
        ...buildLinearVoice("rdb1", "bass", [
          { pitches: ["Db2"], duration: "quarter", romanNumeral: "I", pedal: "down" },
          { pitches: ["Ab2", "Db3", "F3"], duration: "quarter" },
          { pitches: ["Ab2", "Db3", "F3"], duration: "quarter" },
          { pitches: ["Ab2", "Db3", "F3"], duration: "quarter" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 2,
      harmonyLabel: "vi – IV",
      isHardestBar: true,
      events: [
        ...buildLinearVoice("rdb2", "treble", [
          { pitches: ["C5"], duration: "triplet-quarter", finger: 4 },
          { pitches: ["Bb4"], duration: "triplet-quarter", finger: 3 },
          { pitches: ["Ab4"], duration: "triplet-quarter", finger: 2 },
          { pitches: ["Gb4"], duration: "half", finger: 2 },
        ]),
        ...buildLinearVoice("rdb2", "bass", [
          { pitches: ["Bb2"], duration: "quarter", romanNumeral: "vi", pedal: "change" },
          { pitches: ["F3", "Bb3"], duration: "quarter" },
          { pitches: ["Gb2"], duration: "quarter", romanNumeral: "IV", pedal: "change" },
          { pitches: ["Db3", "Gb3", "Bb3"], duration: "quarter" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 3,
      harmonyLabel: "V7",
      events: [
        ...buildLinearVoice("rdb3", "treble", [
          { pitches: ["F4"], duration: "quarter", finger: 1 },
          { pitches: ["Gb4"], duration: "quarter", finger: 2 },
          { pitches: ["Ab4"], duration: "quarter", finger: 3 },
          { pitches: ["C5"], duration: "quarter", finger: 5 },
        ]),
        ...buildLinearVoice("rdb3", "bass", [
          { pitches: ["Ab2"], duration: "quarter", romanNumeral: "V7", pedal: "change" },
          { pitches: ["Eb3", "Gb3", "C4"], duration: "dotted-half" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 4,
      harmonyLabel: "I",
      events: [
        ...buildLinearVoice("rdb4", "treble", [{ pitches: ["Db5"], duration: "whole", finger: 5 }]),
        ...buildLinearVoice("rdb4", "bass", [
          {
            pitches: ["Db2", "Ab2", "Db3", "F3"],
            duration: "whole",
            romanNumeral: "I",
            pedal: "change",
          },
        ]),
      ],
    }),
  ],
});

const ROMANTIC_CM_AUG6: ScorePassage = ScorePassageSchema.parse({
  id: "romantic-cm-aug6-etude",
  title: "Neapolitan & German +6 Cadence Study",
  composer: "Mind Palace Romantic Etude",
  tier: "romantic-study",
  difficulty: 8,
  dayUnlock: 20,
  keySignature: getKeySignature("C-minor"),
  timeSignature: TS_4_4,
  tempoBpm: 62,
  polyrhythm: "none",
  harmonicSummary: "C minor Chopin harmonic DNA: i → bII6 (Neapolitan) → Ger+6 → i6/4 → V7 → i.",
  tags: ["neapolitan-bII6", "german-aug6", "C-minor", "chopin-idioms", "tier-4"],
  previewNotes: {
    roadmap:
      "4 bars showcasing Chopin's two favorite chromatic predominants: bII6 (bar 2) and Ger+6 (bar 3).",
    hardestBarNumber: 3,
    landmarkSummary: "Bass descends C3 → F2 → Ab2 → G2; RH resolves F#4 → G4.",
    keyCue: "C minor (3 flats: Bb, Eb, Ab) + Db (bII6) and F# (Ger+6).",
  },
  measures: [
    MeasureSchema.parse({
      number: 1,
      harmonyLabel: "i",
      events: [
        ...buildLinearVoice("rca1", "treble", [
          { pitches: ["C4", "Eb4", "G4"], duration: "half", dynamic: "mf" },
          { pitches: ["C4", "Eb4", "G4"], duration: "half" },
        ]),
        ...buildLinearVoice("rca1", "bass", [
          { pitches: ["C3", "G3"], duration: "whole", romanNumeral: "i", pedal: "down" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 2,
      harmonyLabel: "bII6 (Neapolitan)",
      events: [
        ...buildLinearVoice("rca2", "treble", [
          { pitches: ["Db4", "F4", "Ab4"], duration: "whole", dynamic: "f" },
        ]),
        ...buildLinearVoice("rca2", "bass", [
          { pitches: ["F2", "F3"], duration: "whole", romanNumeral: "bII6", pedal: "change" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 3,
      harmonyLabel: "Ger+6 → i6/4 – V7",
      isHardestBar: true,
      events: [
        ...buildLinearVoice("rca3", "treble", [
          { pitches: ["C4", "Eb4", "F#4"], duration: "half", dynamic: "ff" },
          { pitches: ["C4", "Eb4", "G4"], duration: "quarter" },
          { pitches: ["B3", "D4", "F4", "G4"], duration: "quarter" },
        ]),
        ...buildLinearVoice("rca3", "bass", [
          { pitches: ["Ab2", "Ab3"], duration: "half", romanNumeral: "Ger+6", pedal: "change" },
          { pitches: ["G2", "G3"], duration: "half", romanNumeral: "V7", pedal: "change" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 4,
      harmonyLabel: "i",
      events: [
        ...buildLinearVoice("rca4", "treble", [
          { pitches: ["C4", "Eb4", "G4"], duration: "whole", dynamic: "p" },
        ]),
        ...buildLinearVoice("rca4", "bass", [
          { pitches: ["C2", "G2", "C3"], duration: "whole", romanNumeral: "i", pedal: "change" },
        ]),
      ],
    }),
  ],
});

// ---------------------------------------------------------------------------
// Tier 5: Authentic Public-Domain Chopin Excerpts
// ---------------------------------------------------------------------------

const CHOPIN_PRELUDE_OP28_NO7: ScorePassage = ScorePassageSchema.parse({
  id: "chopin-prelude-op28-no7",
  title: "Prelude in A Major",
  composer: "Frédéric Chopin",
  opus: "Op. 28, No. 7",
  tier: "chopin-excerpt",
  difficulty: 6,
  dayUnlock: 21,
  keySignature: getKeySignature("A-major"),
  timeSignature: TS_3_4,
  tempoBpm: 76,
  polyrhythm: "none",
  harmonicSummary:
    "Andantino mazurka-prelude in A major: luminous I → V7 → V7 → I harmonic breathing.",
  tags: ["chopin", "prelude", "A-major", "public-domain", "tier-5"],
  previewNotes: {
    roadmap:
      "4-bar opening phrase (mm. 1–4) in A major; keep beat-1 bass warm and pedal cleanly on each harmony change.",
    hardestBarNumber: 2,
    landmarkSummary: "RH reaches C#5 (half step above Treble C5) and leaps down a 6th to E4.",
    keyCue: "A major (3 sharps: F#, C#, G#).",
  },
  measures: [
    MeasureSchema.parse({
      number: 1,
      harmonyLabel: "I",
      handFrame: { rh: "C#4–C#5", lh: "A2–E3" },
      events: [
        ...buildLinearVoice("cp7-1", "treble", [
          { pitches: ["C#4", "E4", "C#5"], duration: "dotted-eighth", dynamic: "p" },
          { pitches: ["B4"], duration: "sixteenth" },
          { pitches: ["A4"], duration: "quarter" },
          { pitches: ["C#4", "F#4"], duration: "quarter" },
        ]),
        ...buildLinearVoice("cp7-1", "bass", [
          { pitches: ["A2"], duration: "quarter", romanNumeral: "I", pedal: "down" },
          { pitches: ["E3", "A3", "C#4"], duration: "quarter" },
          { pitches: ["E3", "A3"], duration: "quarter" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 2,
      harmonyLabel: "V7",
      isHardestBar: true,
      events: [
        ...buildLinearVoice("cp7-2", "treble", [
          { pitches: ["B3", "D4", "G#4"], duration: "half" },
          { pitches: ["E4", "G#4"], duration: "quarter" },
        ]),
        ...buildLinearVoice("cp7-2", "bass", [
          { pitches: ["E2"], duration: "quarter", romanNumeral: "V7", pedal: "change" },
          { pitches: ["B2", "E3", "G#3"], duration: "quarter" },
          { pitches: ["D3", "G#3"], duration: "quarter" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 3,
      harmonyLabel: "V7",
      events: [
        ...buildLinearVoice("cp7-3", "treble", [
          { pitches: ["D4", "G#4", "D5"], duration: "dotted-eighth" },
          { pitches: ["C#5"], duration: "sixteenth" },
          { pitches: ["B4"], duration: "quarter" },
          { pitches: ["D4", "G#4"], duration: "quarter" },
        ]),
        ...buildLinearVoice("cp7-3", "bass", [
          { pitches: ["E2"], duration: "quarter", romanNumeral: "V7", pedal: "change" },
          { pitches: ["B2", "E3", "G#3"], duration: "quarter" },
          { pitches: ["D3", "G#3"], duration: "quarter" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 4,
      harmonyLabel: "I",
      events: [
        ...buildLinearVoice("cp7-4", "treble", [
          { pitches: ["C#4", "E4", "A4"], duration: "half" },
          { pitches: ["E4"], duration: "quarter" },
        ]),
        ...buildLinearVoice("cp7-4", "bass", [
          { pitches: ["A2"], duration: "quarter", romanNumeral: "I", pedal: "change" },
          { pitches: ["E3", "A3", "C#4"], duration: "half" },
        ]),
      ],
    }),
  ],
});

const CHOPIN_PRELUDE_OP28_NO4: ScorePassage = ScorePassageSchema.parse({
  id: "chopin-prelude-op28-no4",
  title: "Prelude in E Minor",
  composer: "Frédéric Chopin",
  opus: "Op. 28, No. 4",
  tier: "chopin-excerpt",
  difficulty: 7,
  dayUnlock: 23,
  keySignature: getKeySignature("E-minor"),
  timeSignature: TS_4_4,
  tempoBpm: 56,
  polyrhythm: "none",
  harmonicSummary:
    "Largo sighing melody over Chopin's celebrated chromatically descending LH chords.",
  tags: ["chopin", "prelude", "E-minor", "chromatic-voice-leading", "public-domain", "tier-5"],
  previewNotes: {
    roadmap:
      "Opening 4 bars in E minor; read the LH as ONE voice sliding down by half-step at a time!",
    hardestBarNumber: 3,
    landmarkSummary: "RH floats on B4–C5; LH pulses around G3–B3–E4 descending to F#3–A3–D#4.",
    keyCue: "E minor (1 sharp: F#). Watch chromatic F natural and D# alterations in LH.",
  },
  measures: [
    MeasureSchema.parse({
      number: 1,
      harmonyLabel: "i6",
      events: [
        ...buildLinearVoice("cp4-1", "treble", [
          { pitches: ["B4"], duration: "dotted-half", dynamic: "p", tiedToNext: false },
          { pitches: ["C5"], duration: "quarter" },
        ]),
        ...buildLinearVoice("cp4-1", "bass", [
          { pitches: ["G3", "B3", "E4"], duration: "eighth", romanNumeral: "i6", pedal: "down" },
          { pitches: ["G3", "B3", "E4"], duration: "eighth" },
          { pitches: ["G3", "B3", "E4"], duration: "eighth" },
          { pitches: ["G3", "B3", "E4"], duration: "eighth" },
          { pitches: ["G3", "B3", "E4"], duration: "eighth" },
          { pitches: ["G3", "B3", "E4"], duration: "eighth" },
          { pitches: ["G3", "B3", "E4"], duration: "eighth" },
          { pitches: ["G3", "B3", "E4"], duration: "eighth" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 2,
      harmonyLabel: "ii°4/2 (chromatic)",
      events: [
        ...buildLinearVoice("cp4-2", "treble", [{ pitches: ["B4"], duration: "whole" }]),
        ...buildLinearVoice("cp4-2", "bass", [
          { pitches: ["F#3", "A3", "E4"], duration: "eighth", pedal: "change" },
          { pitches: ["F#3", "A3", "E4"], duration: "eighth" },
          { pitches: ["F#3", "A3", "E4"], duration: "eighth" },
          { pitches: ["F#3", "A3", "E4"], duration: "eighth" },
          { pitches: ["F#3", "A3", "D#4"], duration: "eighth", pedal: "change" },
          { pitches: ["F#3", "A3", "D#4"], duration: "eighth" },
          { pitches: ["F#3", "A3", "D#4"], duration: "eighth" },
          { pitches: ["F#3", "A3", "D#4"], duration: "eighth" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 3,
      harmonyLabel: "V4/2/iv → iv6",
      isHardestBar: true,
      events: [
        ...buildLinearVoice("cp4-3", "treble", [
          { pitches: ["B4"], duration: "dotted-half" },
          { pitches: ["A4"], duration: "quarter" },
        ]),
        ...buildLinearVoice("cp4-3", "bass", [
          { pitches: ["F3", "A3", "D4"], duration: "eighth", pedal: "change" },
          { pitches: ["F3", "A3", "D4"], duration: "eighth" },
          { pitches: ["F3", "A3", "D4"], duration: "eighth" },
          { pitches: ["F3", "A3", "D4"], duration: "eighth" },
          { pitches: ["E3", "A3", "D4"], duration: "eighth", pedal: "change" },
          { pitches: ["E3", "A3", "D4"], duration: "eighth" },
          { pitches: ["E3", "G#3", "D4"], duration: "eighth", pedal: "change" },
          { pitches: ["E3", "G#3", "D4"], duration: "eighth" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 4,
      harmonyLabel: "iv6",
      events: [
        ...buildLinearVoice("cp4-4", "treble", [{ pitches: ["A4"], duration: "whole" }]),
        ...buildLinearVoice("cp4-4", "bass", [
          {
            pitches: ["E3", "G3", "C4"],
            duration: "quarter",
            romanNumeral: "iv6",
            pedal: "change",
          },
          { pitches: ["E3", "G3", "C4"], duration: "quarter" },
          { pitches: ["E3", "F#3", "C4"], duration: "half", pedal: "change" },
        ]),
      ],
    }),
  ],
});

const CHOPIN_PRELUDE_OP28_NO20: ScorePassage = ScorePassageSchema.parse({
  id: "chopin-prelude-op28-no20",
  title: "Prelude in C Minor (Chordal)",
  composer: "Frédéric Chopin",
  opus: "Op. 28, No. 20",
  tier: "chopin-excerpt",
  difficulty: 8,
  dayUnlock: 25,
  keySignature: getKeySignature("C-minor"),
  timeSignature: TS_4_4,
  tempoBpm: 54,
  polyrhythm: "none",
  harmonicSummary:
    "Largo processional of rich 4-note chords: i – iv – V7 – i | VI – bII – V7 – I/5.",
  tags: ["chopin", "prelude", "C-minor", "chords", "neapolitan", "public-domain", "tier-5"],
  previewNotes: {
    roadmap:
      "The famous 4-bar ff opening in C minor; voice the top soprano note boldly and watch the Db Neapolitan color in bar 2!",
    hardestBarNumber: 2,
    landmarkSummary: "Deep octave bass (C2–F2–G2–C2) supporting dense middle-register chords.",
    keyCue: "C minor (3 flats: Bb, Eb, Ab) with chromatic Db and B natural.",
  },
  measures: [
    MeasureSchema.parse({
      number: 1,
      harmonyLabel: "i – iv – V7 – i",
      events: [
        ...buildLinearVoice("cp20-1", "treble", [
          { pitches: ["C4", "Eb4", "G4"], duration: "quarter", dynamic: "ff" },
          { pitches: ["C4", "F4", "Ab4"], duration: "quarter" },
          { pitches: ["B3", "D4", "G4"], duration: "dotted-eighth" },
          { pitches: ["F4"], duration: "sixteenth" },
          { pitches: ["C4", "Eb4", "G4"], duration: "quarter" },
        ]),
        ...buildLinearVoice("cp20-1", "bass", [
          { pitches: ["C2", "C3"], duration: "quarter", romanNumeral: "i", pedal: "down" },
          { pitches: ["F2", "F3"], duration: "quarter", romanNumeral: "iv", pedal: "change" },
          { pitches: ["G2", "G3"], duration: "quarter", romanNumeral: "V7", pedal: "change" },
          { pitches: ["C2", "C3"], duration: "quarter", romanNumeral: "i", pedal: "change" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 2,
      harmonyLabel: "VI – bII – V7/III – III",
      isHardestBar: true,
      events: [
        ...buildLinearVoice("cp20-2", "treble", [
          { pitches: ["C4", "Eb4", "Ab4"], duration: "quarter" },
          { pitches: ["Db4", "F4", "Ab4"], duration: "quarter" },
          { pitches: ["Bb3", "D4", "Ab4"], duration: "dotted-eighth" },
          { pitches: ["F4"], duration: "sixteenth" },
          { pitches: ["Bb3", "Eb4", "G4"], duration: "quarter" },
        ]),
        ...buildLinearVoice("cp20-2", "bass", [
          { pitches: ["Ab1", "Ab2"], duration: "quarter", romanNumeral: "VI", pedal: "change" },
          { pitches: ["Db2", "Db3"], duration: "quarter", romanNumeral: "bII", pedal: "change" },
          { pitches: ["Bb1", "Bb2"], duration: "quarter", romanNumeral: "V7/III", pedal: "change" },
          { pitches: ["Eb2", "Eb3"], duration: "quarter", romanNumeral: "III", pedal: "change" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 3,
      harmonyLabel: "V7/iv – iv – V7 – i",
      events: [
        ...buildLinearVoice("cp20-3", "treble", [
          { pitches: ["C4", "E4", "G4"], duration: "quarter" },
          { pitches: ["C4", "F4", "Ab4"], duration: "quarter" },
          { pitches: ["B3", "D4", "G4"], duration: "dotted-eighth" },
          { pitches: ["F4"], duration: "sixteenth" },
          { pitches: ["C4", "Eb4", "G4"], duration: "quarter" },
        ]),
        ...buildLinearVoice("cp20-3", "bass", [
          { pitches: ["C2", "C3"], duration: "quarter", romanNumeral: "V7/iv", pedal: "change" },
          { pitches: ["F2", "F3"], duration: "quarter", romanNumeral: "iv", pedal: "change" },
          { pitches: ["G2", "G3"], duration: "quarter", romanNumeral: "V7", pedal: "change" },
          { pitches: ["C2", "C3"], duration: "quarter", romanNumeral: "i", pedal: "change" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 4,
      harmonyLabel: "V7/V – V",
      events: [
        ...buildLinearVoice("cp20-4", "treble", [
          { pitches: ["D4", "F#4", "C5"], duration: "half" },
          { pitches: ["B3", "D4", "G4"], duration: "half" },
        ]),
        ...buildLinearVoice("cp20-4", "bass", [
          { pitches: ["D2", "D3"], duration: "half", romanNumeral: "V7/V", pedal: "change" },
          { pitches: ["G2", "G3"], duration: "half", romanNumeral: "V", pedal: "change" },
        ]),
      ],
    }),
  ],
});

const CHOPIN_WALTZ_AMINOR_B150: ScorePassage = ScorePassageSchema.parse({
  id: "chopin-waltz-aminor-b150",
  title: "Waltz in A Minor",
  composer: "Frédéric Chopin",
  opus: "B. 150 (Op. posth.)",
  tier: "chopin-excerpt",
  difficulty: 7,
  dayUnlock: 24,
  keySignature: getKeySignature("A-minor"),
  timeSignature: TS_3_4,
  tempoBpm: 112,
  polyrhythm: "none",
  harmonicSummary:
    "Allegretto salon waltz in A minor: i – iv – V7 – i over buoyant oom-pah-pah LH.",
  tags: ["chopin", "waltz", "A-minor", "public-domain", "tier-5"],
  previewNotes: {
    roadmap:
      "Opening 4 bars in A minor; keep LH leaps light and blind-anchored while RH sings the rising triad.",
    hardestBarNumber: 3,
    landmarkSummary: "LH leaps A2 → [C4, E4]; RH sweeps E4 → A4 → C5 → E5.",
    keyCue: "A minor (no key-sig accidentals; watch G# on V7 in bar 3).",
  },
  measures: [
    MeasureSchema.parse({
      number: 1,
      harmonyLabel: "i",
      events: [
        ...buildLinearVoice("cw1", "treble", [
          { pitches: ["A4"], duration: "quarter", dynamic: "p", finger: 1 },
          { pitches: ["B4"], duration: "quarter", finger: 2 },
          { pitches: ["C5"], duration: "quarter", finger: 3 },
        ]),
        ...buildLinearVoice("cw1", "bass", [
          { pitches: ["A2"], duration: "quarter", romanNumeral: "i", pedal: "down" },
          { pitches: ["C4", "E4"], duration: "quarter" },
          { pitches: ["C4", "E4"], duration: "quarter" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 2,
      harmonyLabel: "iv",
      events: [
        ...buildLinearVoice("cw2", "treble", [
          { pitches: ["E5"], duration: "half", finger: 5 },
          { pitches: ["D5"], duration: "quarter", finger: 4 },
        ]),
        ...buildLinearVoice("cw2", "bass", [
          { pitches: ["D3"], duration: "quarter", romanNumeral: "iv", pedal: "change" },
          { pitches: ["F3", "A3", "D4"], duration: "quarter" },
          { pitches: ["F3", "A3", "D4"], duration: "quarter" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 3,
      harmonyLabel: "V7",
      isHardestBar: true,
      events: [
        ...buildLinearVoice("cw3", "treble", [
          { pitches: ["C5"], duration: "quarter", finger: 3 },
          { pitches: ["B4"], duration: "quarter", finger: 2 },
          { pitches: ["G#4"], duration: "quarter", finger: 1 },
        ]),
        ...buildLinearVoice("cw3", "bass", [
          { pitches: ["E2"], duration: "quarter", romanNumeral: "V7", pedal: "change" },
          { pitches: ["E3", "G#3", "D4"], duration: "quarter" },
          { pitches: ["E3", "G#3", "D4"], duration: "quarter" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 4,
      harmonyLabel: "i",
      events: [
        ...buildLinearVoice("cw4", "treble", [
          { pitches: ["A4"], duration: "dotted-half", finger: 2 },
        ]),
        ...buildLinearVoice("cw4", "bass", [
          { pitches: ["A2"], duration: "quarter", romanNumeral: "i", pedal: "change" },
          { pitches: ["C4", "E4"], duration: "half" },
        ]),
      ],
    }),
  ],
});

const CHOPIN_NOCTURNE_OP9_NO2: ScorePassage = ScorePassageSchema.parse({
  id: "chopin-nocturne-op9-no2",
  title: "Nocturne in Eb Major",
  composer: "Frédéric Chopin",
  opus: "Op. 9, No. 2",
  tier: "chopin-excerpt",
  difficulty: 9,
  dayUnlock: 27,
  keySignature: getKeySignature("Eb-major"),
  timeSignature: TS_12_8,
  tempoBpm: 58,
  polyrhythm: "none",
  harmonicSummary:
    "Andante 12/8 bel-canto melody opening with the signature M6 leap (Bb4 → G5) over I – V7/ii – ii – V7.",
  tags: ["chopin", "nocturne", "Eb-major", "12-8", "public-domain", "tier-5"],
  previewNotes: {
    roadmap:
      "Opening 2 expansive 12/8 bars in Eb major; hear the M6 leap Bb4→G5 before your fingers touch the keys.",
    hardestBarNumber: 2,
    landmarkSummary: "RH opens on Bb4 → G5; LH spans Eb2 up to Bb3/Eb4.",
    keyCue: "Eb major (3 flats: Bb, Eb, Ab) + D natural / A natural chromatic color in bar 2.",
  },
  measures: [
    MeasureSchema.parse({
      number: 1,
      harmonyLabel: "I – V7/ii – ii – V7",
      events: [
        ...buildLinearVoice("cn1", "treble", [
          {
            pitches: ["G5"],
            duration: "dotted-quarter",
            dynamic: "p",
            finger: 5,
            intervalLabel: "M6",
          },
          { pitches: ["F5"], duration: "eighth", finger: 4 },
          { pitches: ["G5"], duration: "eighth", finger: 5 },
          { pitches: ["F5"], duration: "eighth", finger: 4 },
          { pitches: ["Eb5"], duration: "dotted-quarter", finger: 3 },
          { pitches: ["Bb4"], duration: "dotted-quarter", finger: 1 },
        ]),
        ...buildLinearVoice("cn1", "bass", [
          { pitches: ["Eb2"], duration: "eighth", romanNumeral: "I", pedal: "down" },
          { pitches: ["G3", "Bb3", "Eb4"], duration: "eighth" },
          { pitches: ["G3", "Bb3", "Eb4"], duration: "eighth" },
          { pitches: ["D2"], duration: "eighth", romanNumeral: "V7/ii", pedal: "change" },
          { pitches: ["Ab3", "C4", "F4"], duration: "eighth" },
          { pitches: ["Ab3", "C4", "F4"], duration: "eighth" },
          { pitches: ["Eb2"], duration: "eighth", romanNumeral: "I", pedal: "change" },
          { pitches: ["G3", "Bb3", "Eb4"], duration: "eighth" },
          { pitches: ["G3", "Bb3", "Eb4"], duration: "eighth" },
          { pitches: ["Bb2"], duration: "eighth", romanNumeral: "V7", pedal: "change" },
          { pitches: ["Ab3", "D4"], duration: "eighth" },
          { pitches: ["Ab3", "D4"], duration: "eighth" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 2,
      harmonyLabel: "I – vi – ii7 – V7",
      isHardestBar: true,
      events: [
        ...buildLinearVoice("cn2", "treble", [
          { pitches: ["G5"], duration: "dotted-quarter", finger: 5 },
          { pitches: ["C5"], duration: "dotted-quarter", finger: 2 },
          { pitches: ["C5"], duration: "dotted-quarter", finger: 2 },
          { pitches: ["Bb4"], duration: "dotted-quarter", finger: 1 },
        ]),
        ...buildLinearVoice("cn2", "bass", [
          { pitches: ["Eb2"], duration: "eighth", romanNumeral: "I", pedal: "change" },
          { pitches: ["G3", "Bb3", "Eb4"], duration: "eighth" },
          { pitches: ["G3", "Bb3", "Eb4"], duration: "eighth" },
          { pitches: ["C2"], duration: "eighth", romanNumeral: "vi", pedal: "change" },
          { pitches: ["G3", "C4", "Eb4"], duration: "eighth" },
          { pitches: ["G3", "C4", "Eb4"], duration: "eighth" },
          { pitches: ["F2"], duration: "eighth", romanNumeral: "ii7", pedal: "change" },
          { pitches: ["Ab3", "C4", "Eb4"], duration: "eighth" },
          { pitches: ["Ab3", "C4", "Eb4"], duration: "eighth" },
          { pitches: ["Bb1"], duration: "eighth", romanNumeral: "V7", pedal: "change" },
          { pitches: ["Ab3", "D4", "F4"], duration: "eighth" },
          { pitches: ["Ab3", "D4", "F4"], duration: "eighth" },
        ]),
      ],
    }),
  ],
});

const CHOPIN_MAZURKA_OP7_NO1: ScorePassage = ScorePassageSchema.parse({
  id: "chopin-mazurka-op7-no1",
  title: "Mazurka in Bb Major",
  composer: "Frédéric Chopin",
  opus: "Op. 7, No. 1",
  tier: "chopin-excerpt",
  difficulty: 8,
  dayUnlock: 28,
  keySignature: getKeySignature("Bb-major"),
  timeSignature: TS_3_4,
  tempoBpm: 132,
  polyrhythm: "none",
  harmonicSummary:
    "Vivace Polish folk dance in Bb major with dotted-eighth snap and accent on beat 2.",
  tags: ["chopin", "mazurka", "Bb-major", "dotted-rhythm", "public-domain", "tier-5"],
  previewNotes: {
    roadmap:
      "4-bar lively Mazurka opening in Bb major; lean playfully into beat 2 and keep the dotted-eighth snap crisp.",
    hardestBarNumber: 2,
    landmarkSummary: "RH leaps F4 → D5 → C5; LH grounds on Bb2 and F2.",
    keyCue: "Bb major (2 flats: Bb, Eb).",
  },
  measures: [
    MeasureSchema.parse({
      number: 1,
      harmonyLabel: "I",
      events: [
        ...buildLinearVoice("cm1", "treble", [
          { pitches: ["F4"], duration: "dotted-eighth", dynamic: "mf" },
          { pitches: ["D5"], duration: "sixteenth" },
          { pitches: ["C5"], duration: "quarter", articulation: "accent" },
          { pitches: ["Bb4"], duration: "quarter" },
        ]),
        ...buildLinearVoice("cm1", "bass", [
          { pitches: ["Bb2"], duration: "quarter", romanNumeral: "I", pedal: "down" },
          { pitches: ["F3", "Bb3", "D4"], duration: "quarter" },
          { pitches: ["F3", "Bb3", "D4"], duration: "quarter" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 2,
      harmonyLabel: "V7",
      isHardestBar: true,
      events: [
        ...buildLinearVoice("cm2", "treble", [
          { pitches: ["A4"], duration: "dotted-eighth" },
          { pitches: ["C5"], duration: "sixteenth" },
          { pitches: ["Eb5"], duration: "quarter", articulation: "accent" },
          { pitches: ["C5"], duration: "quarter" },
        ]),
        ...buildLinearVoice("cm2", "bass", [
          { pitches: ["F2"], duration: "quarter", romanNumeral: "V7", pedal: "change" },
          { pitches: ["F3", "A3", "Eb4"], duration: "quarter" },
          { pitches: ["F3", "A3", "Eb4"], duration: "quarter" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 3,
      harmonyLabel: "I",
      events: [
        ...buildLinearVoice("cm3", "treble", [
          { pitches: ["D5"], duration: "dotted-eighth" },
          { pitches: ["F5"], duration: "sixteenth" },
          { pitches: ["D5"], duration: "quarter", articulation: "accent" },
          { pitches: ["Bb4"], duration: "quarter" },
        ]),
        ...buildLinearVoice("cm3", "bass", [
          { pitches: ["Bb2"], duration: "quarter", romanNumeral: "I", pedal: "change" },
          { pitches: ["F3", "Bb3", "D4"], duration: "quarter" },
          { pitches: ["F3", "Bb3", "D4"], duration: "quarter" },
        ]),
      ],
    }),
    MeasureSchema.parse({
      number: 4,
      harmonyLabel: "V7 – I",
      events: [
        ...buildLinearVoice("cm4", "treble", [
          { pitches: ["C5"], duration: "half" },
          { pitches: ["Bb4"], duration: "quarter" },
        ]),
        ...buildLinearVoice("cm4", "bass", [
          { pitches: ["F2", "F3"], duration: "half", romanNumeral: "V7", pedal: "change" },
          {
            pitches: ["Bb2", "F3", "Bb3"],
            duration: "quarter",
            romanNumeral: "I",
            pedal: "change",
          },
        ]),
      ],
    }),
  ],
});

export const SCORE_LIBRARY: readonly ScorePassage[] = [
  METHOD_C_LANDMARKS,
  METHOD_G_THIRDS,
  METHOD_F_BLIND_FRAME,
  HYMNAL_G_CHORALE,
  HYMNAL_EM_CHORALE,
  CLASSICAL_D_MINUET,
  ROMANTIC_DB_POLYRHYTHM,
  ROMANTIC_CM_AUG6,
  CHOPIN_PRELUDE_OP28_NO7,
  CHOPIN_PRELUDE_OP28_NO4,
  CHOPIN_PRELUDE_OP28_NO20,
  CHOPIN_WALTZ_AMINOR_B150,
  CHOPIN_NOCTURNE_OP9_NO2,
  CHOPIN_MAZURKA_OP7_NO1,
];

export function getPassageById(id: string): ScorePassage | undefined {
  return SCORE_LIBRARY.find((passage) => passage.id === id);
}

export function getPassagesByTier(tier: ScoreTier): ScorePassage[] {
  return SCORE_LIBRARY.filter((passage) => passage.tier === tier);
}

export function getPassagesForDifficulty(
  maxDifficulty: number,
  keyId?: KeySignatureId,
): ScorePassage[] {
  return SCORE_LIBRARY.filter((passage) => {
    const withinDiff = passage.difficulty <= maxDifficulty;
    const matchesKey = keyId === undefined || passage.keySignature.id === keyId;
    return withinDiff && matchesKey;
  });
}

// ---------------------------------------------------------------------------
// Deterministic Procedural Sight-Reading Generator (Any of the 24 Keys)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export interface ProceduralPassageOptions {
  keyId: KeySignatureId;
  difficulty: number;
  bars?: number;
  timeSignature?: TimeSignature;
  seed?: number;
}

function difficultyToTier(difficulty: number): ScoreTier {
  if (difficulty <= 2) return "method-book";
  if (difficulty <= 4) return "hymnal-chorale";
  if (difficulty <= 6) return "classical-miniature";
  if (difficulty <= 8) return "romantic-study";
  return "chopin-excerpt";
}

function difficultyToMaxJump(difficulty: number): number {
  if (difficulty <= 2) return 1;
  if (difficulty <= 5) return 2;
  return 4;
}

function chooseProceduralDuration(
  remaining: number,
  difficulty: number,
  isFinalBar: boolean,
  rand: () => number,
): NoteDuration {
  if (remaining < 1 - 0.001) return "eighth";
  if (difficulty >= 5 && remaining >= 1 && rand() > 0.6) return "eighth";
  if (remaining >= 2 && (isFinalBar || rand() > 0.72)) return "half";
  return "quarter";
}

/**
 * Generates a fresh, beat-accurate, never-seen-before sight-reading passage
 * in any of the 24 keys with accurate enharmonic spelling and 30s preview notes.
 */
export function generateProceduralSightReadingPassage(
  options: ProceduralPassageOptions,
): ScorePassage {
  const key = getKeySignature(options.keyId);
  const difficulty = Math.max(1, Math.min(10, Math.round(options.difficulty)));
  const bars = Math.max(2, Math.min(8, options.bars ?? 4));
  const ts = options.timeSignature ?? (difficulty >= 4 ? TS_3_4 : TS_4_4);
  const rand = mulberry32(options.seed ?? difficulty * 7919 + key.fifths * 31 + bars * 13);

  const trebleScale = spellScale(options.keyId, key.mode === "minor" ? "harmonic" : "natural", 4);
  const bassScale = spellScale(options.keyId, "natural", 3);
  const quarterBeats = measureQuarterBeats(ts);
  const progression = [0, 3, 4, 0, 5, 1, 4, 0]; // I - IV - V - I - vi - ii - V - I
  const romanLabels =
    key.mode === "major"
      ? ["I", "ii", "iii", "IV", "V", "vi", "vii°"]
      : ["i", "ii°", "III", "iv", "V", "VI", "vii°"];

  const maxJump = difficultyToMaxJump(difficulty);
  const measures: Measure[] = [];
  let hardestBar = 1;
  let maxLeap = -1;

  for (let barIdx = 0; barIdx < bars; barIdx += 1) {
    const degree = progression[barIdx % progression.length] ?? 0;
    const roman = romanLabels[degree] ?? "I";
    const bassRoot = bassScale[degree] ?? bassScale[0];
    const bassFifth = bassScale[(degree + 4) % 7] ?? bassScale[4];
    const chordThird = trebleScale[(degree + 2) % 7] ?? trebleScale[2];
    if (!bassRoot || !bassFifth || !chordThird) {
      throw new Error(`Incomplete scale for key ${options.keyId}`);
    }

    const rhEvents: NoteEvent[] = [];
    let cursor = 0;
    let prevStep = degree;
    let barMaxLeap = 0;

    while (cursor < quarterBeats - 0.001) {
      const remaining = quarterBeats - cursor;
      const dur = chooseProceduralDuration(remaining, difficulty, barIdx === bars - 1, rand);
      const delta = Math.floor(rand() * (maxJump * 2 + 1)) - maxJump;
      const nextStep = Math.max(0, Math.min(6, prevStep + delta));
      barMaxLeap = Math.max(barMaxLeap, Math.abs(nextStep - prevStep));
      prevStep = nextStep;

      const notePitch = trebleScale[nextStep] ?? trebleScale[0];
      if (!notePitch) {
        throw new Error(`Missing treble pitch at step ${nextStep}`);
      }
      const spelled = formatPitch(midiToPitchInKey(notePitch.midi, options.keyId));

      rhEvents.push(
        evt({
          id: `proc-b${barIdx + 1}-rh-${rhEvents.length + 1}`,
          pitches: difficulty >= 6 && cursor === 0 ? [spelled, formatPitch(chordThird)] : [spelled],
          beatStart: Math.round(cursor * 1000) / 1000,
          duration: dur,
          staff: "treble",
        }),
      );
      cursor += DURATION_TO_QUARTER_BEATS[dur];
    }

    if (barMaxLeap > maxLeap) {
      maxLeap = barMaxLeap;
      hardestBar = barIdx + 1;
    }

    const lhEvents: NoteEvent[] =
      ts.numerator === 3 && ts.denominator === 4
        ? buildLinearVoice(`proc-b${barIdx + 1}`, "bass", [
            { pitches: [formatPitch(bassRoot)], duration: "quarter", romanNumeral: roman },
            { pitches: [formatPitch(bassFifth)], duration: "quarter" },
            { pitches: [formatPitch(bassFifth)], duration: "quarter" },
          ])
        : buildLinearVoice(`proc-b${barIdx + 1}`, "bass", [
            {
              pitches: [formatPitch(bassRoot), formatPitch(bassFifth)],
              duration: "half",
              romanNumeral: roman,
            },
            {
              pitches: [formatPitch(bassRoot), formatPitch(bassFifth)],
              duration: "half",
            },
          ]);

    measures.push(
      MeasureSchema.parse({
        number: barIdx + 1,
        harmonyLabel: roman,
        isHardestBar: false,
        events: [...rhEvents, ...lhEvents],
      }),
    );
  }

  const markedMeasures = measures.map((m) =>
    m.number === hardestBar ? { ...m, isHardestBar: true } : m,
  );
  const tier = difficultyToTier(difficulty);
  const polyrhythm: PolyrhythmRatio = "none";
  const accidentalKind = key.fifths > 0 ? "sharps" : "flats";
  const keyCue =
    key.fifths === 0
      ? `${key.label} — zero key-signature accidentals.`
      : `${key.label} (${Math.abs(key.fifths)} ${accidentalKind}: ${(key.accidentals ?? []).join(", ")}).`;

  return ScorePassageSchema.parse({
    id: `procedural-${options.keyId}-d${difficulty}-s${options.seed ?? 1}`,
    title: `${key.label} Sight-Reading Drill (Lvl ${difficulty})`,
    composer: "Mind Palace Procedural Engine",
    tier,
    difficulty,
    dayUnlock: Math.min(30, Math.max(1, difficulty * 3 - 2)),
    keySignature: key,
    timeSignature: ts,
    tempoBpm: Math.min(128, 64 + difficulty * 6),
    polyrhythm,
    measures: markedMeasures,
    previewNotes: {
      roadmap: `${bars} bars in ${key.label} (${ts.numerator}/${ts.denominator}); scan bar ${hardestBar} for the widest melodic leap.`,
      hardestBarNumber: hardestBar,
      landmarkSummary: `Anchored around ${key.tonic}4 (RH) and ${key.tonic}3 (LH).`,
      keyCue,
    },
    harmonicSummary: `Diatonic ${key.label} sight-reading progression cycling I – IV – V – I.`,
    tags: ["procedural", options.keyId, `difficulty-${difficulty}`],
  });
}
