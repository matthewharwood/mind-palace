import { describe, expect, test } from "bun:test";

import { accepts, isActionable, parseAccepts, resolveDefaultIntent } from "./hit-test";
import type { DragSource, IntentContext } from "./schema";

describe("parseAccepts", () => {
  test("splits on whitespace and drops empties", () => {
    expect(parseAccepts("metal gas")).toEqual(["metal", "gas"]);
    expect(parseAccepts("  a   b ")).toEqual(["a", "b"]);
    expect(parseAccepts("")).toEqual([]);
    expect(parseAccepts(undefined)).toEqual([]);
  });
});

describe("accepts", () => {
  test("empty target accepts anything", () => {
    expect(accepts([], ["metal"])).toBe(true);
    expect(accepts([], [])).toBe(true);
  });
  test("otherwise needs a tag intersection", () => {
    expect(accepts(["metal"], ["metal", "shiny"])).toBe(true);
    expect(accepts(["metal"], ["gas"])).toBe(false);
    expect(accepts(["metal"], [])).toBe(false);
  });
});

describe("isActionable", () => {
  test("drop/swap/replace are actionable; blocked/none are not", () => {
    expect(isActionable({ kind: "drop", targetId: "t" })).toBe(true);
    expect(isActionable({ kind: "swap", targetId: "t" })).toBe(true);
    expect(isActionable({ kind: "replace", targetId: "t" })).toBe(true);
    expect(isActionable({ kind: "blocked", targetId: "t" })).toBe(false);
    expect(isActionable({ kind: "none" })).toBe(false);
  });
});

describe("resolveDefaultIntent", () => {
  const source: DragSource = { kind: "slot", id: "s1" };
  const ctx = (
    over: Partial<IntentContext["target"]>,
    src: DragSource = source,
  ): IntentContext => ({
    cardId: "c",
    cardTags: ["metal"],
    source: src,
    target: {
      id: "t",
      kind: "slot",
      accepts: [],
      occupied: false,
      disabled: false,
      locked: false,
      ...over,
    },
  });

  test("disabled or locked targets are blocked", () => {
    expect(resolveDefaultIntent(ctx({ disabled: true })).kind).toBe("blocked");
    expect(resolveDefaultIntent(ctx({ locked: true })).kind).toBe("blocked");
  });

  test("accepts mismatch is blocked", () => {
    expect(resolveDefaultIntent(ctx({ accepts: ["gas"] })).kind).toBe("blocked");
  });

  test("zones accept", () => {
    expect(resolveDefaultIntent(ctx({ kind: "zone" })).kind).toBe("drop");
  });

  test("empty slot drops; same slot is a no-op drop", () => {
    expect(resolveDefaultIntent(ctx({})).kind).toBe("drop");
    expect(resolveDefaultIntent(ctx({ id: "s1" })).kind).toBe("drop");
  });

  test("occupied slot swaps from a slot source, blocks from elsewhere", () => {
    expect(resolveDefaultIntent(ctx({ occupied: true })).kind).toBe("swap");
    expect(resolveDefaultIntent(ctx({ occupied: true }, { kind: "hand", id: "h" })).kind).toBe(
      "blocked",
    );
  });
});
