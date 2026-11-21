import type { Meta, StoryObj } from "@storybook/react-vite";

import { TactileKeyboard } from "./tactile-keyboard";

const meta = {
  title: "MusicMode/TactileKeyboard",
  component: TactileKeyboard,
  parameters: { layout: "padded" },
} satisfies Meta<typeof TactileKeyboard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BlindTactileDefault: Story = {
  args: {
    startOctave: 3,
    octaves: 2,
    showNoteLabels: false,
    emphasizeBlackClusters: true,
    handFrames: [
      { hand: "LH", rootMidi: 48, label: "LH C3 Frame" },
      { hand: "RH", rootMidi: 60, label: "RH C4 Frame" },
    ],
  },
};

export const IPadProFourOctaveChordShape: Story = {
  args: {
    startOctave: 2,
    octaves: 4,
    showNoteLabels: false,
    emphasizeBlackClusters: true,
    targetNotes: [52, 55, 59, 64],
    correctNotes: [52, 59],
    wrongNotes: [65],
    intervalBracket: { fromMidi: 52, toMidi: 59, label: "P5 (E3–B3)" },
    handFrames: [
      { hand: "LH", rootMidi: 52, label: "LH E-minor" },
      { hand: "RH", rootMidi: 64, label: "RH E4–B4" },
    ],
  },
};

export const NoPeekingVeilActive: Story = {
  args: {
    startOctave: 3,
    octaves: 3,
    showNoteLabels: false,
    emphasizeBlackClusters: true,
    blindVeil: true,
    targetNotes: [60, 64, 67],
    handFrames: [{ hand: "RH", rootMidi: 60, label: "Feel C–G" }],
  },
};

export const LabeledBeginnerReference: Story = {
  args: {
    startOctave: 4,
    octaves: 2,
    showNoteLabels: true,
    emphasizeBlackClusters: true,
    pressedNotes: [60, 64, 67],
  },
};
