import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card } from "../card/card";
import { CardSlot } from "./card-slot";

function ElementFront(): React.ReactNode {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-amber-50 p-3 text-amber-950">
      <span className="text-xs font-semibold opacity-70">79</span>
      <span className="self-center text-4xl font-bold">Au</span>
      <span className="self-center text-sm">Gold</span>
    </div>
  );
}

const meta = {
  title: "Cards/CardSlot",
  component: CardSlot,
  parameters: { layout: "centered" },
  args: { slotId: "slot-1" },
} satisfies Meta<typeof CardSlot>;

export default meta;
type Story = StoryObj<typeof CardSlot>;

export const Empty: Story = {};

export const Filled: Story = {
  args: { children: <Card front={<ElementFront />} /> },
};

export const Row: Story = {
  render: () => (
    <div className="flex gap-4">
      <CardSlot slotId="s1">
        <Card front={<ElementFront />} />
      </CardSlot>
      <CardSlot slotId="s2" />
      <CardSlot slotId="s3" />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <CardSlot slotId="v" state="overValid" />
      <CardSlot slotId="i" state="overInvalid" />
      <CardSlot slotId="w" state="overSwap" occupied>
        <Card front={<ElementFront />} />
      </CardSlot>
    </div>
  ),
};

export const Shapes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <CardSlot slotId="r" shape="rect" />
      <CardSlot slotId="ro" shape="rounded" />
      <CardSlot slotId="c" shape="circle" />
      <CardSlot slotId="h" shape="hex" />
    </div>
  ),
};

export const DisabledAndLocked: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <CardSlot slotId="d" disabled />
      <CardSlot slotId="l" locked>
        <Card front={<ElementFront />} />
      </CardSlot>
    </div>
  ),
};
