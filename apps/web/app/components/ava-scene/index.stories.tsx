import type { Meta, StoryObj } from "@storybook/react-vite";
import { AvaScene } from "./index";

const meta = {
  title: "Ava/Scene",
  component: AvaScene,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="h-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AvaScene>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Jump: Story = { args: { sceneId: "ava-jump", label: "Jump" } };
export const Under: Story = { args: { sceneId: "ava-position-under", label: "Under" } };
export const Counting: Story = {
  args: { sceneId: "number-5", label: "Five", variant: "alternate" },
};
