import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// std: core::iter — the Iterator trait, adapters, and consumers. Every snippet
// rustc-verified (edition 2024).
export const iterators: Curriculum = {
  id: "c-std-iterators",
  title: "Iterators",
  source,
  nodes: [
    {
      id: "iterator-trait",
      title: "The Iterator trait",
      content: {
        type: "read",
        markdown:
          "An `Iterator` yields items via `next() -> Option<Item>`. `for` loops desugar to it via `IntoIterator`: `iter()` borrows (`&T`), `iter_mut()` (`&mut T`), `into_iter()` consumes (`T`). Adapters are **lazy** and chainable; nothing runs until a consumer drives them.",
      },
    },
    {
      id: "adapters",
      title: "Adapters",
      content: {
        type: "read",
        markdown:
          "Lazy transformers that return new iterators: `map`, `filter`, `filter_map`, `enumerate`, `zip`, `chain`, `rev`, `take`, `skip`, `take_while`, `skip_while`, `flat_map`/`flatten`, `step_by`, `peekable`, `scan`, `cloned`/`copied`.",
      },
    },
    {
      id: "consumers",
      title: "Consumers",
      content: {
        type: "read",
        markdown:
          "Terminal operations that drive the chain: `collect`, `sum`, `product`, `count`, `fold`, `for_each`, `any`/`all`, `find`/`position`, `max`/`min`, `last`, `nth`, `partition`, `unzip`. These consume the iterator and produce a value or collection.",
      },
    },
    {
      id: "lazy-concept",
      title: "Laziness",
      content: {
        type: "multiple-choice",
        question: "Iterator adapters are lazy. That means:",
        options: [
          "They run on multiple threads",
          "No work happens until a consumer is called",
          "They cache every result",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "map-filter-sum-output",
      title: "filter + map + sum",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let total: i32 = (1..=10).filter(|n| n % 2 == 0).map(|n| n * n).sum();
    println!("{total}");
}`,
        options: ["220", "30", "100"],
        answerIndex: 0,
      },
    },
    {
      id: "fold-output",
      title: "fold",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let product = (1..=4).fold(1, |acc, x| acc * x);
    println!("{product}");
}`,
        options: ["10", "24", "12"],
        answerIndex: 1,
      },
    },
    {
      id: "zip-output",
      title: "zip",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let a = [1, 2, 3];
    let b = [10, 20, 30];
    let sum: i32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    println!("{sum}");
}`,
        options: ["140", "6", "60"],
        answerIndex: 0,
      },
    },
    {
      id: "find-output",
      title: "find",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let v = vec![1, 3, 5, 8, 9];
    let first_even = v.iter().find(|&&n| n % 2 == 0);
    println!("{first_even:?}");
}`,
        options: ["Some(8)", "Some(1)", "None"],
        answerIndex: 0,
      },
    },
    {
      id: "flat-map-output",
      title: "flat_map",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let words = ["ab", "cd"];
    let chars: String = words.iter().flat_map(|s| s.chars()).collect();
    println!("{chars}");
}`,
        options: ["abcd", "ab cd", "ac bd"],
        answerIndex: 0,
      },
    },
    {
      id: "take-skip-output",
      title: "skip + take",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let v: Vec<i32> = (1..=10).skip(2).take(3).collect();
    println!("{v:?}");
}`,
        options: ["[3, 4, 5]", "[1, 2, 3]", "[2, 3, 4]"],
        answerIndex: 0,
      },
    },
    {
      id: "all-output",
      title: "all",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let v = vec![2, 4, 6];
    println!("{}", v.iter().all(|n| n % 2 == 0));
}`,
        options: ["true", "false", "3"],
        answerIndex: 0,
      },
    },
    {
      id: "position-output",
      title: "position",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let v = vec!['x', 'y', 'z'];
    println!("{:?}", v.iter().position(|&c| c == 'y'));
}`,
        options: ["Some(1)", "Some(2)", "None"],
        answerIndex: 0,
      },
    },
    {
      id: "sum-evens",
      title: "Write: filter + sum",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn sum_evens(v: &[i32]) -> i32` summing the even elements (`filter` + `sum`).",
        solution: `fn sum_evens(v: &[i32]) -> i32 {
    v.iter().filter(|&&n| n % 2 == 0).sum()
}`,
      },
    },
    {
      id: "doubles",
      title: "Write: map + collect",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn doubles(v: &[i32]) -> Vec<i32>` doubling each element (`map` + `collect`).",
        solution: `fn doubles(v: &[i32]) -> Vec<i32> {
    v.iter().map(|n| n * 2).collect()
}`,
      },
    },
    {
      id: "count-matching",
      title: "Write: filter + count",
      content: {
        type: "code",
        language: "rust",
        prompt: "Write `fn count_positive(v: &[i32]) -> usize` counting elements greater than 0.",
        solution: `fn count_positive(v: &[i32]) -> usize {
    v.iter().filter(|&&n| n > 0).count()
}`,
      },
    },
    {
      id: "product-fn",
      title: "Write: product",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn product(v: &[i32]) -> i32` returning the product of all elements via `iter().product()`.",
        solution: `fn product(v: &[i32]) -> i32 {
    v.iter().product()
}`,
      },
    },
    {
      id: "min-max",
      title: "Write: min & max",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn range(v: &[i32]) -> Option<(i32, i32)>` returning `(min, max)` via `iter().min()`/`max()` (use `?`; `None` if empty).",
        solution: `fn range(v: &[i32]) -> Option<(i32, i32)> {
    let min = v.iter().min()?;
    let max = v.iter().max()?;
    Some((*min, *max))
}`,
      },
    },
    {
      id: "partition-fn",
      title: "Write: partition",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn split_parity(v: Vec<i32>) -> (Vec<i32>, Vec<i32>)` partitioning into `(evens, odds)` via `partition`.",
        solution: `fn split_parity(v: Vec<i32>) -> (Vec<i32>, Vec<i32>) {
    v.into_iter().partition(|&n| n % 2 == 0)
}`,
      },
    },
    {
      id: "enumerate-pairs",
      title: "Write: enumerate",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn indexed(v: &[char]) -> Vec<(usize, char)>` pairing each char with its index via `enumerate`.",
        solution: `fn indexed(v: &[char]) -> Vec<(usize, char)> {
    v.iter().enumerate().map(|(i, &c)| (i, c)).collect()
}`,
      },
    },
    {
      id: "chain-fn",
      title: "Write: chain",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn concat(a: &[i32], b: &[i32]) -> Vec<i32>` chaining the slices via `chain` (`copied`).",
        solution: `fn concat(a: &[i32], b: &[i32]) -> Vec<i32> {
    a.iter().chain(b.iter()).copied().collect()
}`,
      },
    },
  ],
  // Network core: consumers are methods on the Iterator trait itself (chord),
  // and `map-filter-sum` chains adapters INTO a consumer (bridge). Honest, acyclic.
  edges: [
    { from: "iterator-trait", to: "adapters" },
    { from: "adapters", to: "consumers" },
    { from: "iterator-trait", to: "consumers" }, // consumers are Iterator-trait methods
    { from: "consumers", to: "map-filter-sum-output" }, // adapters then a `sum` consumer
    { from: "iterator-trait", to: "lazy-concept" },
    { from: "adapters", to: "map-filter-sum-output" },
    { from: "adapters", to: "zip-output" },
    { from: "adapters", to: "flat-map-output" },
    { from: "adapters", to: "take-skip-output" },
    { from: "adapters", to: "find-output" },
    { from: "adapters", to: "position-output" },
    { from: "adapters", to: "doubles" },
    { from: "adapters", to: "enumerate-pairs" },
    { from: "adapters", to: "chain-fn" },
    { from: "adapters", to: "count-matching" },
    { from: "consumers", to: "fold-output" },
    { from: "consumers", to: "all-output" },
    { from: "consumers", to: "sum-evens" },
    { from: "consumers", to: "min-max" },
    { from: "consumers", to: "product-fn" },
    { from: "consumers", to: "partition-fn" },
  ],
};
