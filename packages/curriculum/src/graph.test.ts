import { describe, expect, test } from "bun:test";
import { createCardState, review } from "@mind-palace/srs";

import { buildCurriculumGraph, dueFlashcardIds, isUnlocked, prerequisites, rootIds } from "./graph";
import type { Curriculum } from "./schema";

const T0 = 1_700_000_000_000;

const curriculum: Curriculum = {
  id: "c1",
  title: "Intro",
  source: { kind: "github-repo", url: "https://x" },
  nodes: [
    { id: "n1", title: "Basics", content: { type: "read", markdown: "a" } },
    { id: "n2", title: "Next", content: { type: "read", markdown: "b" } },
    { id: "n3", title: "Also", content: { type: "read", markdown: "c" } },
  ],
  edges: [
    { from: "n1", to: "n2" },
    { from: "n1", to: "n3" },
  ],
};

describe("buildCurriculumGraph", () => {
  test("has the nodes, edges, and node attributes", () => {
    const g = buildCurriculumGraph(curriculum);
    expect(g.order).toBe(3);
    expect(g.size).toBe(2);
    expect(g.getNodeAttribute("n1", "title")).toBe("Basics");
    expect(g.getNodeAttribute("n1", "type")).toBe("read");
  });
});

describe("roots / prerequisites / unlock", () => {
  const g = buildCurriculumGraph(curriculum);
  test("n1 is the only root", () => {
    expect(rootIds(g)).toEqual(["n1"]);
  });
  test("n2 requires n1", () => {
    expect(prerequisites(g, "n2")).toEqual(["n1"]);
  });
  test("a node unlocks once its prerequisites are complete", () => {
    expect(isUnlocked(g, "n2", new Set())).toBe(false);
    expect(isUnlocked(g, "n2", new Set(["n1"]))).toBe(true);
    expect(isUnlocked(g, "n1", new Set())).toBe(true); // root, no prereqs
  });
});

describe("dueFlashcardIds", () => {
  test("a node with no state is due; a freshly-reviewed node is not", () => {
    const reviewed = review(createCardState({ now: T0 }), "easy", { now: T0 }).state;
    const due = dueFlashcardIds(curriculum, { n1: reviewed }, T0);
    expect(due).not.toContain("n1"); // scheduled into the future
    expect(due).toContain("n2"); // never seen → due
    expect(due).toContain("n3");
  });
});
