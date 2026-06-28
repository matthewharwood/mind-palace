import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// Closures, Iterators & Testing. Language semantics; every snippet rustc-verified
// (edition 2024; test snippets compiled with --test).
export const functional: Curriculum = {
  id: "c-rust-functional",
  title: "Closures, Iterators & Testing",
  source,
  nodes: [
    {
      id: "closures",
      title: "Closures",
      content: {
        type: "read",
        markdown:
          "Closures are anonymous functions that can **capture** their environment — by shared ref, mutable ref, or by value (force with `move`). Their traits — `Fn`, `FnMut`, `FnOnce` — reflect how they use captures. Types are usually inferred: `let add = |a, b| a + b;`.",
      },
    },
    {
      id: "iterators",
      title: "Iterators",
      content: {
        type: "read",
        markdown:
          "Iterators produce items one at a time. Adapters (`map`, `filter`, `enumerate`, `zip`) are **lazy** — nothing happens until a *consumer* like `collect`, `sum`, `count`, or `fold` runs them. `iter()` yields `&T`, `iter_mut()` yields `&mut T`, and `into_iter()` on an owned collection yields `T`. They're a zero-cost abstraction.",
      },
    },
    {
      id: "testing",
      title: "Automated Tests",
      content: {
        type: "read",
        markdown:
          "Mark test functions with `#[test]` and check with `assert!`, `assert_eq!`, `assert_ne!`. `cargo test` runs them. Unit tests live in a `#[cfg(test)] mod tests` block (with `use super::*;`); integration tests live in `tests/`. Add `#[should_panic]` for expected panics.",
      },
    },
    {
      id: "closure-capture",
      title: "How closures capture",
      content: {
        type: "multiple-choice",
        question: "How does a closure capture variables from its environment?",
        options: [
          "Always by value",
          "By shared ref, mutable ref, or value — whatever it needs",
          "It cannot capture anything",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "iterator-lazy",
      title: "Laziness",
      content: {
        type: "multiple-choice",
        question: "Iterator adapters like `map` and `filter` are:",
        options: [
          "Eager — they run immediately",
          "Lazy — nothing runs until a consumer is called",
          "Always run on multiple threads",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "collect-purpose",
      title: "collect",
      content: {
        type: "multiple-choice",
        question: "What does `collect()` do?",
        options: [
          "Prints the iterator",
          "Consumes the iterator into a collection (e.g. a Vec)",
          "Reverses the iterator",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "iter-vs-into-iter",
      title: "iter vs into_iter",
      content: {
        type: "multiple-choice",
        question: "`iter()` yields `&T`. Calling `into_iter()` on an owned `Vec<T>` yields:",
        options: ["&T", "T (owned values)", "&mut T"],
        answerIndex: 1,
      },
    },
    {
      id: "closure-output",
      title: "Calling a closure",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let add = |a: i32, b: i32| a + b;
    println!("{}", add(2, 3));
}`,
        options: ["5", "23", "6"],
        answerIndex: 0,
      },
    },
    {
      id: "map-sum-output",
      title: "map + sum",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let total: i32 = (1..=5).map(|x| x * x).sum();
    println!("{total}");
}`,
        options: ["15", "55", "25"],
        answerIndex: 1,
      },
    },
    {
      id: "filter-count-output",
      title: "filter + count",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let count = (1..=10).filter(|n| n % 2 == 0).count();
    println!("{count}");
}`,
        options: ["5", "10", "2"],
        answerIndex: 0,
      },
    },
    {
      id: "enumerate-output",
      title: "enumerate",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let v = vec!['a', 'b', 'c'];
    for (i, c) in v.iter().enumerate() {
        if i == 1 {
            println!("{c}");
        }
    }
}`,
        options: ["a", "b", "c"],
        answerIndex: 1,
      },
    },
    {
      id: "make-adder",
      title: "Write: return a closure",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn make_adder(x: i32) -> impl Fn(i32) -> i32` returning a closure that adds `x` to its argument.",
        solution: `fn make_adder(x: i32) -> impl Fn(i32) -> i32 {
    move |y| x + y
}`,
      },
    },
    {
      id: "apply-twice",
      title: "Write: take a closure",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn apply_twice<F: Fn(i32) -> i32>(f: F, x: i32) -> i32` that returns `f(f(x))`.",
        solution: `fn apply_twice<F: Fn(i32) -> i32>(f: F, x: i32) -> i32 {
    f(f(x))
}`,
      },
    },
    {
      id: "map-double",
      title: "Write: map then collect",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn doubled(v: &[i32]) -> Vec<i32>` returning each element doubled, via `iter().map(...).collect()`.",
        solution: `fn doubled(v: &[i32]) -> Vec<i32> {
    v.iter().map(|x| x * 2).collect()
}`,
      },
    },
    {
      id: "filter-evens",
      title: "Write: filter then collect",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn evens(v: &[i32]) -> Vec<i32>` returning only the even elements, via `iter().filter(...).copied().collect()`.",
        solution: `fn evens(v: &[i32]) -> Vec<i32> {
    v.iter().filter(|&&x| x % 2 == 0).copied().collect()
}`,
      },
    },
    {
      id: "sum-fold",
      title: "Write: fold",
      content: {
        type: "code",
        language: "rust",
        prompt: "Write `fn sum(v: &[i32]) -> i32` that sums the slice using `iter().fold(0, ...)`.",
        solution: `fn sum(v: &[i32]) -> i32 {
    v.iter().fold(0, |acc, x| acc + x)
}`,
      },
    },
    {
      id: "zip-pairs",
      title: "Write: zip two slices",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn pairs(a: &[i32], b: &[i32]) -> Vec<(i32, i32)>` zipping the slices into pairs of owned values.",
        solution: `fn pairs(a: &[i32], b: &[i32]) -> Vec<(i32, i32)> {
    a.iter().zip(b.iter()).map(|(&x, &y)| (x, y)).collect()
}`,
      },
    },
    {
      id: "test-add",
      title: "Write: a unit test",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn add(a: i32, b: i32) -> i32`, then a `#[cfg(test)] mod tests` (with `use super::*;`) containing `#[test] fn adds()` asserting `add(2, 2) == 4` via `assert_eq!`.",
        solution: `fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adds() {
        assert_eq!(add(2, 2), 4);
    }
}`,
      },
    },
  ],
  edges: [
    { from: "closures", to: "iterators" },
    { from: "iterators", to: "testing" },
    { from: "closures", to: "closure-capture" },
    { from: "closures", to: "closure-output" },
    { from: "closures", to: "make-adder" },
    { from: "closures", to: "apply-twice" },
    { from: "iterators", to: "iterator-lazy" },
    { from: "iterators", to: "collect-purpose" },
    { from: "iterators", to: "iter-vs-into-iter" },
    { from: "iterators", to: "map-sum-output" },
    { from: "iterators", to: "filter-count-output" },
    { from: "iterators", to: "enumerate-output" },
    { from: "iterators", to: "map-double" },
    { from: "iterators", to: "filter-evens" },
    { from: "iterators", to: "sum-fold" },
    { from: "iterators", to: "zip-pairs" },
    { from: "testing", to: "test-add" },
  ],
};
