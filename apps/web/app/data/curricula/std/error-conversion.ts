import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// std: std::error::Error, Box<dyn Error>, and ? error conversion via From. Every
// snippet rustc-verified (edition 2024).
export const errorHandling = {
  id: "c-std-error",
  title: "Error Handling & Conversion",
  source,
  nodes: [
    {
      id: "error-trait",
      title: "The Error trait",
      content: {
        type: "read",
        markdown:
          "`std::error::Error` is implemented by error types; it requires `Debug` + `Display`. `Box<dyn Error>` is a trait object that can hold *any* error, so functions (and `main`) can return `Result<T, Box<dyn Error>>` and bubble up heterogeneous errors with `?`.",
      },
    },
    {
      id: "question-conversion",
      title: "? and From conversion",
      content: {
        type: "read",
        markdown:
          "When `?` propagates an error into a different error type, it calls `From::from` on it. So implementing `From<SourceError> for MyError` lets `?` automatically convert — the basis of clean custom error types. `main` may return `Result<(), Box<dyn Error>>`.",
      },
    },
    {
      id: "error-combinators",
      title: "Result combinators for errors",
      content: {
        type: "read",
        markdown:
          "Transform the error channel with `map_err` (change the `Err` type), drop it with `ok()` (→ `Option`), or recover with `unwrap_or`/`unwrap_or_else`. Transform success with `map`/`and_then`. These compose without unwrapping.",
      },
    },
    {
      id: "main-box-output",
      title: "main → Result",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    let n: i32 = "21".parse()?;
    println!("{}", n * 2);
    Ok(())
}`,
        options: ["21", "42", "compile error"],
        answerIndex: 1,
      },
    },
    {
      id: "map-err-output",
      title: "map_err",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let r: Result<i32, String> = "x".parse::<i32>().map_err(|_| "bad".to_string());
    println!("{}", r.is_err());
}`,
        options: ["true", "false", "bad"],
        answerIndex: 0,
      },
    },
    {
      id: "from-conversion-output",
      title: "? with From",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `#[derive(Debug)]
struct MyErr;

impl From<std::num::ParseIntError> for MyErr {
    fn from(_: std::num::ParseIntError) -> MyErr {
        MyErr
    }
}

fn parse(s: &str) -> Result<i32, MyErr> {
    let n: i32 = s.parse()?;
    Ok(n)
}

fn main() {
    println!("{:?}", parse("7"));
}`,
        options: ["Ok(7)", "Err(MyErr)", "7"],
        answerIndex: 0,
      },
    },
    {
      id: "unwrap-or-else-output",
      title: "unwrap_or_else",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let n: i32 = "nope".parse().unwrap_or_else(|_| -1);
    println!("{n}");
}`,
        options: ["0", "-1", "nope"],
        answerIndex: 1,
      },
    },
    {
      id: "box-dyn-concept",
      title: "Box<dyn Error>",
      content: {
        type: "multiple-choice",
        question: "Why is `Box<dyn Error>` useful as a return error type?",
        options: [
          "It is faster than a concrete error",
          "It can hold any type that implements Error",
          "It avoids the heap",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "from-trait-concept",
      title: "What ? uses to convert",
      content: {
        type: "multiple-choice",
        question: "When `?` converts one error type into another, which trait does it use?",
        options: ["From / Into", "Display", "Clone"],
        answerIndex: 0,
      },
    },
    {
      id: "error-impl-concept",
      title: "Making a custom error",
      content: {
        type: "multiple-choice",
        question: "For a custom error to work with `Box<dyn Error>` and `?`, it should implement:",
        options: ["Debug + Display + Error", "Clone only", "Iterator"],
        answerIndex: 0,
      },
    },
    {
      id: "main-box-error",
      title: "Write: main returning Box<dyn Error>",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Write a program whose `main` returns `Result<(), Box<dyn std::error::Error>>`, parses `"10"` with `?`, prints it, and returns `Ok(())`.',
        solution: `fn main() -> Result<(), Box<dyn std::error::Error>> {
    let n: i32 = "10".parse()?;
    println!("{n}");
    Ok(())
}`,
      },
    },
    {
      id: "impl-error",
      title: "Write: a custom Error type",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Define `struct ParseErr;` (derive `Debug`), implement `Display` to write `"parse error"`, and implement `std::error::Error` (empty body). Use `std::fmt` and `std::error::Error`.',
        solution: `use std::error::Error;
