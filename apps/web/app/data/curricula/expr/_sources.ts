import type { Source } from "@mind-palace/curriculum";

// Source anchors for the Expressive Rust path (g-expr). Each curriculum is
// coupled to the repo whose source best exemplifies its theme; several
// curricula share an anchor (established policy). All repos verified live
// during the 2026-07-04 mining pass. "Izzy" from the commissioning voice brief
// resolved to apache/iggy (no notable crate named izzy exists).

export const axumSource: Source = {
  kind: "github-repo",
  url: "https://github.com/tokio-rs/axum",
  ref: "main",
};

export const towerSource: Source = {
  kind: "github-repo",
  url: "https://github.com/tower-rs/tower",
  ref: "master",
};

export const ioUringSource: Source = {
  kind: "github-repo",
  url: "https://github.com/tokio-rs/io-uring",
  ref: "master",
};

export const tokioUringSource: Source = {
  kind: "github-repo",
  url: "https://github.com/tokio-rs/tokio-uring",
  ref: "master",
};

export const tokioSource: Source = {
  kind: "github-repo",
  url: "https://github.com/tokio-rs/tokio",
  ref: "master",
};

export const leptosSource: Source = {
  kind: "github-repo",
  url: "https://github.com/leptos-rs/leptos",
  ref: "main",
};

export const synSource: Source = {
  kind: "github-repo",
  url: "https://github.com/dtolnay/syn",
  ref: "master",
};

export const thiserrorSource: Source = {
  kind: "github-repo",
  url: "https://github.com/dtolnay/thiserror",
  ref: "master",
};

export const iggySource: Source = {
  kind: "github-repo",
  url: "https://github.com/apache/iggy",
  ref: "master",
};

export const patternsSource: Source = {
  kind: "github-repo",
  url: "https://github.com/rust-unofficial/patterns",
  ref: "main",
};
