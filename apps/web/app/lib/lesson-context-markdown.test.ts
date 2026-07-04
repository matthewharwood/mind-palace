import { describe, expect, test } from "bun:test";
import type { Flashcard } from "@mind-palace/curriculum";

import {
  buildLessonContextMarkdown,
  LESSON_CONTEXT_END,
  LESSON_CONTEXT_START,
  type LessonCopyContext,
} from "./lesson-context-markdown";

const context: LessonCopyContext = {
  goalTitle: "Graphics & Shaders",
  goalDescription: "Learn vectors, GPU drawing, and FF6-style effects.",
  pathTitle: "FF6 VFX Path",
  curriculumId: "c-gfx-vectors",
  curriculumTitle: "Vector Motion",
  curriculumSource: "github-repo: https://example.test/repo @ main",
  lessonId: "velocity-addition",
  lessonIndex: 2,
  lessonCount: 10,
  prerequisites: [{ id: "coordinates", title: "Coordinate Grid" }],
  previousLesson: { id: "unit-vectors", title: "Unit Vectors" },
  nextLesson: { id: "velocity", title: "Velocity" },
  canonicalPath: "/curriculum/c-gfx-vectors/node/velocity-addition",
};

describe("buildLessonContextMarkdown", () => {
  test("wraps lesson context in stable separators with hierarchy", () => {
    const flashcard: Flashcard = {
      id: "velocity-addition",
      title: "Velocity Addition",
      content: {
        type: "read",
        markdown: "Add `position + velocity` to move one step.",
      },
    };

    const markdown = buildLessonContextMarkdown(flashcard, context);

    expect(markdown.startsWith(`${LESSON_CONTEXT_START}\n`)).toBe(true);
    expect(markdown).toContain("Use this context to answer my question.");
    expect(markdown).toContain("- Goal: Graphics & Shaders");
    expect(markdown).toContain("- Goal point: Learn vectors, GPU drawing, and FF6-style effects.");
    expect(markdown).toContain("- Lesson: 3 of 10 - Velocity Addition (velocity-addition)");
    expect(markdown).toContain("  - Coordinate Grid (coordinates)");
    expect(markdown).toContain("Add `position + velocity` to move one step.");
    expect(markdown).toContain(`${LESSON_CONTEXT_END}\n`);
  });

  test("serializes code exercises with a language-tagged code fence", () => {
    const flashcard: Flashcard = {
      id: "write-main",
      title: "Write main",
      content: {
        type: "code",
        prompt: "Write a Rust entry point.",
        language: "rust",
        solution: 'fn main() {\n    println!("hi");\n}',
      },
    };

    const markdown = buildLessonContextMarkdown(flashcard, {
      ...context,
      lessonId: "write-main",
    });

    expect(markdown).toContain("### Expected solution");
    expect(markdown).toContain('```rust\nfn main() {\n    println!("hi");\n}\n```');
  });

  test("prefixes a spoken question as its own markdown section", () => {
    const flashcard: Flashcard = {
      id: "mcq",
      title: "Symbol check",
      content: {
        type: "multiple-choice",
        question: "What is iron's chemical symbol?",
        code: 'let symbol = "Fe";',
        language: "rust",
        options: ["Ir", "Fe", "In"],
        answerIndex: 1,
      },
    };

    const markdown = buildLessonContextMarkdown(flashcard, context, "Why is this option correct?");

    expect(markdown.startsWith("----- BEGIN MIND PALACE SPOKEN QUESTION -----")).toBe(true);
    expect(markdown).toContain("Why is this option correct?");
    expect(markdown).toContain('```rust\nlet symbol = "Fe";\n```');
    expect(markdown).toContain("### Authored answer\nFe");
  });
});
