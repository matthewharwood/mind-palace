import { describe, expect, test } from "bun:test";

import { buildSpeechTrack, markdownToSegments, verbalizeInline } from "./speech-track";

describe("verbalizeInline", () => {
  test("applies the pronunciation lexicon on word boundaries", () => {
    expect(verbalizeInline("WGSL runs on wgpu")).toBe("W G S L runs on W G P U");
    // "SDF" must not fire inside "SDFs" — the plural has its own entry.
    expect(verbalizeInline("two SDFs, one SDF")).toBe(
      "two signed distance fields, one signed distance field",
    );
  });

  test("==highlights== become a comma-isolated spoken beat", () => {
    expect(verbalizeInline("change is always ==explicit== here")).toBe(
      "change is always, explicit, here",
    );
  });

  test("highlight at a sentence end does not leave a dangling comma", () => {
    expect(verbalizeInline("evaluated at ==compile time==.")).toBe("evaluated at, compile time.");
  });

  test("inline code speaks as words, not punctuation soup", () => {
    expect(verbalizeInline("call `Mat4::from_scale_rotation_translation`")).toBe(
      "call Mat4 from scale rotation translation",
    );
  });

  test("bold and italic markers are stripped", () => {
    expect(verbalizeInline("**final expression** is *returned*")).toBe(
      "final expression is returned",
    );
  });
});

describe("markdownToSegments", () => {
  test("headings speak slower with a longer pause than body prose", () => {
    const segments = markdownToSegments("## The Pipeline\nVertices go in. Pixels come out.");
    expect(segments[0]?.text).toBe("The Pipeline");
    const heading = segments[0];
    const body = segments[1];
    if (!heading || !body) throw new Error("missing segments");
    expect(heading.rate).toBeLessThan(body.rate);
    expect(heading.pauseAfterMs).toBeGreaterThan(body.pauseAfterMs);
  });

  test("paragraph prose splits into sentence segments", () => {
    const segments = markdownToSegments("Vertices go in. Pixels come out. Simple.");
    expect(segments.map((s) => s.text)).toEqual(["Vertices go in.", "Pixels come out. Simple."]);
  });

  test("list items become individual segments", () => {
    const segments = markdownToSegments("- first thing\n- second thing");
    expect(segments.map((s) => s.text)).toEqual(["first thing", "second thing"]);
  });

  test("fenced code is skipped and announced once", () => {
    const segments = markdownToSegments("Before.\n```rust\nlet x = 5;\nlet y = 6;\n```\nAfter.");
    expect(segments.map((s) => s.text)).toEqual([
      "Before.",
      "Code example, shown on screen.",
      "After.",
    ]);
  });
});

describe("buildSpeechTrack", () => {
  test("read card: title first, then body", () => {
    const segments = buildSpeechTrack({
      id: "x",
      title: "Variables & Mutability",
      content: { type: "read", markdown: "Bindings are ==immutable== by default." },
    });
    expect(segments[0]?.text).toBe("Variables & Mutability");
    expect(segments[1]?.text).toBe("Bindings are, immutable, by default.");
  });

  test("mcq card: question, snippet notice, numbered options — answer not revealed", () => {
    const segments = buildSpeechTrack({
      id: "x",
      title: "Shadowing",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        code: "fn main() {}",
        language: "rust",
        options: ["10", "11", "12"],
        answerIndex: 2,
      },
    });
    const texts = segments.map((s) => s.text);
    expect(texts).toEqual([
      "Shadowing",
      "What does this program print?",
      "There is a code snippet on screen.",
      "Option 1: 10",
      "Option 2: 11",
      "Option 3: 12",
    ]);
    expect(texts.join(" ")).not.toContain("answer");
  });

  test("code card: prompt then editor instruction", () => {
    const segments = buildSpeechTrack({
      id: "x",
      title: "Lerp",
      content: { type: "code", prompt: "Implement `lerp` for `f32`.", solution: "pub fn x() {}" },
    });
    expect(segments.map((s) => s.text)).toEqual([
      "Lerp",
      "Implement lerp for f32.",
      "Type the solution in the editor.",
    ]);
  });

  test("no empty segments are emitted", () => {
    const segments = buildSpeechTrack({
      id: "x",
      title: "T",
      content: { type: "read", markdown: "\n\n\n" },
    });
    expect(segments.every((s) => s.text.length > 0)).toBe(true);
  });
});
