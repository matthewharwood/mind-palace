import type { Curriculum, LearningPath } from "@mind-palace/curriculum";

import { exprAsync } from "./expr/async-anatomy";
import { exprBuilders } from "./expr/builders";
import { exprErasure } from "./expr/erasure";
import { exprErrors } from "./expr/errors-design";
import { exprMacros } from "./expr/macros";
import { exprOwnership } from "./expr/ownership";
import { exprReactive } from "./expr/reactive";
import { exprRegisters } from "./expr/registers";
import { exprShapes } from "./expr/shapes";
import { exprTraits } from "./expr/traits";
import { exprTypestate } from "./expr/typestate";

// Expressive Rust — the shape→machinery→trade-off path mined from tokio,
// io-uring/tokio-uring, tower, axum, leptos, bevy_ecs, iggy, serde, and
// syn/quote (plus the idiom literature). Companion reference:
// docs/rust-expressiveness-atlas.md. Teaches DESIGNING API surfaces (the
// consumer→author flip); the g-rust/g-std paths own consumer fluency.
export const exprCurricula: Curriculum[] = [
  exprShapes,
  exprTraits,
  exprTypestate,
  exprOwnership,
  exprAsync,
  exprReactive,
  exprBuilders,
  exprErasure,
  exprMacros,
  exprErrors,
  exprRegisters,
];

// One root (the magic-fn hook); everything converges on the Registers capstone.
export const exprPath = {
  id: "p-expr",
  title: "Expressive Rust",
  nodes: exprCurricula.map((c) => ({ curriculumId: c.id, title: c.title })),
  edges: [
    { from: "c-expr-shapes", to: "c-expr-traits" },
    { from: "c-expr-shapes", to: "c-expr-macros" },
    { from: "c-expr-shapes", to: "c-expr-ownership" },
    { from: "c-expr-traits", to: "c-expr-typestate" },
    { from: "c-expr-traits", to: "c-expr-erasure" },
    { from: "c-expr-traits", to: "c-expr-builders" },
    { from: "c-expr-traits", to: "c-expr-reactive" },
    { from: "c-expr-typestate", to: "c-expr-ownership" },
    { from: "c-expr-typestate", to: "c-expr-errors" },
    { from: "c-expr-ownership", to: "c-expr-async" },
    { from: "c-expr-async", to: "c-expr-reactive" },
    { from: "c-expr-macros", to: "c-expr-registers" },
    { from: "c-expr-erasure", to: "c-expr-registers" },
    { from: "c-expr-reactive", to: "c-expr-registers" },
    { from: "c-expr-builders", to: "c-expr-registers" },
    { from: "c-expr-errors", to: "c-expr-registers" },
  ],
} satisfies LearningPath;
