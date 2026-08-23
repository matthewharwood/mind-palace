import { describe, expect, test } from "bun:test";
import {
  CHARACTER_PARTY_SESSION_DEFAULT,
  CharacterDefinitionSchema,
  CharacterPartySessionSchema,
} from "@mind-palace/schemas";

import {
  advanceCharacterPartySession,
  buildHeadbandDeck,
  CHARACTER_LIBRARY,
  chunkCharacters,
  formatCountdown,
  revealCurrentCharacter,
  roundSecondsRemaining,
  selectNextCharacter,
  sessionSecondsRemaining,
  skipCurrentCharacter,
  startCharacterPartySession,
} from "./character-party";

function character(id: string, difficulty: "easy" | "medium" | "hard" = "easy") {
  return CharacterDefinitionSchema.parse({
    id,
    name: id,
    franchise: "Test",
    difficulty,
    generation: "cross-generational",
    category: "cartoon",
    drawable: true,
    headbandEligible: true,
    imageSearchTerm: `${id} character`,
    wikipediaTitle: id,
  });
}

describe("character library", () => {
  test("meets the requested size, difficulty mix, and mode coverage", () => {
    expect(CHARACTER_LIBRARY).toHaveLength(180);
    expect(CHARACTER_LIBRARY.filter((item) => item.difficulty === "easy")).toHaveLength(90);
    expect(CHARACTER_LIBRARY.filter((item) => item.difficulty === "medium")).toHaveLength(63);
    expect(CHARACTER_LIBRARY.filter((item) => item.difficulty === "hard")).toHaveLength(27);
    expect(CHARACTER_LIBRARY.filter((item) => item.drawable).length).toBeGreaterThanOrEqual(125);
    expect(CHARACTER_LIBRARY.filter((item) => item.headbandEligible).length).toBeGreaterThanOrEqual(
      150,
    );
  });

  test("builds a unique 150-card headband deck with the target difficulty mix", () => {
    const deck = buildHeadbandDeck(CHARACTER_LIBRARY);
    expect(deck).toHaveLength(150);
    expect(new Set(deck.map((item) => item.id)).size).toBe(150);
    expect(deck.filter((item) => item.difficulty === "easy")).toHaveLength(78);
    expect(deck.filter((item) => item.difficulty === "medium")).toHaveLength(50);
    expect(deck.filter((item) => item.difficulty === "hard")).toHaveLength(22);
    for (const generation of [
      "classics",
      "1990s-2000s",
      "modern-kids",
      "cross-generational",
    ] as const) {
      expect(deck.filter((item) => item.generation === generation).length).toBeGreaterThanOrEqual(
        25,
      );
    }
    expect(chunkCharacters(deck)).toHaveLength(17);
  });
});

describe("smart repetition", () => {
  const cards = [character("alpha"), character("bravo"), character("charlie")];

  test("prioritizes characters that have never been completed", () => {
    const session = CharacterPartySessionSchema.parse({
      history: {
        alpha: { usedCount: 2, lastUsed: 20 },
        bravo: { usedCount: 0, lastUsed: null },
        charlie: { usedCount: 1, lastUsed: 10 },
      },
    });
    expect(selectNextCharacter(cards, session, () => 0)?.id).toBe("bravo");
  });

  test("a skip does not count as completed and cannot immediately repeat", () => {
    const started = startCharacterPartySession(
      CHARACTER_PARTY_SESSION_DEFAULT,
      cards,
      1_000,
      () => 0,
    );
    const skippedId = started.currentCharacterId;
    const afterSkip = skipCurrentCharacter(started, cards, () => 0);
    expect(afterSkip.currentCharacterId).not.toBe(skippedId);
    expect(afterSkip.completedCharacterIds).toEqual([]);
    expect(skippedId ? afterSkip.history[skippedId]?.usedCount : undefined).toBe(0);
  });

  test("reveal completes the character and next advances the round", () => {
    const started = startCharacterPartySession(
      CHARACTER_PARTY_SESSION_DEFAULT,
      cards,
      1_000,
      () => 0,
    );
    const characterId = started.currentCharacterId;
    const revealed = revealCurrentCharacter(started, 2_000);
    expect(revealed.phase).toBe("revealed");
    expect(characterId ? revealed.history[characterId]?.usedCount : undefined).toBe(1);
    expect(revealed.completedCharacterIds).toEqual(characterId ? [characterId] : []);
    const next = advanceCharacterPartySession(revealed, cards, () => 0);
    expect(next.phase).toBe("prompt");
    expect(next.currentCharacterId).not.toBe(characterId);
  });

  test("a new session clears old session-local skip cooldowns", () => {
    const previous = CharacterPartySessionSchema.parse({
      history: {
        alpha: { usedCount: 0, lastUsed: null, lastSkippedAtTurn: 80 },
      },
    });
    const started = startCharacterPartySession(previous, [character("alpha")], 1_000, () => 0);
    expect(started.currentCharacterId).toBe("alpha");
    expect(started.history.alpha?.lastSkippedAtTurn).toBeNull();
  });
});

test("timer helpers derive from persisted timestamps without drift", () => {
  const session = CharacterPartySessionSchema.parse({
    phase: "prompt",
    sessionDurationMinutes: 45,
    roundDurationSeconds: 60,
    sessionStartedAt: 1_000,
    roundStartedAt: 11_000,
  });
  expect(roundSecondsRemaining(session, 26_500)).toBe(45);
  expect(sessionSecondsRemaining(session, 61_000)).toBe(2_640);
  expect(roundSecondsRemaining(session, 10_000)).toBe(60);
  expect(sessionSecondsRemaining(session, 0)).toBe(2_700);
  expect(formatCountdown(45)).toBe("0:45");
  expect(formatCountdown(2_640)).toBe("44:00");
});
