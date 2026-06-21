import cardDissolveUrl from "../../assets/sfx/card-dissolve.mp3";
import cardDropUrl from "../../assets/sfx/card-drop.mp3";
import cardPickupUrl from "../../assets/sfx/card-pickup.mp3";
import cardReplaceUrl from "../../assets/sfx/card-replace-dissolve.mp3";
import cardSlotPickupUrl from "../../assets/sfx/card-slot-pickup.mp3";
import cardSwapUrl from "../../assets/sfx/card-swap.mp3";
import { mergeRegistry, type SoundRegistryOverrides } from "./registry";
import type { SoundRegistry } from "./schema";
import { createSoundService, type SoundService, type SoundServiceOptions } from "./service";

// ---------------------------------------------------------------------------
// Default card sound set. Audio ships *with the package* (Vite imports each mp3
// to a fingerprinted, base-path-safe URL) so cloning the package dir brings the
// sounds along. Every entry is overridable (see createCardSoundService). The
// `prompt` fields are the ElevenLabs generation prompts, kept so a project can
// regenerate bespoke audio without re-deriving the brief.
// ---------------------------------------------------------------------------
export const DEFAULT_CARD_SOUNDS: SoundRegistry = {
  "card.pickup": {
    src: cardPickupUrl,
    volume: 0.72,
    maxVoices: 8,
    replay: "overlap",
    prompt:
      "A single thin playing card lifted from a table — crisp, short paper snap. Dry, close-mic, no reverb.",
  },
  "card.slotPickup": {
    src: cardSlotPickupUrl,
    volume: 0.72,
    maxVoices: 8,
    replay: "overlap",
    prompt:
      "A thin card lifted out of a shallow wooden slot — soft wooden scuff plus paper. Dry and short.",
  },
  "card.drop": {
    src: cardDropUrl,
    volume: 0.74,
    maxVoices: 8,
    replay: "overlap",
    prompt:
      "A thin card dropped into a wooden slot — gentle woody snap/plop. Satisfying, short, dry.",
  },
  "card.swap": {
    src: cardSwapUrl,
    volume: 0.76,
    maxVoices: 6,
    replay: "overlap",
    prompt:
      "Two thin cards exchanged between wooden slots — a quick double paper-and-wood shuffle. Short.",
  },
  "card.replace": {
    src: cardReplaceUrl,
    volume: 0.78,
    maxVoices: 6,
    replay: "overlap",
    prompt:
      "A card replacing another in a slot — soft paper swap with a faint sparkling dissolve tail.",
  },
  "card.dissolve": {
    src: cardDissolveUrl,
    volume: 0.78,
    maxVoices: 6,
    replay: "overlap",
    prompt:
      "A small paper card dissolving into fine sparkling dust — airy shimmer, gentle, no harsh transient.",
  },
};

export interface CardSoundServiceOptions {
  /** Per-id overrides: swap a `src`, tweak `volume`, or add new ids. */
  overrides?: SoundRegistryOverrides;
  masterVolume?: number;
  muted?: boolean;
}

/** A sound service preloaded with the default card set, with overrides merged. */
export function createCardSoundService(options?: CardSoundServiceOptions): SoundService {
  const serviceOptions: SoundServiceOptions = {
    registry: mergeRegistry(DEFAULT_CARD_SOUNDS, options?.overrides),
  };
  if (options?.masterVolume !== undefined) serviceOptions.masterVolume = options.masterVolume;
  if (options?.muted !== undefined) serviceOptions.muted = options.muted;
  return createSoundService(serviceOptions);
}
