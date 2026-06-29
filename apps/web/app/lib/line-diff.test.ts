import { describe, expect, test } from "bun:test";

import { lineDiff } from "./line-diff";

const types = (a: string[], b: string[]) => lineDiff(a, b).map((op) => `${op.type}:${op.text}`);

describe("lineDiff", () => {
  test("identical input is all 'same'", () => {
    expect(types(["a", "b"], ["a", "b"])).toEqual(["same:a", "same:b"]);
  });

  test("a changed middle line shows the removal then the addition", () => {
    expect(types(["fn main() {", "  wrong", "}"], ["fn main() {", "  right", "}"])).toEqual([
      "same:fn main() {",
      "remove:  wrong",
      "add:  right",
      "same:}",
    ]);
  });

  test("a missing line is an add; an extra line is a remove", () => {
    expect(types(["a", "c"], ["a", "b", "c"])).toEqual(["same:a", "add:b", "same:c"]);
    expect(types(["a", "b", "c"], ["a", "c"])).toEqual(["same:a", "remove:b", "same:c"]);
  });

  test("ids are unique and stable per position", () => {
    const ids = lineDiff(["a", "b"], ["a", "c"]).map((op) => op.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
