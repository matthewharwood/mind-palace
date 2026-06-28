import { describe, expect, test } from "bun:test";
import type { CardState } from "@mind-palace/srs";
import { createCardState } from "@mind-palace/srs";

import { getCurriculum } from "~/data/curriculum-data";
import { buildStudyDeck } from "./study-session";

// Real curriculum so the test rides actual node types. c-rust-foundations has
// the read intro "variables-and-mutability", the MCQ "mut-required", and the
// code card "hello-world".
const curriculum = getCurriculum("c-rust-foundations");
if (!curriculum) throw new Error("fixture curriculum missing");

const NOW = 1_000_000_000;

describe("buildStudyDeck", () => {
  test("includes recall cards (MCQ + code), excludes read intros", () => {
    const deck = buildStudyDeck(curriculum, {}, NOW);
    expect(deck).toContain("mut-required");
    expect(deck).toContain("hello-world");
    expect(deck).not.toContain("variables-and-mutability"); // read → not in the deck
  });

  test("due reviews come before never-seen 'new' cards", () => {
    const states: Record<string, CardState> = {
      "mut-required": { ...createCardState({ now: NOW - 10_000 }) }, // due in the past
    };
    const deck = buildStudyDeck(curriculum, states, NOW);
    expect(deck[0]).toBe("mut-required"); // due review sorts ahead of fresh cards
    expect(deck).toContain("hello-world");
  });

  test("not-yet-due reviews are excluded", () => {
    const states: Record<string, CardState> = {
      "mut-required": { ...createCardState({ now: NOW + 1_000_000 }) }, // due in the future
    };
    const deck = buildStudyDeck(curriculum, states, NOW);
    expect(deck).not.toContain("mut-required");
  });

  test("most-overdue review sorts first", () => {
    const states: Record<string, CardState> = {
      "mut-required": { ...createCardState({ now: NOW - 5_000 }) },
      "const-requirements": { ...createCardState({ now: NOW - 50_000 }) }, // more overdue
    };
    const deck = buildStudyDeck(curriculum, states, NOW);
    expect(deck.indexOf("const-requirements")).toBeLessThan(deck.indexOf("mut-required"));
  });
});
