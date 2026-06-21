import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// Error Handling — panic, Result/Option, the ? operator. Language semantics;
// every snippet rustc-verified (edition 2024).
export const errors: Curriculum = {
  id: "c-rust-errors",
  title: "Error Handling",
  source,
  nodes: [
    {
      id: "panic-vs-result",
      title: "panic! vs Result",
      content: {
        type: "read",
        markdown:
          "`panic!` is for **unrecoverable** errors (bugs, broken invariants); it unwinds the stack. **Recoverable** errors return `Result<T, E>` — `Ok(value)` or `Err(error)` — so the caller decides what to do. `unwrap`/`expect` turn an `Err`/`None` into a panic; `expect` adds a message.",
      },
    },
    {
      id: "option-vs-result",
      title: "Option vs Result",
      content: {
        type: "read",
        markdown:
          "`Option<T>` models *absence* (`Some`/`None`); `Result<T, E>` models *failure with a reason* (`Ok`/`Err`). Convert between them: `Option::ok_or(err)` → `Result`; `Result::ok()` → `Option`. Combinators like `map`, `and_then`, `unwrap_or` transform without unwrapping.",
      },
    },
    {
      id: "the-question-mark",
      title: "The ? operator",
      content: {
        type: "read",
        markdown:
          "`?` after a `Result`/`Option` returns early with the `Err`/`None`, otherwise evaluates to the inner value — replacing nested matches. It only works in a function whose return type is compatible (e.g. `-> Result<_, E>` or `-> Option<_>`); `main` may return `Result<(), E>`.",
      },
    },
    {
      id: "result-variants",
      title: "Result's variants",
      content: {
        type: "multiple-choice",
        question: "Which two variants does `Result` have?",
        options: ["Some / None", "Ok / Err", "Yes / No"],
        answerIndex: 1,
      },
    },
    {
      id: "question-mark-purpose",
      title: "What ? does",
      content: {
        type: "multiple-choice",
        question: "Applied to a `Result`, what does the `?` operator do?",
        options: [
          "Always panics on Err",
          "Returns early with the Err, otherwise yields the Ok value",
          "Silently ignores the error",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "expect-vs-unwrap",
      title: "expect vs unwrap",
      content: {
        type: "multiple-choice",
        question: "How does `expect(msg)` differ from `unwrap()`?",
        options: [
          "It never panics",
          "It panics with your custom message on Err/None",
          "It returns an Option",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "map-err-purpose",
      title: "map_err",
      content: {
        type: "multiple-choice",
        question: "`map_err` transforms which part of a `Result`?",
        options: ["The Ok value", "The Err value", "It discards the error"],
        answerIndex: 1,
      },
    },
    {
      id: "unwrap-or-output",
      title: "unwrap_or on Err",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let r: Result<i32, String> = Err(String::from("bad"));
    println!("{}", r.unwrap_or(-1));
}`,
        options: ["-1", "bad", "0"],
        answerIndex: 0,
      },
    },
    {
      id: "parse-ok-output",
      title: "Parsing a number",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let n: i32 = "42".parse().unwrap();
    println!("{}", n + 1);
}`,
        options: ["42", "43", "compile error"],
        answerIndex: 1,
      },
    },
    {
      id: "question-mark-output",
      title: "Propagation with ?",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn parse_sum(a: &str, b: &str) -> Result<i32, std::num::ParseIntError> {
    Ok(a.parse::<i32>()? + b.parse::<i32>()?)
}

fn main() {
    println!("{}", parse_sum("3", "4").unwrap());
}`,
        options: ["7", "34", "compile error"],
        answerIndex: 0,
      },
    },
    {
      id: "ok-or-output",
      title: "Option → Result",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let opt: Option<i32> = None;
    let res: Result<i32, &str> = opt.ok_or("missing");
    println!("{}", res.is_err());
}`,
        options: ["true", "false", "missing"],
        answerIndex: 0,
      },
    },
    {
      id: "divide",
      title: "Write: divide returning Result",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Write `fn divide(a: i32, b: i32) -> Result<i32, String>` returning `Err(String::from("divide by zero"))` when `b == 0`, otherwise `Ok(a / b)`.',
        solution: `fn divide(a: i32, b: i32) -> Result<i32, String> {
    if b == 0 {
        Err(String::from("divide by zero"))
    } else {
        Ok(a / b)
    }
}`,
      },
    },
    {
      id: "first-char-opt",
      title: "Write: Option from maybe-empty",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn first(s: &str) -> Option<char>` returning the first character, or `None` if `s` is empty.",
        solution: `fn first(s: &str) -> Option<char> {
    s.chars().next()
}`,
      },
    },
    {
      id: "parse-i32",
      title: "Write: parse to Result",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn parse_i32(s: &str) -> Result<i32, std::num::ParseIntError>` that parses `s` into an `i32`.",
        solution: `fn parse_i32(s: &str) -> Result<i32, std::num::ParseIntError> {
    s.parse()
}`,
      },
    },
    {
      id: "double-str",
      title: "Write: propagate with ?",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn double_str(s: &str) -> Result<i32, std::num::ParseIntError>` that parses `s` with `?` and returns the value doubled.",
        solution: `fn double_str(s: &str) -> Result<i32, std::num::ParseIntError> {
    let n: i32 = s.parse()?;
    Ok(n * 2)
}`,
      },
    },
    {
      id: "parse-or-zero",
      title: "Write: parse or default",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn parse_or_zero(s: &str) -> i32` that parses `s` to an `i32` or returns 0 using `unwrap_or`.",
        solution: `fn parse_or_zero(s: &str) -> i32 {
    s.parse().unwrap_or(0)
}`,
      },
    },
    {
      id: "require",
      title: "Write: ok_or",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Write `fn require(opt: Option<i32>) -> Result<i32, String>` that turns `None` into `Err(String::from("missing"))` using `ok_or`.',
        solution: `fn require(opt: Option<i32>) -> Result<i32, String> {
    opt.ok_or(String::from("missing"))
}`,
      },
    },
    {
      id: "main-result",
      title: "Write: main returning Result",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Write a program whose `main` returns `Result<(), std::num::ParseIntError>`, parses `"10"` with `?`, prints it, and returns `Ok(())`.',
        solution: `fn main() -> Result<(), std::num::ParseIntError> {
    let n: i32 = "10".parse()?;
    println!("{n}");
    Ok(())
}`,
      },
    },
    {
      id: "add-one",
      title: "Write: Result → Option → map",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn add_one(s: &str) -> Option<i32>` that parses `s` to `i32` via `ok()` and adds 1 with `map`.",
        solution: `fn add_one(s: &str) -> Option<i32> {
    s.parse::<i32>().ok().map(|n| n + 1)
}`,
      },
    },
  ],
  edges: [
    { from: "panic-vs-result", to: "option-vs-result" },
    { from: "option-vs-result", to: "the-question-mark" },
    { from: "panic-vs-result", to: "result-variants" },
    { from: "panic-vs-result", to: "expect-vs-unwrap" },
    { from: "panic-vs-result", to: "map-err-purpose" },
    { from: "panic-vs-result", to: "unwrap-or-output" },
    { from: "panic-vs-result", to: "divide" },
    { from: "panic-vs-result", to: "parse-i32" },
    { from: "panic-vs-result", to: "parse-ok-output" },
    { from: "option-vs-result", to: "first-char-opt" },
    { from: "option-vs-result", to: "ok-or-output" },
    { from: "option-vs-result", to: "require" },
    { from: "option-vs-result", to: "add-one" },
    { from: "option-vs-result", to: "parse-or-zero" },
    { from: "the-question-mark", to: "question-mark-purpose" },
    { from: "the-question-mark", to: "question-mark-output" },
    { from: "the-question-mark", to: "double-str" },
    { from: "the-question-mark", to: "main-result" },
  ],
};
