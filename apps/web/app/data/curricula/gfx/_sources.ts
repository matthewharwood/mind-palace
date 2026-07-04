import type { Source } from "@mind-palace/curriculum";

// Source anchors for the Graphics & Shaders path (g-gfx). Each curriculum is
// coupled to the repo its knowledge is abstracted from; several curricula share
// an anchor (same policy as the rust path sharing the book repo). All URLs
// verified live 2026-07-03.

/** glam — Bevy's math crate; anchors the from-zero VFX math curriculum. */
export const glamSource: Source = {
  kind: "github-repo",
  url: "https://github.com/bitshifter/glam-rs",
  ref: "main",
};

/** learn-wgpu — the Rust GPU-pipeline tutorial; anchors "How the GPU Draws". */
export const learnWgpuSource: Source = {
  kind: "github-repo",
  url: "https://github.com/sotrh/learn-wgpu",
  ref: "master",
};

/** gpuweb — the W3C WebGPU/WGSL spec repo (`/wgsl`); anchors the WGSL curriculum. */
export const gpuwebSource: Source = {
  kind: "github-repo",
  url: "https://github.com/gpuweb/gpuweb",
  ref: "main",
};

/** The Book of Shaders — fragment-shader craft. Copyrighted (not OSS): link,
 *  never copy its text or examples; exercises are original WGSL ports. */
export const bookOfShadersSource: Source = {
  kind: "github-repo",
  url: "https://github.com/patriciogonzalezvivo/thebookofshaders",
  ref: "master",
};

/** Bevy 0.19 — engine + examples; anchors Bevy Core and Bevy VFX. */
export const bevySource: Source = {
  kind: "github-repo",
  url: "https://github.com/bevyengine/bevy",
  ref: "v0.19.0",
};

/** bevy-website — quick-start + release-builds (wasm-opt) docs; anchors shipping. */
export const bevyWebsiteSource: Source = {
  kind: "github-repo",
  url: "https://github.com/bevyengine/bevy-website",
  ref: "main",
};

/** everything8215/ff6 — the FF6 disassembly; anchors SNES VFX anatomy and the
 *  Effect Forge practicum (effect specs derive from the game's animation system). */
export const ff6Source: Source = {
  kind: "github-repo",
  url: "https://github.com/everything8215/ff6",
  ref: "main",
};
