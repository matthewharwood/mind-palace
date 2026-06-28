import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "./input";

const meta = {
  title: "UI/Input",
  component: Input,
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { placeholder: "Email", className: "max-w-xs" } };
export const Disabled: Story = {
  args: { placeholder: "Disabled", disabled: true, className: "max-w-xs" },
};
