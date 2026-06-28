import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// std: core::slice, formatting (core::fmt / format!), and an intro to I/O traits.
// Every snippet rustc-verified (edition 2024).
export const ioSlices: Curriculum = {
  id: "c-std-io-slices",
  title: "Slices, Arrays & Formatting",
  source,
  nodes: [
    {
      id: "slices-arrays",
      title: "Slices & Arrays",
      content: {
        type: "read",
        markdown:
          "Arrays `[T; N]` have a fixed length; **slices** `&[T]` borrow a contiguous view of an array or `Vec`. Rich methods: `first`/`last`/`get`, `iter`, `contains`, `split_first`/`split_last`, `chunks(n)`, `windows(n)`, `sort`, `reverse`, `binary_search`.",
      },
    },
    {
      id: "formatting",
      title: "Formatting",
      content: {
        type: "read",
        markdown:
          "`format!` builds a `String`; `println!`/`write!` print or append. Format specs control output: `{:>5}` (right-align width 5), `{:.2}` (precision), `{:b}`/`{:x}`/`{:o}` (binary/hex/octal), `{:?}` (Debug), `{:#?}` (pretty Debug). `write!` works on any `fmt::Write`/`io::Write`.",
      },
    },
    {
      id: "io-overview",
      title: "I/O traits",
      content: {
        type: "read",
        markdown:
          "I/O is built on the `Read` and `Write` traits. Wrap a reader in `BufReader` (or writer in `BufWriter`) to batch syscalls; `lines()` iterates text. `std::fs` offers `read_to_string`/`write`; `Path`/`PathBuf` model filesystem paths; `std::env::args` reads CLI arguments.",
      },
    },
    {
      id: "slice-range-output",
      title: "Slicing a range",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let arr = [10, 20, 30, 40];
    let slice = &arr[1..3];
    println!("{slice:?}");
}`,
        options: ["[20, 30]", "[10, 20]", "[20, 30, 40]"],
        answerIndex: 0,
      },
    },
    {
      id: "first-last-output",
      title: "first & last",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let v = [5, 6, 7];
    println!("{:?} {:?}", v.first(), v.last());
}`,
        options: ["Some(5) Some(7)", "5 7", "None None"],
        answerIndex: 0,
      },
    },
    {
      id: "chunks-output",
      title: "chunks",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let v = [1, 2, 3, 4, 5];
    println!("{}", v.chunks(2).count());
}`,
        options: ["2", "3", "5"],
        answerIndex: 1,
      },
    },
    {
      id: "windows-output",
      title: "windows",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let v = [1, 2, 3, 4];
    println!("{}", v.windows(2).count());
}`,
        options: ["2", "3", "4"],
        answerIndex: 1,
      },
    },
    {
      id: "format-width-output",
      title: "width & alignment",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let s = format!("{:>5}", 42);
    println!("[{s}]");
}`,
        options: ["[   42]", "[42   ]", "[42]"],
        answerIndex: 0,
      },
    },
    {
      id: "format-precision-output",
      title: "precision",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    println!("{:.2}", 3.14159);
}`,
        options: ["3.14", "3.141", "3"],
        answerIndex: 0,
      },
    },
    {
      id: "binary-output",
      title: "binary format",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    println!("{:b}", 5);
}`,
        options: ["101", "5", "0b101"],
        answerIndex: 0,
      },
    },
    {
      id: "slice-vs-vec-concept",
      title: "Slice vs Vec",
      content: {
        type: "multiple-choice",
        question: "How does a `&[T]` slice differ from a `Vec<T>`?",
        options: [
          "It owns its elements",
          "It borrows a view without owning the data",
          "It is always heap-allocated",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "bufreader-concept",
      title: "BufReader",
      content: {
        type: "multiple-choice",
        question: "Why wrap a reader in `BufReader`?",
        options: [
          "To compress the data",
          "To reduce syscalls by buffering reads",
          "To encrypt the stream",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "slice-sum",
      title: "Write: sum a slice",
      content: {
        type: "code",
        language: "rust",
        prompt: "Write `fn sum(s: &[i32]) -> i32` summing the slice via `iter().sum()`.",
        solution: `fn sum(s: &[i32]) -> i32 {
    s.iter().sum()
}`,
      },
    },
    {
      id: "first-or",
      title: "Write: first or default",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn first_or(s: &[i32], default: i32) -> i32` returning the first element or `default` via `first().copied().unwrap_or(...)`.",
        solution: `fn first_or(s: &[i32], default: i32) -> i32 {
    s.first().copied().unwrap_or(default)
}`,
      },
    },
    {
      id: "has",
      title: "Write: contains",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn has(s: &[i32], target: i32) -> bool` returning whether the slice contains `target`.",
        solution: `fn has(s: &[i32], target: i32) -> bool {
    s.contains(&target)
}`,
      },
    },
    {
      id: "split-first",
      title: "Write: split_first",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn split_first(s: &[i32]) -> Option<(i32, &[i32])>` returning the first element (copied) and the rest, via `split_first`.",
        solution: `fn split_first(s: &[i32]) -> Option<(i32, &[i32])> {
    s.split_first().map(|(first, rest)| (*first, rest))
}`,
      },
    },
    {
      id: "reverse-vec",
      title: "Write: reverse in place",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn reversed(mut v: Vec<i32>) -> Vec<i32>` reversing it in place via `reverse()` and returning it.",
        solution: `fn reversed(mut v: Vec<i32>) -> Vec<i32> {
    v.reverse();
    v
}`,
      },
    },
    {
      id: "format-pad",
      title: "Write: padded format",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Write `fn pad(n: i32) -> String` formatting `n` right-aligned to width 4 via `format!("{n:>4}")`.',
        solution: `fn pad(n: i32) -> String {
    format!("{n:>4}")
}`,
      },
    },
    {
      id: "hex-string",
      title: "Write: hex format",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Write `fn to_hex(n: u32) -> String` formatting `n` as lowercase hex via `format!("{n:x}")`.',
        solution: `fn to_hex(n: u32) -> String {
    format!("{n:x}")
}`,
      },
    },
    {
      id: "write-macro",
      title: "Write: write! into a String",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Using `std::fmt::Write`, write `fn build() -> String` that creates a `String` and appends `"n=7"` via `write!`, returning it (include the `use`).',
        solution: `use std::fmt::Write;

fn build() -> String {
    let mut s = String::new();
    write!(s, "n={}", 7).unwrap();
    s
}`,
      },
    },
  ],
  // A network, not a chain: the three concept reads form an interlinked core
  // (slicing underpins both formatting buffers and I/O byte buffers; formatting
  // feeds println!/write! I/O), and drills attach to the concept(s) they test —
  // several genuinely bridge two concepts (indegree > 1), which is what makes
  // this read as a web rather than a hub-and-spoke tree. Honest prerequisites
  // only (edges gate isUnlocked), and acyclic.
  edges: [
    // Concept core (interlinked).
    { from: "slices-arrays", to: "formatting" },
    { from: "slices-arrays", to: "io-overview" }, // I/O buffers are byte slices `&mut [u8]`
    { from: "formatting", to: "io-overview" }, // println!/write! lead into I/O
    // Slices drills.
    { from: "slices-arrays", to: "slice-range-output" },
    { from: "slices-arrays", to: "first-last-output" },
    { from: "slices-arrays", to: "chunks-output" },
    { from: "slices-arrays", to: "windows-output" },
    { from: "slices-arrays", to: "slice-vs-vec-concept" },
    { from: "slices-arrays", to: "slice-sum" },
    { from: "slices-arrays", to: "first-or" },
    { from: "slices-arrays", to: "has" },
    { from: "slices-arrays", to: "split-first" },
    { from: "slices-arrays", to: "reverse-vec" },
    // Formatting drills.
    { from: "formatting", to: "format-width-output" },
    { from: "formatting", to: "format-precision-output" },
    { from: "formatting", to: "binary-output" },
    { from: "formatting", to: "format-pad" },
    { from: "formatting", to: "hex-string" },
    // I/O drills.
    { from: "io-overview", to: "bufreader-concept" },
    // Bridges: drills that exercise two concepts at once.
    { from: "formatting", to: "write-macro" }, // write! is a format spec…
    { from: "io-overview", to: "write-macro" }, // …into an `io::Write`/`fmt::Write`
  ],
};
