import type { Meta, StoryObj } from "@storybook/react-vite";

import { VectorDungeonGuide } from "./index";

const meta = {
  title: "App/VectorDungeonGuide",
  component: VectorDungeonGuide,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof VectorDungeonGuide>;

export default meta;
type Story = StoryObj<typeof VectorDungeonGuide>;

export const Printable: Story = {
  args: { title: "Dean's Vector Dungeon" },
};
