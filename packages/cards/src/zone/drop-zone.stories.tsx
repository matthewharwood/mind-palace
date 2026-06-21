import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card } from "../card/card";
import { DropZone } from "./drop-zone";

function ElementFront(): React.ReactNode {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-amber-50 p-3 text-amber-950">
      <span className="text-xs font-semibold opacity-70">79</span>
      <span className="self-center text-4xl font-bold">Au</span>
      <span className="self-center text-sm">Gold</span>
    </div>
  );
}

function ZoneLabel({ text }: { text: string }): React.ReactNode {
  return (
    <div className="flex h-40 w-72 items-center justify-center text-sm font-medium text-neutral-500">
      {text}
    </div>
  );
}

const meta = {
  title: "Cards/DropZone",
  component: DropZone,
  parameters: { layout: "centered" },
  args: { zoneId: "discard" },
} satisfies Meta<typeof DropZone>;

export default meta;
type Story = StoryObj<typeof DropZone>;

export const Idle: Story = {
  args: { children: <ZoneLabel text="Drop here" /> },
};

export const OverValid: Story = {
  args: { state: "overValid", children: <ZoneLabel text="Release to drop" /> },
};

export const OverInvalid: Story = {
  args: { state: "overInvalid", children: <ZoneLabel text="Can't drop here" /> },
};

export const Disabled: Story = {
  args: { disabled: true, children: <ZoneLabel text="Closed" /> },
};

export const WithCards: Story = {
  render: () => (
    <DropZone zoneId="tray" className="flex flex-wrap gap-3 p-4">
      <Card front={<ElementFront />} size="sm" />
      <Card front={<ElementFront />} size="sm" />
      <Card front={<ElementFront />} size="sm" />
    </DropZone>
  ),
};
