import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// Ownership & Borrowing — the heart of Rust. Language semantics only; every
// snippet is rustc-verified (edition 2024).
export const ownership: Curriculum = {
  id: "c-rust-ownership",
  title: "Ownership & Borrowing",
  source,
  nodes: [
    {
      id: "ownership-rules",
      title: "The Ownership Rules",
      content: {
        type: "read",
        markdown:
          "Each value has a single **owner**; when the owner goes out of scope the value is dropped. Assigning or passing a non-`Copy` value (like `String`) **moves** it — the source can no longer be used. Simple stack types (`i32`, `bool`, `char`, …) are `Copy`, so they're duplicated instead of moved.",
      },
    },
    {
      id: "borrowing-rules",
      title: "Borrowing Rules",
      content: {
        type: "read",
        markdown:
          "A **reference** borrows without taking ownership: `&T` (shared) or `&mut T` (exclusive). At any moment you may have **either** any number of shared references **or** exactly one mutable reference — never both. References must never outlive their referent (no dangling).",
      },
    },
    {
      id: "slices-and-str",
      title: "Slices, &str vs String",
      content: {
        type: "read",
        markdown:
          "A **slice** `&[T]` (or `&str` for text) borrows a contiguous range — a pointer + length — without owning it. `String` is an owned, growable, heap-allocated UTF-8 string; `&str` is a borrowed view (a string slice). Functions usually take `&str` for flexibility.",
      },
    },
    {
      id: "mut-ref-count",
      title: "Mutable reference count",
      content: {
        type: "multiple-choice",
        question: "How many mutable references to a value may exist at the same time?",
        options: ["Unlimited", "Exactly one", "One per thread"],
        answerIndex: 1,
      },
    },
    {
      id: "pass-by-value",
      title: "Passing a String by value",
      content: {
        type: "multiple-choice",
        question: "What happens when you pass a `String` to a function by value?",
        options: [
          "It is copied; the caller keeps using it",
          "It is moved; the caller can no longer use it",
          "It is borrowed; ownership is unchanged",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "str-vs-string",
      title: "Owned vs borrowed strings",
      content: {
        type: "multiple-choice",
        question: "Which type is an owned, growable string?",
        options: ["&str", "String", "char"],
        answerIndex: 1,
      },
    },
    {
      id: "copy-vs-move-output",
      title: "Copy types",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let a = 5;
    let b = a;
    println!("{}", a + b);
}`,
        options: ["error: a was moved", "10", "5"],
        answerIndex: 1,
      },
    },
    {
      id: "clone-output",
      title: "Cloning a String",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let s1 = String::from("hi");
    let s2 = s1.clone();
    println!("{s1} {s2}");
}`,
        options: ["hi", "hi hi", "compile error"],
        answerIndex: 1,
      },
    },
    {
      id: "mut-ref-output",
      title: "Mutating through a reference",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let mut x = 10;
    let r = &mut x;
    *r += 5;
    println!("{x}");
}`,
        options: ["10", "15", "compile error"],
        answerIndex: 1,
      },
    },
    {
      id: "borrow-no-move-output",
      title: "Borrowing does not move",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let s = String::from("rust");
    let n = calc_len(&s);
    println!("{s} {n}");
}

fn calc_len(s: &String) -> usize {
    s.len()
}`,
        options: ["rust 4", "4", "compile error: s was moved"],
        answerIndex: 0,
      },
    },
    {
      id: "slice-len-output",
      title: "String slice length",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let s = String::from("hello world");
    let word = &s[0..5];
    println!("{}", word.len());
}`,
        options: ["5", "11", "6"],
        answerIndex: 0,
      },
    },
    {
      id: "length",
      title: "Write: borrow to read length",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a function `fn length(s: &String) -> usize` that returns the string's length (it must borrow, not take ownership).",
        solution: `fn length(s: &String) -> usize {
    s.len()
}`,
      },
    },
    {
      id: "first-char",
      title: "Write: first-character slice",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a function `fn first_char(s: &str) -> &str` that returns a slice of the first byte (`0..1`). Assume non-empty ASCII.",
        solution: `fn first_char(s: &str) -> &str {
    &s[0..1]
}`,
      },
    },
    {
      id: "increment",
      title: "Write: increment via &mut",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a function `fn increment(n: &mut i32)` that adds 1 to the value `n` refers to.",
        solution: `fn increment(n: &mut i32) {
    *n += 1;
}`,
      },
    },
    {
      id: "append-excl",
      title: "Write: push onto a &mut String",
      content: {
        type: "code",
        language: "rust",
        prompt: "Write a function `fn append_excl(s: &mut String)` that pushes a `!` character.",
        solution: `fn append_excl(s: &mut String) {
    s.push('!');
}`,
      },
    },
    {
      id: "sum-slice",
      title: "Write: sum a slice",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a function `fn sum(slice: &[i32]) -> i32` that returns the sum of all elements using a `for` loop.",
        solution: `fn sum(slice: &[i32]) -> i32 {
    let mut total = 0;
    for &n in slice {
        total += n;
    }
    total
}`,
      },
    },
    {
      id: "swap-refs",
      title: "Write: swap through references",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a function `fn swap(a: &mut i32, b: &mut i32)` that swaps the two values using `std::mem::swap`.",
        solution: `fn swap(a: &mut i32, b: &mut i32) {
    std::mem::swap(a, b);
}`,
      },
    },
    {
      id: "shout",
      title: "Write: borrow &str, return owned",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a function `fn shout(s: &str) -> String` that returns an uppercased owned copy of `s`.",
        solution: `fn shout(s: &str) -> String {
    s.to_uppercase()
}`,
      },
    },
  ],
  edges: [
    { from: "ownership-rules", to: "borrowing-rules" },
    { from: "borrowing-rules", to: "slices-and-str" },
    { from: "ownership-rules", to: "copy-vs-move-output" },
    { from: "ownership-rules", to: "pass-by-value" },
    { from: "ownership-rules", to: "clone-output" },
    { from: "ownership-rules", to: "length" },
    { from: "ownership-rules", to: "shout" },
    { from: "borrowing-rules", to: "mut-ref-count" },
    { from: "borrowing-rules", to: "mut-ref-output" },
    { from: "borrowing-rules", to: "borrow-no-move-output" },
    { from: "borrowing-rules", to: "increment" },
    { from: "borrowing-rules", to: "append-excl" },
    { from: "borrowing-rules", to: "swap-refs" },
    { from: "slices-and-str", to: "str-vs-string" },
    { from: "slices-and-str", to: "slice-len-output" },
    { from: "slices-and-str", to: "first-char" },
    { from: "slices-and-str", to: "sum-slice" },
  ],
};
