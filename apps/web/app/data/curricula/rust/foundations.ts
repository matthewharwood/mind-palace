import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// Rust Foundations — variables, types, functions, control flow. Questions are
// language-focused (no trivia); every code snippet is rustc-verified by
// scripts/verify-rust-cards.ts (edition 2024).
export const foundations: Curriculum = {
  id: "c-rust-foundations",
  title: "Foundations",
  source,
  nodes: [
    {
      id: "variables-and-mutability",
      title: "Variables & Mutability",
      content: {
        type: "read",
        markdown:
          "Bindings are **immutable by default** — `let x = 5;` can't be reassigned. Add `mut` for a mutable binding. `const` is always immutable, must be type-annotated, and is evaluated at compile time. *Shadowing* (`let x = x + 1;`) creates a new binding, and may change the type.",
      },
    },
    {
      id: "types-overview",
      title: "Scalar & Compound Types",
      content: {
        type: "read",
        markdown:
          "Scalars: integers (`i32` is the default), floats (`f64`), `bool`, `char`. Compound: **tuples** `(i32, f64)` (fixed, mixed) and **arrays** `[i32; 3]` (fixed length, one type). Integer literals default to `i32`; arithmetic overflow panics in debug builds.",
      },
    },
    {
      id: "functions-and-control-flow",
      title: "Functions & Control Flow",
      content: {
        type: "read",
        markdown:
          "Functions annotate every parameter and use `-> T` for returns; the final **expression** (no semicolon) is returned. `if` is an expression, so `let y = if c { 1 } else { 2 };` works. `loop` can return a value via `break`; also `while` and `for x in iter`.",
      },
    },
    {
      id: "mut-required",
      title: "Making a binding reassignable",
      content: {
        type: "multiple-choice",
        question: "Which keyword lets you reassign a `let` binding?",
        options: ["mut", "let", "var"],
        answerIndex: 0,
      },
    },
    {
      id: "const-requirements",
      title: "const declarations",
      content: {
        type: "multiple-choice",
        question: "What must every `const` declaration include that a `let` may omit?",
        options: ["A type annotation", "The mut keyword", "A heap allocation"],
        answerIndex: 0,
      },
    },
    {
      id: "integer-overflow",
      title: "Integer overflow",
      content: {
        type: "multiple-choice",
        question: "In a debug build, what happens when an `i32` addition overflows?",
        options: ["The program panics", "It wraps around silently", "It returns zero"],
        answerIndex: 0,
      },
    },
    {
      id: "array-type",
      title: "Array type inference",
      content: {
        type: "multiple-choice",
        question: "What is the inferred type of the expression `[0; 3]`?",
        options: ["[i32; 3]", "Vec<i32>", "[i32]"],
        answerIndex: 0,
      },
    },
    {
      id: "shadowing-output",
      title: "Shadowing",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let x = 5;
    let x = x + 1;
    let x = x * 2;
    println!("{x}");
}`,
        options: ["10", "11", "12"],
        answerIndex: 2,
      },
    },
    {
      id: "tuple-destructure-output",
      title: "Tuple destructuring",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let triple = (1, 2, 3);
    let (a, _, c) = triple;
    println!("{}", a + c);
}`,
        options: ["3", "4", "6"],
        answerIndex: 1,
      },
    },
    {
      id: "if-expression-output",
      title: "if as an expression",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let n = 7;
    let parity = if n % 2 == 0 { "even" } else { "odd" };
    println!("{parity}");
}`,
        options: ["even", "odd", "7"],
        answerIndex: 1,
      },
    },
    {
      id: "loop-break-value-output",
      title: "loop returns a value",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let mut i = 0;
    let result = loop {
        i += 1;
        if i == 5 {
            break i * 2;
        }
    };
    println!("{result}");
}`,
        options: ["5", "10", "25"],
        answerIndex: 1,
      },
    },
    {
      id: "hello-world",
      title: "Write: Hello, world!",
      content: {
        type: "code",
        language: "rust",
        prompt: "Write a Rust program whose `main` prints exactly `Hello, world!`.",
        solution: `fn main() {
    println!("Hello, world!");
}`,
      },
    },
    {
      id: "double",
      title: "Write: double",
      content: {
        type: "code",
        language: "rust",
        prompt: "Write a function `fn double(n: i32) -> i32` that returns `n` multiplied by 2.",
        solution: `fn double(n: i32) -> i32 {
    n * 2
}`,
      },
    },
    {
      id: "is-even",
      title: "Write: is_even",
      content: {
        type: "code",
        language: "rust",
        prompt: "Write a function `fn is_even(n: i32) -> bool` that returns whether `n` is even.",
        solution: `fn is_even(n: i32) -> bool {
    n % 2 == 0
}`,
      },
    },
    {
      id: "max-of-two",
      title: "Write: larger of two",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a function `fn larger(a: i32, b: i32) -> i32` that returns the greater value using an `if` expression.",
        solution: `fn larger(a: i32, b: i32) -> i32 {
    if a > b {
        a
    } else {
        b
    }
}`,
      },
    },
    {
      id: "sum-to",
      title: "Write: sum_to",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a function `fn sum_to(n: u32) -> u32` that returns the sum of `1..=n` using a `for` loop.",
        solution: `fn sum_to(n: u32) -> u32 {
    let mut total = 0;
    for i in 1..=n {
        total += i;
    }
    total
}`,
      },
    },
    {
      id: "to-fahrenheit",
      title: "Write: Celsius → Fahrenheit",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a function `fn to_fahrenheit(c: f64) -> f64` returning `c * 9.0 / 5.0 + 32.0`.",
        solution: `fn to_fahrenheit(c: f64) -> f64 {
    c * 9.0 / 5.0 + 32.0
}`,
      },
    },
    {
      id: "count-down",
      title: "Write: count down",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a program whose `main` uses a `while` loop to print 3, then 2, then 1, each on its own line.",
        solution: `fn main() {
    let mut n = 3;
    while n > 0 {
        println!("{n}");
        n -= 1;
    }
}`,
      },
    },
    {
      id: "swap-tuple",
      title: "Write: swap",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a function `fn swap(pair: (i32, i32)) -> (i32, i32)` that returns the pair with its elements swapped.",
        solution: `fn swap(pair: (i32, i32)) -> (i32, i32) {
    (pair.1, pair.0)
}`,
      },
    },
  ],
  edges: [
    { from: "variables-and-mutability", to: "types-overview" },
    { from: "types-overview", to: "functions-and-control-flow" },
    { from: "variables-and-mutability", to: "mut-required" },
    { from: "variables-and-mutability", to: "const-requirements" },
    { from: "variables-and-mutability", to: "shadowing-output" },
    { from: "types-overview", to: "integer-overflow" },
    { from: "types-overview", to: "array-type" },
    { from: "types-overview", to: "tuple-destructure-output" },
    { from: "types-overview", to: "to-fahrenheit" },
    { from: "functions-and-control-flow", to: "if-expression-output" },
    { from: "functions-and-control-flow", to: "loop-break-value-output" },
    { from: "functions-and-control-flow", to: "hello-world" },
    { from: "functions-and-control-flow", to: "double" },
    { from: "functions-and-control-flow", to: "is-even" },
    { from: "functions-and-control-flow", to: "max-of-two" },
    { from: "functions-and-control-flow", to: "sum-to" },
    { from: "functions-and-control-flow", to: "count-down" },
    { from: "functions-and-control-flow", to: "swap-tuple" },
  ],
};
