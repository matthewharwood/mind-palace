import { createAdaptiveFlowState, createFSRSCard } from "./fsrs";
import {
  type CurriculumPhase,
  type DailyBlock,
  DailyBlockSchema,
  type DailySprint,
  DailySprintSchema,
  type DayPlan,
  DayPlanSchema,
  type ExerciseKind,
  type FSRSCard,
  type KeySignatureId,
  type MusicModeState,
  MusicModeStateSchema,
  type SightReadingStep,
} from "./schemas";
import { RHYTHM_CELLS, SCORE_LIBRARY } from "./scores";
import { CORE_24_KEY_IDS, getKeySignature, INTERVALS, LANDMARK_NOTES } from "./theory";

// ---------------------------------------------------------------------------
// 5-Step Sight-Reading Ritual Definition
// ---------------------------------------------------------------------------

export interface RitualStepSpec {
  step: SightReadingStep;
  order: 1 | 2 | 3 | 4 | 5;
  shortLabel: string;
  title: string;
  durationHint: string;
  instruction: string;
}

export const FIVE_STEP_RITUAL: readonly RitualStepSpec[] = [
  {
    step: "preview-30s",
    order: 1,
    shortLabel: "Scan",
    title: "30-Second Page Preview",
    durationHint: "30 sec",
    instruction:
      "Hands off keys. Scan key signature, time signature, landmarks, harmonic roadmap, and spotlight the hardest bar.",
  },
  {
    step: "rhythm-isolate",
    order: 2,
    shortLabel: "Rhythm",
    title: "Isolate Rhythm First",
    durationHint: "60 sec",
    instruction:
      "Tap the rhythm on the Rhythm Pad (split LH/RH for polyrhythms) with the metronome until the pulse is automatic.",
  },
  {
    step: "look-ahead-play",
    order: 3,
    shortLabel: "Play",
    title: "Look-Ahead Play-Through",
    durationHint: "2–3 min",
    instruction:
      "Play straight through WITHOUT stopping. Keep your eyes 1 bar ahead (current bar softly masked) and feel the keys blind.",
  },
  {
    step: "review-weakest-bar",
    order: 4,
    shortLabel: "Fix Bar",
    title: "Review Weakest Bar Once",
    durationHint: "60 sec",
    instruction:
      "Revisit ONLY the single hardest bar once at slow tempo to fix the interval shape or hand-frame shift, then move on.",
  },
  {
    step: "fsrs-rate",
    order: 5,
    shortLabel: "Recital",
    title: "Recital Playback & FSRS Log",
    durationHint: "15 sec",
    instruction:
      "Listen back to your recital take, review your personal best, and confirm or override the suggested FSRS rating.",
  },
];

// ---------------------------------------------------------------------------
// 30-Day x 4-Hour/Day (120h) Curriculum Blueprint
// ---------------------------------------------------------------------------

interface DaySeed {
  day: number;
  phase: CurriculumPhase;
  title: string;
  theme: string;
  keysIntroduced: readonly KeySignatureId[];
  targetBpmRange: readonly [number, number];
  passages: readonly string[];
  earSprints: readonly [ExerciseKind, ExerciseKind];
  rhythmSprint: ExerciseKind;
  habitCue: string;
  milestone: string;
}

