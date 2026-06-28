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
          "Every value you name in Rust lives in a **binding**, introduced with `let`. By default a binding is ==immutable== — once `let x = 5;` runs, `x` can never be reassigned.\n\n## Opt in to change with mut\nWhen you genuinely need to mutate, add the `mut` keyword:\n\n- `let x = 5;` — fixed for its entire scope\n- `let mut x = 5;` — `x` may be reassigned later\n\nThe compiler makes immutability the *default*, so change is always **explicit**.\n\n## const is more than an immutable let\nA `const` is always immutable, **must** carry a type annotation, and is evaluated at ==compile time== — ideal for fixed values like `const MAX_POINTS: u32 = 100_000;`.\n\n## Shadowing reuses a name\nRe-declaring with `let` *shadows* the previous binding — a brand-new variable that may even change type.",
      },
    },
    {
      id: "types-overview",
      title: "Scalar & Compound Types",
      content: {
        type: "read",
        markdown:
          "Rust's types split into two families, and the compiler always knows which one it's working with.\n\n## Scalars hold one value\n- **integers** — `i32` is the default; also `u8`, `u64`, `usize`, and more\n- **floats** — `f64` by default, `f32` for half precision\n- **bool** — `true` or `false`\n- **char** — a single ==Unicode scalar==, in single quotes like `'z'`\n\n## Compounds group values\n- **tuples** group a *fixed* number of **mixed** types: `(i32, f64, char)`\n- **arrays** hold a *fixed* number of **one** type: `[i32; 3]`\n\nInteger literals default to `i32`, and arithmetic that ==overflows panics in debug builds== — so a bug is never silent while you develop.",
      },
    },
    {
      id: "functions-and-control-flow",
      title: "Functions & Control Flow",
      content: {
        type: "read",
        markdown:
          '## Functions\nEvery parameter is annotated, and the return type follows `->`. The body\'s **final expression** — written *without* a trailing semicolon — is what the function returns:\n\n- `fn double(n: i32) -> i32 { n * 2 }` returns `n * 2`\n- add a `;` and it becomes a statement that returns `()`\n\n## Almost everything is an expression\nBecause `if` is an ==expression==, it yields a value you can bind directly: `let parity = if n % 2 == 0 { "even" } else { "odd" };`.\n\n## Three kinds of loop\n- `loop { … }` — runs until you `break`; a `break value` can even **return** a value\n- `while cond { … }` — repeats while a condition holds\n- `for x in iter { … }` — the idiomatic way to walk a range or collection',
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
