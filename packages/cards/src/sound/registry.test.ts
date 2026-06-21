import { describe, expect, test } from "bun:test";

import { mergeRegistry } from "./registry";
import type { SoundRegistry } from "./schema";

const base: SoundRegistry = {
  "card.pickup": { src: "/pickup.mp3", volume: 0.7 },
  "card.drop": { src: "/drop.mp3", volume: 0.8 },
};

describe("mergeRegistry", () => {
  test("returns a copy when there are no overrides", () => {
    const merged = mergeRegistry(base);
    expect(merged).toEqual(base);
    expect(merged).not.toBe(base);
  });

  test("field-merges a known id (override volume, keep src)", () => {
    const merged = mergeRegistry(base, { "card.drop": { volume: 0.5 } });
    expect(merged["card.drop"]).toEqual({ src: "/drop.mp3", volume: 0.5 });
  });

  test("swaps a src on a known id", () => {
    const merged = mergeRegistry(base, { "card.pickup": { src: "/mine.mp3" } });
    expect(merged["card.pickup"]).toEqual({ src: "/mine.mp3", volume: 0.7 });
  });

  test("adds a new id that carries a src", () => {
    const merged = mergeRegistry(base, { "card.win": { src: "/win.mp3", volume: 1 } });
    expect(merged["card.win"]).toEqual({ src: "/win.mp3", volume: 1 });
  });

  test("ignores a new id with no src (nothing to play)", () => {
    const merged = mergeRegistry(base, { "card.win": { volume: 1 } });
    expect(merged["card.win"]).toBeUndefined();
  });

  test("does not mutate the base", () => {
    mergeRegistry(base, { "card.drop": { volume: 0.1 } });
    expect(base["card.drop"]?.volume).toBe(0.8);
  });
});
