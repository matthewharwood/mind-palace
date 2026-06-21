import { type CardState, isDue } from "@mind-palace/srs";
import Graph from "graphology";

import type { Curriculum, Edge, LearningPath } from "./schema";

// ---------------------------------------------------------------------------
// Graph helpers over graphology. Curricula and learning paths are both directed
// graphs (prerequisite edges); this builds the graphology model used for layout,
// traversal, and unlock/due logic. Pure given its inputs (deterministic), so it
// unit-tests without a DOM.
// ---------------------------------------------------------------------------

function buildGraph(nodeIds: readonly string[], edges: readonly Edge[]): Graph {
  const graph = new Graph({ type: "directed", allowSelfLoops: false });
  for (const id of nodeIds) {
    if (!graph.hasNode(id)) graph.addNode(id);
  }
  for (const edge of edges) {
    if (graph.hasNode(edge.from) && graph.hasNode(edge.to) && !graph.hasEdge(edge.from, edge.to)) {
      graph.addDirectedEdge(edge.from, edge.to);
    }
  }
  return graph;
}

/** Directed graph of a curriculum's flashcards, with title/type node attributes. */
export function buildCurriculumGraph(curriculum: Curriculum): Graph {
  const graph = buildGraph(
    curriculum.nodes.map((n) => n.id),
    curriculum.edges,
  );
  for (const node of curriculum.nodes) {
    graph.mergeNodeAttributes(node.id, { title: node.title, type: node.content.type });
  }
  return graph;
}

/** Directed tree of a learning path's curricula. */
export function buildPathGraph(path: LearningPath): Graph {
  const graph = buildGraph(
    path.nodes.map((n) => n.curriculumId),
    path.edges,
  );
  for (const node of path.nodes) {
    graph.mergeNodeAttributes(node.curriculumId, { title: node.title });
  }
  return graph;
}

/** Node ids with no prerequisites (entry points / tree roots). */
export function rootIds(graph: Graph): string[] {
  return graph.nodes().filter((id) => graph.inDegree(id) === 0);
}

/** The direct prerequisites of a node. */
export function prerequisites(graph: Graph, nodeId: string): string[] {
  return graph.hasNode(nodeId) ? graph.inNeighbors(nodeId) : [];
}

/** A node is unlocked once every prerequisite is in `completed`. */
export function isUnlocked(graph: Graph, nodeId: string, completed: ReadonlySet<string>): boolean {
  return prerequisites(graph, nodeId).every((p) => completed.has(p));
}

/** Flashcard ids due for review now (no state = new = due). Reuses srs `isDue`. */
export function dueFlashcardIds(
  curriculum: Curriculum,
  states: Readonly<Record<string, CardState>>,
  now: number = Date.now(),
): string[] {
  return curriculum.nodes
    .filter((node) => {
      const state = states[node.id];
      return state === undefined || isDue(state, now);
    })
    .map((node) => node.id);
}
