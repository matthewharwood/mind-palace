import { describe, expect, test } from "bun:test";

import { parseInline } from "./markdown";

describe("parseInline", () => {
  test("splits inline code, bold, italic, and highlight out of prose", () => {
    const segments = parseInline(
      "Use `let mut x` for a **mutable** *binding* at ==compile time==.",
    );
    expect(segments.map((s) => s.kind)).toEqual([
      "text",
      "code",
      "text",
      "bold",
      "text",
      "italic",
      "text",
      "highlight",
      "text",
    ]);
    expect(segments.find((s) => s.kind === "code")?.text).toBe("let mut x");
    expect(segments.find((s) => s.kind === "bold")?.text).toBe("mutable");
    expect(segments.find((s) => s.kind === "highlight")?.text).toBe("compile time");
  });

  test("plain text yields a single text segment", () => {
    const segments = parseInline("no markup here");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ kind: "text", text: "no markup here" });
  });

  test("segment ids are unique", () => {
    const segments = parseInline("`a` and `b` and `c`");
    expect(new Set(segments.map((s) => s.id)).size).toBe(segments.length);
  });
});
