import * as z from "zod";

// ---------------------------------------------------------------------------
// Drag physics — pure math + tunables, ported from dean-n-dean's iPad-calibrated
// drag.tsx. Kept dependency-free and side-effect-free so it unit-tests cleanly
// and so the *feel* is portable: the same constants reproduce the same motion in
// any project. Everything is size-agnostic (px deltas, ratios, rect-relative),
// so a small token tile and an iPhone-SE-sized card drag with identical feel.
// ---------------------------------------------------------------------------

export const DragConfigSchema = z.object({
  /** Scale applied on press/pickup. */
  pressScale: z.number().default(1.07),
  /** Max tilt (deg) from where within the card you grabbed it. */
  pressTiltMaxDeg: z.number().default(10),
  /** Tilt-per-velocity while dragging. */
  frictionTiltFactor: z.number().default(0.5),
  /** Cap (deg) on the velocity-driven tilt. */
  frictionTiltMaxDeg: z.number().default(7),
  /** Movement (px) before a press becomes a drag — filters finger tremor. */
  minDragDistancePx: z.number().default(5),
  /** Extra scale per px/ms of pointer speed. */
  velocityLiftFactor: z.number().default(0.04),
  /** Cap on the velocity lift (added to pressScale). */
  velocityLiftMax: z.number().default(0.04),
  /** EMA weight kept from prior speed samples (0–1). */
  velocitySmoothKeep: z.number().default(0.7),
  /** How strongly the card is pulled toward a hovered target's center (0–1). */
  hoverMagnetism: z.number().default(0.4),
  /** Snap-to-target animation duration (ms). */
  snapDurationMs: z.number().default(160),
  /** Revert-to-origin animation duration (ms). */
  revertDurationMs: z.number().default(200),
});
export type DragConfig = z.infer<typeof DragConfigSchema>;

/** The fully-resolved default config. */
export const DEFAULT_DRAG_CONFIG: DragConfig = DragConfigSchema.parse({});

/** Merge a partial override over the defaults. A plain merge (not a Zod parse)
 *  so it is safe to call every render in production — Pillar 2: runtime parsing
 *  is dev-only; TypeScript guards the field types at compile time. */
export function resolveDragConfig(config?: Partial<DragConfig>): DragConfig {
  return config ? { ...DEFAULT_DRAG_CONFIG, ...config } : DEFAULT_DRAG_CONFIG;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Initial tilt from where the card was grabbed. `grabFraction` is the pointer's
 *  x position within the card mapped to [-0.5, 0.5]. */
export function pressTilt(grabFraction: number, cfg: DragConfig): number {
  return clamp(grabFraction * 2 * cfg.pressTiltMaxDeg, -cfg.pressTiltMaxDeg, cfg.pressTiltMaxDeg);
}

/** Velocity-driven tilt added on top of the press tilt while dragging. */
export function frictionTilt(velocityX: number, cfg: DragConfig): number {
  return clamp(velocityX * cfg.frictionTiltFactor, -cfg.frictionTiltMaxDeg, cfg.frictionTiltMaxDeg);
}

/** Exponential moving average of pointer speed, to keep the lift from jittering. */
export function smoothSpeed(previous: number, instant: number, cfg: DragConfig): number {
  return previous * cfg.velocitySmoothKeep + instant * (1 - cfg.velocitySmoothKeep);
}

/** Scale while dragging: pressScale plus a capped boost for fast movement. */
export function liftScale(smoothedSpeed: number, cfg: DragConfig): number {
  return cfg.pressScale + clamp(smoothedSpeed * cfg.velocityLiftFactor, 0, cfg.velocityLiftMax);
}

/** Lerp the applied translation toward a hovered target's delta — the card
 *  "settles" into the slot during hover so the release snap is barely visible. */
export function magnetize(delta: number, targetDelta: number, magnetism: number): number {
  return delta + (targetDelta - delta) * magnetism;
}

/** Has the pointer moved far enough to count as a drag (vs a tap)? */
export function pastDragThreshold(dx: number, dy: number, cfg: DragConfig): boolean {
  return Math.hypot(dx, dy) >= cfg.minDragDistancePx;
}
