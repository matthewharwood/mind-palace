import type { ReactNode } from "react";

export function MiniGameBody({ prompt }: { prompt: string }): ReactNode {
  return (
    <div className="rounded-md border border-dashed border-black/20 p-4 text-sm opacity-80">
      <p className="font-medium">Card mini-game</p>
      <p>{prompt}</p>
      <p className="mt-2 text-xs opacity-60">Built on @mind-palace/cards (drag-and-drop).</p>
    </div>
  );
}
