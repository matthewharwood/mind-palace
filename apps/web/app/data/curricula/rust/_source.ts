import type { Source } from "@mind-palace/curriculum";

// All Rust curricula are derived from the same source: "The Rust Programming
// Language" (the 2024 book). Shared so the 8 topic curricula stay consistent.
export const source: Source = {
  kind: "github-repo",
  url: "https://github.com/rust-lang/book",
  ref: "main",
};
