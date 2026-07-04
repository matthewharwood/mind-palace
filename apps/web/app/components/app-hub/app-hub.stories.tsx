import type { Meta, StoryObj } from "@storybook/react-vite";

import { AppHub } from "./index";

const meta = {
  title: "App/AppHub",
  component: AppHub,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AppHub>;

export default meta;
type Story = StoryObj<typeof AppHub>;

export const Default: Story = {
  args: {
    title: "Choose your path",
    description: "Study cards and parent-run applications live side by side.",
    items: [
      {
        title: "Study Guide",
        description: "Continue the Rust and graphics learning paths.",
        href: "/goals",
        kind: "study",
        cta: "Open study guide",
      },
      {
        title: "Vector Dungeon",
        description: "Run a printable grid adventure from a phone.",
        href: "/apps/vector-dungeon",
        kind: "dm",
        cta: "Open DM app",
      },
    ],
  },
};
