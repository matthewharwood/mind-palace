// @mind-palace/cards — portable drag-and-drop card primitives.
//
// Phase 1 surface: the themeable Card primitive + the core Zod model. Slots,
// drop zones, the drag engine, sound, haptics, and a11y land in later phases.
//
//   import { Card } from "@mind-palace/cards";
//   import "@mind-palace/cards/theme"; // default tokens (override any --mp-card-*)

export { Card } from "./card/card";
export * from "./card/schema";
export { Draggable } from "./drag/draggable";
export {
  accepts,
  type DropTargetInfo,
  dropTargetAtPoint,
  isActionable,
  parseAccepts,
  readDropTarget,
  resolveDefaultIntent,
} from "./drag/hit-test";
export {
  DEFAULT_DRAG_CONFIG,
  type DragConfig,
  DragConfigSchema,
  resolveDragConfig,
} from "./drag/physics";
export * from "./drag/schema";
export {
  type CardFeedbackHandlers,
  type CardFeedbackOptions,
  createCardFeedback,
} from "./feedback/orchestrator";
export { defineComponent } from "./lib/define-component";
export { prefersReducedMotion, useReducedMotion } from "./lib/reduced-motion";
export { CardSlot } from "./slot/card-slot";
export * from "./slot/schema";
export { DropZone } from "./zone/drop-zone";
export * from "./zone/schema";
