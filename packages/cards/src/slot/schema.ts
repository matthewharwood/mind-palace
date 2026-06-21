import type { ReactNode } from "react";
import * as z from "zod";

import { CardShapeSchema, CardSizeSchema, DropTargetStateSchema } from "../card/schema";

const reactNode = z.custom<ReactNode>();

// A CardSlot is a fixed, single-occupant drop target — the persistent surface a
// card sits on. It owns no state: the consumer places the occupant as children
// and drives `occupied`/`disabled`/`locked`; the drag engine writes `state`
// during a drag. Hit-testing reads the `data-drop-target` contract it renders.
export const CardSlotPropsSchema = z.object({
  /** Stable id, surfaced as `data-target-id` for hit-testing. */
  slotId: z.string().min(1),
  /** Space-separated tags this slot accepts (e.g. "metal gas"); omit = any. */
  accepts: z.string().optional(),
  /** Dimmed and refuses drops. */
  disabled: z.boolean().optional(),
  /** Refuses drops but renders normally (e.g. a fixed operand). */
  locked: z.boolean().optional(),
  /** Whether a card occupies the slot. Defaults to "has children". */
  occupied: z.boolean().optional(),
  /** Drag-feedback state; the engine sets this. Defaults to "idle". */
  state: DropTargetStateSchema.optional(),
  /** Slot silhouette + footprint, matched to the cards it holds. */
  shape: CardShapeSchema.optional(),
  size: CardSizeSchema.optional(),
  label: z.string().optional(),
  className: z.string().optional(),
  /** Optional data-test id for Playwright selectors. */
  testId: z.string().optional(),
  /** The occupant card, placed by the consumer. */
  children: reactNode.optional(),
});
export type CardSlotProps = z.infer<typeof CardSlotPropsSchema>;
