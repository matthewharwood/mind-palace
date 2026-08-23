import type { Meta, StoryObj } from "@storybook/react-vite";

import { CharacterRoundTimer } from "./index";

const meta = {
  title: "App/CharacterParty/RoundTimer",
  component: CharacterRoundTimer,
  args: { durationSeconds: 60, onStart: () => undefined },
} satisfies Meta<typeof CharacterRoundTimer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = { args: { secondsRemaining: null } };
export const Running: Story = { args: { secondsRemaining: 42 } };
export const TenSeconds: Story = { args: { secondsRemaining: 10 } };
export const Expired: Story = { args: { secondsRemaining: 0 } };
