// @mind-palace/cards/haptics — pluggable tactile feedback (no-op on iPad).
//
//   import { createHaptics, cardHapticFeedback } from "@mind-palace/cards/haptics";
//   const haptics = createHaptics();
//   <Draggable {...cardHapticFeedback(haptics)} ... />

export {
  type CardHapticMap,
  cardHapticFeedback,
  createHaptics,
  DEFAULT_HAPTIC_PATTERNS,
  type HapticAdapter,
  type HapticController,
  type HapticOptions,
  type HapticPattern,
  type HapticPatternMap,
  type HapticPatternName,
  resolveHapticPattern,
  webVibrationAdapter,
} from "./haptics";
