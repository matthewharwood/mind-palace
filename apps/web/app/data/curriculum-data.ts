import type { Curriculum, Goal, LearningPath } from "@mind-palace/curriculum";

import { gfxCurricula, gfxPath } from "./curricula/gfx";
import { rustCurricula, rustPath } from "./curricula/rust-book";
import { stdCurricula, stdPath } from "./curricula/std-lib";

// The registered curriculum content. Typed with `satisfies` (compile-time
// Pillar-2 guarantee; authored data needs no runtime parse). The extraction
// tooling emits this exact shape — see the extract-curriculum skill.

const CURRICULA: Curriculum[] = [...rustCurricula, ...stdCurricula, ...gfxCurricula];

const PATHS: LearningPath[] = [rustPath, stdPath, gfxPath];

const GOALS: Goal[] = [
  {
    id: "g-rust",
    title: "Learn Rust — the language",
    description:
      "The language itself: ownership, types & syntax, keywords, traits, generics, and error handling. Start here to learn to read and write Rust from the ground up.",
    pathId: "p-rust",
  } satisfies Goal,
  {
    id: "g-std",
    title: "Master the Standard Library",
    description:
      "The batteries-included toolkit you reach for daily: Option/Result, collections, iterators, the common std traits (From, Display, Iterator…), smart pointers, and concurrency. Come here after Learn Rust to get fluent with what ships in std.",
    pathId: "p-std",
  } satisfies Goal,
  {
    id: "g-gfx",
    title: "Graphics & Shaders — FF6 VFX in Bevy",
    description:
      "From zero math to designing your own Final Fantasy-style attack effects: vectors and easing, how the GPU draws, WGSL shaders, Bevy 0.19, and shipping to the browser as WASM — capped by the Effect Forge, where you rebuild FF6's spells, Blitzes, and esper summons one by one.",
    pathId: "p-gfx",
  } satisfies Goal,
];

// --- accessors --------------------------------------------------------------

export function listGoals(): readonly Goal[] {
  return GOALS;
}

export function getGoal(id: string): Goal | undefined {
  return GOALS.find((g) => g.id === id);
}

export function getPath(id: string): LearningPath | undefined {
  return PATHS.find((p) => p.id === id);
}

export function getCurriculum(id: string): Curriculum | undefined {
  return CURRICULA.find((c) => c.id === id);
}

export function getFlashcard(curriculumId: string, nodeId: string) {
  return getCurriculum(curriculumId)?.nodes.find((n) => n.id === nodeId);
}

/** Which goal's learning path contains this curriculum (for breadcrumbs / nav). */
export function getGoalForCurriculum(curriculumId: string): Goal | undefined {
  for (const goal of GOALS) {
    const path = getPath(goal.pathId);
    if (path?.nodes.some((n) => n.curriculumId === curriculumId)) return goal;
  }
  return undefined;
}
