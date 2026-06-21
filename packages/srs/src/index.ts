// @mind-palace/srs — the pure, shareable core (depends only on zod).
//
// Persistence and React bindings live in the subpath entries so this core stays
// portable to any future usage (a CLI, a worker, a different framework):
//   import { ... } from "@mind-palace/srs"        // algorithm + schemas + deck ops
//   import { createDeckStore } from "@mind-palace/srs/idb"    // IndexedDB persistence
//   import { createDeckAtoms } from "@mind-palace/srs/jotai"  // reactive Jotai atoms

export * from "./deck";
export * from "./scheduler";
export * from "./schema";
