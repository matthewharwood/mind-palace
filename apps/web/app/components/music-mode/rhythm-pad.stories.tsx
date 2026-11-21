import type { Meta, StoryObj } from "@storybook/react-vite";

import { RhythmPad } from "./rhythm-pad";

const meta = {
  title: "MusicMode/RhythmPad",
  component: RhythmPad,
  parameters: { layout: "padded" },
} satisfies Meta<typeof RhythmPad>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleHandIsolation: Story = {
  args: {
    mode: "single",
    bpm: 76,
    beatsPerMeasure: 4,
    activeSlot: 2,
    lastHit: {
      id: "hit-1",
      hand: "single",
      slotIndex: 1,
      offsetMs: -8,
      rating: "on-beat",
      timestampMs: 1000,
    },
    recentHits: [
      { id: "h1", hand: "single", slotIndex: 0, offsetMs: 12, rating: "on-beat", timestampMs: 200 },
      {
        id: "h2",
        hand: "single",
        slotIndex: 1,
        offsetMs: -8,
        rating: "on-beat",
        timestampMs: 1000,
      },
    ],
  },
};

export const ChopinTwoAgainstThree: Story = {
  args: {
    mode: "split-hands",
    polyrhythm: "2:3",
    bpm: 64,
    activeSlot: 2,
    lastHit: {
      id: "poly-1",
      hand: "RH",
      slotIndex: 1,
      offsetMs: 34,
      rating: "slightly-late",
      timestampMs: 1500,
    },
    recentHits: [
      { id: "p1", hand: "LH", slotIndex: 0, offsetMs: -5, rating: "on-beat", timestampMs: 500 },
      { id: "p2", hand: "RH", slotIndex: 0, offsetMs: 4, rating: "on-beat", timestampMs: 504 },
      {
        id: "p3",
        hand: "RH",
        slotIndex: 1,
        offsetMs: 34,
        rating: "slightly-late",
        timestampMs: 1500,
      },
    ],
  },
};

export const ChopinThreeAgainstFour: Story = {
  args: {
    mode: "split-hands",
    polyrhythm: "3:4",
    bpm: 58,
    activeSlot: 4,
    lastHit: {
      id: "poly34-1",
      hand: "LH",
      slotIndex: 1,
      offsetMs: -68,
      rating: "early",
      timestampMs: 2000,
    },
    recentHits: [
      { id: "q1", hand: "LH", slotIndex: 0, offsetMs: 9, rating: "on-beat", timestampMs: 1000 },
      { id: "q2", hand: "RH", slotIndex: 0, offsetMs: -6, rating: "on-beat", timestampMs: 1005 },
      { id: "q3", hand: "RH", slotIndex: 1, offsetMs: 14, rating: "on-beat", timestampMs: 1500 },
      { id: "q4", hand: "LH", slotIndex: 1, offsetMs: -68, rating: "early", timestampMs: 2000 },
    ],
  },
};
