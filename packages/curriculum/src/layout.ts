import type Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";

import type { Edge } from "./schema";

// ---------------------------------------------------------------------------
// Layouts → { nodeId: {x,y} }. The learning-path tree uses a deterministic
// layered layout (pure, no deps — great for tests + reduced-motion static
// render). The curriculum network graph uses graphology's forceatlas2, seeded
// from deterministic circular positions with a fixed iteration count so it is
// reproducible (no randomness).
// ---------------------------------------------------------------------------

export interface Point {
  x: number;
  y: number;
}

export interface LayeredOptions {
  gapX?: number;
  gapY?: number;
}

/** Longest-path layered tree layout (Kahn topological relaxation). Stable in
 *  input order; cycle nodes (curricula are DAGs in practice) fall back to depth 0. */
export function layeredTree(
  nodeIds: readonly string[],
  edges: readonly Edge[],
  options: LayeredOptions = {},
): Record<string, Point> {
  const gapX = options.gapX ?? 160;
  const gapY = options.gapY ?? 140;

  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const id of nodeIds) {
    indegree.set(id, 0);
    adjacency.set(id, []);
  }
  for (const edge of edges) {
    const out = adjacency.get(edge.from);
    if (out && indegree.has(edge.to)) {
      out.push(edge.to);
      indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
    }
  }

  const depth = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  const remaining = new Map(indegree);
  const queue = nodeIds.filter((id) => (indegree.get(id) ?? 0) === 0);
  for (let head = 0; head < queue.length; head += 1) {
    const id = queue[head];
    if (id === undefined) continue;
    const d = depth.get(id) ?? 0;
    for (const next of adjacency.get(id) ?? []) {
      depth.set(next, Math.max(depth.get(next) ?? 0, d + 1));
      const left = (remaining.get(next) ?? 1) - 1;
      remaining.set(next, left);
      if (left === 0) queue.push(next);
    }
  }

  const layers = new Map<number, string[]>();
  for (const id of nodeIds) {
    const d = depth.get(id) ?? 0;
    const row = layers.get(d) ?? [];
    row.push(id);
    layers.set(d, row);
  }

  const positions: Record<string, Point> = {};
  for (const [d, ids] of layers) {
    const offset = ((ids.length - 1) * gapX) / 2;
    ids.forEach((id, i) => {
      positions[id] = { x: i * gapX - offset, y: d * gapY };
    });
  }
  return positions;
}

export interface ForceOptions {
  iterations?: number;
  scalingRatio?: number;
}

/** Force-directed layout via graphology forceatlas2, seeded deterministically. */
export function forceLayout(graph: Graph, options: ForceOptions = {}): Record<string, Point> {
  const ids = graph.nodes();
  const count = Math.max(1, ids.length);
  ids.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / count;
    graph.setNodeAttribute(id, "x", Math.cos(angle) * 100);
    graph.setNodeAttribute(id, "y", Math.sin(angle) * 100);
  });

  forceAtlas2.assign(graph, {
    iterations: options.iterations ?? 100,
    settings: { gravity: 1, scalingRatio: options.scalingRatio ?? 10 },
  });

  const positions: Record<string, Point> = {};
  graph.forEachNode((id, attrs) => {
    positions[id] = { x: Number(attrs.x) || 0, y: Number(attrs.y) || 0 };
  });
  return positions;
}
