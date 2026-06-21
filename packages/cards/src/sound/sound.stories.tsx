import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { createCardSoundService, DEFAULT_CARD_SOUNDS } from "./default-registry";

function SoundDemo(): React.ReactNode {
  const [service] = useState(() => createCardSoundService());
  const ids = Object.keys(DEFAULT_CARD_SOUNDS);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-500">
        Click a cue to play it (the first click unlocks audio).
      </p>
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => service.play(id)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
          >
            {id}
          </button>
        ))}
      </div>
    </div>
  );
}

const meta = {
  title: "Cards/Sound",
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;

export const Player: StoryObj = { render: () => <SoundDemo /> };
