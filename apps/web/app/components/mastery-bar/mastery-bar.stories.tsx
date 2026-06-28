import type { Meta, StoryObj } from "@storybook/react-vite";

import { MasteryBar } from "./index";

const meta = {
  title: "App/MasteryBar",
  component: MasteryBar,
  parameters: { layout: "padded" },
} satisfies Meta<typeof MasteryBar>;

export default meta;
type Story = StoryObj<typeof MasteryBar>;

export const Mixed: Story = {
  args: { counts: { review: 8, learning: 4, relearning: 2, new: 6 }, total: 20 },
};

export const Untouched: Story = {
  args: { counts: { review: 0, learning: 0, relearning: 0, new: 20 }, total: 20 },
};

export const Mastered: Story = {
  args: { counts: { review: 20, learning: 0, relearning: 0, new: 0 }, total: 20 },
};
