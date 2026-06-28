import type { Curriculum, LearningPath } from "@mind-palace/curriculum";

import { advanced } from "./rust/advanced";
import { errors } from "./rust/errors";
import { foundations } from "./rust/foundations";
import { functional } from "./rust/functional";
import { genericsTraits } from "./rust/generics-traits";
import { keywords } from "./rust/keywords";
import { modules } from "./rust/modules";
import { ownership } from "./rust/ownership";
import { structsEnums } from "./rust/structs-enums";

// "The Rust Programming Language" (2024 book) split into a learning path of topic
// curricula, so the path tree is multi-node. Each curriculum's internal flashcard
// graph carries the detail; every Rust snippet is rustc-verified by
// scripts/verify-rust-cards.ts (run `bun scripts/verify-rust-cards.ts`).
export const rustCurricula: Curriculum[] = [
  foundations,
  keywords,
  ownership,
  structsEnums,
  modules,
  errors,
  genericsTraits,
  functional,
  advanced,
];

// The learning path: the tree of these curricula joined by prerequisite edges.
export const rustPath = {
  id: "p-rust",
  title: "Learn Rust",
  nodes: rustCurricula.map((c) => ({ curriculumId: c.id, title: c.title })),
  edges: [
    { from: "c-rust-foundations", to: "c-rust-keywords" },
    { from: "c-rust-foundations", to: "c-rust-ownership" },
    { from: "c-rust-foundations", to: "c-rust-structs-enums" },
    { from: "c-rust-ownership", to: "c-rust-modules" },
    { from: "c-rust-structs-enums", to: "c-rust-errors" },
    { from: "c-rust-ownership", to: "c-rust-generics-traits" },
    { from: "c-rust-structs-enums", to: "c-rust-generics-traits" },
    { from: "c-rust-generics-traits", to: "c-rust-functional" },
    { from: "c-rust-generics-traits", to: "c-rust-advanced" },
    { from: "c-rust-ownership", to: "c-rust-advanced" },
  ],
} satisfies LearningPath;
