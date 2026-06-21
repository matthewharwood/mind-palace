import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// Modules & the std collections (Vec, String, HashMap). Language/std semantics;
// every snippet rustc-verified (edition 2024). HashMap output questions use
// deterministic key lookups (never iteration order).
export const modules: Curriculum = {
  id: "c-rust-modules",
  title: "Modules, Collections & Cargo",
  source,
  nodes: [
    {
      id: "modules-and-paths",
      title: "Modules, Paths & use",
      content: {
        type: "read",
        markdown:
          "`mod` defines a module; items are **private by default** and exposed with `pub`. Refer to items by path — absolute (`crate::a::b`), relative, or via `super::`/`self::`. `use` brings a path into scope; `pub use` re-exports it. A crate is a compilation unit; a package bundles crates via `Cargo.toml`.",
      },
    },
    {
      id: "vectors-and-strings",
      title: "Vec & String",
      content: {
        type: "read",
        markdown:
          "`Vec<T>` is a growable list: `push`, iterate, and access via `v[i]` (panics out of bounds) or `v.get(i)` (returns `Option`). `String` is owned UTF-8: build with `push_str`/`push`/`format!`; you **cannot** index it with `s[i]` because bytes don't map 1:1 to characters.",
      },
    },
    {
      id: "hashmaps",
      title: "HashMap",
      content: {
        type: "read",
        markdown:
          "`HashMap<K, V>` stores key→value pairs: `insert`, `get` (returns `Option<&V>`), and the `entry(k).or_insert(v)` pattern to update-or-default. Inserting an owned value moves it into the map. Iteration order is unspecified.",
      },
    },
    {
      id: "pub-default",
      title: "Module privacy",
      content: {
        type: "multiple-choice",
        question: "By default, an item declared inside a module is:",
        options: [
          "Public to the whole crate",
          "Private to that module (and its descendants)",
          "Visible only via super::",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "use-keyword",
      title: "The use keyword",
      content: {
        type: "multiple-choice",
        question: "What does `use` do?",
        options: [
          "Copies the item's code into the file",
          "Brings a path into scope as a shorter name",
          "Makes an item public",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "vec-get-vs-index",
      title: "Indexing vs get",
      content: {
        type: "multiple-choice",
        question: "For a `Vec<i32>` of length 3, how do `v[10]` and `v.get(10)` differ?",
        options: [
          "Both return None",
          "v[10] panics; v.get(10) returns None",
          "Both panic at runtime",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "string-index",
      title: "Why no String indexing",
      content: {
        type: "multiple-choice",
        question: "Why does Rust reject indexing a `String` with `s[0]`?",
        options: [
          "Strings are immutable",
          "UTF-8 bytes don't map 1:1 to characters, so byte indexing is disallowed",
          "Indexing a String returns a Vec",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "vec-sum-output",
      title: "Summing a Vec",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let v = vec![1, 2, 3, 4];
    let sum: i32 = v.iter().sum();
    println!("{sum}");
}`,
        options: ["10", "1234", "4"],
        answerIndex: 0,
      },
    },
    {
      id: "string-concat-output",
      title: "format!",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let s = format!("{}-{}", "a", "b");
    println!("{s}");
}`,
        options: ["ab", "a-b", "a b"],
        answerIndex: 1,
      },
    },
    {
      id: "hashmap-get-output",
      title: "HashMap lookup",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();
    scores.insert("blue", 10);
    scores.insert("red", 50);
    println!("{}", scores["red"]);
}`,
        options: ["10", "50", "0"],
        answerIndex: 1,
      },
    },
    {
      id: "entry-or-insert-output",
      title: "entry / or_insert",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `use std::collections::HashMap;

fn main() {
    let mut map: HashMap<&str, i32> = HashMap::new();
    *map.entry("a").or_insert(0) += 1;
    *map.entry("a").or_insert(0) += 1;
    println!("{}", map["a"]);
}`,
        options: ["1", "2", "0"],
        answerIndex: 1,
      },
    },
    {
      id: "mod-with-pub",
      title: "Write: a module",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Define a module `math` containing a public function `fn add(a: i32, b: i32) -> i32` that returns their sum.",
        solution: `mod math {
    pub fn add(a: i32, b: i32) -> i32 {
        a + b
    }
}`,
      },
    },
    {
      id: "vec-build",
      title: "Write: build a Vec",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a function `fn evens() -> Vec<i32>` that returns a vector containing 2, 4, 6.",
        solution: `fn evens() -> Vec<i32> {
    vec![2, 4, 6]
}`,
      },
    },
    {
      id: "vec-push",
      title: "Write: push onto a Vec",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a function `fn push_zero(v: &mut Vec<i32>)` that pushes `0` onto the vector.",
        solution: `fn push_zero(v: &mut Vec<i32>) {
    v.push(0);
}`,
      },
    },
    {
      id: "vec-total",
      title: "Write: sum a slice",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a function `fn total(v: &[i32]) -> i32` that returns the sum using `iter().sum()`.",
        solution: `fn total(v: &[i32]) -> i32 {
    v.iter().sum()
}`,
      },
    },
    {
      id: "string-greet",
      title: "Write: build a String",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Write a function `fn greet(name: &str) -> String` returning `"Hello, <name>!"` using `format!`.',
        solution: `fn greet(name: &str) -> String {
    format!("Hello, {name}!")
}`,
      },
    },
    {
      id: "dash-join",
      title: "Write: join with a dash",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a function `fn dash_join(items: &[&str]) -> String` that joins items with `-`.",
        solution: `fn dash_join(items: &[&str]) -> String {
    items.join("-")
}`,
      },
    },
    {
      id: "word-count",
      title: "Write: word frequency",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::collections::HashMap`, write `fn word_count(text: &str) -> HashMap<&str, i32>` that counts whitespace-separated words (include the `use`).",
        solution: `use std::collections::HashMap;

fn word_count(text: &str) -> HashMap<&str, i32> {
    let mut counts = HashMap::new();
    for word in text.split_whitespace() {
        *counts.entry(word).or_insert(0) += 1;
    }
    counts
}`,
      },
    },
    {
      id: "hashmap-get-or",
      title: "Write: get or default",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::collections::HashMap`, write `fn get_or_zero(map: &HashMap<String, i32>, key: &str) -> i32` returning the value for `key` or 0 (include the `use`).",
        solution: `use std::collections::HashMap;

fn get_or_zero(map: &HashMap<String, i32>, key: &str) -> i32 {
    *map.get(key).unwrap_or(&0)
}`,
      },
    },
  ],
  edges: [
    { from: "modules-and-paths", to: "vectors-and-strings" },
    { from: "vectors-and-strings", to: "hashmaps" },
    { from: "modules-and-paths", to: "pub-default" },
    { from: "modules-and-paths", to: "use-keyword" },
    { from: "modules-and-paths", to: "mod-with-pub" },
    { from: "vectors-and-strings", to: "vec-get-vs-index" },
    { from: "vectors-and-strings", to: "string-index" },
    { from: "vectors-and-strings", to: "vec-sum-output" },
    { from: "vectors-and-strings", to: "string-concat-output" },
    { from: "vectors-and-strings", to: "vec-build" },
    { from: "vectors-and-strings", to: "vec-push" },
    { from: "vectors-and-strings", to: "vec-total" },
    { from: "vectors-and-strings", to: "string-greet" },
    { from: "vectors-and-strings", to: "dash-join" },
    { from: "hashmaps", to: "hashmap-get-output" },
    { from: "hashmaps", to: "entry-or-insert-output" },
    { from: "hashmaps", to: "word-count" },
    { from: "hashmaps", to: "hashmap-get-or" },
  ],
};
