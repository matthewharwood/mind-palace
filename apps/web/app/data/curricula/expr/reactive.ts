import type { Curriculum } from "@mind-palace/curriculum";

import { leptosSource } from "./_sources";

// Control Flow & Reactivity — designing the machinery under the call-sites you
// already drive from the other side. Two halves: control flow reified as a
// value (ControlFlow<B, C> as a return type, try_fold as the one short-circuit
// engine, the lazy-adapter dialect), and fine-grained reactivity rebuilt from
// parts you know (a Copy handle into a hidden arena, an owner tree that decides
// lifetimes at runtime, a thread-local that turns reading into subscribing,
// effects scheduled off the graph). leptos itself is not in the card verifier,
// so its real code appears only in prose and question text; every drill is pure
// std Rust, rustc-verified by scripts/verify-rust-cards.ts.
export const exprReactive: Curriculum = {
  id: "c-expr-reactive",
  title: "Control Flow & Reactivity",
  source: leptosSource,
  nodes: [
    {
      id: "reactive-map",
      title: "Control Flow & Reactivity: The Map",
      content: {
        type: "read",
        markdown:
          "You already USE all of this from the other side. You write `let x = thing?;` and errors thread themselves. You call `.filter().map().collect()` and a pipeline appears. You read `count.get()` in a leptos view and the DOM updates. The mechanics of `?`, of consuming an iterator, of async/await, and of `Rc`/`RefCell` are ==cold prerequisites== here — this curriculum never re-explains them. It flips you to the side that DESIGNS the control flow those call-sites ride.\n\n## Two halves\n- **Control flow as a value.** `?` is not the only way to short-circuit. This half builds the vocabulary underneath it: `ControlFlow<B, C>` as a return type, `try_fold` as the one engine every early-exit consumer shares, and the lazy-adapter dialect that lets you ship iterator verbs of your own.\n- **Reactivity as a graph.** leptos makes UI state a `Copy` handle you sprinkle anywhere with no lifetimes. This half rebuilds that machine from parts you know: an arena of values behind integer handles, an owner tree that decides lifetimes at runtime, a thread-local that turns reading into subscribing, and effects scheduled off the resulting graph.\n\n## The lens, always\nEvery card runs the triple. ==SHAPE==: the call-site a designer wanted. ==MACHINERY==: the types and tricks that make it legal. ==TRADE-OFF==: what the aesthetic buys and what it costs — because `ControlFlow`, arena handles, and implicit tracking each bill you in a specific currency, and the authors knew it when they shipped.\n\n## Sandbox note\nleptos is not in the card verifier, so its real code lives only in prose and question text. Every drill you type is ==pure `std` Rust== — a `ControlFlow` fold, a lazy adapter, a generational arena, a `Copy` signal handle — recreations that compile with bare `rustc` and teach the exact same shapes.",
      },
    },
    {
      id: "controlflow-shape",
      title: "ControlFlow: Short-Circuit as a Value",
      content: {
        type: "read",
        markdown:
          '## The shape\nA function hands back not just an answer but *where it stopped and why*: `fn visit(&self, node: &Node) -> ControlFlow<Found>`. The caller reads the return value to learn whether the walk ran to completion or bailed early with a payload — and the bail value is an ordinary answer, not an error. Graph and AST visitors (`petgraph`, `syn::visit`) speak exactly this.\n\n## The machinery\n`std::ops::ControlFlow<B, C>` is a two-variant vocabulary: `Continue(C)` carries the running state, `Break(B)` carries the early-exit payload. Both are full type parameters — `C` defaults to `()`. The load-bearing move: `ControlFlow` implements the `Try` trait (`core::ops::try_trait`), the *same* trait `Result` and `Option` implement, so the `?` you already use threads a `Break` outward exactly like an `Err`. You are not learning `?` here; you are learning to reach for the type that ==already participates in it== when you design a short-circuiting API.\n\nWhy a third short-circuit type when `Result` exists? Because `Break` is not failure. `Iterator::try_for_each`, `Iterator::try_fold`, and `RangeInclusive`\'s internals all return `ControlFlow` so that "I found it, stop" reads as success, not error. The direction is explicit in the names, and the payload type is yours to choose.\n\n## The trade-off\nBuys: a short-circuit that says "stop with this answer" without borrowing `Result`\'s failure connotation, and a type that rides `?` and the `Try` machinery for free. Costs: a ==second early-exit vocabulary== alongside `Result`/`Option` that readers must recognize; `Break`/`Continue` reads backwards to eyes trained on `Ok`/`Err`; and the `Try` trait it leans on is still unstable to *implement* by hand, so on stable you compose with `ControlFlow` rather than mint your own short-circuit type.',
      },
    },
    {
      id: "try-fold-engine",
      title: "try_fold: The Short-Circuit Engine",
      content: {
        type: "read",
        markdown:
          "## The shape\nOne method powers every short-circuiting consumer on `Iterator`. `all`, `any`, `find`, `position`, `try_for_each` — none of them re-implement the early-exit loop. They all funnel through `try_fold`, and so can you: `xs.iter().try_fold(acc, |acc, x| ...)` stops the instant the closure returns a `Break`/`Err`/`None`.\n\n## The machinery\n`Iterator::try_fold<B, F, R>` folds like `fold`, but the closure returns `R: Try<Output = B>` instead of a bare `B`. Any `Try` type works — `ControlFlow<_, B>`, `Result<B, E>`, `Option<B>` — and the first residual (a `Break`, `Err`, or `None`) ==ends the iteration and propagates out== without touching the remaining elements. `find` is essentially `try_fold((), |(), x| if pred(x) { Break(x) } else { Continue(()) })`; that is the whole trick.\n\nThe author-side reason it exists: when you write a custom iterator, the *provided* `try_fold` works via repeated `next()`, but nested adapters can short-circuit far faster by ==overriding `try_fold` to push the loop into the inner iterator==. std does exactly this — `Chain::try_fold` runs each half's own `try_fold` — which is why a `filter().map()` tower collapses into one tight loop instead of a stack of `next()` calls.\n\n## The trade-off\nBuys: a single engine expresses every early-exit consumer, and overriding it makes deep adapter stacks short-circuit at full speed. Costs: the `R: Try<Output = B>` signature is genuinely advanced, its type errors are among the worst in std, and it is the most powerful `Iterator` method that most Rust programmers never learn exists.",
      },
    },
    {
      id: "lazy-adapter-dialect",
      title: "Iterators as Control Flow",
      content: {
        type: "read",
        markdown:
          '## The shape\nYou already CALL `filter`, `map`, and `collect`. This is the other side: shipping adapter verbs of *your own* that chain the same way. `events.until(|e| e.is_close()).map_each(decode)` reads like `Iterator`\'s native vocabulary, but `until` is a verb you authored, retrofitted onto every iterator in the language by one `use`.\n\n## The machinery\nAn adapter is a ==wrapper struct that holds the upstream iterator plus its config==: `struct Until<I, P> { inner: I, stop: P, done: bool }`. Its `Iterator` impl pulls from `inner` inside `next` and applies the logic — nothing runs until a consumer drives it, so the pipeline stays ==lazy==. The verb itself lives on an ==extension trait== (the RFC 445 pattern you met as `ServiceExt` in the traits curriculum): a `trait UntilExt: Iterator` with a default-body `until(self, ...)` constructor, plus one blanket `impl<I: Iterator> UntilExt for I {}` that lights the vocabulary up on `Vec`, `Range`, `Chars`, everything.\n\nThis is `Itertools` and `rayon`\'s `par_iter` in miniature: a mirrored register of adapters delivered by extension trait. And it is genuinely zero-cost — ==monomorphization inlines the whole `Until<Map<Filter<...>>>` tower into a single loop== (Turon\'s "abstraction without overhead"), so your dialect compiles to the same code a hand-written `while` would.\n\n## The trade-off\nBuys: a composable, lazy, zero-cost vocabulary that reads like the standard library and works on every iterator. Costs: the types accrete into towers — `Map<Until<Enumerate<Iter>>, F>` in every error message and `-> impl Iterator` return; compile time grows with each adapter; and the verbs are ==import-gated== — "where did `.until` come from?" is the standing tax of every extension trait.',
      },
    },
    {
      id: "signal-arena-handles",
      title: "Signals: Copy Handles into an Arena",
      content: {
        type: "read",
        markdown:
          "## The shape\n`let count = RwSignal::new(0);` then, three closures deep, `move || count.get() * 2` — no `clone`, no lifetime, no `Arc` dance. A leptos signal is `Copy`: you scatter it across event handlers and derived views as freely as an integer, and it stays `'static`.\n\n## The machinery\nThe handle is not the value. `reactive_graph::signal::RwSignal<T>` is an `ArenaItem` — a `NodeId` plus `PhantomData<T>`, i.e. a plain integer index. The actual value lives in a process-global `SlotMap<NodeId, Box<dyn Any + Send + Sync>>` owned by the reactive runtime (`reactive_graph::owner::arena`). `count.get()` means \"look up my `NodeId` in the arena, downcast, read.\" Because the handle is only an id, `Copy` is trivially sound and there is nothing to borrow.\n\nYou know `Rc<RefCell<T>>` cold; this is that idea ==promoted to a protocol==. Instead of every component threading owned smart pointers and their lifetimes, the runtime centralizes ownership in one arena and hands out cheap copyable tickets. State becomes location-independent: the same `NodeId` means the same value from anywhere, which is what makes fine-grained reactivity ergonomic enough to actually use.\n\n## The trade-off\nBuys: `Copy`, `'static`, lifetime-free UI state — the single ergonomic win the whole leptos call-site aesthetic rests on. Costs: the borrow checker is now OFF this data. A handle to a disposed value is not a compile error but a ==runtime `None`/panic==; every access pays a map lookup plus a downcast; and the `Send`/`Sync` arena forces a storage-policy escape hatch (`LocalStorage`) for `!Send` values.",
      },
    },
    {
      id: "owner-tree",
      title: "The Owner Tree, Not Lifetimes",
      content: {
        type: "read",
        markdown:
          "## The shape\nInside a component you write `let count = RwSignal::new(0);` and never annotate a lifetime, never call a destructor — yet when that component leaves the screen, its signals, memos, and effects are all cleaned up. `'static` state that still dies on schedule.\n\n## The machinery\nA parallel structure decides lifetimes the borrow checker no longer can: the ==owner tree==. `reactive_graph::owner::Owner` wraps an `OwnerInner { parent, nodes, cleanups, children }`. Creating any reactive node registers its arena `NodeId` in the *current* owner's `nodes` list; rendering a child component pushes a child owner. When an owner drops, its `Drop` impl walks `nodes` and ==frees exactly those arena slots==, runs registered `cleanups`, and drops child owners recursively.\n\nSo lifetime is by ==tree position, resolved at runtime==, not by lexical scope resolved at compile time. This is the deliberate opposite pole of the lifetime-full designs from the ownership curriculum — where io-uring removes borrows by taking *owned* buffers, leptos removes borrows by moving ownership into a runtime-managed arena keyed by the owner tree. Both erase lifetimes from the signature; they just relocate the bookkeeping to opposite ends.\n\n## The trade-off\nBuys: zero lifetime annotations in UI code, and automatic, scoped, RAII-style cleanup at component granularity. Costs: the cleanup is ==runtime bookkeeping==, not a compile-time guarantee; a handle used after its owner drops resolves to `None` (use-after-dispose becomes a live bug class); and \"which owner owns this?\" is a new question with no compiler to answer it.",
      },
    },
    {
      id: "subscription-tracking",
      title: "Reading Is Subscribing",
      content: {
        type: "read",
        markdown:
          '## The shape\n`Memo::new(move |_| format!("{} {}", first.get(), last.get()))` — and it recomputes whenever `first` OR `last` changes, with ==no dependency array==. Reading a signal inside a reactive closure is *itself* the act of subscribing. Add a `.get()`, gain a dependency; guard it behind a branch that does not run, lose it.\n\n## The machinery\nA ==thread-local "current observer"== does it. When an effect or memo runs its closure, the runtime installs that node as the current observer for the duration. Every `.get()` bottoms out in the `Track` primitive (the base of the verb lattice you built in the traits curriculum), and `Track` reads the thread-local and ==registers the current observer as a subscriber== of the signal. When the closure returns, the observer is popped. Dependencies are therefore *dynamic and exact*: only the signals actually read on this run are subscribed, so a `.get()` skipped by an `if` unsubscribes automatically next run.\n\nThe escape hatches confirm the model: `get_untracked` reads without touching the thread-local, and `Effect::watch` takes an explicit dependency closure for when you want manual control (`reactive_graph::effect`). The whole mechanism is the `Track`/`Notify` primitive pair from `reactive_graph::traits` wired through one thread-local.\n\n## The trade-off\nBuys: the ==stale-deps bug class simply cannot occur== — there is no hand-maintained list to fall out of sync, and precision is per-run. Costs: control flow via a hidden thread-local is spooky ("who subscribed me, and when?"); the subscription is invisible in the type; and the one-character cliff between `{count.get()}` (read once) and `{move || count.get()}` (reactive forever) is real and unguarded.',
      },
    },
    {
      id: "effect-scheduling",
      title: "Effects: Scheduling Reactive Work",
      content: {
        type: "read",
        markdown:
          '## The shape\n`Effect::new(move |_| log(count.get()))` runs after render and re-runs when `count` changes. `Memo::new(|prev| expensive(prev))` is a cached derived signal that recomputes only when its inputs change AND notifies downstream only when its *output* actually differs. Both are closures of the form `Fn(Option<&T>) -> T` — reactive computations shaped as ==folds over time==.\n\n## The machinery\nEffects and memos are nodes in the same graph as signals. When a signal is set, the `Notify` primitive marks every subscriber ==dirty== and schedules it; effects flush after the current render, memos recompute lazily on next read. The `prev` parameter is the previous output threaded back in, which is why cancellation, diffing, and cleanup "fall out of the fold shape" — an `Effect` can cancel the previous run\'s work using `prev` before starting the next.\n\nThe damping knob lives on `Memo`: `reactive_graph::computed::memo` compares the new output with the old via `PartialEq` and ==suppresses downstream notification when they are equal==, cutting wasted recomputation off at the source. `Memo::new_with_compare` swaps in a custom equality, and `new_owning -> (T, bool)` returns the value plus "did it change," handing you the diff decision directly.\n\n## The trade-off\nBuys: declarative dataflow where the graph, not you, decides what re-runs; glitch-free ordering from scheduling; and `PartialEq` damping that stops needless work automatically. Costs: the `PartialEq` bound on memoized values; three memo constructors to choose between; and scheduling seams you must hold in your head — effects after render, memos on demand — because "when exactly does this run?" is no longer answered by reading top to bottom.',
      },
    },
    {
      id: "controlflow-tradeoff-mcq",
      title: "Why a Third Short-Circuit Type",
      content: {
        type: "multiple-choice",
        question:
          "std already has `Result` and `Option` for short-circuiting, yet `Iterator::try_fold` and visitor APIs return `ControlFlow<B, C>` where both `B` (the break value) and `C` (the continue value) are full type parameters. What is the design reason for a third short-circuit type?",
        options: [
          "`ControlFlow` is required because only it can implement the `Try` trait; `Result` and `Option` cannot participate in `?`",
          '`Break` models "stop with this answer," which is often an ordinary success rather than a failure — folding it into `Result` would mislabel a normal early exit as an error, and both the break payload and the running accumulator need to be arbitrary types',
          "`ControlFlow` is a zero-cost alias for `Result` that the compiler lowers into a jump table",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "try-fold-print-mcq",
      title: "Trace the try_fold",
      content: {
        type: "multiple-choice",
        question:
          "This program folds a running sum with `try_fold`, breaking with the first element that pushes the sum strictly above 6. What does it print?",
        language: "rust",
        code: `use std::ops::ControlFlow;

fn main() {
    let xs = [1, 2, 3, 4, 5];
    let result = xs.iter().try_fold(0, |sum, &x| {
        let next = sum + x;
        if next > 6 {
            ControlFlow::Break(x)
        } else {
            ControlFlow::Continue(next)
        }
    });
    match result {
        ControlFlow::Continue(total) => println!("sum {total}"),
        ControlFlow::Break(hit) => println!("stopped at {hit}"),
    }
}`,
        options: ["stopped at 4", "sum 15", "stopped at 3"],
        answerIndex: 0,
      },
    },
    {
      id: "arena-cost-mcq",
      title: "The Cost of a Copy Handle",
      content: {
        type: "multiple-choice",
        question:
          "leptos's `RwSignal` is `Copy` because it is only a `NodeId` index into a global arena (`SlotMap<NodeId, Box<dyn Any>>`), not the value itself. Compared with holding an `Rc<RefCell<T>>` directly, what does this Copy-handle design trade away?",
        options: [
          "Nothing meaningful — the arena handle is strictly better because it is `Copy` and `'static`",
          "It forces every signal's value type to be `Copy`, since the arena can only store copyable values",
          "The borrow checker no longer guards the value: a handle to a disposed signal is a runtime `None`/panic instead of a compile error, and each access pays a map lookup plus a downcast",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "reactive-graph-print-mcq",
      title: "Trace the Hand-Rolled Signal",
      content: {
        type: "multiple-choice",
        question:
          "This program hand-rolls the core of a signal: `subscribe` runs the callback once immediately, and `set` re-runs every subscriber. What does it print?",
        language: "rust",
        code: `use std::cell::RefCell;
use std::rc::Rc;

struct Signal {
    value: RefCell<i32>,
    subscribers: RefCell<Vec<Rc<dyn Fn(i32)>>>,
}

impl Signal {
    fn new(value: i32) -> Rc<Self> {
        Rc::new(Signal {
            value: RefCell::new(value),
            subscribers: RefCell::new(Vec::new()),
        })
    }

    fn subscribe(&self, f: Rc<dyn Fn(i32)>) {
        f(*self.value.borrow());
        self.subscribers.borrow_mut().push(f);
    }

    fn set(&self, value: i32) {
        *self.value.borrow_mut() = value;
        let subs = self.subscribers.borrow();
        for f in subs.iter() {
            f(value);
        }
    }
}

fn main() {
    let count = Signal::new(1);
    let total = Rc::new(RefCell::new(0));
    let sink = Rc::clone(&total);
    count.subscribe(Rc::new(move |v| *sink.borrow_mut() += v));
    count.set(4);
    count.set(10);
    println!("{}", *total.borrow());
}`,
        options: ["14", "15", "1"],
        answerIndex: 1,
      },
    },
    {
      id: "verb-lattice-recall-mcq",
      title: "Recall: The Verb Pyramid",
      content: {
        type: "multiple-choice",
        question:
          'Recall from the trait-architecture curriculum: leptos exposes `.get()`, `.with()`, and `.read()` uniformly on every reactive type via a blanket "pyramid" in `reactive_graph::traits`. What must a NEW reactive type implement to inherit that entire read-side vocabulary?',
        options: [
          "It implements `Get` directly; `Read` and `With` are provided methods that call back into `Get`",
          "It hand-writes `Read`, `With`, and `Get` for its own value type, once each",
          "Only the primitives `Track` and `ReadUntracked`; `Read`, `With`, and `Get` are blanket-implemented on top, with `Get` adding the `Value: Clone` bound",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "write-controlflow-fold",
      title: "Write: a ControlFlow Fold",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Build a short-circuiting fold with `ControlFlow`. Write `pub fn running_until(limit: i32, xs: &[i32]) -> ControlFlow<i32, i32>` that walks `xs` with `Iterator::try_fold`, threading a running sum as the `Continue` value. The moment adding the next element would push the sum strictly above `limit`, break with that element (`ControlFlow::Break(x)`); otherwise continue with the new sum. Start with `use std::ops::ControlFlow;`.",
        solution: `use std::ops::ControlFlow;

pub fn running_until(limit: i32, xs: &[i32]) -> ControlFlow<i32, i32> {
    xs.iter().try_fold(0, |sum, &x| {
        let next = sum + x;
        if next > limit {
            ControlFlow::Break(x)
        } else {
            ControlFlow::Continue(next)
        }
    })
}`,
      },
    },
    {
      id: "write-lazy-adapter",
      title: "Write: a Lazy Adapter Verb",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Ship an iterator verb of your own in the extension-trait style. Write `pub struct Until<I, P> { inner: I, stop: P, done: bool }` and implement `Iterator` for it where `I: Iterator` and `P: FnMut(&I::Item) -> bool`: yield items from `inner` until `stop` first returns true (that item is dropped and iteration ends), latching `done` so nothing more is produced. Then the vocabulary: `pub trait UntilExt: Iterator` with a default-body `until<P>(self, stop: P) -> Until<Self, P>` (bounded `where Self: Sized`), and the blanket `impl<I: Iterator> UntilExt for I {}`.",
        solution: `pub struct Until<I, P> {
    inner: I,
    stop: P,
    done: bool,
}

impl<I, P> Iterator for Until<I, P>
where
    I: Iterator,
    P: FnMut(&I::Item) -> bool,
{
    type Item = I::Item;

    fn next(&mut self) -> Option<I::Item> {
        if self.done {
            return None;
        }
        let item = match self.inner.next() {
            Some(item) => item,
            None => return None,
        };
        if (self.stop)(&item) {
            self.done = true;
            None
        } else {
            Some(item)
        }
    }
}

pub trait UntilExt: Iterator {
    fn until<P>(self, stop: P) -> Until<Self, P>
    where
        Self: Sized,
        P: FnMut(&Self::Item) -> bool,
    {
        Until {
            inner: self,
            stop,
            done: false,
        }
    }
}

impl<I: Iterator> UntilExt for I {}`,
      },
    },
    {
      id: "write-slotmap",
      title: "Write: a Generational Arena",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Build the generational arena underneath a signal runtime. Write `pub struct SlotMap<T>` holding a `Vec` of private `Slot<T> { value: Option<T>, generation: u32 }`, and a `Copy` handle `pub struct Key { index: usize, generation: u32 }`. Give `SlotMap` a `new()`, an `insert(&mut self, value: T) -> Key` that pushes a fresh slot at generation 0, a `get(&self, key: Key) -> Option<&T>` that returns the value only when the slot's generation still matches the key's, and a `remove(&mut self, key: Key) -> Option<T>` that bumps the slot's generation (invalidating any outstanding handle) and takes the value out.",
        solution: `pub struct SlotMap<T> {
    slots: Vec<Slot<T>>,
}

struct Slot<T> {
    value: Option<T>,
    generation: u32,
}

#[derive(Clone, Copy, PartialEq)]
pub struct Key {
    index: usize,
    generation: u32,
}

impl<T> SlotMap<T> {
    pub fn new() -> Self {
        SlotMap { slots: Vec::new() }
    }

    pub fn insert(&mut self, value: T) -> Key {
        let index = self.slots.len();
        self.slots.push(Slot {
            value: Some(value),
            generation: 0,
        });
        Key {
            index,
            generation: 0,
        }
    }

    pub fn get(&self, key: Key) -> Option<&T> {
        let slot = match self.slots.get(key.index) {
            Some(slot) => slot,
            None => return None,
        };
        if slot.generation == key.generation {
            slot.value.as_ref()
        } else {
            None
        }
    }

    pub fn remove(&mut self, key: Key) -> Option<T> {
        let slot = match self.slots.get_mut(key.index) {
            Some(slot) => slot,
            None => return None,
        };
        if slot.generation != key.generation {
            return None;
        }
        slot.generation += 1;
        slot.value.take()
    }
}`,
      },
    },
    {
      id: "write-signal-arena",
      title: "Write: a Copy Signal Handle",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Recreate leptos's `Copy` signal handle in `std`. Using a `thread_local!` arena `static ARENA: RefCell<Vec<i32>>`, write a `#[derive(Clone, Copy)] pub struct Signal { id: usize }` whose value lives in the arena, not the handle. Give it `new(value: i32) -> Self` (push into the arena, capture the index as the id), plus `get(self) -> i32`, `set(self, value: i32)`, and `update(self, f: impl FnOnce(&mut i32))` — every method takes `self` by copy, exactly like a leptos signal. Start with `use std::cell::RefCell;`.",
        solution: `use std::cell::RefCell;

thread_local! {
    static ARENA: RefCell<Vec<i32>> = RefCell::new(Vec::new());
}

#[derive(Clone, Copy)]
pub struct Signal {
    id: usize,
}

impl Signal {
    pub fn new(value: i32) -> Self {
        ARENA.with(|arena| {
            let mut arena = arena.borrow_mut();
            let id = arena.len();
            arena.push(value);
            Signal { id }
        })
    }

    pub fn get(self) -> i32 {
        ARENA.with(|arena| arena.borrow()[self.id])
    }

    pub fn set(self, value: i32) {
        ARENA.with(|arena| {
            arena.borrow_mut()[self.id] = value;
        });
    }

    pub fn update(self, f: impl FnOnce(&mut i32)) {
        ARENA.with(|arena| {
            f(&mut arena.borrow_mut()[self.id]);
        });
    }
}`,
      },
    },
  ],
  edges: [
    // Control-flow spine
    { from: "reactive-map", to: "controlflow-shape" },
    { from: "controlflow-shape", to: "try-fold-engine" },
    { from: "try-fold-engine", to: "lazy-adapter-dialect" },
    // Reactivity spine
    { from: "reactive-map", to: "signal-arena-handles" },
    { from: "signal-arena-handles", to: "owner-tree" },
    { from: "signal-arena-handles", to: "subscription-tracking" },
    { from: "owner-tree", to: "effect-scheduling" },
    { from: "subscription-tracking", to: "effect-scheduling" },
    // MCQ drills
    { from: "controlflow-shape", to: "controlflow-tradeoff-mcq" },
    { from: "try-fold-engine", to: "try-fold-print-mcq" },
    { from: "signal-arena-handles", to: "arena-cost-mcq" },
    { from: "owner-tree", to: "arena-cost-mcq" },
    { from: "subscription-tracking", to: "reactive-graph-print-mcq" },
    { from: "effect-scheduling", to: "reactive-graph-print-mcq" },
    { from: "signal-arena-handles", to: "verb-lattice-recall-mcq" },
    // Code drills
    { from: "controlflow-shape", to: "write-controlflow-fold" },
    { from: "try-fold-engine", to: "write-controlflow-fold" },
    { from: "lazy-adapter-dialect", to: "write-lazy-adapter" },
    { from: "signal-arena-handles", to: "write-slotmap" },
    { from: "write-slotmap", to: "write-signal-arena" },
    { from: "signal-arena-handles", to: "write-signal-arena" },
  ],
};
