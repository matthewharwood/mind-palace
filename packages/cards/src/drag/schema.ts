import type { ReactNode } from "react";
import * as z from "zod";

import type { DropIntent } from "../card/schema";
import type { DragConfig } from "./physics";

const reactNode = z.custom<ReactNode>();

/** Where a dragged card currently lives. `kind` is consumer-defined
 *  ("slot" | "zone" | "hand" | "inventory" | …); `id` identifies the location. */
export const DragSourceSchema = z.object({
  kind: z.string(),
  id: z.string(),
});
export type DragSource = z.infer<typeof DragSourceSchema>;

/** A resolved drop target, as read from the `data-drop-target` contract. */
export interface DropTarget {
  id: string;
  kind: "slot" | "zone";
}

/** Context handed to a consumer's `resolveIntent` so it can apply game rules. */
export interface IntentContext {
  cardId: string;
  cardTags: string[];
  source: DragSource;
  target: {
    id: string;
    kind: "slot" | "zone";
    accepts: string[];
    occupied: boolean;
    disabled: boolean;
    locked: boolean;
  };
}

/** Emitted on every hover transition (feedback seam for sound/haptics). */
export interface OverInfo {
  cardId: string;
  target: DropTarget | null;
  intent: DropIntent;
}

/** The committed outcome of a drag, handed to `onDrop`. The consumer mutates
 *  its own state from this (the package never persists). */
export interface DropResult {
  cardId: string;
  source: DragSource;
  target: DropTarget | null;
  intent: DropIntent;
}

export const DraggablePropsSchema = z.object({
  cardId: z.string().min(1),
  source: DragSourceSchema,
  /** Space-separated tags matched against a target's `accepts`. */
  tags: z.string().optional(),
  /** Accessible name for the draggable (falls back to cardId). */
  label: z.string().optional(),
  /** Enable keyboard drag-and-drop (Enter/Space + arrows). Default true. */
  keyboard: z.boolean().optional(),
  disabled: z.boolean().optional(),
  /** Physics overrides; merged over DEFAULT_DRAG_CONFIG. */
  config: z.custom<Partial<DragConfig>>().optional(),
  /** Consumer rules; defaults to accepts + occupancy resolution. */
  resolveIntent: z.custom<(ctx: IntentContext) => DropIntent>().optional(),
  /** Commit the move. Called after the snap settles for an actionable intent;
   *  called with `target: null` after a revert. */
  onDrop: z.custom<(result: DropResult) => void>(),
  /** Feedback seams (Phase 5/6 wire sound + haptics here). */
  onPickup: z.custom<(cardId: string) => void>().optional(),
  onOver: z.custom<(info: OverInfo) => void>().optional(),
  onRelease: z.custom<(result: DropResult) => void>().optional(),
  className: z.string().optional(),
  /** Optional data-test id for Playwright selectors. */
  testId: z.string().optional(),
  children: reactNode,
});
export type DraggableProps = z.infer<typeof DraggablePropsSchema>;
