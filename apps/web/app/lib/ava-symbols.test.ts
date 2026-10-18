import { describe, expect, test } from "bun:test";
import {
  AVA_LETTERS_SESSION_DEFAULT,
  AVA_NUMBERS_SESSION_DEFAULT,
  AvaSymbolsSessionSchema,
} from "@mind-palace/schemas";
import {
  buildAvaSymbolImage,
  buildAvaSymbolSvg,
  getAvaSymbolCards,
  rateAvaSymbolCard,
} from "./ava-symbols";

const NOW = 1_000_000_000;

describe("Ava's number and letter decks", () => {
  test("numbers cover zero through ten, once each, in counting order", () => {
    const cards = getAvaSymbolCards("ava-numbers");
    expect(cards.map((card) => card.id)).toEqual(
      Array.from({ length: 11 }, (_, index) => String(index)),
    );
    expect(cards.map((card) => card.label)).toEqual([
      "Zero",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
    ]);
    for (const card of cards) {
      if (card.kind !== "number") throw new Error("Expected a number");
      const svg = buildAvaSymbolSvg(card, "alternate");
      expect(svg.match(/<circle /g)).toHaveLength(10);
      expect(svg.match(/r="31" fill="#087f8c"/g) ?? []).toHaveLength(card.value);
    }
  });

  test("the whole alphabet has matching uppercase, lowercase, and picture words", () => {
    const cards = getAvaSymbolCards("ava-letters");
    expect(cards.map((card) => card.id).join("")).toBe("abcdefghijklmnopqrstuvwxyz");
    for (const card of cards) {
      if (card.kind !== "letter") throw new Error("Expected a letter");
      expect(card.upper).toBe(card.lower.toUpperCase());
      expect(card.label[0]?.toUpperCase()).toBe(card.upper);
      expect(buildAvaSymbolSvg(card, "symbol")).toContain(`>${card.upper}</text>`);
      expect(buildAvaSymbolSvg(card, "alternate")).toContain(`>${card.lower}</text>`);
      expect(buildAvaSymbolSvg(card, "word")).toContain(card.label);
      expect(buildAvaSymbolImage(card, "word")).toStartWith("data:image/svg+xml;");
    }
  });

  test("rating progresses through each complete deck and keeps representation settings", () => {
    for (const initial of [AVA_NUMBERS_SESSION_DEFAULT, AVA_LETTERS_SESSION_DEFAULT]) {
      let session = AvaSymbolsSessionSchema.parse({
        ...initial,
        viewMode: "3d",
        representation: "alternate",
      });
      const cards = getAvaSymbolCards(initial.id);
      for (const [index, card] of cards.entries()) {
        expect(session.selectedIndex).toBe(index);
        session = rateAvaSymbolCard(session, "easy", NOW);
        expect(session.states[card.id]?.reps).toBe(1);
        expect(session.states[card.id]?.due).toBeGreaterThan(NOW);
      }
      expect(Object.keys(session.states)).toHaveLength(cards.length);
      expect(session.selectedIndex).toBe(0);
      expect(session.viewMode).toBe("3d");
      expect(session.representation).toBe("alternate");
      expect(initial.states).toEqual({});
    }
  });

  test("overdue reviews take priority over fresh cards", () => {
    const practiced = rateAvaSymbolCard(AVA_NUMBERS_SESSION_DEFAULT, "easy", NOW);
    const due = practiced.states["0"]?.due;
    if (due === undefined) throw new Error("Review must schedule its next due date");
    const next = rateAvaSymbolCard(practiced, "easy", due + 1);
    expect(next.selectedIndex).toBe(0);
    expect(next.states["1"]?.reps).toBe(1);
  });

  test("session schemas reject indices outside each app's deck", () => {
    expect(
      AvaSymbolsSessionSchema.safeParse({ id: "ava-numbers", selectedIndex: 11 }).success,
    ).toBe(false);
    expect(
      AvaSymbolsSessionSchema.safeParse({ id: "ava-letters", selectedIndex: 26 }).success,
    ).toBe(false);
    expect(
      AvaSymbolsSessionSchema.safeParse({ id: "ava-numbers", selectedIndex: -1 }).success,
    ).toBe(false);
    expect(
      AvaSymbolsSessionSchema.safeParse({ id: "ava-numbers", viewMode: "unknown" }).success,
    ).toBe(false);
  });
});
