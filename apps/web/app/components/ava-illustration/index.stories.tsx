import type { Meta, StoryObj } from "@storybook/react-vite";
import { AvaIllustration } from "./index";

const meta = {
  title: "Ava/Illustration",
  component: AvaIllustration,
  decorators: [
    (Story) => (
      <div className="size-[min(90vw,40rem)] bg-[#fffaf0]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AvaIllustration>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Jump: Story = { args: { sceneId: "ava-jump", label: "Jump illustration" } };
export const Help: Story = { args: { sceneId: "ava-need-help", label: "Help illustration" } };
export const Under: Story = {
  args: { sceneId: "ava-position-under", label: "Under illustration" },
};
export const Counting: Story = {
  args: {
    sceneId: "number-5",
    representation: "alternate",
    label: "Five: alternate representation",
  },
};
export const Letter: Story = {
  args: { sceneId: "letter-a", representation: "word", label: "A for Apple: word representation" },
};
export const Shape: Story = {
  args: { sceneId: "shape-square-colorless", label: "Square illustration" },
};
