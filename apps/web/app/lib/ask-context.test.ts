import { describe, expect, test } from "bun:test";
import type { Curriculum, Goal } from "@mind-palace/curriculum";
import { type CardState, CardStateSchema } from "@mind-palace/srs";

import { ASK_PREFIX, buildAskMarkdown, type FocusContext } from "./ask-context";
import { pathReport } from "./progress-report";

const cs = (overrides: Partial<CardState>): CardState => CardStateSchema.parse(overrides);
const curric: Curriculum = {
  id: "c1",
  title: "Ownership & Borrowing",
  source: { kind: "pdf", href: "/a.pdf" },
  nodes: [
    { id: "a", title: "Ownership", content: { type: "read", markdown: "x" } },
    { id: "b", title: "Borrowing", content: { type: "read", markdown: "y" } },
  ],
  edges: [],
};
const goal: Goal = { id: "g", title: "Learn Rust", description: "d", pathId: "p" };

describe("buildAskMarkdown", () => {
  test("assembles prefix, focus, progress, weaknesses, and the question", () => {
    const states = new Map([["c1", { b: cs({ phase: "relearning", lapses: 2, ease: 1.4 }) }]]);
    const report = pathReport(goal, [curric], states, 1_700_000_000_000);
    const focus: FocusContext = {
      location: "Learn Rust › Ownership & Borrowing › Borrowing",
      detail: "What is borrowing?",
    };
    const md = buildAskMarkdown(focus, [report], "Why does the borrow checker reject this?");

    expect(md.startsWith(ASK_PREFIX)).toBe(true);
    expect(md).toContain("## Where I am right now");
    expect(md).toContain("Learn Rust › Ownership & Borrowing › Borrowing");
    expect(md).toContain("> What is borrowing?");
    expect(md).toContain("### Learn Rust");
    expect(md).toContain("Struggling with");
    expect(md).toContain("## My question");
    expect(md).toContain("Why does the borrow checker reject this?");
  });

  test("falls back to placeholders when empty", () => {
    const md = buildAskMarkdown({ location: "Goals overview", detail: null }, [], "");
    expect(md).toContain("_(describe what you're stuck on)_");
    expect(md).toContain("_Just getting started");
  });
});
