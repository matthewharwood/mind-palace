import { describe, expect, test } from "bun:test";

import { buildCurriculumGraph } from "./graph";
import { forceLayout, layeredTree } from "./layout";
import type { Curriculum, Edge } from "./schema";

describe("layeredTree", () => {
  test("a linear chain stacks by depth", () => {
    const edges: Edge[] = [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
    ];
    const pos = layeredTree(["a", "b", "c"], edges, { gapY: 100 });
    expect(pos.a?.y).toBe(0);
    expect(pos.b?.y).toBe(100);
    expect(pos.c?.y).toBe(200);
  });

  test("siblings share a layer (same y, different x)", () => {
    const pos = layeredTree(
      ["root", "l", "r"],
      [
        { from: "root", to: "l" },
        { from: "root", to: "r" },
      ],
    );
    expect(pos.l?.y).toBe(pos.r?.y);
    expect(pos.l?.x).not.toBe(pos.r?.x);
    expect(pos.root?.y).toBe(0);
  });

  test("positions every node", () => {
    const pos = layeredTree(["x", "y", "z"], []);
    expect(Object.keys(pos).sort()).toEqual(["x", "y", "z"]);
  });
});

describe("forceLayout", () => {
  const curriculum: Curriculum = {
    id: "c1",
    title: "t",
    source: { kind: "pdf", href: "/a.pdf" },
    nodes: [
      { id: "n1", title: "1", content: { type: "read", markdown: "a" } },
      { id: "n2", title: "2", content: { type: "read", markdown: "b" } },
      { id: "n3", title: "3", content: { type: "read", markdown: "c" } },
    ],
    edges: [{ from: "n1", to: "n2" }],
  };

  test("places every node and is deterministic", () => {
    const a = forceLayout(buildCurriculumGraph(curriculum), { iterations: 50 });
    const b = forceLayout(buildCurriculumGraph(curriculum), { iterations: 50 });
    expect(Object.keys(a).sort()).toEqual(["n1", "n2", "n3"]);
    expect(a).toEqual(b); // seeded + fixed iterations → reproducible
  });
});
