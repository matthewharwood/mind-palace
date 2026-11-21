import type { Meta, StoryObj } from "@storybook/react-vite";

import { SCORE_LIBRARY } from "~/lib/music-mode/scores";
import { SightReadingRitual } from "./sight-reading-ritual";

const firstPassage = SCORE_LIBRARY[0];
const chopinPassage = SCORE_LIBRARY.find((p) => p.tier === "chopin-excerpt") ?? SCORE_LIBRARY[0];

if (!firstPassage || !chopinPassage) {
  throw new Error("SCORE_LIBRARY must contain at least one passage");
}

const meta: Meta<typeof SightReadingRitual> = {
  title: "Music Mode/SightReadingRitual",
  component: SightReadingRitual,
  parameters: { layout: "padded" },
  args: {
    passage: firstPassage,
    step: "preview-30s",
    bpmOffset: 0,
    blindKeyboard: true,
    lookAheadMasking: true,
    showIntervalsOverlay: true,
    showRomanNumerals: false,
    showQwertyHints: false,
    autoFocusOnPlay: true,
    focusMode: false,
    onStepChange: () => undefined,
    onRate: () => undefined,
  },
};

export default meta;
type Story = StoryObj<typeof SightReadingRitual>;

export const Step1Preview: Story = {};

export const Step2RhythmIsolation: Story = {
  args: {
    passage: chopinPassage,
    step: "rhythm-isolate",
  },
};

export const Step3LookAheadPlay: Story = {
  args: {
    passage: chopinPassage,
    step: "look-ahead-play",
    showRomanNumerals: true,
  },
};

export const Step5FsrsRating: Story = {
  args: {
    passage: chopinPassage,
    step: "fsrs-rate",
  },
};
