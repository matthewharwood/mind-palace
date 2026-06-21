import type * as z from "zod";
import { createCardState, type ReviewResult, resolveConfig, review } from "./scheduler";
import {
  type Card,
  type CardPhase,
  type Deck,
  deckSchema,
  type Rating,
  type SchedulerConfig,
  type SchedulerConfigInput,
  type SchedulerConfigOverride,
} from "./schema";

// ---------------------------------------------------------------------------
// Pure, persistence-free deck operations. Everything returns new objects (no
// mutation) so these compose cleanly with Jotai's immutable updates and stay
// trivially testable. Ids default to crypto.randomUUID() but can be supplied
// for deterministic tests / reproducible imports.
// ---------------------------------------------------------------------------

function newId(): string {
  return crypto.randomUUID();
}

/** Build a card around a piece of content, with fresh SRS state. */
export function createCard<T>(
  content: T,
  opts?: { id?: string; now?: number; config?: SchedulerConfigInput },
): Card<T> {
  const now = opts?.now ?? Date.now();
  return {
    id: opts?.id ?? newId(),
    content,
    srs: createCardState({ now, ...(opts?.config ? { config: opts.config } : {}) }),
    createdAt: now,
  };
}

/** Create a deck, optionally seeded with content for its first cards. */
export function createDeck<T>(
  name: string,
  contents: readonly T[] = [],
  opts?: { id?: string; now?: number; config?: SchedulerConfigOverride },
): Deck<T> {
  const now = opts?.now ?? Date.now();
  const config: SchedulerConfigOverride = opts?.config ?? {};
  return {
    id: opts?.id ?? newId(),
    name,
    createdAt: now,
    config,
    cards: contents.map((content) => createCard(content, { now, config })),
  };
}

/** Append cards built from new content. Returns a new deck. */
export function addCards<T>(
  deck: Deck<T>,
  contents: readonly T[],
  opts?: { now?: number },
): Deck<T> {
  const now = opts?.now ?? Date.now();
  const fresh = contents.map((content) => createCard(content, { now, config: deck.config }));
  return { ...deck, cards: [...deck.cards, ...fresh] };
}

/** Cards due at `now`, soonest-due first. */
export function getDueCards<T>(deck: Deck<T>, now: number = Date.now()): Card<T>[] {
  return deck.cards.filter((card) => card.srs.due <= now).sort((a, b) => a.srs.due - b.srs.due);
}

/** Apply a rating to one card in the deck. Returns the new deck and the log
 *  entry, or null if the card id isn't found. */
export function reviewCard<T>(
  deck: Deck<T>,
  cardId: string,
  rating: Rating,
  opts?: { now?: number },
): { deck: Deck<T>; result: ReviewResult } | null {
  const index = deck.cards.findIndex((card) => card.id === cardId);
  const card = deck.cards[index];
  if (!card) return null;

  const result = review(card.srs, rating, {
    now: opts?.now ?? Date.now(),
    config: deck.config,
  });

  const cards = deck.cards.with(index, { ...card, srs: result.state });
  return { deck: { ...deck, cards }, result };
}

export interface DeckStats {
  total: number;
  due: number;
  byPhase: Record<CardPhase, number>;
}

/** Summary counts for a deck at `now`. */
export function deckStats<T>(deck: Deck<T>, now: number = Date.now()): DeckStats {
  const byPhase: Record<CardPhase, number> = { new: 0, learning: 0, review: 0, relearning: 0 };
  let due = 0;
  for (const card of deck.cards) {
    byPhase[card.srs.phase] += 1;
    if (card.srs.due <= now) due += 1;
  }
  return { total: deck.cards.length, due, byPhase };
}

/** Serialize a deck to shareable JSON. */
export function exportDeck<T>(deck: Deck<T>): string {
  return JSON.stringify(deck);
}

/** Parse + validate a shared deck JSON against a content schema. Throws on
 *  mismatch — the boundary where an untrusted shared deck is made trustworthy. */
export function importDeck<TContent extends z.ZodType>(
  json: string,
  content: TContent,
): Deck<z.infer<TContent>> {
  return deckSchema(content).parse(JSON.parse(json));
}

/** Effective config for a deck (deck overrides merged over defaults). */
export function deckConfig<T>(deck: Deck<T>): SchedulerConfig {
  return resolveConfig(deck.config);
}
