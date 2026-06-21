import type { ReactNode } from "react";
import * as z from "zod";

import { DropTargetStateSchema } from "../card/schema";

const reactNode = z.custom<ReactNode>();

// A DropZone is a region target (not a single slot) — a discard pile, a "play
// area", a sell/deliver bin. It may hold many cards or trigger an action on
// drop. Sized by the consumer (className/content). Same `data-drop-target`
// contract as CardSlot, with `data-target-kind="zone"`.
export const DropZonePropsSchema = z.object({
  /** Stable id, surfaced as `data-target-id` for hit-testing. */
  zoneId: z.string().min(1),
  /** Space-separated tags this zone accepts; omit = any. */
  accepts: z.string().optional(),
  disabled: z.boolean().optional(),
  /** Drag-feedback state; the engine sets this. Defaults to "idle". */
  state: DropTargetStateSchema.optional(),
  label: z.string().optional(),
  className: z.string().optional(),
  /** Optional data-test id for Playwright selectors. */
  testId: z.string().optional(),
  children: reactNode.optional(),
});
export type DropZoneProps = z.infer<typeof DropZonePropsSchema>;
