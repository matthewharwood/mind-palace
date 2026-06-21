import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { createHaptics, type HapticPatternName } from "./haptics";

const NAMES: HapticPatternName[] = ["light", "medium", "heavy", "success", "warning", "error"];

function HapticDemo(): React.ReactNode {
  const [haptics] = useState(() => createHaptics());
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-500">
        Supported on this device: <strong>{String(haptics.supported)}</strong>
        {haptics.supported ? "" : " — calls are a silent no-op (e.g. iPad/desktop)."}
      </p>
      <div className="flex flex-wrap gap-2">
        {NAMES.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => haptics.vibrate(name)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

const meta = {
  title: "Cards/Haptics",
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;

export const Player: StoryObj = { render: () => <HapticDemo /> };
