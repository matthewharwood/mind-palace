import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card } from "./card";

// Local demo faces (not exported, to keep the story file component-export clean).
function ElementFront(): React.ReactNode {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-amber-50 p-3 text-amber-950">
      <span className="text-xs font-semibold opacity-70">79</span>
      <span className="self-center text-4xl font-bold">Au</span>
      <span className="self-center text-sm">Gold</span>
    </div>
  );
}

function CardBack(): React.ReactNode {
  return (
    <div className="flex h-full w-full items-center justify-center bg-indigo-700 text-indigo-200">
      <span className="text-2xl">✦</span>
    </div>
  );
}

const meta = {
  title: "Cards/Card",
  component: Card,
  parameters: { layout: "centered" },
  args: { front: <ElementFront />, shape: "rounded", size: "md" },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {};

export const Shapes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Card front={<ElementFront />} shape="rect" />
      <Card front={<ElementFront />} shape="rounded" />
      <Card front={<ElementFront />} shape="circle" />
      <Card front={<ElementFront />} shape="hex" />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Card front={<ElementFront />} size="sm" />
      <Card front={<ElementFront />} size="md" />
      <Card front={<ElementFront />} size="lg" />
    </div>
  ),
};

export const FlipFront: Story = {
  args: { flippable: true, face: "front", back: <CardBack /> },
};

export const FlipBack: Story = {
  args: { flippable: true, face: "back", back: <CardBack /> },
};

export const States: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Card front={<ElementFront />} state="overValid" />
      <Card front={<ElementFront />} state="overInvalid" />
      <Card front={<ElementFront />} state="pickedUp" />
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
};
