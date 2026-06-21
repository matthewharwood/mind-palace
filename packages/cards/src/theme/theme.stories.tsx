import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card } from "../card/card";
import { CardSlot } from "../slot/card-slot";

// Abstraction audit — proves ANY theme + ANY size from token overrides alone,
// no forking. Each group sets --mp-card-* on a wrapper; the same Card/CardSlot
// components re-skin entirely. (The iPhone-SE *size* case is in Cards/Draggable.)

function Face({ label, className }: { label: string; className: string }): React.ReactNode {
  return (
    <div className={`flex h-full w-full items-center justify-center text-center ${className}`}>
      {label}
    </div>
  );
}

const NEON =
  "[--mp-card-bg:#0f172a] [--mp-card-fg:#e2e8f0] [--mp-card-radius:1.25rem] [--mp-card-border-color:#22d3ee]";
const PAPER =
  "[--mp-card-bg:#fdf6e3] [--mp-card-fg:#5b4636] [--mp-card-radius:0.25rem] [--mp-card-border-color:#d8c8a8]";
const BIG = "[--mp-card-w:16rem] [--mp-card-h:9rem]"; // wide, landscape — arbitrary ratio

const meta = {
  title: "Cards/Theming",
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;

export const ThemeOverrides: StoryObj = {
  render: () => (
    <div className="flex flex-wrap items-center gap-8">
      <div className={NEON}>
        <Card front={<Face label="Neon" className="text-cyan-300" />} />
      </div>
      <div className={PAPER}>
        <Card front={<Face label="Paper" className="text-stone-700" />} />
      </div>
    </div>
  ),
};

export const ArbitrarySize: StoryObj = {
  render: () => (
    <div className="flex flex-col items-center gap-6">
      <div className={BIG}>
        <Card front={<Face label="16rem × 9rem (custom ratio)" className="bg-violet-100" />} />
      </div>
      <div className={`flex gap-4 ${BIG}`}>
        <CardSlot slotId="wide-1" />
      </div>
    </div>
  ),
};
