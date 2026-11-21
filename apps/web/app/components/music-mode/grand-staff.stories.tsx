import type { Meta, StoryObj } from "@storybook/react-vite";

import { GrandStaff } from "./grand-staff";
import { ALL_24_KEY_SIGNATURES, type KeySignature, makePitch, type StaffMeasure } from "./types";

const C_MAJOR_FALLBACK: KeySignature = {
  id: "C-major",
  tonic: "C",
  mode: "major",
  fifths: 0,
  label: "C major",
  relativeId: "A-minor",
};

const E_MINOR = ALL_24_KEY_SIGNATURES.find((k) => k.id === "E-minor") ?? C_MAJOR_FALLBACK;
const EB_MAJOR = ALL_24_KEY_SIGNATURES.find((k) => k.id === "Eb-major") ?? C_MAJOR_FALLBACK;

const CHOPIN_EM_MEASURES: StaffMeasure[] = [
  {
    number: 1,
    rehearsalMark: "A",
    harmonyLabel: "i (Em)",
    events: [
      {
        id: "m1-rh-1",
        beatStart: 0,
        duration: "dotted-half",
        durationBeats: 3,
        staff: "treble",
        pitches: [makePitch("B", 4)],
        dynamic: "p",
        finger: 5,
        intervalLabel: "P5",
      },
      {
        id: "m1-rh-2",
        beatStart: 3,
        duration: "quarter",
        durationBeats: 1,
        staff: "treble",
        pitches: [makePitch("C", 5)],
        finger: 5,
        intervalLabel: "m2",
        tiedToNext: true,
      },
      {
        id: "m1-lh-1",
        beatStart: 0,
        duration: "eighth",
        durationBeats: 0.5,
        staff: "bass",
        beamGroup: "m1-lh-a",
        pitches: [makePitch("G", 3), makePitch("B", 3), makePitch("E", 4)],
      },
      {
        id: "m1-lh-2",
        beatStart: 0.5,
        duration: "eighth",
        durationBeats: 0.5,
        staff: "bass",
        beamGroup: "m1-lh-a",
        pitches: [makePitch("G", 3), makePitch("B", 3), makePitch("E", 4)],
      },
      {
        id: "m1-lh-3",
        beatStart: 1,
        duration: "quarter",
        durationBeats: 1,
        staff: "bass",
        pitches: [makePitch("G", 3), makePitch("B", 3), makePitch("E", 4)],
      },
      {
        id: "m1-lh-4",
        beatStart: 2,
        duration: "half",
        durationBeats: 2,
        staff: "bass",
        pitches: [makePitch("G", 3), makePitch("B", 3), makePitch("E", 4)],
      },
    ],
  },
  {
    number: 2,
    harmonyLabel: "i⁶ → vii°⁷/V",
    events: [
      {
        id: "m2-rh-1",
        beatStart: 0,
        duration: "half",
        durationBeats: 2,
        staff: "treble",
        pitches: [makePitch("C", 5)],
        finger: 5,
        status: "correct",
      },
      {
        id: "m2-rh-2",
        beatStart: 2,
        duration: "quarter",
        durationBeats: 1,
        staff: "treble",
        pitches: [makePitch("B", 4)],
        finger: 4,
        intervalLabel: "step",
        status: "active",
      },
      {
        id: "m2-rh-3",
        beatStart: 3,
        duration: "quarter",
        durationBeats: 1,
        staff: "treble",
        pitches: [makePitch("A", 4)],
        finger: 3,
      },
      {
        id: "m2-lh-1",
        beatStart: 0,
        duration: "half",
        durationBeats: 2,
        staff: "bass",
        pitches: [makePitch("F", 3, "#"), makePitch("A", 3), makePitch("E", 4)],
      },
      {
        id: "m2-lh-2",
        beatStart: 2,
        duration: "half",
        durationBeats: 2,
        staff: "bass",
        pitches: [makePitch("F", 3), makePitch("A", 3), makePitch("D", 4, "#")],
      },
    ],
  },
  {
    number: 3,
    harmonyLabel: "iv (Am)",
    isHardestBar: true,
    events: [
      {
        id: "m3-rh-1",
        beatStart: 0,
        duration: "eighth",
        durationBeats: 0.5,
        staff: "treble",
        beamGroup: "m3-rh",
        pitches: [makePitch("G", 4)],
        dynamic: "mp",
        finger: 2,
      },
      {
        id: "m3-rh-2",
        beatStart: 0.5,
        duration: "eighth",
        durationBeats: 0.5,
        staff: "treble",
        beamGroup: "m3-rh",
        pitches: [makePitch("A", 4)],
        finger: 3,
      },
      {
        id: "m3-rh-3",
        beatStart: 1,
        duration: "eighth",
        durationBeats: 0.5,
        staff: "treble",
        beamGroup: "m3-rh",
        pitches: [makePitch("B", 4)],
        finger: 4,
      },
      {
        id: "m3-rh-4",
        beatStart: 1.5,
        duration: "eighth",
        durationBeats: 0.5,
        staff: "treble",
        beamGroup: "m3-rh",
        pitches: [makePitch("C", 5)],
        finger: 5,
      },
      {
        id: "m3-rh-5",
        beatStart: 2,
        duration: "half",
        durationBeats: 2,
        staff: "treble",
        pitches: [makePitch("E", 5), makePitch("G", 5)],
        intervalLabel: "m3",
      },
      {
        id: "m3-lh-1",
        beatStart: 0,
        duration: "quarter",
        durationBeats: 1,
        staff: "bass",
        pitches: [makePitch("E", 3), makePitch("A", 3), makePitch("C", 4)],
      },
      {
        id: "m3-lh-2",
        beatStart: 1,
        duration: "quarter",
        durationBeats: 1,
        staff: "bass",
        isRest: true,
        pitches: [],
      },
      {
        id: "m3-lh-3",
        beatStart: 2,
        duration: "half",
        durationBeats: 2,
        staff: "bass",
        pitches: [makePitch("C", 3), makePitch("E", 3), makePitch("A", 3)],
      },
    ],
  },
  {
    number: 4,
    harmonyLabel: "V⁷ → i",
    events: [
      {
        id: "m4-rh-1",
        beatStart: 0,
        duration: "half",
        durationBeats: 2,
        staff: "treble",
        pitches: [makePitch("D", 5, "#"), makePitch("F", 5, "#")],
        intervalLabel: "m3",
      },
      {
        id: "m4-rh-2",
        beatStart: 2,
        duration: "half",
        durationBeats: 2,
        staff: "treble",
        pitches: [makePitch("E", 5)],
        dynamic: "pp",
      },
      {
        id: "m4-lh-1",
        beatStart: 0,
        duration: "half",
        durationBeats: 2,
        staff: "bass",
        pitches: [makePitch("B", 2), makePitch("F", 3, "#"), makePitch("A", 3)],
      },
      {
        id: "m4-lh-2",
        beatStart: 2,
        duration: "half",
        durationBeats: 2,
        staff: "bass",
        pitches: [makePitch("E", 3), makePitch("B", 3)],
      },
    ],
  },
];

