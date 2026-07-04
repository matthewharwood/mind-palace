import type { Curriculum, LearningPath } from "@mind-palace/curriculum";

import { gfxBevyCore } from "./gfx/bevy-core";
import { gfxBevyVfx } from "./gfx/bevy-vfx";
import { gfxFf6Anatomy } from "./gfx/ff6-anatomy";
import { gfxForge1 } from "./gfx/forge-1";
import { gfxForge2 } from "./gfx/forge-2";
import { gfxForge3 } from "./gfx/forge-3";
import { gfxGpu } from "./gfx/gpu";
import { gfxMath } from "./gfx/math";
import { gfxShaderCraft } from "./gfx/shader-craft";
import { gfxWasm } from "./gfx/wasm";
import { gfxWgsl } from "./gfx/wgsl";

// Graphics & Shaders — from-zero math through WGSL, Bevy 0.19, and WASM
// shipping, with Final Fantasy VI attack-effect recreations as the practicum
// (the Effect Forge). Companion reference: docs/ff-attack-vfx-catalog.md.
// Every code snippet is machine-verified by scripts/verify-rust-cards.ts
// (bare rustc / bevy-0.19 cargo sandbox / naga WGSL validation by language).
export const gfxCurricula: Curriculum[] = [
  gfxMath,
  gfxFf6Anatomy,
  gfxGpu,
  gfxWgsl,
  gfxShaderCraft,
  gfxBevyCore,
  gfxBevyVfx,
  gfxWasm,
  gfxForge1,
  gfxForge2,
  gfxForge3,
];

// Two roots: start with the math on-ramp or the FF6 anatomy motivation track.
// Both spines converge on the Effect Forge.
export const gfxPath = {
  id: "p-gfx",
  title: "Graphics & Shaders",
  nodes: gfxCurricula.map((c) => ({ curriculumId: c.id, title: c.title })),
  edges: [
    { from: "c-gfx-math", to: "c-gfx-gpu" },
    { from: "c-gfx-math", to: "c-gfx-bevy-core" },
    { from: "c-gfx-gpu", to: "c-gfx-wgsl" },
    { from: "c-gfx-wgsl", to: "c-gfx-shader-craft" },
    { from: "c-gfx-bevy-core", to: "c-gfx-bevy-vfx" },
    { from: "c-gfx-wgsl", to: "c-gfx-bevy-vfx" },
    { from: "c-gfx-bevy-vfx", to: "c-gfx-wasm" },
    { from: "c-gfx-ff6-anatomy", to: "c-gfx-forge-1" },
    { from: "c-gfx-shader-craft", to: "c-gfx-forge-1" },
    { from: "c-gfx-bevy-vfx", to: "c-gfx-forge-1" },
    { from: "c-gfx-forge-1", to: "c-gfx-forge-2" },
    { from: "c-gfx-forge-2", to: "c-gfx-forge-3" },
    { from: "c-gfx-wasm", to: "c-gfx-forge-3" },
  ],
} satisfies LearningPath;
