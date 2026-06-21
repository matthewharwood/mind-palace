import { describe, expect, test } from "bun:test";

import { cycleIndex } from "./keyboard";

describe("cycleIndex", () => {
  test("advances and wraps forward", () => {
    expect(cycleIndex(0, 3, 1)).toBe(1);
    expect(cycleIndex(2, 3, 1)).toBe(0);
  });
  test("advances and wraps backward", () => {
    expect(cycleIndex(0, 3, -1)).toBe(2);
    expect(cycleIndex(1, 3, -1)).toBe(0);
  });
  test("is safe for an empty list", () => {
    expect(cycleIndex(0, 0, 1)).toBe(0);
  });
});
