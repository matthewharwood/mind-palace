import { describe, expect, test } from "bun:test";
import * as z from "zod";

import {
  addCards,
  createCard,
  createDeck,
  deckStats,
  exportDeck,
  getDueCards,
  importDeck,
  reviewCard,
} from "./deck";

const T0 = 1_700_000_000_000;
const DAY_MS = 86_400_000;

// A representative content schema — the GitHub use case would swap this for a
// code-card schema without touching anything else.
const Flashcard = z.object({ front: z.string(), back: z.string() });
type Flashcard = z.infer<typeof Flashcard>;

const sample: Flashcard[] = [
  { front: "2 + 2", back: "4" },
  { front: "capital of France", back: "Paris" },
];

describe("createDeck / createCard", () => {
  test("seeds cards with fresh, due-now SRS state", () => {
    const deck = createDeck("math", sample, { now: T0, id: "d1" });
    expect(deck.id).toBe("d1");
    expect(deck.cards).toHaveLength(2);
    for (const card of deck.cards) {
      expect(card.srs.phase).toBe("new");
      expect(card.srs.due).toBe(T0);
      expect(card.createdAt).toBe(T0);
    }
  });

  test("a single card carries its content untouched", () => {
    const card = createCard<Flashcard>({ front: "q", back: "a" }, { now: T0, id: "c1" });
    expect(card.content).toEqual({ front: "q", back: "a" });
  });
});

describe("addCards", () => {
  test("appends without mutating the original deck", () => {
    const deck = createDeck("d", sample, { now: T0 });
    const bigger = addCards(deck, [{ front: "x", back: "y" }], { now: T0 });
    expect(deck.cards).toHaveLength(2);
    expect(bigger.cards).toHaveLength(3);
  });
});

describe("getDueCards", () => {
  test("returns only due cards, soonest first", () => {
    const deck = createDeck("d", sample, { now: T0, id: "d" });
    // Push the first card into the future via an easy review.
    const reviewed = reviewCard(deck, deck.cards[0]!.id, "easy", { now: T0 });
    expect(reviewed).not.toBeNull();
    const due = getDueCards(reviewed!.deck, T0);
    expect(due).toHaveLength(1);
    expect(due[0]!.id).toBe(deck.cards[1]!.id);
  });
});

describe("reviewCard", () => {
  test("updates only the targeted card and returns a log", () => {
    const deck = createDeck("d", sample, { now: T0, id: "d" });
    const target = deck.cards[0]!.id;
    const out = reviewCard(deck, target, "good", { now: T0 });
    expect(out).not.toBeNull();
    expect(out!.result.log.rating).toBe("good");
    const updated = out!.deck.cards.find((c) => c.id === target)!;
    const untouched = out!.deck.cards.find((c) => c.id !== target)!;
    expect(updated.srs.reps).toBe(1);
    expect(untouched.srs.reps).toBe(0);
    // original deck is unchanged (immutability)
    expect(deck.cards[0]!.srs.reps).toBe(0);
  });

  test("returns null for an unknown card id", () => {
    const deck = createDeck("d", sample, { now: T0 });
    expect(reviewCard(deck, "nope", "good", { now: T0 })).toBeNull();
  });
});

describe("deckStats", () => {
  test("counts totals, due, and phases", () => {
    const deck = createDeck("d", sample, { now: T0, id: "d" });
    const reviewed = reviewCard(deck, deck.cards[0]!.id, "easy", { now: T0 })!.deck;
    const stats = deckStats(reviewed, T0);
    expect(stats.total).toBe(2);
    expect(stats.due).toBe(1);
    expect(stats.byPhase.new).toBe(1);
    expect(stats.byPhase.review).toBe(1);
  });
});

describe("export / import round-trip", () => {
  test("a deck survives serialize -> parse unchanged", () => {
    const deck = createDeck("d", sample, { now: T0, id: "d" });
    const json = exportDeck(deck);
    const restored = importDeck(json, Flashcard);
    expect(restored).toEqual(deck);
  });

  test("import rejects content that violates the schema", () => {
    const bad = JSON.stringify({
      id: "d",
      name: "d",
      createdAt: T0,
      config: {},
      cards: [{ id: "c", content: { front: 1, back: 2 }, srs: {}, createdAt: T0 }],
    });
    expect(() => importDeck(bad, Flashcard)).toThrow();
  });

  test("a future review timestamp is preserved across a round-trip", () => {
    const deck = createDeck("d", sample, { now: T0, id: "d" });
    const reviewed = reviewCard(deck, deck.cards[0]!.id, "good", { now: T0 + DAY_MS })!.deck;
    const restored = importDeck(exportDeck(reviewed), Flashcard);
    expect(restored.cards[0]!.srs.lastReviewedAt).toBe(T0 + DAY_MS);
  });
});
