import { describe, expect, test } from "bun:test";

import { type LayoutNode, layeredDag, radialNetwork } from "./layout";
import type { Edge } from "./schema";

const sized = (ids: string[], w = 100, h = 50): LayoutNode[] =>
  ids.map((id) => ({ id, width: w, height: h }));

describe("layeredDag", () => {
  test("a linear chain stacks by depth", () => {
    const edges: Edge[] = [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
    ];
    const { positions } = layeredDag(sized(["a", "b", "c"]), edges, { layerGap: 100 });
    expect(positions.a?.y).toBeLessThan(positions.b?.y ?? 0);
    expect(positions.b?.y).toBeLessThan(positions.c?.y ?? 0);
  });

  test("siblings share a layer (same y) and never overlap in x", () => {
    const { positions } = layeredDag(sized(["root", "l", "r"], 100, 50), [
      { from: "root", to: "l" },
      { from: "root", to: "r" },
    ]);
    expect(positions.l?.y).toBe(positions.r?.y);
    expect(Math.abs((positions.l?.x ?? 0) - (positions.r?.x ?? 0))).toBeGreaterThanOrEqual(100);
    expect(positions.root?.y).toBeLessThan(positions.l?.y ?? 0);
  });

  test("positions every node and reports bounds", () => {
    const result = layeredDag(sized(["x", "y", "z"]), []);
    expect(Object.keys(result.positions).sort()).toEqual(["x", "y", "z"]);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  test("is deterministic", () => {
    const nodes = sized(["a", "b", "c", "d"]);
    const edges: Edge[] = [
      { from: "a", to: "b" },
      { from: "a", to: "c" },
      { from: "b", to: "d" },
      { from: "c", to: "d" },
    ];
    expect(layeredDag(nodes, edges)).toEqual(layeredDag(nodes, edges));
  });
});

describe("radialNetwork", () => {
  test("a single root sits at the center; children radiate outward", () => {
    const { positions } = radialNetwork(sized(["root", "a", "b", "c"]), [
      { from: "root", to: "a" },
      { from: "root", to: "b" },
      { from: "root", to: "c" },
    ]);
    const root = positions.root;
    const center = { x: root?.x ?? 0, y: root?.y ?? 0 };
    // Children sit further from the root than its own (near-zero) radius.
    for (const id of ["a", "b", "c"]) {
      const p = positions[id];
      const dist = Math.hypot((p?.x ?? 0) - center.x, (p?.y ?? 0) - center.y);
      expect(dist).toBeGreaterThan(50);
    }
  });

  test("positions every node, including disconnected ones, and reports bounds", () => {
    const result = radialNetwork(sized(["x", "y", "lonely"]), [{ from: "x", to: "y" }]);
    expect(Object.keys(result.positions).sort()).toEqual(["lonely", "x", "y"]);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  test("is deterministic", () => {
    const nodes = sized(["a", "b", "c", "d"]);
    const edges: Edge[] = [
      { from: "a", to: "b" },
      { from: "a", to: "c" },
      { from: "c", to: "d" },
    ];
    expect(radialNetwork(nodes, edges)).toEqual(radialNetwork(nodes, edges));
  });
});
