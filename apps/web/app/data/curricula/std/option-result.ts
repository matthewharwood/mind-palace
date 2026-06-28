import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// std: core::option / core::result — mastering the combinators. Every snippet is
// rustc-verified (edition 2024); behavioral outputs are run and matched.
export const optionResult: Curriculum = {
  id: "c-std-option-result",
  title: "Option & Result",
  source,
  nodes: [
    {
      id: "option-deep",
      title: "Option in depth",
      content: {
        type: "read",
        markdown:
          "`Option<T>` (`Some`/`None`) models absence. Beyond `match`, the std API is rich: `map`, `map_or`, `unwrap_or`, `unwrap_or_else`, `and_then`, `or_else`, `filter`, `take`, `replace`, `as_ref` (`&Option<T>` → `Option<&T>`), and `?` for early return.",
      },
    },
    {
      id: "result-deep",
      title: "Result in depth",
      content: {
        type: "read",
        markdown:
          "`Result<T, E>` carries a success or an error. Transform it with `map`, `map_err`, `and_then`, `unwrap_or`, `ok()` (→ `Option`), and propagate with `?`. A `Vec<Result<T, E>>` can `collect()` into `Result<Vec<T>, E>` — stopping at the first `Err`.",
      },
    },
    {
      id: "combinators-overview",
      title: "map vs and_then",
      content: {
        type: "read",
        markdown:
          "Use `map` when your closure returns a plain value (`T -> U`); use `and_then` (a.k.a. flat-map) when the closure itself returns an `Option`/`Result` (`T -> Option<U>`), so you don't end up with `Option<Option<U>>`. `transpose` swaps `Option<Result<…>>` and `Result<Option<…>>`.",
      },
    },
    {
      id: "map-or-output",
      title: "map_or",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let x = Some(5);
    println!("{}", x.map_or(0, |v| v * 2));
}`,
        options: ["0", "5", "10"],
        answerIndex: 2,
      },
    },
    {
      id: "and-then-output",
      title: "and_then",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let x: Option<i32> = Some(4);
    let y = x.and_then(|v| if v > 0 { Some(v * 10) } else { None });
    println!("{}", y.unwrap());
}`,
        options: ["4", "40", "0"],
        answerIndex: 1,
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
    let x: Option<i32> = None;
    println!("{}", x.unwrap_or_else(|| 42));
}`,
        options: ["0", "42", "None"],
        answerIndex: 1,
      },
    },
    {
      id: "filter-output",
      title: "Option::filter",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let x = Some(3);
    let y = x.filter(|&n| n % 2 == 0);
    println!("{y:?}");
}`,
        options: ["Some(3)", "None", "Some(0)"],
        answerIndex: 1,
      },
    },
    {
      id: "ok-or-output",
      title: "ok_or",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let opt = Some(7);
    let res: Result<i32, &str> = opt.ok_or("none");
    println!("{}", res.unwrap());
}`,
        options: ["7", "none", "0"],
        answerIndex: 0,
      },
    },
    {
      id: "question-mark-option",
      title: "? on Option",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn first_upper(s: &str) -> Option<char> {
    let c = s.chars().next()?;
    Some(c.to_ascii_uppercase())
}

fn main() {
    println!("{:?}", first_upper("rust"));
}`,
        options: ["Some('R')", "Some('r')", "None"],
        answerIndex: 0,
      },
    },
    {
      id: "collect-result-output",
      title: "collect into Result",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let nums: Result<Vec<i32>, _> = ["1", "2", "3"]
        .into_iter()
        .map(|s| s.parse::<i32>())
        .collect();
    println!("{:?}", nums.unwrap());
}`,
        options: ["[1, 2, 3]", "123", "Err(...)"],
        answerIndex: 0,
      },
    },
    {
      id: "as-ref-concept",
      title: "Option::as_ref",
      content: {
        type: "multiple-choice",
        question: "What does `Option::as_ref` produce?",
        options: [
          "It unwraps the value",
          "It converts `&Option<T>` into `Option<&T>`",
          "It clones the option",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "map-vs-and-then-concept",
      title: "Choosing a combinator",
      content: {
        type: "multiple-choice",
        question:
          "Your closure itself returns an `Option`. Which combinator avoids a nested `Option<Option<T>>`?",
        options: ["map", "and_then", "unwrap"],
        answerIndex: 1,
      },
    },
    {
      id: "opt-double",
      title: "Write: Option::map",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn double(x: Option<i32>) -> Option<i32>` that doubles the value using `map`.",
        solution: `fn double(x: Option<i32>) -> Option<i32> {
    x.map(|n| n * 2)
}`,
      },
    },
    {
      id: "value-or",
      title: "Write: unwrap_or",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn value_or(x: Option<i32>, default: i32) -> i32` returning the value or `default` via `unwrap_or`.",
        solution: `fn value_or(x: Option<i32>, default: i32) -> i32 {
    x.unwrap_or(default)
}`,
      },
    },
    {
      id: "result-map",
      title: "Write: Result::map",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn inc(r: Result<i32, String>) -> Result<i32, String>` adding 1 to the `Ok` value via `map`.",
        solution: `fn inc(r: Result<i32, String>) -> Result<i32, String> {
    r.map(|n| n + 1)
}`,
      },
    },
    {
      id: "opt-and-then",
      title: "Write: and_then",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn half(x: Option<i32>) -> Option<i32>` returning `Some(n / 2)` only when `n` is even, else `None`, using `and_then`.",
        solution: `fn half(x: Option<i32>) -> Option<i32> {
    x.and_then(|n| if n % 2 == 0 { Some(n / 2) } else { None })
}`,
      },
    },
    {
      id: "ok-or-fn",
      title: "Write: ok_or_else",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Write `fn require(x: Option<i32>) -> Result<i32, String>` using `ok_or_else` to produce `Err("missing".to_string())`.',
        solution: `fn require(x: Option<i32>) -> Result<i32, String> {
    x.ok_or_else(|| "missing".to_string())
}`,
      },
    },
    {
      id: "transpose",
      title: "Write: transpose",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn flip(x: Option<Result<i32, String>>) -> Result<Option<i32>, String>` using `transpose`.",
        solution: `fn flip(x: Option<Result<i32, String>>) -> Result<Option<i32>, String> {
    x.transpose()
}`,
      },
    },
    {
      id: "collect-opt",
      title: "Write: collect into Option",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn all_some(v: Vec<Option<i32>>) -> Option<Vec<i32>>` collecting into an `Option<Vec<i32>>` (`None` if any element is `None`).",
        solution: `fn all_some(v: Vec<Option<i32>>) -> Option<Vec<i32>> {
    v.into_iter().collect()
}`,
      },
    },
  ],
  // Network core: combinators apply to BOTH Option and Result (indegree 2), and
  // `transpose` bridges Result + combinators (Option<Result> ↔ Result<Option>).
  // Honest prerequisites, acyclic.
  edges: [
    { from: "option-deep", to: "result-deep" },
    { from: "result-deep", to: "combinators-overview" },
    { from: "option-deep", to: "combinators-overview" }, // combinators work on Option too
    { from: "result-deep", to: "transpose" }, // transpose needs Result + combinators
    { from: "option-deep", to: "map-or-output" },
    { from: "option-deep", to: "unwrap-or-else-output" },
    { from: "option-deep", to: "filter-output" },
    { from: "option-deep", to: "as-ref-concept" },
    { from: "option-deep", to: "question-mark-option" },
    { from: "option-deep", to: "opt-double" },
    { from: "option-deep", to: "value-or" },
    { from: "result-deep", to: "ok-or-output" },
    { from: "result-deep", to: "collect-result-output" },
    { from: "result-deep", to: "result-map" },
    { from: "result-deep", to: "ok-or-fn" },
    { from: "combinators-overview", to: "and-then-output" },
    { from: "combinators-overview", to: "map-vs-and-then-concept" },
    { from: "combinators-overview", to: "opt-and-then" },
    { from: "combinators-overview", to: "transpose" },
    { from: "combinators-overview", to: "collect-opt" },
  ],
};
