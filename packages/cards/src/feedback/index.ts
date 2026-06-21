// @mind-palace/cards/feedback — unify sound + haptic cues for a draggable.
//
//   import { createCardFeedback } from "@mind-palace/cards/feedback";
//   const fx = createCardFeedback({ sound, haptics });
//   <Draggable {...fx} ... />

export {
  type CardFeedbackHandlers,
  type CardFeedbackOptions,
  createCardFeedback,
} from "./orchestrator";
