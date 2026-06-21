import type { SoundDefinition, SoundRegistry } from "./schema";

// ---------------------------------------------------------------------------
// Registry merge — the override mechanism. Defaults provide a working sound set;
// a consumer passes overrides to swap a single file ({ "card.drop": { src } }),
// tweak a field (volume), or add brand-new ids. Pure, so it unit-tests cleanly.
// ---------------------------------------------------------------------------

export type SoundRegistryOverrides = Record<string, Partial<SoundDefinition>>;

/** Merge overrides over a base registry. Known ids are field-merged (override a
 *  src or volume without re-stating the rest); unknown ids are added whole (and
 *  must carry a `src`). */
export function mergeRegistry(
  base: SoundRegistry,
  overrides?: SoundRegistryOverrides,
): SoundRegistry {
  if (!overrides) return { ...base };
  const merged: SoundRegistry = { ...base };
  for (const [id, patch] of Object.entries(overrides)) {
    const existing = merged[id];
    if (existing) {
      merged[id] = { ...existing, ...patch };
    } else if (patch.src) {
      merged[id] = { src: patch.src, ...patch };
    }
    // An override for an unknown id without a `src` is ignored (nothing to play).
  }
  return merged;
}
