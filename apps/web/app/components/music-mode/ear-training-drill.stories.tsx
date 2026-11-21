import type { Meta, StoryObj } from "@storybook/react-vite";

import { EarTrainingDrill } from "./ear-training-drill";

const meta: Meta<typeof EarTrainingDrill> = {
  title: "Music Mode/EarTrainingDrill",
  component: EarTrainingDrill,
  parameters: { layout: "padded" },
  args: {
    exerciseKind: "ear-interval",
    difficulty: 3,
    blindKeyboard: true,
    onExerciseKindChange: () => undefined,
    onDrillResult: () => undefined,
  },
};

export default meta;
type Story = StoryObj<typeof EarTrainingDrill>;

export const EarInterval: Story = {};

export const ShapeChunkVisual: Story = {
  args: {
    exerciseKind: "shape-chunk",
    difficulty: 5,
  },
};

export const TactileBlindFrame: Story = {
  args: {
    exerciseKind: "tactile-blind-frame",
    difficulty: 2,
    lastFlowReason: "Difficulty eased to Level 2 to keep you in the 80–85% flow zone.",
  },
};
