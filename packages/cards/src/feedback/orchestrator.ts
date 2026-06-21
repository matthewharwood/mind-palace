import type { DropResult, OverInfo } from "../drag/schema";
import { type CardHapticMap, cardHapticFeedback, type HapticController } from "../haptics/haptics";
import { type CardSoundMap, cardSoundFeedback } from "../sound/feedback";
import type { SoundService } from "../sound/service";

// ---------------------------------------------------------------------------
// Feedback orchestration — wire ONE thing instead of three. Visual feedback is
// already automatic (the engine writes data-state; CSS reacts). This merges the
// sound + haptic bridges into a single set of handlers to spread onto a
// <Draggable>. Either channel is optional, so a project can ship sound-only,
// haptics-only, or both, and retune cue mapping per channel.
// ---------------------------------------------------------------------------

export interface CardFeedbackOptions {
  sound?: SoundService;
  haptics?: HapticController;
  soundMap?: CardSoundMap;
  hapticMap?: CardHapticMap;
}

export interface CardFeedbackHandlers {
  onPickup: () => void;
  onOver: (info: OverInfo) => void;
  onRelease: (result: DropResult) => void;
}

export function createCardFeedback(options: CardFeedbackOptions): CardFeedbackHandlers {
  const sound = options.sound ? cardSoundFeedback(options.sound, options.soundMap) : null;
  const haptics = options.haptics ? cardHapticFeedback(options.haptics, options.hapticMap) : null;
  return {
    onPickup: () => {
      sound?.onPickup();
      haptics?.onPickup();
    },
    onOver: (info) => {
      haptics?.onOver(info); // the sound bridge intentionally stays silent on hover
    },
    onRelease: (result) => {
      sound?.onRelease(result);
      haptics?.onRelease(result);
    },
  };
}
