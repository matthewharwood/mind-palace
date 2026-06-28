import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// std: alloc/std collections — Vec, VecDeque, HashMap, HashSet, BTreeMap. Every
// snippet rustc-verified (edition 2024). Output questions avoid HashMap
// iteration order (BTreeMap is ordered → deterministic).
export const collections: Curriculum = {
  id: "c-std-collections",
  title: "Collections",
  source,
  nodes: [
    {
      id: "vec-deep",
      title: "Vec",
      content: {
        type: "read",
        markdown:
          "`Vec<T>` is the growable array: `push`/`pop`, index (`v[i]` panics out of bounds) or `get` (returns `Option`), `iter`, `sort`, `dedup` (removes *consecutive* duplicates), `retain` (keep matching), `with_capacity` (preallocate). `VecDeque<T>` adds efficient `push_front`/`push_back`.",
      },
    },
    {
      id: "maps-and-sets",
      title: "HashMap & HashSet",
      content: {
        type: "read",
        markdown:
          "`HashMap<K, V>`: `insert`, `get` (→ `Option<&V>`), `contains_key`, and the `entry(k).or_insert(v)` update-or-default pattern. `HashSet<T>` stores unique values. Both are unordered — **iteration order is unspecified**.",
      },
    },
    {
      id: "btree-ordered",
      title: "BTreeMap & BTreeSet",
      content: {
        type: "read",
        markdown:
          "`BTreeMap<K, V>` / `BTreeSet<T>` keep entries **sorted by key**, so iteration is ordered and deterministic. Use them when you need range queries or ordered traversal; use the hash versions when you only need fast lookup.",
      },
    },
    {
      id: "vec-push-pop-output",
      title: "push / pop",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let mut v = vec![1, 2, 3];
    v.push(4);
    v.pop();
    v.pop();
    println!("{v:?}");
}`,
        options: ["[1, 2]", "[1, 2, 3]", "[1, 2, 3, 4]"],
        answerIndex: 0,
      },
    },
    {
      id: "vec-sort-output",
      title: "sort",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let mut v = vec![3, 1, 2];
    v.sort();
    println!("{v:?}");
}`,
        options: ["[1, 2, 3]", "[3, 1, 2]", "[3, 2, 1]"],
        answerIndex: 0,
      },
    },
    {
      id: "vec-retain-output",
      title: "retain",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let mut v = vec![1, 2, 3, 4, 5, 6];
    v.retain(|&n| n % 2 == 0);
    println!("{v:?}");
}`,
        options: ["[2, 4, 6]", "[1, 3, 5]", "[1, 2, 3, 4, 5, 6]"],
        answerIndex: 0,
      },
    },
    {
      id: "hashmap-entry-output",
      title: "entry / or_insert",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `use std::collections::HashMap;

fn main() {
    let mut m: HashMap<&str, i32> = HashMap::new();
    *m.entry("a").or_insert(0) += 5;
    *m.entry("a").or_insert(0) += 5;
    println!("{}", m["a"]);
}`,
        options: ["5", "10", "0"],
        answerIndex: 1,
      },
    },
    {
      id: "hashset-dedup-output",
      title: "HashSet uniqueness",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `use std::collections::HashSet;

fn main() {
    let set: HashSet<i32> = [1, 2, 2, 3, 3, 3].into_iter().collect();
    println!("{}", set.len());
}`,
        options: ["3", "6", "1"],
        answerIndex: 0,
      },
    },
    {
      id: "btreemap-order-output",
      title: "BTreeMap ordering",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `use std::collections::BTreeMap;

