import type { DropIntent } from "../card/schema";
import type { IntentContext } from "./schema";

// ---------------------------------------------------------------------------
// Hit-testing against the `data-drop-target` contract that CardSlot/DropZone
// render. The matching + intent logic is pure (unit-tested); the DOM readers are
// thin wrappers exercised via Storybook/Playwright.
// ---------------------------------------------------------------------------

export interface DropTargetInfo {
  id: string;
  kind: "slot" | "zone";
  accepts: string[];
  occupied: boolean;
  disabled: boolean;
  locked: boolean;
  el: HTMLElement;
}

const WHITESPACE = /\s+/;

/** Parse a space-separated `accepts` attribute into tags. */
export function parseAccepts(value: string | null | undefined): string[] {
  return (value ?? "").split(WHITESPACE).filter(Boolean);
}

/** Does a target accept a card? An empty `accepts` list means "accepts any". */
export function accepts(targetAccepts: string[], cardTags: string[]): boolean {
  if (targetAccepts.length === 0) return true;
  return cardTags.some((tag) => targetAccepts.includes(tag));
}

const drop = (targetId: string): DropIntent => ({ kind: "drop", targetId });
const swap = (targetId: string): DropIntent => ({ kind: "swap", targetId });
const blocked = (targetId: string): DropIntent => ({ kind: "blocked", targetId });

/** Default intent resolution mirroring dean-n-dean's proven rules. Consumers can
 *  override per-card via `resolveIntent` (e.g. to allow replace, or custom zones). */
export function resolveDefaultIntent(ctx: IntentContext): DropIntent {
  const { source, target } = ctx;
  if (target.disabled || target.locked) return blocked(target.id);
  if (!accepts(target.accepts, ctx.cardTags)) return blocked(target.id);
  if (target.kind === "zone") return drop(target.id);
  // Slot:
  if (source.kind === "slot" && source.id === target.id) return drop(target.id); // no-op
  if (!target.occupied) return drop(target.id);
  if (source.kind === "slot") return swap(target.id);
  return blocked(target.id); // occupied slot from a non-slot source → opt into replace via resolveIntent
}

/** Is an intent something the consumer should commit (vs revert)? */
export function isActionable(intent: DropIntent): boolean {
  return intent.kind === "drop" || intent.kind === "swap" || intent.kind === "replace";
}

/** Read the drop-target contract off an element (or the nearest ancestor with it). */
export function readDropTarget(el: Element | null): DropTargetInfo | null {
  const host = el?.closest<HTMLElement>("[data-drop-target]");
  if (!host) return null;
  const id = host.dataset.targetId;
  const kind = host.dataset.targetKind;
  if (!id || (kind !== "slot" && kind !== "zone")) return null;
  return {
    id,
    kind,
    accepts: parseAccepts(host.dataset.accepts),
    occupied: host.dataset.occupied === "true",
    disabled: host.dataset.disabled === "true",
    locked: host.dataset.locked === "true",
    el: host,
  };
}

/** The topmost drop target under a screen point (the dragged card should have
 *  pointer-events:none so it isn't returned). */
export function dropTargetAtPoint(x: number, y: number): DropTargetInfo | null {
  if (typeof document === "undefined") return null;
  return readDropTarget(document.elementFromPoint(x, y));
}
