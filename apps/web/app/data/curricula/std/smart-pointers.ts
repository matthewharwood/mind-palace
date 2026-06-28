import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// std: Box, Rc, Arc, Cell, RefCell, Cow — ownership & interior mutability. Every
// snippet rustc-verified (edition 2024).
export const smartPointers: Curriculum = {
  id: "c-std-smart-pointers",
  title: "Smart Pointers & Shared State",
  source,
  nodes: [
    {
      id: "box-and-rc",
      title: "Box & Rc",
      content: {
        type: "read",
        markdown:
          "`Box<T>` is a single-owner heap allocation — used for recursive types, large values, and `Box<dyn Trait>` (dynamic dispatch). `Rc<T>` is reference-counted **shared ownership** for single-threaded graphs; `Rc::clone` bumps the count (`Rc::strong_count`). Both `Deref` to `T`.",
      },
    },
    {
      id: "cell-refcell",
      title: "Cell & RefCell",
      content: {
        type: "read",
        markdown:
          "These give **interior mutability** — mutating through a shared `&` reference. `Cell<T>` is for `Copy` values (`get`/`set`). `RefCell<T>` hands out `borrow()`/`borrow_mut()` guards and enforces the borrow rules **at runtime** (panicking on violation). Common pairing: `Rc<RefCell<T>>`.",
      },
    },
    {
      id: "arc-cow",
      title: "Arc & Cow",
      content: {
        type: "read",
        markdown:
          "`Arc<T>` is the **atomic**, thread-safe `Rc` — use it to share across threads (often `Arc<Mutex<T>>`). `Cow<'a, B>` (clone-on-write) holds either `Borrowed` or `Owned` data, letting you avoid allocation until a mutation actually needs it.",
      },
    },
    {
      id: "box-deref-output",
      title: "Box deref",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let b = Box::new(10);
    println!("{}", *b * 2);
}`,
        options: ["10", "20", "2"],
        answerIndex: 1,
      },
    },
    {
      id: "rc-count-output",
      title: "Rc::strong_count",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `use std::rc::Rc;

fn main() {
    let a = Rc::new(5);
    let _b = Rc::clone(&a);
    let _c = Rc::clone(&a);
    println!("{}", Rc::strong_count(&a));
}`,
        options: ["1", "2", "3"],
        answerIndex: 2,
      },
    },
    {
      id: "refcell-mutate-output",
      title: "RefCell::borrow_mut",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `use std::cell::RefCell;

fn main() {
    let cell = RefCell::new(5);
    *cell.borrow_mut() += 10;
    println!("{}", cell.borrow());
}`,
        options: ["5", "15", "10"],
        answerIndex: 1,
      },
    },
    {
      id: "cell-get-output",
      title: "Cell::set/get",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `use std::cell::Cell;

fn main() {
    let c = Cell::new(1);
    c.set(c.get() + 41);
    println!("{}", c.get());
}`,
        options: ["1", "41", "42"],
        answerIndex: 2,
      },
    },
    {
      id: "box-purpose-concept",
      title: "Box's role",
      content: {
        type: "multiple-choice",
        question: "What does `Box<T>` provide?",
        options: ["Shared ownership", "Single-owner heap allocation", "Thread-safe sharing"],
        answerIndex: 1,
      },
    },
    {
      id: "rc-vs-arc-concept",
      title: "Rc vs Arc",
      content: {
        type: "multiple-choice",
        question: "When should you reach for `Arc<T>` instead of `Rc<T>`?",
        options: [
          "When you need ordered data",
          "When the value is shared across threads",
          "When you need interior mutability",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "refcell-panic-concept",
      title: "RefCell checking",
      content: {
        type: "multiple-choice",
        question: "When does `RefCell` enforce Rust's borrow rules?",
        options: ["At compile time", "At runtime — it panics on a violation", "Never"],
        answerIndex: 1,
      },
    },
    {
      id: "cow-concept",
      title: "Cow",
      content: {
        type: "multiple-choice",
        question: "What does `Cow<str>` let you do?",
        options: [
          "Always clone the data",
          "Avoid cloning until a mutation requires it",
          "Share data across threads",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "box-it",
      title: "Write: Box a value",
      content: {
        type: "code",
        language: "rust",
        prompt: "Write `fn boxed(n: i32) -> Box<i32>` allocating `n` on the heap.",
        solution: `fn boxed(n: i32) -> Box<i32> {
    Box::new(n)
}`,
      },
    },
    {
      id: "rc-new",
      title: "Write: Rc wrap",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::rc::Rc`, write `fn shared(v: Vec<i32>) -> Rc<Vec<i32>>` wrapping `v` (include the `use`).",
        solution: `use std::rc::Rc;

fn shared(v: Vec<i32>) -> Rc<Vec<i32>> {
    Rc::new(v)
}`,
      },
    },
    {
      id: "box-dyn",
      title: "Write: Box<dyn Trait>",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Define `trait Animal { fn noise(&self) -> String; }`, a `struct Dog` implementing it (`"woof"`), and `fn make() -> Box<dyn Animal>` returning a boxed `Dog`.',
        solution: `trait Animal {
    fn noise(&self) -> String;
}

struct Dog;

impl Animal for Dog {
    fn noise(&self) -> String {
        String::from("woof")
    }
}

fn make() -> Box<dyn Animal> {
    Box::new(Dog)
}`,
      },
    },
    {
      id: "refcell-new",
      title: "Write: a RefCell",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::cell::RefCell`, write `fn cell(n: i32) -> RefCell<i32>` (include the `use`).",
        solution: `use std::cell::RefCell;

fn cell(n: i32) -> RefCell<i32> {
    RefCell::new(n)
}`,
      },
    },
    {
      id: "bump-refcell",
      title: "Write: mutate a RefCell",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::cell::RefCell`, write `fn bump(c: &RefCell<i32>)` incrementing the inner value via `borrow_mut` (include the `use`).",
        solution: `use std::cell::RefCell;

fn bump(c: &RefCell<i32>) {
    *c.borrow_mut() += 1;
}`,
      },
    },
    {
      id: "rc-refcell",
      title: "Write: Rc<RefCell<T>>",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `Rc` and `RefCell`, write `fn shared_mut(n: i32) -> Rc<RefCell<i32>>` wrapping `n` (include both `use`s).",
        solution: `use std::cell::RefCell;
use std::rc::Rc;

fn shared_mut(n: i32) -> Rc<RefCell<i32>> {
    Rc::new(RefCell::new(n))
}`,
      },
    },
    {
      id: "arc-new",
      title: "Write: an Arc",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::sync::Arc`, write `fn shared_atomic(n: i32) -> Arc<i32>` (include the `use`).",
        solution: `use std::sync::Arc;

fn shared_atomic(n: i32) -> Arc<i32> {
    Arc::new(n)
}`,
      },
    },
    {
      id: "cow-fn",
      title: "Write: Cow",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Using `std::borrow::Cow`, write `fn ensure_nonempty(s: &str) -> Cow<str>` returning `Cow::Borrowed(s)` when non-empty, else `Cow::Owned("default".to_string())` (include the `use`).',
        solution: `use std::borrow::Cow;

fn ensure_nonempty(s: &str) -> Cow<str> {
    if s.is_empty() {
        Cow::Owned("default".to_string())
    } else {
        Cow::Borrowed(s)
    }
}`,
      },
    },
  ],
  // Network core: Arc/Cow build on Box/Rc ownership (chord), and `Rc<RefCell<T>>`
  // bridges Rc (box-and-rc) + interior mutability (cell-refcell). Honest, acyclic.
  edges: [
    { from: "box-and-rc", to: "cell-refcell" },
    { from: "cell-refcell", to: "arc-cow" },
    { from: "box-and-rc", to: "arc-cow" }, // Arc is the thread-safe Rc; Cow builds on ownership
    { from: "box-and-rc", to: "rc-refcell" }, // Rc<RefCell<T>> needs Rc + RefCell
    { from: "box-and-rc", to: "box-deref-output" },
    { from: "box-and-rc", to: "rc-count-output" },
    { from: "box-and-rc", to: "box-purpose-concept" },
    { from: "box-and-rc", to: "box-it" },
    { from: "box-and-rc", to: "rc-new" },
    { from: "box-and-rc", to: "box-dyn" },
    { from: "cell-refcell", to: "refcell-mutate-output" },
    { from: "cell-refcell", to: "cell-get-output" },
    { from: "cell-refcell", to: "refcell-panic-concept" },
    { from: "cell-refcell", to: "refcell-new" },
    { from: "cell-refcell", to: "bump-refcell" },
    { from: "cell-refcell", to: "rc-refcell" },
    { from: "arc-cow", to: "rc-vs-arc-concept" },
    { from: "arc-cow", to: "cow-concept" },
    { from: "arc-cow", to: "arc-new" },
    { from: "arc-cow", to: "cow-fn" },
  ],
};
