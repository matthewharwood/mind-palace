import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// std: std::thread / std::sync — threads, Arc<Mutex>, RwLock, channels, atomics.
// Every snippet rustc-verified (edition 2024); concurrency outputs read state
// only AFTER joining, so they're deterministic.
export const concurrency: Curriculum = {
  id: "c-std-concurrency",
  title: "Concurrency",
  source,
  nodes: [
    {
      id: "threads",
      title: "Threads",
      content: {
        type: "read",
        markdown:
          "`thread::spawn(closure)` runs work on a new OS thread and returns a `JoinHandle`; `.join()` waits and yields the closure's result. `move` closures take ownership of captures. `thread::scope` allows threads that *borrow* local data, joined before the scope ends.",
      },
    },
    {
      id: "shared-state",
      title: "Arc, Mutex & RwLock",
      content: {
        type: "read",
        markdown:
          "Share ownership across threads with `Arc<T>` (atomic refcount). Wrap mutable shared data in `Mutex<T>` (`lock()` → exclusive guard) or `RwLock<T>` (many readers XOR one writer). The classic combo is `Arc<Mutex<T>>`.",
      },
    },
    {
      id: "channels-sync",
      title: "Channels & Atomics",
      content: {
        type: "read",
        markdown:
          "`std::sync::mpsc::channel()` returns a `(Sender, Receiver)`; `send` from threads, `recv`/iterate on the receiver. Atomics (`AtomicI32`, `AtomicUsize`, …) provide lock-free updates like `fetch_add` with an `Ordering`. `OnceLock`/`LazyLock` give thread-safe one-time init.",
      },
    },
    {
      id: "spawn-join-output",
      title: "spawn / join",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `use std::thread;

fn main() {
    let h = thread::spawn(|| 6 * 7);
    println!("{}", h.join().unwrap());
}`,
        options: ["6", "42", "7"],
        answerIndex: 1,
      },
    },
    {
      id: "arc-mutex-output",
      title: "Arc<Mutex<T>>",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];
    for _ in 0..5 {
        let c = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            *c.lock().unwrap() += 2;
        }));
    }
    for h in handles {
        h.join().unwrap();
    }
    println!("{}", *counter.lock().unwrap());
}`,
        options: ["2", "10", "5"],
        answerIndex: 1,
      },
    },
    {
      id: "channel-output",
      title: "mpsc channel",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();
    thread::spawn(move || {
        for i in 1..=3 {
            tx.send(i).unwrap();
        }
    });
    let sum: i32 = rx.iter().sum();
    println!("{sum}");
}`,
        options: ["3", "6", "0"],
        answerIndex: 1,
      },
    },
    {
      id: "scoped-output",
      title: "thread::scope",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `use std::thread;

fn main() {
    let data = vec![1, 2, 3];
    let sum = thread::scope(|s| {
        let h = s.spawn(|| data.iter().sum::<i32>());
        h.join().unwrap()
    });
    println!("{sum}");
}`,
        options: ["3", "6", "0"],
        answerIndex: 1,
      },
    },
    {
      id: "send-concept",
      title: "Send",
      content: {
        type: "multiple-choice",
        question: "Which marker trait means a value can be *moved* to another thread?",
        options: ["Send", "Sync", "Sized"],
        answerIndex: 0,
      },
    },
    {
      id: "arc-vs-rc-concept",
      title: "Sharing across threads",
      content: {
        type: "multiple-choice",
        question: "To share ownership of data across threads, you use:",
        options: ["Rc", "Arc", "Box"],
        answerIndex: 1,
      },
    },
    {
      id: "mutex-concept",
      title: "Mutex",
      content: {
        type: "multiple-choice",
        question: "What does a `Mutex<T>` provide?",
        options: [
          "Lock-free reads",
          "Exclusive access to the data via lock()",
          "Atomic integer math",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "rwlock-concept",
      title: "RwLock",
      content: {
        type: "multiple-choice",
        question: "What concurrency does `RwLock<T>` allow?",
        options: ["One writer XOR many readers", "Two simultaneous writers", "No readers at all"],
        answerIndex: 0,
      },
    },
    {
      id: "spawn-compute",
      title: "Write: spawn & join",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::thread`, write `fn compute() -> i32` spawning a thread that returns `3 * 3`, joining it, and returning the result (include the `use`).",
        solution: `use std::thread;

fn compute() -> i32 {
    let handle = thread::spawn(|| 3 * 3);
    handle.join().unwrap()
}`,
      },
    },
    {
      id: "parallel-sum",
      title: "Write: thread::scope",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::thread`, write `fn parallel_sum(data: &[i32]) -> i32` using `thread::scope` to spawn one thread that sums the slice (include the `use`).",
        solution: `use std::thread;

fn parallel_sum(data: &[i32]) -> i32 {
    thread::scope(|s| {
        let h = s.spawn(|| data.iter().sum::<i32>());
        h.join().unwrap()
    })
}`,
      },
    },
    {
      id: "spawn-many",
      title: "Write: join many threads",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::thread`, write `fn spawn_sum() -> i32` that spawns 4 threads each returning 10, joins them all, and returns the total (include the `use`).",
        solution: `use std::thread;

fn spawn_sum() -> i32 {
    let handles: Vec<_> = (0..4).map(|_| thread::spawn(|| 10)).collect();
    handles.into_iter().map(|h| h.join().unwrap()).sum()
}`,
      },
    },
    {
      id: "new-counter",
      title: "Write: Arc<Mutex<T>>",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::sync::{Arc, Mutex}`, write `fn counter() -> Arc<Mutex<i32>>` returning `Arc::new(Mutex::new(0))` (include the `use`).",
        solution: `use std::sync::{Arc, Mutex};

fn counter() -> Arc<Mutex<i32>> {
    Arc::new(Mutex::new(0))
}`,
      },
    },
    {
      id: "lock-incr",
      title: "Write: lock & add",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::sync::{Arc, Mutex}`, write `fn add(counter: &Arc<Mutex<i32>>, n: i32)` that adds `n` to the locked value (include the `use`).",
        solution: `use std::sync::{Arc, Mutex};

fn add(counter: &Arc<Mutex<i32>>, n: i32) {
    *counter.lock().unwrap() += n;
}`,
      },
    },
    {
      id: "rwlock-new",
      title: "Write: an RwLock",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::sync::RwLock`, write `fn locked(n: i32) -> RwLock<i32>` (include the `use`).",
        solution: `use std::sync::RwLock;

fn locked(n: i32) -> RwLock<i32> {
    RwLock::new(n)
}`,
      },
    },
    {
      id: "make-channel",
      title: "Write: a channel",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::sync::mpsc`, write `fn channel_pair() -> (mpsc::Sender<i32>, mpsc::Receiver<i32>)` returning a new channel (include the `use`).",
        solution: `use std::sync::mpsc;

fn channel_pair() -> (mpsc::Sender<i32>, mpsc::Receiver<i32>) {
    mpsc::channel()
}`,
      },
    },
    {
      id: "atomic-incr",
      title: "Write: an atomic",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `std::sync::atomic::{AtomicI32, Ordering}`, write `fn bump(a: &AtomicI32)` doing `fetch_add(1, Ordering::SeqCst)` (include the `use`).",
        solution: `use std::sync::atomic::{AtomicI32, Ordering};

fn bump(a: &AtomicI32) {
    a.fetch_add(1, Ordering::SeqCst);
}`,
      },
    },
  ],
  // Network core: channels coordinate threads directly (chord), and `parallel-sum`
  // bridges spawning threads + sharing state (bridge). Honest, acyclic.
  edges: [
    { from: "threads", to: "shared-state" },
    { from: "shared-state", to: "channels-sync" },
    { from: "threads", to: "channels-sync" }, // channels coordinate spawned threads
    { from: "shared-state", to: "parallel-sum" }, // parallel sum spawns threads + shares state
    { from: "threads", to: "spawn-join-output" },
    { from: "threads", to: "scoped-output" },
    { from: "threads", to: "send-concept" },
    { from: "threads", to: "spawn-compute" },
    { from: "threads", to: "parallel-sum" },
    { from: "threads", to: "spawn-many" },
    { from: "shared-state", to: "arc-mutex-output" },
    { from: "shared-state", to: "arc-vs-rc-concept" },
    { from: "shared-state", to: "mutex-concept" },
    { from: "shared-state", to: "rwlock-concept" },
    { from: "shared-state", to: "new-counter" },
    { from: "shared-state", to: "lock-incr" },
    { from: "shared-state", to: "rwlock-new" },
    { from: "channels-sync", to: "channel-output" },
    { from: "channels-sync", to: "make-channel" },
    { from: "channels-sync", to: "atomic-incr" },
  ],
};
