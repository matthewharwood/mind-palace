import type { Source } from "@mind-palace/curriculum";

// The Rust standard library lives in rust-lang/rust under `library/` (core,
// alloc, std). Every std curriculum is derived from that source; all code
// snippets are rustc-verified (edition 2024) by scripts/verify-rust-cards.ts.
export const source: Source = {
  kind: "github-repo",
  url: "https://github.com/rust-lang/rust",
  ref: "master",
};