fn main() {
    let mut m = BTreeMap::new();
    m.insert(3, "c");
    m.insert(1, "a");
    m.insert(2, "b");
    let keys: Vec<i32> = m.keys().copied().collect();
    println!("{keys:?}");
}`,
        options: ["[1, 2, 3]", "[3, 1, 2]", "[3, 2, 1]"],
        answerIndex: 0,
      },
    },
    {
      id: "hashmap-order-concept",
      title: "HashMap iteration order",
      content: {
        type: "multiple-choice",
        question: "The iteration order of a `HashMap` is:",
        options: ["Sorted by key", "Insertion order", "Unspecified"],
        answerIndex: 2,
      },
    },
    {
      id: "with-capacity-concept",
      title: "with_capacity",
      content: {
        type: "multiple-choice",
        question: "What does `Vec::with_capacity(n)` do?",
        options: [
          "Creates a Vec already holding n elements",
          "Preallocates room for n elements without adding any",
          "Caps the length at n",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "build-vec",
      title: "Write: build a Vec",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn squares(n: i32) -> Vec<i32>` returning the squares of `1..=n` via `map` + `collect`.",
        solution: `fn squares(n: i32) -> Vec<i32> {
    (1..=n).map(|x| x * x).collect()
}`,
      },
    },
    {
      id: "dedup-sorted",
      title: "Write: sort + dedup",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn unique_sorted(mut v: Vec<i32>) -> Vec<i32>` that sorts then removes duplicates with `sort` and `dedup`.",
        solution: `fn unique_sorted(mut v: Vec<i32>) -> Vec<i32> {
    v.sort();
    v.dedup();
    v
}`,
      },
    },
    {
      id: "max-in-vec",
      title: "Write: max",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn max(v: &[i32]) -> Option<i32>` returning the largest element via `iter().max().copied()`.",
        solution: `fn max(v: &[i32]) -> Option<i32> {
    v.iter().max().copied()
}`,
      },
    },
    {
      id: "vecdeque",
      title: "Write: a VecDeque",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::collections::VecDeque`, write `fn make_queue() -> VecDeque<i32>` that pushes 1 then 2 to the back and returns it (include the `use`).",
        solution: `use std::collections::VecDeque;

fn make_queue() -> VecDeque<i32> {
    let mut q = VecDeque::new();
    q.push_back(1);
    q.push_back(2);
    q
}`,
      },
    },
    {
      id: "frequencies",
      title: "Write: frequency map",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::collections::HashMap`, write `fn frequencies<'a>(items: &[&'a str]) -> HashMap<&'a str, i32>` counting occurrences (include the `use`).",
        solution: `use std::collections::HashMap;

fn frequencies<'a>(items: &[&'a str]) -> HashMap<&'a str, i32> {
    let mut counts = HashMap::new();
    for &item in items {
        *counts.entry(item).or_insert(0) += 1;
    }
    counts
}`,
      },
    },
    {
      id: "set-from-vec",
      title: "Write: dedup via HashSet",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::collections::HashSet`, write `fn unique(v: Vec<i32>) -> HashSet<i32>` collecting the values (include the `use`).",
        solution: `use std::collections::HashSet;

fn unique(v: Vec<i32>) -> HashSet<i32> {
    v.into_iter().collect()
}`,
      },
    },
    {
      id: "sum-values",
      title: "Write: sum map values",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::collections::HashMap`, write `fn sum_values(m: &HashMap<String, i32>) -> i32` returning the sum of all values via `values().sum()` (include the `use`).",
        solution: `use std::collections::HashMap;

fn sum_values(m: &HashMap<String, i32>) -> i32 {
    m.values().sum()
}`,
      },
    },
    {
      id: "btree-insert",
      title: "Write: a BTreeMap",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::collections::BTreeMap`, write `fn ordered() -> BTreeMap<i32, i32>` inserting `(2, 20)` then `(1, 10)` and returning it (include the `use`).",
        solution: `use std::collections::BTreeMap;

fn ordered() -> BTreeMap<i32, i32> {
    let mut m = BTreeMap::new();
    m.insert(2, 20);
    m.insert(1, 10);
    m
}`,
      },
    },
  ],
  // Network core: ordered BTree collections build on Vec fundamentals (chord),
  // and `set-from-vec` bridges Vec + sets. Honest, acyclic.
  edges: [
    { from: "vec-deep", to: "maps-and-sets" },
    { from: "maps-and-sets", to: "btree-ordered" },
    { from: "vec-deep", to: "btree-ordered" }, // BTree collections build on Vec basics
    { from: "vec-deep", to: "set-from-vec" }, // building a HashSet from a Vec needs both
    { from: "vec-deep", to: "vec-push-pop-output" },
    { from: "vec-deep", to: "vec-sort-output" },
    { from: "vec-deep", to: "vec-retain-output" },
    { from: "vec-deep", to: "with-capacity-concept" },
    { from: "vec-deep", to: "build-vec" },
    { from: "vec-deep", to: "dedup-sorted" },
    { from: "vec-deep", to: "max-in-vec" },
    { from: "vec-deep", to: "vecdeque" },
    { from: "maps-and-sets", to: "hashmap-entry-output" },
    { from: "maps-and-sets", to: "hashset-dedup-output" },
    { from: "maps-and-sets", to: "hashmap-order-concept" },
    { from: "maps-and-sets", to: "frequencies" },
    { from: "maps-and-sets", to: "set-from-vec" },
    { from: "maps-and-sets", to: "sum-values" },
    { from: "btree-ordered", to: "btreemap-order-output" },
    { from: "btree-ordered", to: "btree-insert" },
  ],
};
