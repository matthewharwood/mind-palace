import * as z from "zod";

// ---------------------------------------------------------------------------
// Sound model — Zod-first. A registry maps semantic ids ("card.pickup") to a
// playable definition. The package ships defaults (see default-registry.ts) that
// a consumer overrides per-id or replaces wholesale — sounds stay overridable so
// each project can be bespoke while the engine stays pristine.
// ---------------------------------------------------------------------------

/** What to do when a sound is asked to play while already at its voice cap. */
export const ReplayPolicySchema = z.enum(["overlap", "restart", "ignore"]);
export type ReplayPolicy = z.infer<typeof ReplayPolicySchema>;

export const SoundDefinitionSchema = z.object({
  /** Resolved URL of the audio file (Vite-imported asset or a public path). */
  src: z.string().min(1),
  /** Linear gain 0–2. */
  volume: z.number().min(0).max(2).optional(),
  /** Playback rate (1 = normal); subtle per-play variation can be added by the
   *  caller. */
  rate: z.number().positive().optional(),
  /** Max simultaneous voices for this id. */
  maxVoices: z.int().min(1).optional(),
  /** Behavior at the voice cap. */
  replay: ReplayPolicySchema.optional(),
  /** ElevenLabs generation prompt — kept so the asset can be regenerated. */
  prompt: z.string().optional(),
});
export type SoundDefinition = z.infer<typeof SoundDefinitionSchema>;

/** A registry is a plain map of id → definition. */
export const SoundRegistrySchema = z.record(z.string(), SoundDefinitionSchema);
export type SoundRegistry = z.infer<typeof SoundRegistrySchema>;
