import { describe, expect, test } from "bun:test";
import type { Curriculum, Goal } from "@mind-palace/curriculum";
import { type CardState, CardStateSchema } from "@mind-palace/srs";

import { curriculumReport, pathReport } from "./progress-report";

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;
const cs = (overrides: Partial<CardState>): CardState => CardStateSchema.parse(overrides);

const curric: Curriculum = {
  id: "c1",
  title: "C1",
  source: { kind: "pdf", href: "/a.pdf" },
  nodes: [
    { id: "a", title: "A", content: { type: "read", markdown: "x" } },
    { id: "b", title: "B", content: { type: "read", markdown: "y" } },
    { id: "c", title: "C", content: { type: "read", markdown: "z" } },
    { id: "d", title: "D", content: { type: "read", markdown: "w" } },
  ],
  edges: [],
};

describe("curriculumReport", () => {
  const states = {
    a: cs({ phase: "review", ease: 2.6, due: NOW + 1000 }), // mastered, not due
    b: cs({ phase: "relearning", lapses: 2, ease: 1.4, due: NOW - 5 * DAY }), // weak
    c: cs({ phase: "learning", reps: 4, due: NOW - 1000 }), // stuck + due
    // d has no state → new, due
  };
  const r = curriculumReport(curric, states, NOW);

  test("counts phases and mastery", () => {
    expect(r.total).toBe(4);
    expect(r.started).toBe(3);
    expect(r.counts).toEqual({ new: 1, learning: 1, review: 1, relearning: 1 });
    expect(r.mastered).toBe(1);
    expect(r.masteryPct).toBe(25);
    expect(r.lapses).toBe(2);
  });

  test("counts due (overdue reviews + unseen)", () => {
    expect(r.due).toBe(3); // b overdue + c due + d unseen
  });

  test("ranks weaknesses and excludes mastered cards", () => {
    expect(r.weak[0]?.nodeId).toBe("b");
    expect(r.weak[0]?.reasons).toContain("relearning");
    expect(r.weak.some((w) => w.nodeId === "c")).toBe(true);
    expect(r.weak.some((w) => w.nodeId === "a")).toBe(false);
  });
});

describe("pathReport", () => {
  test("aggregates curricula and picks the weakest started curriculum", () => {
    const goal: Goal = { id: "g", title: "G", description: "d", pathId: "p" };
    const c2: Curriculum = {
      id: "c2",
      title: "C2",
      source: { kind: "pdf", href: "/a.pdf" },
      nodes: [{ id: "x", title: "X", content: { type: "read", markdown: "x" } }],
      edges: [],
    };
    const states = new Map([["c1", { a: cs({ phase: "review", ease: 2.6, due: NOW + 1000 }) }]]);
    const report = pathReport(goal, [curric, c2], states, NOW);
    expect(report.total).toBe(5);
    expect(report.mastered).toBe(1);
    expect(report.weakestCurriculumId).toBe("c1"); // c1 started; c2 untouched is excluded
  });
});