use std::fmt;

#[derive(Debug)]
struct ParseErr;

impl fmt::Display for ParseErr {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "parse error")
    }
}

impl Error for ParseErr {}`,
      },
    },
    {
      id: "from-error",
      title: "Write: From for a custom error",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "For `struct AppError(String)`, implement `From<std::num::ParseIntError>` storing the source error's `to_string()`.",
        solution: `struct AppError(String);

impl From<std::num::ParseIntError> for AppError {
    fn from(e: std::num::ParseIntError) -> AppError {
        AppError(e.to_string())
    }
}`,
      },
    },
    {
      id: "propagate-custom",
      title: "Write: propagate to Box<dyn Error>",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn parse(s: &str) -> Result<i32, Box<dyn std::error::Error>>` parsing `s` with `?` and returning it.",
        solution: `fn parse(s: &str) -> Result<i32, Box<dyn std::error::Error>> {
    let n: i32 = s.parse()?;
    Ok(n)
}`,
      },
    },
    {
      id: "map-err-fn",
      title: "Write: map_err",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn parse_or(s: &str) -> Result<i32, String>` parsing `s` and converting the error with `map_err(|e| e.to_string())`.",
        solution: `fn parse_or(s: &str) -> Result<i32, String> {
    s.parse::<i32>().map_err(|e| e.to_string())
}`,
      },
    },
    {
      id: "unwrap-or-fn",
      title: "Write: recover with unwrap_or",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn parse_default(s: &str) -> i32` parsing `s` or returning -1 via `unwrap_or`.",
        solution: `fn parse_default(s: &str) -> i32 {
    s.parse().unwrap_or(-1)
}`,
      },
    },
    {
      id: "parse-double",
      title: "Write: map success",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn parse_double(s: &str) -> Result<i32, std::num::ParseIntError>` parsing `s` then doubling via `map`.",
        solution: `fn parse_double(s: &str) -> Result<i32, std::num::ParseIntError> {
    s.parse::<i32>().map(|n| n * 2)
}`,
      },
    },
    {
      id: "ok-discard",
      title: "Write: Result → Option",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn try_parse(s: &str) -> Option<i32>` returning the parse result as an `Option` via `.ok()`.",
        solution: `fn try_parse(s: &str) -> Option<i32> {
    s.parse().ok()
}`,
      },
    },
  ],
  // Network core: combinators operate on the Error/Result foundation (chord),
  // and `propagate-custom` bridges the Error trait + `?`-driven From conversion
  // (bridge). Honest, acyclic.
  edges: [
    { from: "error-trait", to: "question-conversion" },
    { from: "question-conversion", to: "error-combinators" },
    { from: "error-trait", to: "error-combinators" }, // combinators act on the Error/Result base
    { from: "question-conversion", to: "propagate-custom" }, // propagating a custom error uses `?` + From
    { from: "error-trait", to: "box-dyn-concept" },
    { from: "error-trait", to: "error-impl-concept" },
    { from: "error-trait", to: "main-box-output" },
    { from: "error-trait", to: "impl-error" },
    { from: "error-trait", to: "main-box-error" },
    { from: "error-trait", to: "propagate-custom" },
    { from: "question-conversion", to: "from-conversion-output" },
    { from: "question-conversion", to: "from-trait-concept" },
    { from: "question-conversion", to: "from-error" },
    { from: "error-combinators", to: "map-err-output" },
    { from: "error-combinators", to: "unwrap-or-else-output" },
    { from: "error-combinators", to: "map-err-fn" },
    { from: "error-combinators", to: "unwrap-or-fn" },
    { from: "error-combinators", to: "parse-double" },
    { from: "error-combinators", to: "ok-discard" },
  ],
} satisfies Curriculum;