const EB_NOCTURNE_MEASURES: StaffMeasure[] = [
  {
    number: 1,
    harmonyLabel: "I (E♭)",
    events: [
      {
        id: "eb-1",
        beatStart: 0,
        duration: "dotted-quarter",
        durationBeats: 1.5,
        staff: "treble",
        pitches: [makePitch("G", 4)],
        dynamic: "p",
      },
      {
        id: "eb-2",
        beatStart: 1.5,
        duration: "eighth",
        durationBeats: 0.5,
        staff: "treble",
        beamGroup: "eb-b1",
        pitches: [makePitch("B", 4, "b")],
        intervalLabel: "m3",
      },
      {
        id: "eb-3",
        beatStart: 2,
        duration: "quarter",
        durationBeats: 1,
        staff: "treble",
        pitches: [makePitch("E", 5, "b")],
        intervalLabel: "P4",
      },
      {
        id: "eb-lh-1",
        beatStart: 0,
        duration: "quarter",
        durationBeats: 1,
        staff: "bass",
        pitches: [makePitch("E", 2, "b")],
      },
      {
        id: "eb-lh-2",
        beatStart: 1,
        duration: "quarter",
        durationBeats: 1,
        staff: "bass",
        pitches: [makePitch("B", 2, "b"), makePitch("G", 3)],
      },
      {
        id: "eb-lh-3",
        beatStart: 2,
        duration: "quarter",
        durationBeats: 1,
        staff: "bass",
        pitches: [makePitch("B", 2, "b"), makePitch("E", 3, "b"), makePitch("G", 3)],
      },
    ],
  },
  {
    number: 2,
    harmonyLabel: "V⁷ (B♭⁷)",
    isHardestBar: true,
    events: [
      {
        id: "eb-4",
        beatStart: 0,
        duration: "half",
        durationBeats: 2,
        staff: "treble",
        pitches: [makePitch("D", 5), makePitch("A", 5, "b")],
        intervalLabel: "d5",
      },
      {
        id: "eb-5",
        beatStart: 2,
        duration: "quarter",
        durationBeats: 1,
        staff: "treble",
        pitches: [makePitch("G", 5)],
      },
      {
        id: "eb-lh-4",
        beatStart: 0,
        duration: "dotted-half",
        durationBeats: 3,
        staff: "bass",
        pitches: [makePitch("B", 2, "b"), makePitch("F", 3), makePitch("A", 3, "b")],
      },
    ],
  },
];

