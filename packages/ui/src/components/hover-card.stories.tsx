import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";

const meta = {
  title: "UI/HoverCard",
  component: HoverCard,
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof HoverCard>;

export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="link">@mind-palace</Button>
      </HoverCardTrigger>
      <HoverCardContent>
        <p className="text-sm">A portable, Zod-friendly component library.</p>
      </HoverCardContent>
    </HoverCard>
  ),
};
