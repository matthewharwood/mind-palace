import type { DropResult } from "../drag/schema";
import type { SoundService } from "./service";

// Drag → sound bridge. Lives apart from default-registry.ts (which imports the
// .mp3 assets) so the orchestrator and core can wire sound without pulling audio
// binaries into their module graph.

/** Maps drag events to sound ids; override any to retheme the audio cues. */
export interface CardSoundMap {
  pickup?: string;
  drop?: string;
  swap?: string;
  replace?: string;
}

const DEFAULT_SOUND_MAP: Required<CardSoundMap> = {
  pickup: "card.pickup",
  drop: "card.drop",
  swap: "card.swap",
  replace: "card.replace",
};

/** Spread the returned handlers onto a `<Draggable>` to wire pickup/drop/swap/
 *  replace cues. Pure mapping; the service plays. */
export function cardSoundFeedback(
  service: SoundService,
  map?: CardSoundMap,
): { onPickup: () => void; onRelease: (result: DropResult) => void } {
  const ids = { ...DEFAULT_SOUND_MAP, ...map };
  return {
    onPickup: () => service.play(ids.pickup),
    onRelease: (result) => {
      if (result.intent.kind === "drop") service.play(ids.drop);
      else if (result.intent.kind === "swap") service.play(ids.swap);
      else if (result.intent.kind === "replace") service.play(ids.replace);
    },
  };
}