const meta = {
  title: "MusicMode/GrandStaff",
  component: GrandStaff,
  parameters: { layout: "padded" },
} satisfies Meta<typeof GrandStaff>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ChopinPreludeInEMinor: Story = {
  args: {
    title: "Prelude in E minor, Op. 28 No. 4 (Study Excerpt)",
    composer: "Frédéric Chopin • Sight-Reading Adaptation",
    keySignature: E_MINOR,
    timeSignature: { numerator: 4, denominator: 4 },
    measures: CHOPIN_EM_MEASURES,
    mode: "standard",
    showRomanNumerals: true,
    showIntervalShapes: true,
    showFingerings: true,
  },
};

export const LookAheadMode: Story = {
  args: {
    ...ChopinPreludeInEMinor.args,
    mode: "look-ahead",
    activeMeasure: 2,
    activeBeat: 2,
    lookAheadMaskOpacity: 0.72,
    showRomanNumerals: false,
    showIntervalShapes: true,
  },
};

export const ThirtySecondPreview: Story = {
  args: {
    ...ChopinPreludeInEMinor.args,
    mode: "preview-30s",
    previewFocus: "all",
    showRomanNumerals: true,
  },
};

export const RhythmIsolationMode: Story = {
  args: {
    ...ChopinPreludeInEMinor.args,
    mode: "rhythm-only",
    activeMeasure: 3,
    activeBeat: 1,
  },
};

export const FlatKeyNocturne: Story = {
  args: {
    title: "Nocturne Study in E♭ Major",
    composer: "3-Flat Key Signature & Waltz Accompaniment",
    keySignature: EB_MAJOR,
    timeSignature: { numerator: 3, denominator: 4 },
    measures: EB_NOCTURNE_MEASURES,
    mode: "standard",
    showRomanNumerals: true,
    showIntervalShapes: true,
  },
};

export const GuidedWaitModeLoopRH: Story = {
  args: {
    ...ChopinPreludeInEMinor.args,
    mode: "standard",
    notationScaffold: "guided-colors",
    handMode: "rh",
    awaitedBeat: { barNumber: 2, beatStart: 2 },
    loopRange: { startBar: 2, endBar: 3 },
  },
};

export const PureUrtextParchment: Story = {
  args: {
    ...ChopinPreludeInEMinor.args,
    mode: "standard",
    notationScaffold: "pure-urtext",
  },
};
