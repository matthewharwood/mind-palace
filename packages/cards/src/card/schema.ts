import type { ReactNode } from "react";
import * as z from "zod";

// ---------------------------------------------------------------------------
// Card model — Pillar 2, Zod-first. Content is intentionally opaque: `front`
// and `back` are arbitrary ReactNode, so this package never cares whether a
// card holds a chemical element, a math fact, or a photo. That is what keeps it
// portable — the *mechanics* live here, the *content + theme* live in the app.
// ---------------------------------------------------------------------------

/** Silhouette of a card. Drives radius / clip-path via theme tokens. */
export const CardShapeSchema = z.enum(["rect", "rounded", "circle", "hex"]);
export type CardShape = z.infer<typeof CardShapeSchema>;

/** T-shirt sizes; each maps to a `--mp-card-w/-h` token pair. */
export const CardSizeSchema = z.enum(["sm", "md", "lg"]);
export type CardSize = z.infer<typeof CardSizeSchema>;

/** Which face is showing. */
export const CardFaceSchema = z.enum(["front", "back"]);
export type CardFace = z.infer<typeof CardFaceSchema>;

/** Every interaction state a card can be in. Feedback (visual/sound/haptic) is
 *  keyed off transitions between these — see the drag engine + feedback layers
 *  in later phases. */
export const CardStateSchema = z.enum([
  "idle",
  "hover",
  "focus",
  "pickedUp",
  "dragging",
  "overValid",
  "overInvalid",
  "dropping",
  "placed",
  "returning",
  "disabled",
]);
export type CardState = z.infer<typeof CardStateSchema>;

/** What a drop *means* when a card is released over a target. Consumers resolve
 *  this from their own rules; the package just renders the matching feedback.
 *  Discriminated union mirrors dean-n-dean's proven shape (drop/swap/replace/
 *  blocked) and is open to project-specific kinds via the generic helpers. */
export const DropIntentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("drop"), targetId: z.string() }),
  z.object({ kind: z.literal("swap"), targetId: z.string() }),
  z.object({ kind: z.literal("replace"), targetId: z.string() }),
  z.object({ kind: z.literal("blocked"), targetId: z.string() }),
]);
export type DropIntent = z.infer<typeof DropIntentSchema>;

/** Visual feedback state of a drop target (slot or zone) while a card is being
 *  dragged over it. The drag engine writes this to `data-state`; the CSS in
 *  each component maps it to a ring/tint. `over` is neutral hover before the
 *  consumer's rules have resolved valid/invalid. */
export const DropTargetStateSchema = z.enum([
  "idle",
  "over",
  "overValid",
  "overInvalid",
  "overSwap",
  "disabled",
]);
export type DropTargetState = z.infer<typeof DropTargetStateSchema>;

const reactNode = z.custom<ReactNode>();

// Props validate types when present; defaults are applied in the component body
// (parse is dev-only, so destructuring defaults are the prod-safe source of
// truth). Callers pass the input shape — optional fields may be omitted.
export const CardPropsSchema = z.object({
  /** Front face content. */
  front: reactNode,
  /** Back face content. Required only when `flippable` is true. */
  back: reactNode.optional(),
  shape: CardShapeSchema.optional(),
  size: CardSizeSchema.optional(),
  /** Which face is up. Ignored unless `flippable`. */
  face: CardFaceSchema.optional(),
  /** Render a 3D flip between front and back. */
  flippable: z.boolean().optional(),
  disabled: z.boolean().optional(),
  /** Drives data-state styling hooks; defaults to "idle". */
  state: CardStateSchema.optional(),
  /** Accessible label for the card as a whole. */
  label: z.string().optional(),
  /** Stable id, surfaced as `data-card-id` for hit-testing in later phases. */
  cardId: z.string().optional(),
  className: z.string().optional(),
  /** Optional data-test id for Playwright selectors. */
  testId: z.string().optional(),
});
export type CardProps = z.infer<typeof CardPropsSchema>;
