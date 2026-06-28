import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// std: alloc::string / core::str / char — text handling. Every snippet
// rustc-verified (edition 2024).
export const strings: Curriculum = {
  id: "c-std-strings",
  title: "Strings & Text",
  source,
  nodes: [
    {
      id: "string-vs-str",
      title: "String vs &str",
      content: {
        type: "read",
        markdown:
          "`String` is owned, growable, heap UTF-8; `&str` is a borrowed slice. Build with `push_str`/`push`/`format!`/`to_string`. You can't index by integer (`s[0]`) because UTF-8 bytes don't map 1:1 to characters — iterate `chars()` or `bytes()` instead.",
      },
    },
    {
      id: "str-methods",
      title: "&str methods",
      content: {
        type: "read",
        markdown:
          "Slicing helpers: `split`, `split_whitespace`, `lines`, `trim`, `replace`, `contains`, `starts_with`/`ends_with`, `to_uppercase`/`to_lowercase`, `find`. Most return iterators or new `String`s and never mutate the source.",
      },
    },
    {
      id: "char-and-parse",
      title: "chars & parse",
      content: {
        type: "read",
        markdown:
          '`chars()` yields Unicode scalar values (`char`); `chars().count()` is the character count (≠ `len()`, which is bytes). `str::parse::<T>()` returns `Result<T, _>` for any `FromStr` type, e.g. `"42".parse::<i32>()`.',
      },
    },
    {
      id: "split-collect-output",
      title: "split + collect",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let parts: Vec<&str> = "a,b,c".split(',').collect();
    println!("{}", parts.len());
}`,
        options: ["1", "3", "5"],
        answerIndex: 1,
      },
    },
    {
      id: "trim-output",
      title: "trim",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let s = "  hi  ".trim();
    println!("[{s}]");
}`,
        options: ["[hi]", "[  hi  ]", "[ hi ]"],
        answerIndex: 0,
      },
    },
    {
      id: "replace-output",
      title: "replace",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    println!("{}", "foofoo".replace("foo", "bar"));
}`,
        options: ["barbar", "bar", "foofoo"],
        answerIndex: 0,
      },
    },
    {
      id: "contains-output",
      title: "contains",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    println!("{}", "hello world".contains("world"));
}`,
        options: ["true", "false", "world"],
        answerIndex: 0,
      },
    },
    {
      id: "lines-output",
      title: "lines",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let text = "a\\nb\\nc";
    println!("{}", text.lines().count());
}`,
        options: ["1", "2", "3"],
        answerIndex: 2,
      },
    },
    {
      id: "chars-count-output",
      title: "chars().count()",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    println!("{}", "héllo".chars().count());
}`,
        options: ["4", "5", "6"],
        answerIndex: 1,
      },
    },
    {
      id: "parse-output",
      title: "parse",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let n: i32 = "  42  ".trim().parse().unwrap();
    println!("{}", n + 8);
}`,
        options: ["42", "50", "8"],
        answerIndex: 1,
      },
    },
    {
      id: "string-index-concept",
      title: "No integer indexing",
      content: {
        type: "multiple-choice",
        question: "Why does `String` not support `s[0]`?",
        options: [
          "Strings are immutable",
          "UTF-8 bytes aren't 1:1 with characters",
          "It would return a slice",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "word-count",
      title: "Write: word count",
      content: {
        type: "code",
        language: "rust",
        prompt: "Write `fn word_count(s: &str) -> usize` counting whitespace-separated words.",
        solution: `fn word_count(s: &str) -> usize {
    s.split_whitespace().count()
}`,
      },
    },
    {
      id: "starts-with",
      title: "Write: starts_with",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Write `fn is_greeting(s: &str) -> bool` returning whether `s` starts with `"hello"`.',
        solution: `fn is_greeting(s: &str) -> bool {
    s.starts_with("hello")
}`,
      },
    },
    {
      id: "to-csv",
      title: "Write: join",
      content: {
        type: "code",
        language: "rust",
        prompt: "Write `fn to_csv(items: &[&str]) -> String` joining the items with a comma.",
        solution: `fn to_csv(items: &[&str]) -> String {
    items.join(",")
}`,
      },
    },
    {
      id: "reverse-chars",
      title: "Write: reverse",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn reverse(s: &str) -> String` returning the characters reversed via `chars().rev().collect()`.",
        solution: `fn reverse(s: &str) -> String {
    s.chars().rev().collect()
}`,
      },
    },
    {
      id: "parse-add",
      title: "Write: parse & add",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn parse_add(a: &str, b: &str) -> i32` that parses both to `i32` and returns their sum (use `.parse::<i32>().unwrap()`).",
        solution: `fn parse_add(a: &str, b: &str) -> i32 {
    a.parse::<i32>().unwrap() + b.parse::<i32>().unwrap()
}`,
      },
    },
    {
      id: "count-char",
      title: "Write: count a char",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn count_char(s: &str, target: char) -> usize` counting how many times `target` appears.",
        solution: `fn count_char(s: &str, target: char) -> usize {
    s.chars().filter(|&c| c == target).count()
}`,
      },
    },
    {
      id: "capitalize",
      title: "Write: capitalize",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn capitalize(s: &str) -> String` that uppercases the first character and keeps the rest (assume non-empty ASCII; use `chars()` and `as_str()`).",
        solution: `fn capitalize(s: &str) -> String {
    let mut chars = s.chars();
    let first = chars.next().unwrap().to_ascii_uppercase();
    format!("{first}{}", chars.as_str())
}`,
      },
    },
  ],
  // Network core: char/parse work builds directly on the String/&str distinction
  // (chord), and `capitalize` bridges str-methods + chars. Honest, acyclic.
  edges: [
    { from: "string-vs-str", to: "str-methods" },
    { from: "str-methods", to: "char-and-parse" },
    { from: "string-vs-str", to: "char-and-parse" }, // chars/parsing build on String vs &str
    { from: "str-methods", to: "capitalize" }, // capitalize needs str slicing + chars
    { from: "string-vs-str", to: "string-index-concept" },
    { from: "string-vs-str", to: "to-csv" },
    { from: "str-methods", to: "split-collect-output" },
    { from: "str-methods", to: "trim-output" },
    { from: "str-methods", to: "replace-output" },
    { from: "str-methods", to: "contains-output" },
    { from: "str-methods", to: "lines-output" },
    { from: "str-methods", to: "word-count" },
    { from: "str-methods", to: "starts-with" },
    { from: "str-methods", to: "count-char" },
    { from: "char-and-parse", to: "chars-count-output" },
    { from: "char-and-parse", to: "parse-output" },
    { from: "char-and-parse", to: "reverse-chars" },
    { from: "char-and-parse", to: "parse-add" },
    { from: "char-and-parse", to: "capitalize" },
  ],
};