const DAY_SEEDS: readonly DaySeed[] = [
  // Phase 1: Foundations & Landmarks (Days 1-7)
  {
    day: 1,
    phase: "foundations",
    title: "Grand Staff Landmarks & 2nds/3rds",
    theme: "Anchor Middle C4, Treble G4, Bass F3 and read steps & skips without letter-naming.",
    keysIntroduced: ["C-major", "A-minor"],
    targetBpmRange: [60, 76],
    passages: ["method-c-landmarks-walk"],
    earSprints: ["ear-interval", "ear-cadence"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "Hands on the 2-black group before glancing at the screen.",
    milestone: "Identify all 7 landmark notes and 2nd/3rd visual shapes in <1.5s.",
  },
  {
    day: 2,
    phase: "foundations",
    title: "4ths, 5ths & Tactile 5-Finger Frames",
    theme: "Expand interval vision to P4/P5 and lock in blind C/Am 5-finger hand topography.",
    keysIntroduced: ["C-major", "A-minor"],
    targetBpmRange: [64, 80],
    passages: ["method-c-landmarks-walk"],
    earSprints: ["ear-interval", "ear-chord"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "Keep all five fingertips resting on keys during every rest.",
    milestone: "Play 4-bar C major sight-reading drills without looking at hands.",
  },
  {
    day: 3,
    phase: "foundations",
    title: "G Major, E Minor & Waltz 3/4 Pulse",
    theme: "Introduce F# tactile anchor, 3/4 waltz accompaniment, and parallel 3rd shapes.",
    keysIntroduced: ["G-major", "E-minor"],
    targetBpmRange: [68, 84],
    passages: ["method-g-parallel-thirds"],
    earSprints: ["ear-interval", "ear-cadence"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "Spot F# in the 30-second preview before playing bar 1.",
    milestone: "Sight-read 3/4 waltz patterns in G major with steady downbeat pulse.",
  },
  {
    day: 4,
    phase: "foundations",
    title: "Triad Shapes & Root-Position Ear",
    theme: "Read 3-note snowman triads as a single visual chunk; hear Major vs Minor vs Dim.",
    keysIntroduced: ["G-major", "E-minor"],
    targetBpmRange: [70, 88],
    passages: ["method-g-parallel-thirds", "method-c-landmarks-walk"],
    earSprints: ["ear-chord", "ear-cadence"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "Name the chord quality out loud before pressing the keys.",
    milestone: "90%+ accuracy distinguishing Major/Minor/Diminished triads by ear and sight.",
  },
  {
    day: 5,
    phase: "foundations",
    title: "F Major, D Minor & Blind Bb Anchor",
    theme: "Use Bb (rightmost of 3-black group) as a physical compass for blind keyboard shifts.",
    keysIntroduced: ["F-major", "D-minor"],
    targetBpmRange: [72, 88],
    passages: ["method-f-blind-frame"],
    earSprints: ["ear-interval", "ear-dictation"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "Let finger 4 find Bb by touch alone—zero peeking.",
    milestone: "Fluent blind-mode reading across 0- and 1-accidental keys (C, Am, G, Em, F, Dm).",
  },
  {
    day: 6,
    phase: "foundations",
    title: "First 4-Part Hymnal Chorale & 6ths",
    theme: "Read vertical SATB chord shapes from bass upward; add m6/M6 interval vision.",
    keysIntroduced: ["G-major"],
    targetBpmRange: [64, 78],
    passages: ["hymnal-g-old-hundredth"],
    earSprints: ["ear-interval", "ear-cadence"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "Read bass + soprano outer frame first, then fill inner alto/tenor shapes.",
    milestone: "Play 4-part hymnal chorale in G major with look-ahead masking enabled.",
  },
  {
    day: 7,
    phase: "foundations",
    title: "Week 1 Interleaved Consolidation",
    theme: "Ultralearning mixed retrieval across 6 keys, intervals 2nd–6th, and dotted rhythms.",
    keysIntroduced: ["C-major", "G-major", "F-major"],
    targetBpmRange: [72, 92],
    passages: ["method-c-landmarks-walk", "method-g-parallel-thirds", "hymnal-g-old-hundredth"],
    earSprints: ["ear-chord", "ear-dictation"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "Honor the Adaptive Flow drop whenever accuracy dips below 80%.",
    milestone: "Week 1 Gate: 85% sight-reading accuracy across Tier 1–2 in 6 keys.",
  },

  // Phase 2: Keys, Inversions & Chorales (Days 8-15)
  {
    day: 8,
    phase: "keys-and-chorales",
    title: "D Major, B Minor & Triad Inversions",
    theme:
      "Recognize 1st-inversion (3rd+4th) and 2nd-inversion (4th+3rd) triad silhouettes instantly.",
    keysIntroduced: ["D-major", "B-minor"],
    targetBpmRange: [76, 96],
    passages: ["classical-d-alberti-minuet"],
    earSprints: ["ear-chord", "ear-cadence"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "Spot the 'gap of a 4th' to identify triad inversions in a single glance.",
    milestone: "Instant recognition of root/1st/2nd triad inversions in D major & B minor.",
  },
  {
    day: 9,
    phase: "keys-and-chorales",
    title: "Minor Chorales, Leading Tones & 7ths",
    theme: "Master harmonic minor raised #7 accidentals and m7/M7 intervals in 4-part Bach style.",
    keysIntroduced: ["E-minor", "B-minor"],
    targetBpmRange: [64, 80],
    passages: ["hymnal-em-bach-chorale"],
    earSprints: ["ear-interval", "ear-cadence"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "Highlight every accidental during your 30-second page preview.",
    milestone: "Sight-read minor-key 4-part chorales with accurate raised leading tones.",
  },
  {
    day: 10,
    phase: "keys-and-chorales",
    title: "Bb Major, G Minor & Compound 6/8 Lilt",
    theme: "Add 2-flat keys and internalize compound 6/8 two-beat barcarolle sway.",
    keysIntroduced: ["Bb-major", "G-minor"],
    targetBpmRange: [76, 96],
    passages: ["hymnal-g-old-hundredth", "method-f-blind-frame"],
    earSprints: ["ear-chord", "ear-dictation"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "Count 6/8 as TWO broad pulses (1-la-li, 2-la-li), never six choppy clicks.",
    milestone: "Fluent 6/8 rhythm isolation and 2-flat key signature fluency.",
  },
  {
    day: 11,
    phase: "keys-and-chorales",
    title: "A Major, F# Minor & Alberti Bass",
    theme: "Introduce 3-sharp keys (F#, C#, G#) and Mozartian broken-chord LH automation.",
    keysIntroduced: ["A-major", "F#-minor"],
    targetBpmRange: [84, 108],
    passages: ["classical-d-alberti-minuet"],
    earSprints: ["ear-interval", "ear-cadence"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "Chunk Alberti bass into a single chord grip—never read note-by-note.",
    milestone: "Sight-read classical miniatures with independent broken-chord LH.",
  },
  {
    day: 12,
    phase: "keys-and-chorales",
    title: "Eb Major, C Minor & Dominant 7th Inversions",
    theme:
      "Master 3-flat keys (Nocturne Op. 9 No. 2 & Prelude No. 20 home keys!) and V7/V65/V43/V42.",
    keysIntroduced: ["Eb-major", "C-minor"],
    targetBpmRange: [72, 92],
    passages: ["hymnal-em-bach-chorale", "classical-d-alberti-minuet"],
    earSprints: ["ear-chord", "ear-cadence"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "Spot the 'crushed 2nd' inside every 7th-chord inversion.",
    milestone: "Recognize all 4 dominant-7th inversions by sight and ear in Eb & Cm.",
  },
  {
    day: 13,
    phase: "keys-and-chorales",
    title: "E Major, C# Minor & Ab Major, F Minor",
    theme: "Conquer 4-sharp and 4-flat keys—the heart of Chopin's Etudes, Nocturnes, and Ballades.",
    keysIntroduced: ["E-major", "C#-minor", "Ab-major", "F-minor"],
    targetBpmRange: [76, 96],
    passages: ["classical-d-alberti-minuet"],
    earSprints: ["ear-chord", "ear-dictation"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "Notice how 4-black-key scales fit the natural curve of fingers 2-3-4.",
    milestone: "Zero hesitation spelling scales & primary triads in E, C#m, Ab, Fm.",
  },
  {
    day: 14,
    phase: "keys-and-chorales",
    title: "B Major, G# Minor & Db Major, Bb Minor",
    theme: "Embrace 5-sharp and 5-flat keys (Chopin's favorite ergonomic black-key topography).",
    keysIntroduced: ["B-major", "G#-minor", "Db-major", "Bb-minor"],
    targetBpmRange: [68, 88],
    passages: ["romantic-db-polyrhythm-nocturne"],
    earSprints: ["ear-interval", "ear-cadence"],
    rhythmSprint: "polyrhythm-tap",
    habitCue: "In B and Db major, long fingers stay on black keys—thumb takes the white keys.",
    milestone: "Play 5-accidental key frames blind with higher comfort than C major.",
  },
  {
    day: 15,
    phase: "keys-and-chorales",
    title: "All 24 Keys Complete + 2:3 Polyrhythms",
    theme: "Add 6-accidental keys (F# major, Eb minor) and lock in Chopin's 2:3 cross-rhythm.",
    keysIntroduced: ["F#-major", "Eb-minor"],
    targetBpmRange: [66, 86],
    passages: ["romantic-db-polyrhythm-nocturne", "hymnal-em-bach-chorale"],
    earSprints: ["ear-chord", "ear-cadence"],
    rhythmSprint: "polyrhythm-tap",
    habitCue: "Tap LH duplets vs RH triplets on the split Rhythm Pad until hands decouple.",
    milestone: "Day 15 Halfway Gate: All 24 major/minor keys unlocked + fluent 2:3 polyrhythm.",
  },

  // Phase 3: Romantic Harmony & Eye-Hand Span (Days 16-22)
  {
    day: 16,
    phase: "romantic-fluency",
    title: "Compound Intervals (9ths & 10ths) & Rolled LH",
    theme: "Expand visual span to 9ths/10ths for Chopin's warm open left-hand nocturne bass.",
    keysIntroduced: ["Db-major", "Eb-major"],
    targetBpmRange: [64, 84],
    passages: ["romantic-db-polyrhythm-nocturne"],
    earSprints: ["ear-interval", "ear-dictation"],
    rhythmSprint: "polyrhythm-tap",
    habitCue: "Read 10ths as 'octave + a 3rd' instead of counting ledger lines.",
    milestone: "Sight-read open 10th bass figures smoothly with damper pedal.",
  },
  {
    day: 17,
    phase: "romantic-fluency",
    title: "Secondary Dominants (V7/V, V7/ii, V7/iv)",
    theme: "Recognize applied dominants instantly by their raised chromatic leading tone.",
    keysIntroduced: ["C-minor", "A-major"],
    targetBpmRange: [70, 92],
    passages: ["romantic-cm-aug6-etude", "classical-d-alberti-minuet"],
    earSprints: ["ear-cadence", "ear-chord"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "When you see a surprise sharp/natural, ask: 'Which chord is this tonicizing?'",
    milestone: "Identify V7/V, V7/ii, and V7/vi by ear and on the grand staff.",
  },
  {
    day: 18,
    phase: "romantic-fluency",
    title: "Nocturne 2:3 Polyrhythm & Bel-Canto Voicing",
    theme: "Balance cantabile RH melody over flowing LH broken chords in Db major.",
    keysIntroduced: ["Db-major", "Bb-minor"],
    targetBpmRange: [60, 76],
    passages: ["romantic-db-polyrhythm-nocturne"],
    earSprints: ["ear-interval", "ear-dictation"],
    rhythmSprint: "polyrhythm-tap",
    habitCue: "Sing the top melody line mentally during the 30-second preview.",
    milestone: "Play Db Major 2:3 Nocturne Study end-to-end without stopping.",
  },
  {
    day: 19,
    phase: "romantic-fluency",
    title: "Chopin's Neapolitan Sixth (bII6) & Chromatic Mediants",
    theme: "Spot the dramatic lowered-2nd major triad (bII6) and shimmering bVI/bIII shifts.",
    keysIntroduced: ["C-minor", "E-major"],
    targetBpmRange: [62, 82],
    passages: ["romantic-cm-aug6-etude"],
    earSprints: ["ear-chord", "ear-cadence"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "In minor keys, a surprise flat on scale-degree 2 screams 'Neapolitan bII6!'",
    milestone: "Hear and sight-read bII6 → V7 → i cadences in any minor key.",
  },
  {
    day: 20,
    phase: "romantic-fluency",
    title: "Augmented Sixth Chords (It+6, Fr+6, Ger+6)",
    theme: "Master Chopin's signature outward-resolving chromatic predominants (b6 + #4 → 5).",
    keysIntroduced: ["C-minor", "F-minor"],
    targetBpmRange: [58, 76],
    passages: ["romantic-cm-aug6-etude"],
    earSprints: ["ear-chord", "ear-cadence"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "See b6 in bass + #4 on top? Prepare both hands to expand outward to V.",
    milestone: "Complete Romantic Cadence Etude with accurate Ger+6 → i6/4 → V7 → i resolution.",
  },
  {
    day: 21,
    phase: "romantic-fluency",
    title: "First Authentic Chopin: Prelude Op. 28 No. 7",
    theme: "Apply the full 5-Step Sight-Reading Ritual to Chopin's luminous A Major Prelude.",
    keysIntroduced: ["A-major"],
    targetBpmRange: [68, 84],
    passages: ["chopin-prelude-op28-no7"],
    earSprints: ["ear-cadence", "ear-dictation"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "Let the beat-3 pickup breathe; pedal cleanly on every beat-1 bass note.",
    milestone: "Sight-read Chopin Prelude Op. 28 No. 7 with expressive dynamics & pedal.",
  },
  {
    day: 22,
    phase: "romantic-fluency",
    title: "3:4 Polyrhythms & Eye-Hand Span Push",
    theme: "Introduce Chopin 3:4 cross-rhythms and push look-ahead masking a full bar ahead.",
    keysIntroduced: ["C#-minor", "Ab-major"],
    targetBpmRange: [64, 84],
    passages: ["chopin-prelude-op28-no7", "romantic-db-polyrhythm-nocturne"],
    earSprints: ["ear-interval", "ear-dictation"],
    rhythmSprint: "polyrhythm-tap",
    habitCue: "Lock your gaze on bar N+1 before bar N finishes.",
    milestone: "Week 3 Gate: Accurate 3:4 tap alignment and 1-full-bar eye-hand span.",
  },

  // Phase 4: Chopin Fluency & Mastery (Days 23-30)
  {
    day: 23,
    phase: "chopin-mastery",
    title: "Chopin Prelude Op. 28 No. 4 (Chromatic LH)",
    theme: "Read Chopin's E minor Prelude by tracking single-semitone voice-leading shifts in LH.",
    keysIntroduced: ["E-minor"],
    targetBpmRange: [50, 62],
    passages: ["chopin-prelude-op28-no4"],
    earSprints: ["ear-chord", "ear-cadence"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "Don't re-read all 3 LH notes—only read the ONE finger that slides down a half-step.",
    milestone: "Fluent sight-reading of Prelude Op. 28 No. 4 with cantabile RH balance.",
  },
  {
    day: 24,
    phase: "chopin-mastery",
    title: "Chopin Waltz in A Minor, B. 150",
    theme: "Combine blind LH waltz leaps with graceful, lyrical RH phrasing.",
    keysIntroduced: ["A-minor"],
    targetBpmRange: [96, 118],
    passages: ["chopin-waltz-aminor-b150"],
    earSprints: ["ear-interval", "ear-cadence"],
    rhythmSprint: "rhythm-isolation",
    habitCue:
      "Bounce off the beat-1 bass lightly; aim LH thumb directly for the middle-C landmark.",
    milestone: "Play Chopin Waltz in A minor fluently in blind-keyboard mode.",
  },
  {
    day: 25,
    phase: "chopin-mastery",
    title: "Chopin Prelude Op. 28 No. 20 (Chordal C Minor)",
    theme: "Read dense 4-note Romantic chord progressions rapidly via harmonic chunking.",
    keysIntroduced: ["C-minor"],
    targetBpmRange: [48, 60],
    passages: ["chopin-prelude-op28-no20"],
    earSprints: ["ear-chord", "ear-dictation"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "Voice the pinky soprano note boldly; read each chord by Roman function.",
    milestone: "Sight-read Prelude Op. 28 No. 20 recognizing every secondary dominant & bII.",
  },
  {
    day: 26,
    phase: "chopin-mastery",
    title: "24-Key Transposition & Ear Dictation Sprint",
    theme: "Interleaved sight-reading and functional dictation across remote sharp & flat keys.",
    keysIntroduced: ["F#-major", "Db-major", "G#-minor", "Eb-minor"],
    targetBpmRange: [68, 92],
    passages: ["chopin-prelude-op28-no7", "romantic-cm-aug6-etude"],
    earSprints: ["ear-cadence", "ear-dictation"],
    rhythmSprint: "polyrhythm-tap",
    habitCue: "Hear the Roman numerals (i – bII6 – V7 – i) independent of the starting key.",
    milestone: "Instant sight-reading orientation across 5- and 6-accidental keys.",
  },
  {
    day: 27,
    phase: "chopin-mastery",
    title: "Chopin Nocturne Op. 9 No. 2 in Eb Major",
    theme: "Master 12/8 bel-canto phrasing, wide LH leaps, and M6/m7 expressive melodic intervals.",
    keysIntroduced: ["Eb-major"],
    targetBpmRange: [52, 64],
    passages: ["chopin-nocturne-op9-no2"],
    earSprints: ["ear-interval", "ear-dictation"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "Feel 12/8 in four broad sighs; hear the Bb4→G5 Major 6th before touching the key.",
    milestone: "Sight-read Nocturne Op. 9 No. 2 opening with poised 12/8 accompaniment.",
  },
  {
    day: 28,
    phase: "chopin-mastery",
    title: "Chopin Mazurka Op. 7 No. 1 in Bb Major",
    theme:
      "Bring Polish dance vitality: dotted-eighth snaps, beat-2 accents, and crisp articulation.",
    keysIntroduced: ["Bb-major"],
    targetBpmRange: [116, 138],
    passages: ["chopin-mazurka-op7-no1"],
    earSprints: ["ear-chord", "ear-cadence"],
    rhythmSprint: "rhythm-isolation",
    habitCue: "Keep the sixteenth note late and snappy; lean playfully into beat 2.",
    milestone: "Sight-read Mazurka Op. 7 No. 1 at tempo with idiomatic dance rubato.",
  },
  {
    day: 29,
    phase: "chopin-mastery",
    title: "Chopin Anthology Medley & FSRS Deep Sweep",
    theme: "Clear overdue FSRS queue and sight-read rotating Chopin genres back-to-back.",
    keysIntroduced: ["A-major", "E-minor", "C-minor", "Eb-major", "Bb-major"],
    targetBpmRange: [60, 124],
    passages: [
      "chopin-prelude-op28-no7",
      "chopin-prelude-op28-no4",
      "chopin-waltz-aminor-b150",
      "chopin-mazurka-op7-no1",
    ],
    earSprints: ["ear-chord", "ear-dictation"],
    rhythmSprint: "polyrhythm-tap",
    habitCue: "Treat every new score as a fresh 30-second puzzle—zero panic, pure curiosity.",
    milestone: "Clear 100% of due FSRS cards across all 8 categories at >=88% retention.",
  },
  {
    day: 30,
    phase: "chopin-mastery",
    title: "Day 30 Capstone: Fluent Chopin Sight-Reader",
    theme:
      "Full 4-hour capstone: blind-keyboard Chopin sight-reading + ear dictation in any of 24 keys.",
    keysIntroduced: ["C-major", "Db-major", "F#-major", "Eb-minor"],
    targetBpmRange: [56, 132],
    passages: [
      "chopin-nocturne-op9-no2",
      "chopin-prelude-op28-no20",
      "chopin-prelude-op28-no4",
      "chopin-mazurka-op7-no1",
    ],
    earSprints: ["ear-cadence", "ear-dictation"],
    rhythmSprint: "polyrhythm-tap",
    habitCue:
      "You are a fluent sight-reader: preview 30s, feel the keys, read ahead, enjoy the music.",
    milestone:
      "120-Hour Mastery Complete: sight-read & hear Chopin idioms fluently in all 24 keys!",
  },
];

function buildDayPlan(seed: DaySeed): DayPlan {
  const keys = [...seed.keysIntroduced];
  const passages = [...seed.passages];

  const sprints: DailySprint[] = [
    // Hour 1: Interval & Shape Flash + Anki FSRS Retrieval
    DailySprintSchema.parse({
      index: 0,
      hour: 1,
      title: `Interval & Landmark Flash (Day ${seed.day})`,
      focusMinutes: 25,
      breakMinutes: 5,
      exerciseKind: "interval-flash",
      targetKeys: keys,
      targetPassages: passages,
      habitCue: seed.habitCue,
      drillTip: "Read relative step distance from the nearest landmark—never count letters.",
    }),
    DailySprintSchema.parse({
      index: 1,
      hour: 1,
      title: "Shape Chunks & FSRS Interleaved Retrieval",
      focusMinutes: 25,
      breakMinutes: 5,
      exerciseKind: "shape-chunk",
      targetKeys: keys,
      targetPassages: passages,
      habitCue: "Clear your due FSRS queue honestly so the algorithm calibrates your memory.",
      drillTip: "See triads, 7ths, and key signatures as instant visual silhouettes.",
    }),

    // Hour 2: Active Ear Training
    DailySprintSchema.parse({
      index: 2,
      hour: 2,
      title: "Active Ear: Intervals & Chord Qualities",
      focusMinutes: 25,
      breakMinutes: 5,
      exerciseKind: seed.earSprints[0],
      targetKeys: keys,
      targetPassages: passages,
      habitCue: "Sing or hum the top note before selecting your answer.",
      drillTip: "Connect every interval and inversion to its emotional color in Chopin.",
    }),
    DailySprintSchema.parse({
      index: 3,
      hour: 2,
      title: "Functional Roman-Numeral Cadences & Dictation",
      focusMinutes: 25,
      breakMinutes: 5,
      exerciseKind: seed.earSprints[1],
      targetKeys: keys,
      targetPassages: passages,
      habitCue:
        "Listen to the bass line first to lock in harmonic function (I, IV, V7, bII6, Ger+6).",
      drillTip: "Predict the resolution before the next chord sounds.",
    }),

    // Hour 3: Rhythm Isolation & Tactile Blind-Keyboard Hand-Frames
    DailySprintSchema.parse({
      index: 4,
      hour: 3,
      title:
        seed.rhythmSprint === "polyrhythm-tap"
          ? "Polyrhythm Split-Hand Tap Drill (2:3 & 3:4)"
          : "Rhythm Isolation & Metronome Lock",
      focusMinutes: 25,
      breakMinutes: 5,
      exerciseKind: seed.rhythmSprint,
      targetKeys: keys,
      targetPassages: passages,
      habitCue: "Aim for <= 25ms timing variance on the Rhythm Pad before adding pitches.",
      drillTip: "Subdivide internally; keep shoulders and wrists completely relaxed.",
    }),
    DailySprintSchema.parse({
      index: 5,
      hour: 3,
      title: "Blind-Keyboard Tactile Hand-Frames",
      focusMinutes: 25,
      breakMinutes: 5,
      exerciseKind: "tactile-blind-frame",
      targetKeys: keys,
      targetPassages: passages,
      habitCue: "Enable No-Peeking Veil and navigate strictly by 2-black / 3-black key clusters.",
      drillTip: "Your eyes belong on the score—teach your hands the geography of the keys.",
    }),

    // Hour 4: 5-Step Sight-Reading Ritual
    DailySprintSchema.parse({
      index: 6,
      hour: 4,
      title: "5-Step Ritual: Curated Repertoire",
      focusMinutes: 25,
      breakMinutes: 5,
      exerciseKind: "sight-reading-ritual",
      targetKeys: keys,
      targetPassages: passages,
      habitCue:
        "30s Preview → Isolate Rhythm → Look-Ahead Play Without Stopping → Fix Weakest Bar Once → FSRS Log.",
      drillTip: "Never stop for a missed note—keep the pulse alive and eyes one bar ahead.",
    }),
    DailySprintSchema.parse({
      index: 7,
      hour: 4,
      title: "5-Step Ritual: Unseen Procedural Sight-Reading",
      focusMinutes: 25,
      breakMinutes: 5,
      exerciseKind: "sight-reading-ritual",
      targetKeys: keys,
      targetPassages: passages,
      habitCue: "True sight-reading happens on music you have never seen before.",
      drillTip:
        "If accuracy drops below 80%, let Adaptive Flow step down 1 tier to keep effortless flow.",
    }),
  ];

  const blocks: DailyBlock[] = [
    DailyBlockSchema.parse({
      hour: 1,
      theme: "Interval & Shape Flash + Anki FSRS Retrieval",
      pillar: "interval-fsrs",
      totalMinutes: 60,
      sprints: sprints.slice(0, 2),
    }),
    DailyBlockSchema.parse({
      hour: 2,
      theme: "Active Ear Training (Intervals, Chords, Cadences & Dictation)",
      pillar: "active-ear",
      totalMinutes: 60,
      sprints: sprints.slice(2, 4),
    }),
    DailyBlockSchema.parse({
      hour: 3,
      theme: "Rhythm Isolation & Tactile Blind-Keyboard Hand-Frames",
      pillar: "rhythm-tactile",
      totalMinutes: 60,
      sprints: sprints.slice(4, 6),
    }),
    DailyBlockSchema.parse({
      hour: 4,
      theme: "5-Step Sight-Reading Ritual (Look-Ahead & Flow)",
      pillar: "sight-reading-ritual",
      totalMinutes: 60,
      sprints: sprints.slice(6, 8),
    }),
  ];

  return DayPlanSchema.parse({
    day: seed.day,
    phase: seed.phase,
    title: seed.title,
    theme: seed.theme,
    keysIntroduced: [...seed.keysIntroduced],
    targetBpmRange: [seed.targetBpmRange[0], seed.targetBpmRange[1]],
    sprints,
    blocks,
    milestone: seed.milestone,
  });
}

export const CURRICULUM_DAYS: readonly DayPlan[] = DAY_SEEDS.map(buildDayPlan);

export function getDayPlan(day: number): DayPlan {
  const clamped = Math.max(1, Math.min(30, Math.round(day)));
  const plan = CURRICULUM_DAYS[clamped - 1];
  if (!plan) {
    throw new Error(`Missing DayPlan for day ${clamped}`);
  }
  return plan;
}

export interface CurriculumSummary {
  totalDays: number;
  hoursPerDay: number;
  totalHours: number;
  sprintsPerDay: number;
  totalSprints: number;
  totalKeysCovered: number;
}

export function getCurriculumSummary(): CurriculumSummary {
  const uniqueKeys = new Set<KeySignatureId>();
  for (const day of CURRICULUM_DAYS) {
    for (const k of day.keysIntroduced) {
      uniqueKeys.add(k);
    }
  }
  return {
    totalDays: CURRICULUM_DAYS.length,
    hoursPerDay: 4,
    totalHours: CURRICULUM_DAYS.length * 4,
    sprintsPerDay: 8,
    totalSprints: CURRICULUM_DAYS.length * 8,
    totalKeysCovered: uniqueKeys.size,
  };
}

// ---------------------------------------------------------------------------
// Starter FSRS Deck & Initial Persisted State Builders
// ---------------------------------------------------------------------------

/**
 * Generates an interleaved FSRS deck spanning all 8 card categories
 * tailored up to `day` (1..30).
 */
export function createStarterFSRSDeck(day = 1, nowMs = 0): FSRSCard[] {
  const clampedDay = Math.max(1, Math.min(30, Math.round(day)));
  const maxTier = Math.min(5, Math.ceil(clampedDay / 6));
  const cards: FSRSCard[] = [];

  // 1. Landmark chunks
  for (const lm of LANDMARK_NOTES) {
    cards.push(
      createFSRSCard({
        id: `card-landmark-${lm.id}`,
        category: "landmark-chunk",
        promptKey: lm.id,
        prompt: `${lm.staffPosition} (${lm.clef} clef)`,
        answer: lm.label,
        difficultyLevel: 1,
        nowMs,
      }),
    );
  }

  // 2. Intervals (scaled by day)
  let intervalLimit = INTERVALS.length;
  if (clampedDay <= 5) {
    intervalLimit = 8;
  } else if (clampedDay <= 15) {
    intervalLimit = 14;
  }
  for (const iv of INTERVALS.slice(1, intervalLimit)) {
    cards.push(
      createFSRSCard({
        id: `card-interval-${iv.id}`,
        category: "interval",
        promptKey: iv.id,
        prompt: `${iv.fullName} (${iv.semitones} semitones, ${iv.visualShape})`,
        answer: `${iv.shortName} — ${iv.earReference}`,
        difficultyLevel: Math.min(10, Math.max(1, Math.ceil(iv.number / 1.5))),
        nowMs,
      }),
    );
  }

  // 3. Key signatures unlocked by this day
  for (const keyId of CORE_24_KEY_IDS) {
    const key = getKeySignature(keyId);
    if ((key.tier ?? 1) <= maxTier) {
      const accidentalLabel =
        key.accidentalType === "none" ? "accidentals" : `${key.accidentalType ?? "accidental"}s`;
      cards.push(
        createFSRSCard({
          id: `card-key-${key.id}`,
          category: "key-signature",
          promptKey: key.id,
          prompt: `${Math.abs(key.fifths)} ${accidentalLabel} (${key.mode})`,
          answer: key.label,
          difficultyLevel: Math.min(10, (key.tier ?? 1) * 2),
          nowMs,
        }),
      );
    }
  }

  // 4. Chord qualities & inversions
  const chordPrompts: readonly { key: string; prompt: string; answer: string; lvl: number }[] = [
    {
      key: "major-root",
      prompt: "Root triad: M3 + m3 (line-line-line)",
      answer: "Major Triad (root)",
      lvl: 1,
    },
    { key: "minor-root", prompt: "Root triad: m3 + M3", answer: "Minor Triad (root)", lvl: 1 },
    {
      key: "triad-inv-1",
      prompt: "3rd on bottom + 4th on top (6)",
      answer: "1st Inversion Triad",
      lvl: 3,
    },
    {
      key: "triad-inv-2",
      prompt: "4th on bottom + 3rd on top (6/4)",
      answer: "2nd Inversion Triad",
      lvl: 3,
    },
    {
      key: "dom7-inv",
      prompt: "4-note chord with crushed 2nd on top",
      answer: "Dominant 7th (1st inv V6/5)",
      lvl: 5,
    },
    {
      key: "half-dim7",
      prompt: "m3 + m3 + M3 (Chopin melancholic iiø7)",
      answer: "Half-Diminished 7th",
      lvl: 6,
    },
  ];
  for (const item of chordPrompts) {
    if (item.lvl <= maxTier * 2) {
      cards.push(
        createFSRSCard({
          id: `card-chord-${item.key}`,
          category: item.key.includes("inv") ? "inversion" : "chord-quality",
          promptKey: item.key,
          prompt: item.prompt,
          answer: item.answer,
          difficultyLevel: item.lvl,
          nowMs,
        }),
      );
    }
  }

  // 5. Rhythm cells
  for (const cell of RHYTHM_CELLS) {
    if (cell.tier <= maxTier) {
      cards.push(
        createFSRSCard({
          id: `card-rhythm-${cell.id}`,
          category: "rhythm-cell",
          promptKey: cell.id,
          prompt: `${cell.name} (${cell.timeSignature.numerator}/${cell.timeSignature.denominator})`,
          answer: cell.description,
          difficultyLevel: Math.min(10, cell.tier * 2),
          nowMs,
        }),
      );
    }
  }

  // 6. Chopin harmonic idioms (unlocked from tier 3+)
  if (maxTier >= 3) {
    const idioms = [
      {
        key: "neapolitan-bII6",
        prompt: "Major triad on b2 in 1st inversion (bII6)",
        answer: "Neapolitan Sixth → V",
      },
      {
        key: "german-aug6",
        prompt: "b6 – 1 – b3 – #4 expanding outward",
        answer: "German Augmented 6th → i6/4 → V",
      },
      {
        key: "italian-aug6",
        prompt: "b6 – 1 – #4 lean 3-note predominant",
        answer: "Italian Augmented 6th → V",
      },
      {
        key: "chromatic-mediant-bVI",
        prompt: "Borrowed major triad on b6 sharing tonic",
        answer: "Chromatic Mediant (bVI)",
      },
    ];
    for (const idiom of idioms) {
      cards.push(
        createFSRSCard({
          id: `card-idiom-${idiom.key}`,
          category: "chopin-idiom",
          promptKey: idiom.key,
          prompt: idiom.prompt,
          answer: idiom.answer,
          difficultyLevel: 8,
          nowMs,
        }),
      );
    }
  }

  // 7. Score passages unlocked by this day
  for (const passage of SCORE_LIBRARY) {
    if (passage.dayUnlock <= clampedDay) {
      cards.push(
        createFSRSCard({
          id: `card-passage-${passage.id}`,
          category: "score-passage",
          promptKey: passage.id,
          prompt: `${passage.title} (${passage.keySignature.label})`,
          answer: passage.harmonicSummary,
          difficultyLevel: passage.difficulty,
          nowMs,
        }),
      );
    }
  }

  return cards;
}

export function createInitialMusicModeState(nowMs = 0): MusicModeState {
  const starterCards = createStarterFSRSDeck(1, nowMs);
  const cardsMap: Record<string, FSRSCard> = {};
  for (const card of starterCards) {
    cardsMap[card.id] = card;
  }
  return MusicModeStateSchema.parse({
    id: "music-mode",
    currentDay: 1,
    activeSprintIndex: 0,
    ritualStep: "preview-30s",
    adaptiveDifficulty: 1,
    rollingAccuracy: 0.85,
    streakDays: 0,
    lastPracticeDate: null,
    totalMinutesPracticed: 0,
    completedSprintsByDay: {},
    cards: cardsMap,
    reviewLogs: [],
    flowState: createAdaptiveFlowState(1),
  });
}
