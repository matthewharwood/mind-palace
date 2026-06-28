import type { Meta, StoryObj } from "@storybook/react-vite";

import { AspectRatio } from "./aspect-ratio";

const meta = {
  title: "UI/AspectRatio",
  component: AspectRatio,
} satisfies Meta<typeof AspectRatio>;

export default meta;
type Story = StoryObj<typeof AspectRatio>;

export const Default: Story = {
  render: () => (
    <div className="w-72">
      <AspectRatio ratio={16 / 9} className="rounded-md bg-muted">
        <div className="flex size-full items-center justify-center text-muted-foreground text-sm">
          16 / 9
        </div>
      </AspectRatio>
    </div>
  ),
};
