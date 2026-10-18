import type { Meta, StoryObj } from "@storybook/react-vite";
import { AvaSymbolCardSchema, getAvaSymbolCards } from "~/lib/ava-symbols";
import { AvaSymbolPicture } from "./index";

const meta = {
  title: "App/AvaSymbolPicture",
  component: AvaSymbolPicture,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="h-dvh">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AvaSymbolPicture>;
export default meta;
type Story = StoryObj<typeof meta>;

export const CountingFrame: Story = {
  args: {
    card: AvaSymbolCardSchema.parse(getAvaSymbolCards("ava-numbers")[5]),
    representation: "alternate",
    mode: "2d",
  },
};
export const Letter: Story = {
  args: {
    card: AvaSymbolCardSchema.parse(getAvaSymbolCards("ava-letters")[0]),
    representation: "word",
    mode: "2d",
  },
};
export const ThreeD: Story = { args: { ...Letter.args, mode: "3d" } };
