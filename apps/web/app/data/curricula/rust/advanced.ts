import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// Smart pointers, fearless concurrency, trait objects & async. Language semantics;
// every snippet rustc-verified (edition 2024). Concurrency output questions read
// state only AFTER joining all threads, so results are deterministic.
export const advanced: Curriculum = {
  id: "c-rust-advanced",
  title: "Smart Pointers, Concurrency & Beyond",
  source,
  nodes: [
    {
      id: "smart-pointers",
      title: "Smart Pointers",
      content: {
        type: "read",
        markdown:
          "`Box<T>` owns a value on the heap (single owner). `Rc<T>` allows **multiple owners** of the same data (single-threaded, reference-counted). `RefCell<T>` gives **interior mutability** with borrow rules enforced at *runtime*. Smart pointers implement `Deref` (so `*` works) and `Drop` (cleanup).",
      },
    },
    {
      id: "concurrency",
      title: "Fearless Concurrency",
      content: {
        type: "read",
        markdown:
          "`thread::spawn` starts a thread; `handle.join()` waits for it. Share data with `Arc<T>` (atomic, thread-safe `Rc`) plus `Mutex<T>` for mutation. Or pass messages with channels (`mpsc`). The `Send`/`Sync` marker traits let the compiler reject data races at compile time.",
      },
    },
    {
      id: "trait-objects-async",
      title: "Trait Objects & Async",
      content: {
        type: "read",
        markdown:
          "`dyn Trait` (usually behind `Box<dyn Trait>` or `&dyn Trait`) gives **dynamic dispatch** through a vtable — useful for heterogeneous collections. `async fn` returns a `Future` that does nothing until `.await`ed on an executor; it enables concurrency without dedicating an OS thread per task.",
      },
    },
    {
      id: "box-purpose",
      title: "Box",
      content: {
        type: "multiple-choice",
        question: "What is `Box<T>` for?",
        options: [
          "Sharing ownership among many owners",
          "Storing a single-owner value on the heap",
          "Mutating through shared references",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "rc-purpose",
      title: "Rc",
      content: {
        type: "multiple-choice",
        question: "What does `Rc<T>` enable?",
        options: [
          "Multiple owners of the same data (single-threaded)",
          "Interior mutation",
          "Thread-safe sharing across threads",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "refcell-purpose",
      title: "RefCell",
      content: {
        type: "multiple-choice",
        question: "What does `RefCell<T>` provide?",
        options: [
          "Compile-time-only borrow checking",
          "Interior mutability with borrow rules checked at runtime",
          "Heap allocation and nothing else",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "send-trait",
      title: "Send",
      content: {
        type: "multiple-choice",
        question: "Which marker trait means a value can be transferred to another thread?",
        options: ["Send", "Sync", "Sized"],
        answerIndex: 0,
      },
    },
    {
      id: "dyn-trait",
      title: "Dynamic dispatch",
      content: {
        type: "multiple-choice",
        question: "`Box<dyn Trait>` dispatches method calls using:",
        options: [
          "Static dispatch (monomorphization)",
          "Dynamic dispatch via a vtable",
          "No dispatch at all",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "box-deref-output",
      title: "Dereferencing a Box",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let b = Box::new(5);
    println!("{}", *b + 1);
}`,
        options: ["5", "6", "compile error"],
        answerIndex: 1,
      },
    },
    {
      id: "thread-join-output",
      title: "Spawning a thread",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `use std::thread;

fn main() {
    let handle = thread::spawn(|| 21 * 2);
    let result = handle.join().unwrap();
    println!("{result}");
}`,
        options: ["21", "42", "compile error"],
        answerIndex: 1,
      },
    },
    {
      id: "arc-mutex-output",
      title: "Arc + Mutex",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];
    for _ in 0..10 {
        let c = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            *c.lock().unwrap() += 1;
        }));
    }
    for h in handles {
        h.join().unwrap();
    }
    println!("{}", *counter.lock().unwrap());
}`,
        options: ["1", "10", "0"],
        answerIndex: 1,
      },
    },
    {
      id: "box-value",
      title: "Write: box a value",
      content: {
        type: "code",
        language: "rust",
        prompt: "Write `fn boxed(n: i32) -> Box<i32>` that stores `n` on the heap.",
        solution: `fn boxed(n: i32) -> Box<i32> {
    Box::new(n)
}`,
      },
    },
    {
      id: "rc-clone",
      title: "Write: shared ownership",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::rc::Rc`, write `fn shared() -> Rc<i32>` that makes `Rc::new(5)` and returns a clone of it (include the `use`).",
        solution: `use std::rc::Rc;

fn shared() -> Rc<i32> {
    let value = Rc::new(5);
    Rc::clone(&value)
}`,
      },
    },
    {
      id: "refcell-mutate",
      title: "Write: interior mutability",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::cell::RefCell`, write `fn bump(cell: &RefCell<i32>)` that adds 1 to the inner value via `borrow_mut` (include the `use`).",
        solution: `use std::cell::RefCell;

fn bump(cell: &RefCell<i32>) {
    *cell.borrow_mut() += 1;
}`,
      },
    },
    {
      id: "box-dyn-trait",
      title: "Write: a trait object",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Define a trait `Speak { fn say(&self) -> String; }`, a `struct Cat` implementing it to return `"meow"`, and `fn make() -> Box<dyn Speak>` returning a boxed `Cat`.',
        solution: `trait Speak {
    fn say(&self) -> String;
}

struct Cat;

impl Speak for Cat {
    fn say(&self) -> String {
        String::from("meow")
    }
}

fn make() -> Box<dyn Speak> {
    Box::new(Cat)
}`,
      },
    },
    {
      id: "spawn-join",
      title: "Write: spawn & join",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::thread`, write `fn compute() -> i32` that spawns a thread returning `2 + 2`, joins it, and returns the result (include the `use`).",
        solution: `use std::thread;

fn compute() -> i32 {
    let handle = thread::spawn(|| 2 + 2);
    handle.join().unwrap()
}`,
      },
    },
    {
      id: "channel-send",
      title: "Write: a channel",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::sync::mpsc` and `std::thread`, write `fn one_message() -> i32` that sends `42` from a spawned thread and returns the received value (include the `use`s).",
        solution: `use std::sync::mpsc;
use std::thread;

fn one_message() -> i32 {
    let (tx, rx) = mpsc::channel();
    thread::spawn(move || {
        tx.send(42).unwrap();
    });
    rx.recv().unwrap()
}`,
      },
    },
    {
      id: "arc-mutex-fn",
      title: "Write: a shared counter",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::sync::{Arc, Mutex}`, write `fn new_counter() -> Arc<Mutex<i32>>` returning `Arc::new(Mutex::new(0))` (include the `use`).",
        solution: `use std::sync::{Arc, Mutex};

fn new_counter() -> Arc<Mutex<i32>> {
    Arc::new(Mutex::new(0))
}`,
      },
    },
    {
      id: "async-double",
      title: "Write: an async function",
      content: {
        type: "code",
        language: "rust",
        prompt: "Write an `async fn double(n: i32) -> i32` that returns `n * 2`.",
        solution: `async fn double(n: i32) -> i32 {
    n * 2
}`,
      },
    },
  ],
  edges: [
    { from: "smart-pointers", to: "concurrency" },
    { from: "concurrency", to: "trait-objects-async" },
    { from: "smart-pointers", to: "box-purpose" },
    { from: "smart-pointers", to: "rc-purpose" },
    { from: "smart-pointers", to: "refcell-purpose" },
    { from: "smart-pointers", to: "box-deref-output" },
    { from: "smart-pointers", to: "box-value" },
    { from: "smart-pointers", to: "rc-clone" },
    { from: "smart-pointers", to: "refcell-mutate" },
    { from: "concurrency", to: "send-trait" },
    { from: "concurrency", to: "thread-join-output" },
    { from: "concurrency", to: "arc-mutex-output" },
    { from: "concurrency", to: "spawn-join" },
    { from: "concurrency", to: "channel-send" },
    { from: "concurrency", to: "arc-mutex-fn" },
    { from: "trait-objects-async", to: "dyn-trait" },
    { from: "trait-objects-async", to: "box-dyn-trait" },
    { from: "trait-objects-async", to: "async-double" },
  ],
};
