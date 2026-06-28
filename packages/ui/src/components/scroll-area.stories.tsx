import type { Meta, StoryObj } from "@storybook/react-vite";

import { ScrollArea } from "./scroll-area";

const meta = {
  title: "UI/ScrollArea",
  component: ScrollArea,
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof ScrollArea>;

const TAGS = Array.from({ length: 25 }, (_, i) => `Tag ${i + 1}`);

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-48 w-56 rounded-md border p-3">
      {TAGS.map((tag) => (
        <div key={tag} className="border-b py-1.5 text-sm last:border-0">
          {tag}
        </div>
      ))}
    </ScrollArea>
  ),
};
