import type { Curriculum, LearningPath } from "@mind-palace/curriculum";

import { collections } from "./std/collections";
import { concurrency } from "./std/concurrency";
import { errorHandling } from "./std/error-conversion";
import { ioSlices } from "./std/io-slices";
import { iterators } from "./std/iterators";
import { optionResult } from "./std/option-result";
import { smartPointers } from "./std/smart-pointers";
import { strings } from "./std/strings";
import { traits } from "./std/traits";

// "Master the Rust Standard Library" — derived from rust-lang/rust `library/`
// (core, alloc, std). A learning path of topic curricula; every Rust snippet is
// rustc-verified by scripts/verify-rust-cards.ts (`bun run verify:rust-cards`).
export const stdCurricula: Curriculum[] = [
  optionResult,
  strings,
  collections,
  iterators,
  traits,
  smartPointers,
  errorHandling,
  concurrency,
  ioSlices,
];

export const stdPath = {
  id: "p-std",
  title: "Master the Rust Standard Library",
  nodes: stdCurricula.map((c) => ({ curriculumId: c.id, title: c.title })),
  edges: [
    { from: "c-std-option-result", to: "c-std-strings" },
    { from: "c-std-option-result", to: "c-std-collections" },
    { from: "c-std-option-result", to: "c-std-traits" },
    { from: "c-std-option-result", to: "c-std-error" },
    { from: "c-std-collections", to: "c-std-iterators" },
    { from: "c-std-collections", to: "c-std-io-slices" },
    { from: "c-std-traits", to: "c-std-smart-pointers" },
    { from: "c-std-smart-pointers", to: "c-std-concurrency" },
    { from: "c-std-iterators", to: "c-std-concurrency" },
  ],
} satisfies LearningPath;
