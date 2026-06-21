import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// Structs, Enums & Pattern Matching. Language semantics; every snippet
// rustc-verified (edition 2024).
export const structsEnums: Curriculum = {
  id: "c-rust-structs-enums",
  title: "Structs, Enums & Matching",
  source,
  nodes: [
    {
      id: "structs-basics",
      title: "Structs & Methods",
      content: {
        type: "read",
        markdown:
          "A `struct` groups named fields. Methods live in an `impl` block and take `&self` (read), `&mut self` (mutate), or `self` (consume). Associated functions have no `self` (e.g. `Self::new`) and are called as `Type::func()`. Field init shorthand and struct update syntax (`..other`) reduce boilerplate.",
      },
    },
    {
      id: "enums-and-option",
      title: "Enums & Option",
      content: {
        type: "read",
        markdown:
          "An `enum` is a value that is exactly one of several **variants**, each able to carry data (tuple-like `Write(String)` or struct-like `Move { x, y }`). `Option<T>` (`Some`/`None`) is the standard enum that replaces null.",
      },
    },
    {
      id: "match-and-patterns",
      title: "match & Patterns",
      content: {
        type: "read",
        markdown:
          "`match` compares a value against patterns and must be **exhaustive** (`_` is the catch-all). Patterns bind data out of variants, match literals/ranges, combine with `|`, and add `match` guards (`x if cond`). `if let` / `let ... else` are concise single-pattern forms.",
      },
    },
    {
      id: "method-receiver",
      title: "Read-only method receiver",
      content: {
        type: "multiple-choice",
        question: "A method that reads `self` but does not modify it should take:",
        options: ["self", "&self", "&mut self"],
        answerIndex: 1,
      },
    },
    {
      id: "associated-fn",
      title: "Associated functions",
      content: {
        type: "multiple-choice",
        question: '`String::from("hi")` is called without an instance. What is `from` here?',
        options: ["A method on an instance", "An associated function", "A standalone macro"],
        answerIndex: 1,
      },
    },
    {
      id: "match-exhaustive",
      title: "Exhaustiveness",
      content: {
        type: "multiple-choice",
        question: "What does the compiler require of a `match` expression?",
        options: [
          "It covers at least one case",
          "It is exhaustive — every case handled",
          "It matches only enums",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "option-unwrap-or-output",
      title: "unwrap_or on None",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let x: Option<i32> = None;
    let y = x.unwrap_or(0);
    println!("{y}");
}`,
        options: ["0", "None", "it panics"],
        answerIndex: 0,
      },
    },
    {
      id: "enum-match-output",
      title: "Matching an enum",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `enum Coin {
    Penny,
    Nickel,
    Dime,
}

fn value(c: Coin) -> u32 {
    match c {
        Coin::Penny => 1,
        Coin::Nickel => 5,
        Coin::Dime => 10,
    }
}

fn main() {
    println!("{}", value(Coin::Nickel));
}`,
        options: ["1", "5", "10"],
        answerIndex: 1,
      },
    },
    {
      id: "struct-update-output",
      title: "Struct update syntax",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p1 = Point { x: 1, y: 2 };
    let p2 = Point { x: 9, ..p1 };
    println!("{} {}", p2.x, p2.y);
}`,
        options: ["1 2", "9 2", "9 9"],
        answerIndex: 1,
      },
    },
    {
      id: "if-let-output",
      title: "if let",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let value = Some(7);
    if let Some(n) = value {
        println!("{n}");
    } else {
        println!("none");
    }
}`,
        options: ["7", "none", "Some(7)"],
        answerIndex: 0,
      },
    },
    {
      id: "match-guard-output",
      title: "match guard",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let n = 4;
    let s = match n {
        x if x % 2 == 0 => "even",
        _ => "odd",
    };
    println!("{s}");
}`,
        options: ["even", "odd", "4"],
        answerIndex: 0,
      },
    },
    {
      id: "struct-def",
      title: "Write: define a struct",
      content: {
        type: "code",
        language: "rust",
        prompt: "Define a struct `Point` with two `i32` fields named `x` and `y`.",
        solution: `struct Point {
    x: i32,
    y: i32,
}`,
      },
    },
    {
      id: "impl-area",
      title: "Write: a method",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Define `struct Rectangle { width: u32, height: u32 }` and an `impl` with a method `fn area(&self) -> u32` returning width × height.",
        solution: `struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }
}`,
      },
    },
    {
      id: "associated-new",
      title: "Write: an associated function",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Define `struct Counter { count: u32 }` and an `impl` with an associated function `fn new() -> Counter` whose `count` starts at 0.",
        solution: `struct Counter {
    count: u32,
}

impl Counter {
    fn new() -> Counter {
        Counter { count: 0 }
    }
}`,
      },
    },
    {
      id: "enum-def",
      title: "Write: a simple enum",
      content: {
        type: "code",
        language: "rust",
        prompt: "Define an enum `Direction` with variants `North`, `South`, `East`, and `West`.",
        solution: `enum Direction {
    North,
    South,
    East,
    West,
}`,
      },
    },
    {
      id: "enum-with-data",
      title: "Write: enum with data",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Define an enum `Message` with `Quit`, a struct-like `Move { x: i32, y: i32 }`, and a tuple-like `Write(String)`.",
        solution: `enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
}`,
      },
    },
    {
      id: "match-describe",
      title: "Write: match on Option",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Write a function `fn describe(n: Option<i32>) -> String` that returns the owned string `"some"` for `Some` and `"none"` for `None`, using `match`.',
        solution: `fn describe(n: Option<i32>) -> String {
    match n {
        Some(_) => String::from("some"),
        None => String::from("none"),
    }
}`,
      },
    },
    {
      id: "option-map",
      title: "Write: Option::map",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a function `fn double_opt(x: Option<i32>) -> Option<i32>` that doubles the inner value when present, using `map`.",
        solution: `fn double_opt(x: Option<i32>) -> Option<i32> {
    x.map(|n| n * 2)
}`,
      },
    },
    {
      id: "area-shape",
      title: "Write: match an enum with data",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Define `enum Shape { Circle(f64), Rectangle(f64, f64) }` and `fn area(s: Shape) -> f64` (circle area = `3.14 * r * r`).",
        solution: `enum Shape {
    Circle(f64),
    Rectangle(f64, f64),
}

fn area(s: Shape) -> f64 {
    match s {
        Shape::Circle(r) => 3.14 * r * r,
        Shape::Rectangle(w, h) => w * h,
    }
}`,
      },
    },
  ],
  edges: [
    { from: "structs-basics", to: "enums-and-option" },
    { from: "enums-and-option", to: "match-and-patterns" },
    { from: "structs-basics", to: "method-receiver" },
    { from: "structs-basics", to: "associated-fn" },
    { from: "structs-basics", to: "struct-def" },
    { from: "structs-basics", to: "impl-area" },
    { from: "structs-basics", to: "associated-new" },
    { from: "structs-basics", to: "struct-update-output" },
    { from: "enums-and-option", to: "enum-def" },
    { from: "enums-and-option", to: "enum-with-data" },
    { from: "enums-and-option", to: "option-unwrap-or-output" },
    { from: "enums-and-option", to: "option-map" },
    { from: "match-and-patterns", to: "match-exhaustive" },
    { from: "match-and-patterns", to: "enum-match-output" },
    { from: "match-and-patterns", to: "if-let-output" },
    { from: "match-and-patterns", to: "match-guard-output" },
    { from: "match-and-patterns", to: "match-describe" },
    { from: "match-and-patterns", to: "area-shape" },
  ],
};
