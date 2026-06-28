import type { Edge } from "./schema";

// ---------------------------------------------------------------------------
// Layered DAG layout → { positions, width, height }. Both the learning-path
// tree and the curriculum graph are prerequisite DAGs, so both render top-down
// in layers (far more readable than a force-directed blob). Pure (no deps, no
// DOM) — the caller measures text and passes node sizes in, so this stays
// portable + unit-testable. Layers are ordered by the barycenter heuristic to
// reduce edge crossings; within a layer nodes are packed by their own widths so
// content-sized nodes never overlap.
// ---------------------------------------------------------------------------

interface Point {
  x: number;
  y: number;
}

export interface LayoutNode {
  id: string;
  width: number;
  height: number;
}

interface LayeredOptions {
  /** Vertical gap between layers. */
  layerGap?: number;
  /** Horizontal gap between nodes in a layer. */
  nodeGap?: number;
}

interface LayeredResult {
  /** Center position of each node. */
  positions: Record<string, Point>;
  /** Total bounding width (graph is centered on x = 0). */
  width: number;
  /** Total bounding height (graph starts at y = 0). */
  height: number;
}

/** Longest-path layered DAG layout, width-aware, with barycenter ordering. */
export function layeredDag(
  nodes: readonly LayoutNode[],
  edges: readonly Edge[],
  options: LayeredOptions = {},
): LayeredResult {
  const layerGap = options.layerGap ?? 90;
  const nodeGap = options.nodeGap ?? 36;

  const ids = nodes.map((n) => n.id);
  const sizeOf = new Map(nodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, string[]>(ids.map((id) => [id, []]));
  const reverse = new Map<string, string[]>(ids.map((id) => [id, []]));
  const indegree = new Map<string, number>(ids.map((id) => [id, 0]));
  for (const edge of edges) {
    if (adjacency.has(edge.from) && indegree.has(edge.to)) {
      adjacency.get(edge.from)?.push(edge.to);
      reverse.get(edge.to)?.push(edge.from);
      indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
    }
  }

  // Longest-path depth via Kahn relaxation.
  const depth = new Map<string, number>(ids.map((id) => [id, 0]));
  const remaining = new Map(indegree);
  const queue = ids.filter((id) => (indegree.get(id) ?? 0) === 0);
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
  for (const id of ids) {
    const d = depth.get(id) ?? 0;
    const row = layers.get(d) ?? [];
    row.push(id);
    layers.set(d, row);
  }
  const depths = [...layers.keys()].sort((a, b) => a - b);
  const maxDepth = depths.length > 0 ? (depths[depths.length - 1] ?? 0) : 0;

  // Barycenter crossing reduction — alternate downward/upward sweeps.
  const sweep = (down: boolean) => {
    const orderedDepths = down ? depths : [...depths].reverse();
    for (const d of orderedDepths) {
      if (d === (down ? 0 : maxDepth)) continue;
      const neighbors = layers.get(d + (down ? -1 : 1)) ?? [];
      const rank = new Map(neighbors.map((id, i) => [id, i]));
      const source = down ? reverse : adjacency;
      const bary = (id: string): number => {
        const ns = (source.get(id) ?? [])
          .map((n) => rank.get(n))
          .filter((v): v is number => v !== undefined);
        return ns.length > 0 ? ns.reduce((a, c) => a + c, 0) / ns.length : Number.POSITIVE_INFINITY;
      };
      const row = layers.get(d);
      if (row) row.sort((a, b) => bary(a) - bary(b));
    }
  };
  for (let i = 0; i < 4; i += 1) {
    sweep(true);
    sweep(false);
  }

  // Assign positions: each layer centered on x = 0, stacked by max layer height.
  const positions: Record<string, Point> = {};
  let y = 0;
  let totalWidth = 0;
  for (const d of depths) {
    const row = layers.get(d) ?? [];
    const layerHeight = Math.max(0, ...row.map((id) => sizeOf.get(id)?.height ?? 0));
    const layerWidth =
      row.reduce((acc, id) => acc + (sizeOf.get(id)?.width ?? 0), 0) +
      nodeGap * Math.max(0, row.length - 1);
    totalWidth = Math.max(totalWidth, layerWidth);
    let x = -layerWidth / 2;
    for (const id of row) {
      const w = sizeOf.get(id)?.width ?? 0;
      positions[id] = { x: x + w / 2, y: y + layerHeight / 2 };
      x += w + nodeGap;
    }
    y += layerHeight + layerGap;
  }

  return { positions, width: totalWidth, height: Math.max(0, y - layerGap) };
}

interface RadialOptions {
  /** Distance added per ring (prerequisite depth). */
  ringGap?: number;
  /** Minimum arc gap between adjacent nodes on a ring. */
  minGap?: number;
}

/**
 * Deterministic radial network layout. Root concepts sit at the center and
 * prerequisites radiate outward in concentric rings by depth (BFS distance),
 * giving a web/network look rather than a top-down flow. Each ring's radius
 * grows to fit its nodes without overlap; ring order follows the parents'
 * angles (barycenter) to keep spokes from crossing. Output uses the same
 * convention as `layeredDag` (x centered on 0, y from 0) so the renderer fits
 * it identically. Pure + deterministic — no physics, no deps.
 */
export function radialNetwork(
  nodes: readonly LayoutNode[],
  edges: readonly Edge[],
  options: RadialOptions = {},
): LayeredResult {
  const ringGap = options.ringGap ?? 150;
  const minGap = options.minGap ?? 28;

  const ids = nodes.map((n) => n.id);
  const sizeOf = new Map(nodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, string[]>(ids.map((id) => [id, []]));
  const reverse = new Map<string, string[]>(ids.map((id) => [id, []]));
  const indegree = new Map<string, number>(ids.map((id) => [id, 0]));
  for (const edge of edges) {
    if (adjacency.has(edge.from) && indegree.has(edge.to)) {
      adjacency.get(edge.from)?.push(edge.to);
      reverse.get(edge.to)?.push(edge.from);
      indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
    }
  }

  // BFS depth from the roots (indegree 0). Unreached nodes go to an outer ring.
  const depth = new Map<string, number>();
  let roots = ids.filter((id) => (indegree.get(id) ?? 0) === 0);
  if (roots.length === 0 && ids.length > 0 && ids[0] !== undefined) roots = [ids[0]];
  const queue = [...roots];
  for (const r of roots) depth.set(r, 0);
  for (let head = 0; head < queue.length; head += 1) {
    const id = queue[head];
    if (id === undefined) continue;
    const d = depth.get(id) ?? 0;
    for (const next of adjacency.get(id) ?? []) {
      if (!depth.has(next)) {
        depth.set(next, d + 1);
        queue.push(next);
      }
    }
  }
  let maxDepth = 0;
  for (const d of depth.values()) maxDepth = Math.max(maxDepth, d);
  for (const id of ids) if (!depth.has(id)) depth.set(id, maxDepth + 1);
  maxDepth = 0;
  for (const d of depth.values()) maxDepth = Math.max(maxDepth, d);

  const rings = new Map<number, string[]>();
  for (const id of ids) {
    const d = depth.get(id) ?? 0;
    const row = rings.get(d) ?? [];
    row.push(id);
    rings.set(d, row);
  }

  const positions: Record<string, Point> = {};
  const angleOf = new Map<string, number>();
  const parentAngle = (id: string): number => {
    const parents = (reverse.get(id) ?? [])
      .map((p) => angleOf.get(p))
      .filter((v): v is number => v !== undefined);
    return parents.length > 0 ? parents.reduce((a, c) => a + c, 0) / parents.length : 0;
  };

  let prevRadius = 0;
  for (let d = 0; d <= maxDepth; d += 1) {
    const ring = rings.get(d);
    if (!ring || ring.length === 0) continue;
    if (d > 0) ring.sort((a, b) => parentAngle(a) - parentAngle(b));
    if (d === 0 && ring.length === 1) {
      const id = ring[0];
      if (id !== undefined) {
        positions[id] = { x: 0, y: 0 };
        angleOf.set(id, 0);
      }
      continue;
    }
    // Radius: at least d rings out, and wide enough that the ring's
    // circumference fits every node's width plus a gap.
    const circumferenceNeed = ring.reduce(
      (acc, id) => acc + (sizeOf.get(id)?.width ?? 0) + minGap,
      0,
    );
    const need = circumferenceNeed / (2 * Math.PI);
    // Fit the ring's own nodes, and always sit at least `ringGap` beyond the
    // previous ring so depth rings never overlap radially.
    const radius = d === 0 ? need : Math.max(prevRadius + ringGap, need);
    for (let i = 0; i < ring.length; i += 1) {
      const id = ring[i];
      if (id === undefined) continue;
      const angle = (2 * Math.PI * i) / ring.length - Math.PI / 2;
      angleOf.set(id, angle);
      positions[id] = { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
    }
    prevRadius = radius;
  }

  // Bounding box, then shift to the layeredDag convention (x centered, y ≥ 0).
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const id of ids) {
    const p = positions[id];
    const s = sizeOf.get(id);
    if (!p || !s) continue;
    minX = Math.min(minX, p.x - s.width / 2);
    maxX = Math.max(maxX, p.x + s.width / 2);
    minY = Math.min(minY, p.y - s.height / 2);
    maxY = Math.max(maxY, p.y + s.height / 2);
  }
  if (!Number.isFinite(minX)) return { positions, width: 0, height: 0 };
  const centerX = (minX + maxX) / 2;
  for (const id of ids) {
    const p = positions[id];
    if (p) {
      p.x -= centerX;
      p.y -= minY;
    }
  }
  return { positions, width: maxX - minX, height: maxY - minY };
}
