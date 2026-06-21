import { describe, expect, test } from "bun:test";

import {
  CurriculumSchema,
  FlashcardContentSchema,
  GoalSchema,
  LearningPathSchema,
  SourceSchema,
} from "./schema";

describe("SourceSchema", () => {
  test("accepts github-repo and pdf, rejects unknown kinds", () => {
    expect(SourceSchema.parse({ kind: "github-repo", url: "https://x" }).kind).toBe("github-repo");
    expect(SourceSchema.parse({ kind: "pdf", href: "/a.pdf", pages: [1, 9] }).kind).toBe("pdf");
    expect(() => SourceSchema.parse({ kind: "notion", url: "x" })).toThrow();
    expect(() => SourceSchema.parse({ kind: "github-repo" })).toThrow();
  });
});

describe("FlashcardContentSchema", () => {
  test("read carries markdown", () => {
    expect(FlashcardContentSchema.parse({ type: "read", markdown: "# hi" }).type).toBe("read");
  });
  test("multiple-choice needs >= 2 options", () => {
    expect(() =>
      FlashcardContentSchema.parse({
        type: "multiple-choice",
        question: "?",
        options: ["a"],
        answerIndex: 0,
      }),
    ).toThrow();
    expect(
      FlashcardContentSchema.parse({
        type: "multiple-choice",
        question: "?",
        options: ["a", "b"],
        answerIndex: 1,
      }).type,
    ).toBe("multiple-choice");
  });
  test("rejects unknown node types", () => {
    expect(() => FlashcardContentSchema.parse({ type: "hologram" })).toThrow();
  });
});

describe("CurriculumSchema / LearningPathSchema / GoalSchema", () => {
  test("a minimal curriculum parses", () => {
    const c = CurriculumSchema.parse({
      id: "c1",
      title: "Intro",
      source: { kind: "github-repo", url: "https://x" },
      nodes: [{ id: "n1", title: "N1", content: { type: "read", markdown: "hi" } }],
      edges: [],
    });
    expect(c.nodes).toHaveLength(1);
  });
  test("a path is a tree of curriculum refs; a goal owns a path", () => {
    const p = LearningPathSchema.parse({
      id: "p1",
      title: "Path",
      nodes: [{ curriculumId: "c1", title: "Intro" }],
      edges: [],
    });
    expect(p.nodes[0]?.curriculumId).toBe("c1");
    expect(GoalSchema.parse({ id: "g1", title: "G", description: "d", pathId: "p1" }).pathId).toBe(
      "p1",
    );
  });
});
