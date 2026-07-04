import type { Curriculum } from "@mind-palace/curriculum";

import { tokioSource } from "./_sources";

// Async from First Principles — the machinery beneath `.await`: the Future
// poll contract, the compiler-built state machine, Waker + a hand-rolled
// block_on executor in pure std, the readiness↔completion fork, select!'s
// drop-to-cancel grammar, the Pin seam, and tokio's task model (spawn vs
// join!, size-based boxing). Bare-std drills are rustc-verified; the select!
// drill cargo-checks against tokio in the card sandbox.
export const exprAsync: Curriculum = {
  id: "c-expr-async",
  title: "Async from First Principles",
  source: tokioSource,
  nodes: [
    {
      id: "async-map",
      title: "Async With No Library: The Map",
      content: {
        type: "read",
        markdown:
          "`let n = stream.read(&mut buf).await?;` — one line, and beneath it: a state machine the compiler built, a waker threaded through every poll, an executor loop, and an OS event queue. This curriculum rebuilds that stack from the bottom in pure std, until tokio stops looking like magic and starts looking like ==a set of design decisions you could have made differently==.\n\n## Async is smaller than you think\nThe language ships exactly two pieces: the `Future` trait and the `async`/`await` sugar that compiles into it. ==Everything else is a library== — std does not even include an executor. tokio is one answer to the missing pieces (a work-stealing scheduler plus an epoll reactor via mio); tokio-uring, smol, and embassy are different answers to the same three questions: *who polls, who wakes, and who talks to the OS?*\n\n## The map\n- ==The contract== — `Future::poll`, `Poll::Pending`, and the wake-me-later promise\n- ==The compiler's half== — the state machine an `async fn` becomes\n- ==The library's half== — a `Waker` and a `block_on` executor you will write yourself in about twenty lines of std\n- ==The fork== — readiness (epoll, mio) versus completion (io_uring): the OS-level stance that shapes every API above it\n- ==The dialect== — `select!` grammar, drop-to-cancel semantics, the Pin seam, and `spawn` versus `join!`\n\n## What is assumed\nWriting `.await` chains, spawning threads, and passing channel messages are assumed cold from the core Rust and std paths — none of that is re-taught here. The lens is the author's: not how to *use* async, but ==why the machinery is shaped the way it is==, so you can design call-sites of your own.",
      },
    },
    {
      id: "future-poll-machine",
      title: "Future: The Poll Contract",
      content: {
        type: "read",
        markdown:
          "Call an async fn and ==nothing runs==. You hold an inert value, and it will sit there forever unless something polls it. That inertness is the design decision everything else in async Rust falls out of.\n\n## The whole trait\nAll of `std::future::Future` fits in one breath: `type Output` plus `fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>`. Poll returns `Poll::Ready(value)` when finished, `Poll::Pending` when not. No stored callbacks, no implied threads, no required allocation.\n\n## Pull, not push\nEager promise systems start work at creation and *push* results into callbacks the promise stores — which means heap-allocated callback lists and a cancellation API bolted on later. Rust inverted it: the executor *pulls* by calling `poll`, and the future computes only inside those calls. The executor decides when; the future decides what.\n\n## The one obligation\n`Poll::Pending` carries a promise: ==before returning Pending, arrange for the waker to be called==. `cx.waker()` is the executor's phone number; a leaf future that returns Pending without storing or ringing it will never be polled again — the task just sleeps forever. This lost-wakeup class of bug belongs exclusively to leaf-future authors, which is why so few crates ever need to write one.\n\n## What the aesthetic buys\n- **Cancellation is drop.** A value that only runs when polled is cancelled by dropping it — no cancel token, no unsubscribe API. `select!` is built on exactly this.\n- **Suspension is free.** Waiting is just *returning* from poll; the state machine stays exactly where it is — one value, zero allocations.\n\nThe costs: waker plumbing threads through every layer, `Pin` sits in the signature (a lesson of its own), and the contract that makes it all sound lives partly in documentation rather than types.",
      },
    },
    {
      id: "desugar-state-machine",
      title: "What the Compiler Builds",
      content: {
        type: "read",
        markdown:
          "You never implement `Future` for the async fns you write — the compiler does, and what it builds is worth seeing precisely because tower, tokio, and every combinator library hand-write the same shape.\n\n## One enum, one variant per await\nThe compiler lowers an async body into ==a state machine with one variant per await point==. Locals that are alive across an `.await` become fields of that variant; everything else stays on the poll-time stack. Each `poll` call resumes at the current state, runs to the next await, stores the live locals, and returns `Poll::Pending`.\n\n## Exactly sized\nNested async calls do not allocate frames: an awaited future is embedded *inside* its caller's state machine, so the entire call graph flattens into one struct whose size is a compile-time constant. That is why deep async stacks produce comically large futures — and why `tokio::spawn` secretly measures `size_of` (a later lesson).\n\n## Unnameable and !Unpin\nThe generated type has no name you can write — APIs return `impl Future` because nothing better exists. And because one stored field may borrow another (a reference into a buffer held across the same await), the machine is ==self-referential==: moving it would invalidate its own internal pointers, so the compiler marks it `!Unpin`. The Pin seam lesson shows how tokio contains that fact.\n\n## The four registers\nwithout.boats frames async as one effect with four registers: hand-written `impl Future` is the ==core register== — tower's `Oneshot` (tower/src/util/oneshot.rs) is literally a hand-desugared async fn, a NotReady→Called→Done enum with a poll loop. Combinators are the combinatoric register; `async`/`await` is the consuming, imperative-looking one; executors are the fourth, driving the whole thing. When you hand-desugar a chain in the drill ahead, you are writing what rustc writes.",
      },
    },
    {
      id: "waker-contract",
      title: "Waker: The One Callback",
      content: {
        type: "read",
        markdown:
          "No callback appears anywhere in your async code — yet when a socket turns readable, exactly the right task re-polls. The trick is that the system has ==exactly one callback==, and it is invisible: `std::task::Waker`.\n\n## The round trip\n- The executor creates a `Waker` meaning *re-queue this task* and packs it into a `Context`\n- Every `poll` threads that context down through the whole state machine\n- The ==leaf== future — the one that truly cannot progress — clones the waker and parks it where the event source will find it; tokio's reactor keeps a slab of wakers keyed by mio `Token`s\n- When the OS reports readiness, the reactor calls `wake()`, the scheduler re-queues the task, and polling restarts from the top\n\n## Wake carries no data\nA wake says ==try again== — nothing more. The bytes stay in the kernel buffer; the re-polled future pulls them itself on the next `poll`. Keeping the callback data-free is a deliberate stance: wakers stay cheap to clone, trivially thread-safe, and completely decoupled from whatever is being waited on. (Completion models must break this rule — the fork lesson shows what that costs.)\n\n## Building one is now easy\nUnderneath sits `RawWaker`, a hand-rolled vtable of function pointers — maximal flexibility, painful to write. Since Rust 1.51, ==`std::task::Wake`== hides it: implement `fn wake(self: Arc<Self>)` on any type and `Waker::from(arc)` performs the vtable ceremony for you. An entire executor's waker can be an `Arc<ThreadWaker>` whose wake calls `.unpark()` — precisely the one you build next.",
      },
    },
    {
      id: "block-on-anatomy",
      title: "block_on in Twenty Lines",
      content: {
        type: "read",
        markdown:
          "`pollster::block_on(setup())` boots a whole wgpu context on the strength of one tiny function, and `futures::executor::block_on` is the same idea. The smallest real executor is ==about twenty lines of std==, and writing it answers the biggest async mystery: where does the program actually wait?\n\n## The three moves\n- **Pin the future to the stack.** `std::pin::pin!(fut)` yields a `Pin<&mut F>` you can poll repeatedly. (Why pinning is demanded is the Pin seam lesson; for now it is the required incantation.)\n- **Make the current thread the wake target.** A `ThreadWaker(Thread)` whose `Wake::wake` calls `.unpark()` — waking the task and unblocking the thread become the same event.\n- **Loop.** Poll; on `Ready(v)`, return it; on `Pending`, `thread::park()`. When the leaf future's stored waker fires, unpark releases the park and the loop polls again.\n\n## Spurious wakeups are absorbed, not prevented\n`park` may return for no reason; wakers may ring more often than needed. The design shrugs: ==re-polling is always legal==, and a future that is not ready simply returns Pending again. Executors never learn *why* they woke — the wake channel deliberately carries no such information, which is exactly what keeps wakers cheap.\n\n## From here to tokio\nA production runtime is this loop pluralized: a run queue of many tasks instead of one pinned local, worker threads stealing from each other's queues, and a reactor thread converting epoll events into `wake()` calls instead of unparks. The rhythm — poll, park, wake, re-poll — never changes.",
      },
    },
    {
      id: "readiness-vs-completion",
      title: "Readiness vs Completion",
      content: {
        type: "read",
        markdown:
          "Beneath every async runtime sits one OS-level question: does the kernel tell you when to ==try==, or when it is ==done==? The two answers force different API shapes all the way up the stack.\n\n## Readiness: the kernel never holds your buffer\nepoll and kqueue — wrapped by mio, the crate tokio's reactor is built on. You register interest — `registry.register(&mut socket, Token(0), Interest::READABLE)` — and the kernel reports that the socket *might* be readable. You then perform the read yourself, lending the buffer only for the duration of the syscall. The contract is behavioral, spelled out in the docs of mio's `Poll` (mio/src/poll.rs) because no type can carry it: ==spurious events are legal==; after an event you must ==drain until `WouldBlock`==; and `WouldBlock` is a signal, not an error.\n\nBecause nothing is ever in flight, two things come free: I/O keeps the borrowed `read(&mut buf)` shape you know from std, and ==cancellation costs nothing== — stop being interested, and there is no cleanup to do.\n\n## Completion: the kernel owns the operation\nio_uring inverts it. You describe the whole operation up front — fd, pointer, length — submit it, and ==the kernel performs the I/O while your code keeps running==. The io-uring crate's own README example builds an opcode entry, stamps `.user_data(0x42)` as a correlation id, and pushes it inside an `unsafe` block — unsafe at exactly the point where a raw pointer must stay valid across the flight window, a promise no borrow can express.\n\ntokio-uring makes the same model safe the only way possible: ==move ownership into the operation==. Its signature shape is `let (res, buf) = file.read_at(buf, 0).await;` — the buffer travels in by value and comes back with the result.\n\n## The trade\nReadiness buys free cancellation and familiar borrowed-buffer call-sites, at the price of a syscall per attempt and a contract that lives in an essay. Completion buys fewer syscalls and true async file I/O, at the price of ownership-transfer APIs and genuinely hard cancellation. The next lessons — select!'s drop-to-cancel and the cancellation-safety doctrine — are ==the readiness choice propagating upward== into macro semantics.",
      },
    },
    {
      id: "select-grammar",
      title: "select!: Match-Shaped Racing",
      content: {
        type: "read",
        markdown:
          "`tokio::select!` reads like the language grew a concurrent match: `Some(msg) = rx.recv() => handle(msg)` arms, an `if !paused` guard, `biased;` to poll in written order, `else =>` for when every branch is disabled. It is not a language feature — it is ==macro_rules all the way down== (tokio/src/macros/select.rs), and it is the best case study in macro-built control flow that exists.\n\n## The machinery\n- A ==token-tree muncher== normalizes each `pattern = future => handler` arm into an internal accumulator form prefixed with `@`\n- The accumulator grows one `_` token per processed branch — ==unary arithmetic in macro_rules== — and a `count!` helper maps `(_ _)` to `2`, with rules written out up to 64\n- A companion proc-macro declares a one-shot enum with a variant per branch, plus a `Mask` bitfield that records disabled branches (failed pattern match, false guard)\n- The expansion pins every branch future to the stack and drives them all inside one `poll_fn` loop, starting from a ==random branch index== each poll for fairness; `biased;` replaces the random start with 0\n- Every helper resolves through `$crate::macros::support` — a `#[doc(hidden)] pub` module that keeps expansions working inside any user crate, whatever it imports or renames\n\n## What the shape buys and costs\nBuys: the highest-leverage call-site in async Rust — heterogeneous racing with pattern binding, guards, and a default arm, all on stable macro_rules. Costs: macro-opaque type errors when an arm fails to check; a hard 64-branch ceiling baked into the unary counter; and a semantic tax heavy enough to earn its own lesson — ==the losing arms are not paused, they are dropped==.",
      },
    },
    {
      id: "cancel-safety",
      title: "Drop to Cancel & the Safety Tax",
      content: {
        type: "read",
        markdown:
          "Every `select!` iteration ends with the losing arms' futures ==dropped on the spot==. Drop *is* the cancellation mechanism — no token, no cancel method, just a scope ending. Elegant, and only sound because of a decision made two layers down.\n\n## Why dropping is legal at all\nIn tokio's readiness world, a dropped read future held an interest registration and nothing else — your buffer was never handed away across a suspension, so nothing dangles. Contrast the completion world: tokio-uring cannot simply discard a dropped op while the kernel may still be writing through its pointer, so the driver ==parks the orphaned state in `Lifecycle::Ignored(Box<dyn Any>)`== until the completion entry finally lands (tokio-uring runtime/driver/op). In a readiness model cancellation is a closing brace; in a completion model it is a protocol.\n\n## The tax: cancellation safety\nSound is not the same as harmless. A select! loop recreates its losing futures every iteration, so the load-bearing question becomes: ==is it a no-op to drop this future and recreate it?== That sentence is tokio's own definition of cancel-safe, and the select! docs then do something remarkable for a type-obsessed ecosystem: they enumerate methods by name. `mpsc::Receiver::recv` and `TcpListener::accept` — cancel-safe. `read_exact` — not: bytes already consumed vanish with the dropped future. `Mutex::lock` — not: your place in the queue is lost.\n\n## The design lesson\nA contract the type system cannot state does not disappear — it relocates. tokio's contracts live in three homes: ==types== (`Poll`, ownership transfer), ==documentation treated as API== (cancellation safety, drain-until-WouldBlock), and ==macro grammar== (select!'s arm syntax). When you design an async surface, you are choosing which home each promise lives in — and the doc-shaped ones are the ones your users discover in production.",
      },
    },
    {
      id: "pin-seam",
      title: "The Pin Seam",
      content: {
        type: "read",
        markdown:
          "tokio users can go months without typing `Pin`, then meet it all at once in a single spot. That spot is ==a deliberately drawn boundary==, and knowing where it sits teaches you how to hide hard concepts in your own APIs.\n\n## How Pin stays hidden\nRecall the two-layer trait design from the trait-architecture curriculum: `AsyncRead` is poll-shaped for implementors, and the blanket `AsyncReadExt` serves consumers. The concealment lives in the ext layer: every method bounds ==`Self: Unpin`== and takes `&mut self`, so the returned named future can call `Pin::new(&mut *reader)` internally — Pin never surfaces at the call-site. `JoinHandle` ships a manual `impl Unpin` for the same reason, and `select!` pins its own branch futures inside the expansion.\n\n## Where the hiding must stop\nOne shape defeats every trick: ==holding one future across multiple poll sites==. That is the select-in-a-loop pattern — an arm reads `_ = &mut future =>` so the same future survives from iteration to iteration. Polling through `&mut` requires the future to already be pinned, and an async fn's state machine is `!Unpin`. Here, and only here, the consumer must pin — and tokio compresses the ceremony to one line: `tokio::pin!(future);`\n\n## The shadowing trick\nThe expansion (tokio/src/macros/pin.rs) is two rebindings: move the value into a fresh local, then ==shadow the same name== with `Pin::new_unchecked(&mut ...)` inside an `unsafe` block. `new_unchecked` demands the value never move again; the shadow discharges that obligation *syntactically* — the original binding is unnameable now, so no later code can possibly move it. Scope rules doing the type system's job.\n\n## The trade\nSafe stack pinning, zero heap, one line — against two real costs: shadowing-as-soundness is deep magic that resists explanation, and forgetting the macro yields the worst error messages in async Rust. The transferable lesson: ==pick the one call-site shape where users must meet your hard concept==, then spend machinery keeping it out of every other shape.",
      },
    },
    {
      id: "spawn-vs-join",
      title: "spawn vs join!: Two Concurrencies",
      content: {
        type: "read",
        markdown:
          "tokio offers two ways to run futures concurrently, and their signatures encode opposite philosophies about ownership.\n\n## join!: concurrency as expression composition\n`let (a, b) = tokio::join!(fetch_user(&db), fetch_posts(&db));` — both run concurrently while ==borrowing local state freely==. The machinery (tokio/src/macros/join.rs): each expression is wrapped in a `maybe_done` future that stores its result until all are finished, pinned on the *current task's* stack, and polled with a rotating start index for fairness. Nothing leaves the task — hence no `Send`, no `'static`, no allocation. The doc-contract states the cost plainly: the branches run ==concurrently but not in parallel== — one compute-heavy branch stalls the set, and dropping the enclosing future cancels them all together.\n\n## spawn: concurrency as ownership transfer\n`let handle = tokio::spawn(compute());` hands the future to the scheduler, and the signature confesses the design: ==`F: Future + Send + 'static`==. Work stealing may migrate a task between worker threads at any suspension point, so the scheduling strategy surfaces in the type system on purpose — the most common tokio compile error is not an accident but a disclosure.\n\n`JoinHandle` completes the contract. Dropping it ==detaches== — the task keeps running, which buys fire-and-forget ergonomics and costs structured concurrency (the leaked-background-task failure class). `abort()` is the explicit kill switch. And a panic inside the task is ==reified as data==: `handle.await` returns `Result<T, JoinError>` instead of propagating, so crashes surface at the join point as values.\n\n## The invisible third decision\n`spawn` also measures your future: if `size_of::<F>()` exceeds `BOX_FUTURE_THRESHOLD`, it silently `Box::pin`s it (tokio/src/task/spawn.rs). The size is a monomorphization-time constant, so the branch folds away entirely. Recall that an async call graph flattens into one exactly-sized struct — this check is the guard rail for the day that struct reaches a megabyte, preserving ==one call-site shape over two representations==. A reusable trick for any generic API with a size cliff.",
      },
    },
    {
      id: "poll-vs-callbacks",
      title: "Poll vs stored callbacks",
      content: {
        type: "multiple-choice",
        question:
          "A JavaScript promise starts running the moment it is created and delivers its result by calling stored callbacks. A Rust future is inert — it only runs while an executor calls `poll`. What did Rust buy by choosing the pull model?",
        options: [
          "Push-style callbacks cannot express fallible completion, so a Result-based language had no alternative",
          "Cancellation collapses into drop — stop polling and discard the value — and suspension needs no per-await heap allocation, because the whole computation is one inert state machine",
          "Pulling avoids a system call per completion that stored-callback designs are forced to make",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "executor-poll-count",
      title: "Trace the executor",
      content: {
        type: "multiple-choice",
        question:
          "This is the block_on loop with the parking removed — the future wakes itself immediately, so the executor just polls again. Counting every call to `poll`, what does the program print?",
        language: "rust",
        code: `use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};

struct YieldTwice {
    left: u32,
}

impl Future for YieldTwice {
    type Output = ();

    fn poll(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<()> {
        if self.left == 0 {
            return Poll::Ready(());
        }
        self.left -= 1;
        cx.waker().wake_by_ref();
        Poll::Pending
    }
}

struct NoopWaker;

impl Wake for NoopWaker {
    fn wake(self: Arc<Self>) {}
}

fn main() {
    let waker = Waker::from(Arc::new(NoopWaker));
    let mut cx = Context::from_waker(&waker);
    let mut fut = std::pin::pin!(YieldTwice { left: 2 });
    let mut polls = 0;
    while fut.as_mut().poll(&mut cx).is_pending() {
        polls += 1;
    }
    polls += 1;
    println!("{polls}");
}`,
        options: ["3", "2", "1"],
        answerIndex: 0,
      },
    },
    {
      id: "cancel-safe-arms",
      title: "Choosing cancel-safe arms",
      content: {
        type: "multiple-choice",
        question:
          "A framed-protocol task loops over `tokio::select!` with arms `_ = interval.tick() => send_heartbeat()` and `_ = stream.read_exact(&mut header) => parse_frame()`. tokio's docs mark `read_exact` cancel-unsafe. What is the actual failure mode?",
        options: [
          "`read_exact` holds the stream locked, so the heartbeat arm is starved and never fires",
          "The arm fails to compile: `read_exact` returns a `!Unpin` future that select! cannot poll",
          "Whenever the tick arm wins an iteration, the dropped `read_exact` future forgets the bytes it had already pulled from the stream — the recreated one resumes mid-frame with data silently gone",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "spawn-bounds-leak",
      title: "What Send + 'static discloses",
      content: {
        type: "multiple-choice",
        question:
          "`tokio::spawn` requires `F: Future + Send + 'static` — famously the most common tokio compile error. What is the bound actually disclosing about the runtime's design?",
        options: [
          "The multi-threaded scheduler steals work: a spawned task may migrate to another worker thread at any suspension point, so the scheduling strategy deliberately surfaces in the signature",
          "All futures in Rust must be Send; the bound merely restates a language rule that async blocks already satisfy",
          "Send is needed so several threads can await the same JoinHandle concurrently",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "size-boxing-dispatch",
      title: "The size_of dispatch",
      content: {
        type: "multiple-choice",
        question:
          "This recreates the dispatch inside `tokio::spawn` (tokio/src/task/spawn.rs). `std::mem::size_of::<F>()` is a compile-time constant per instantiation, so the branch folds away. What does the pattern buy?",
        language: "rust",
        code: `use std::future::Future;

const THRESHOLD: usize = 16384;

fn schedule<F: Future + Send + 'static>(task: F) {
    drop(task);
}

pub fn spawn_like<F: Future + Send + 'static>(fut: F) {
    if std::mem::size_of::<F>() > THRESHOLD {
        schedule(Box::pin(fut));
    } else {
        schedule(fut);
    }
}`,
        options: [
          "A compile-time cap on task memory: futures above the threshold are rejected with a custom error",
          "One unchanged call-site shape that quietly protects against moving a huge state machine by value through the scheduler's queues — paid for with a heap allocation the caller never sees",
          "Faster scheduling for small futures, because the runtime can skip polling anything under the threshold",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "pin-shadow-trick",
      title: "Why pin! shadows",
      content: {
        type: "multiple-choice",
        question:
          "The two rebindings hand-expand `tokio::pin!` (tokio/src/macros/pin.rs). `Pin::new_unchecked` demands the value never move again — an obligation the compiler cannot check here. How does the expansion discharge it?",
        language: "rust",
        code: `use std::pin::Pin;

pub fn shadow_pin() {
    let future = async { 1 + 1 };
    let mut future = future;
    let mut future = unsafe { Pin::new_unchecked(&mut future) };
    let _pinned: Pin<&mut _> = future.as_mut();
}`,
        options: [
          "It does not — pin! is documented as unsound and kept only for backward compatibility",
          "The unsafe block performs a runtime address check each time the pinned value is polled",
          "The second binding shadows the first: the original owner becomes unnameable, so no later code can move the value — the no-move guarantee is enforced by scope rules instead of the type system",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "cancel-across-models",
      title: "Cancellation across the fork",
      content: {
        type: "multiple-choice",
        question:
          "Dropping an in-flight read future is a plain drop in tokio, but tokio-uring's driver parks the dropped operation's state in `Lifecycle::Ignored(Box<dyn Any>)` until the kernel completes it. Why the asymmetry?",
        options: [
          "Readiness I/O has nothing in flight: the kernel never held the buffer, so dropping the future merely abandons an interest. Under completion I/O the kernel still owns the buffer's pointer, so something must keep it alive until the CQE lands",
          "epoll automatically cancels outstanding reads on drop, while io_uring lacks any cancellation opcode",
          "tokio-uring futures are not Unpin, and !Unpin values need a destructor trampoline to drop safely",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "write-countdown",
      title: "Write: a countdown future",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Hand-implement a leaf future in pure std. Define `pub struct Countdown { pub remaining: u32 }` and implement `Future` for it with `type Output = u32`: when `remaining` is 0, return `Poll::Ready(0)`; otherwise decrement `remaining`, call `cx.waker().wake_by_ref()` (never return Pending without arranging a wake), and return `Poll::Pending`. Import `Future` from `std::future`, `Pin` from `std::pin`, and `Context`/`Poll` from `std::task`; the poll receiver is `mut self: Pin<&mut Self>`.",
        solution: `use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

pub struct Countdown {
    pub remaining: u32,
}

impl Future for Countdown {
    type Output = u32;

    fn poll(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<u32> {
        if self.remaining == 0 {
            return Poll::Ready(0);
        }
        self.remaining -= 1;
        cx.waker().wake_by_ref();
        Poll::Pending
    }
}`,
      },
    },
    {
      id: "write-block-on",
      title: "Write: block_on",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Build the twenty-line executor. Define a `struct ThreadWaker(Thread)` implementing `std::task::Wake` — `fn wake(self: Arc<Self>)` calls `self.0.unpark()`. Then write `pub fn block_on<F: Future>(fut: F) -> F::Output`: pin with `let mut fut = std::pin::pin!(fut);`, build the waker via `Waker::from(Arc::new(ThreadWaker(thread::current())))`, wrap it with `Context::from_waker`, and loop on `fut.as_mut().poll(&mut cx)` — return the value on `Ready`, call `thread::park()` on `Pending`.",
        solution: `use std::future::Future;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
use std::thread::{self, Thread};

struct ThreadWaker(Thread);

impl Wake for ThreadWaker {
    fn wake(self: Arc<Self>) {
        self.0.unpark();
    }
}

pub fn block_on<F: Future>(fut: F) -> F::Output {
    let mut fut = std::pin::pin!(fut);
    let waker = Waker::from(Arc::new(ThreadWaker(thread::current())));
    let mut cx = Context::from_waker(&waker);
    loop {
        match fut.as_mut().poll(&mut cx) {
            Poll::Ready(v) => return v,
            Poll::Pending => thread::park(),
        }
    }
}`,
      },
    },
    {
      id: "write-chain-desugar",
      title: "Write: hand-desugar a chain",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Hand-desugar an await chain the way rustc and tower do. Define `pub enum Chain<A: Future + Unpin, B: Future + Unpin>` with variants `First { first: A, second: Option<B> }`, `Second { second: B }`, and `Done`. Implement `Future` (`type Output = B::Output`) as a `loop` over `match &mut *self`: in `First`, poll `first` via `Pin::new` — on `Ready(_)`, `take()` the second future out of its Option (expect-message it) and transition with `*self = Chain::Second { second }` so the loop polls it immediately, exactly like desugared code; in `Second`, on `Ready(out)` set `*self = Chain::Done` and return `Poll::Ready(out)`; polling `Done` panics. Return `Poll::Pending` whenever the active future is pending.",
        solution: `use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

pub enum Chain<A: Future + Unpin, B: Future + Unpin> {
    First { first: A, second: Option<B> },
    Second { second: B },
    Done,
}

impl<A: Future + Unpin, B: Future + Unpin> Future for Chain<A, B> {
    type Output = B::Output;

    fn poll(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<B::Output> {
        loop {
            match &mut *self {
                Chain::First { first, second } => match Pin::new(first).poll(cx) {
                    Poll::Ready(_) => {
                        let second = second.take().expect("second future already taken");
                        *self = Chain::Second { second };
                    }
                    Poll::Pending => return Poll::Pending,
                },
                Chain::Second { second } => match Pin::new(second).poll(cx) {
                    Poll::Ready(out) => {
                        *self = Chain::Done;
                        return Poll::Ready(out);
                    }
                    Poll::Pending => return Poll::Pending,
                },
                Chain::Done => panic!("Chain polled after completion"),
            }
        }
    }
}`,
      },
    },
    {
      id: "write-race",
      title: "Write: race two futures",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Build select!'s core move — poll the competitors, first Ready wins, the loser is cancelled by drop. Define `pub enum Winner<A, B> { Left(A), Right(B) }` and `pub struct Race<A: Future + Unpin, B: Future + Unpin> { pub left: A, pub right: B }`. Implement `Future` for `Race` with `type Output = Winner<A::Output, B::Output>`: poll `left` via `Pin::new(&mut self.left)` — if Ready, return `Winner::Left`; then poll `right` the same way for `Winner::Right`; otherwise return `Poll::Pending`. (Real select! adds a random starting index so left cannot starve right — yours is what `biased;` gives you.)",
        solution: `use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

pub enum Winner<A, B> {
    Left(A),
    Right(B),
}

pub struct Race<A: Future + Unpin, B: Future + Unpin> {
    pub left: A,
    pub right: B,
}

impl<A: Future + Unpin, B: Future + Unpin> Future for Race<A, B> {
    type Output = Winner<A::Output, B::Output>;

    fn poll(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        if let Poll::Ready(v) = Pin::new(&mut self.left).poll(cx) {
            return Poll::Ready(Winner::Left(v));
        }
        if let Poll::Ready(v) = Pin::new(&mut self.right).poll(cx) {
            return Poll::Ready(Winner::Right(v));
        }
        Poll::Pending
    }
}`,
      },
    },
    {
      id: "write-select-loop",
      title: "Write: a select! loop",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Recreate the canonical select!-in-a-loop shape with a deadline. Write `pub async fn drain_until_deadline(mut rx: Receiver<u64>, deadline: Duration) -> u64` (import `std::time::Duration` and `tokio::sync::mpsc::Receiver`): create `tokio::time::sleep(deadline)`, stack-pin it with `tokio::pin!(sleep)` so it can be polled by `&mut` reference across iterations, then loop a `tokio::select!` with two arms — `_ = &mut sleep => break` and `maybe = rx.recv()`, matching `Some(v)` to add into a running total and `None` to break. Return the total. (`rx.recv()` is cancel-safe, so recreating its future each iteration loses nothing; the pinned sleep is the one future that must survive across poll sites.)",
        solution: `use std::time::Duration;
use tokio::sync::mpsc::Receiver;

pub async fn drain_until_deadline(mut rx: Receiver<u64>, deadline: Duration) -> u64 {
    let sleep = tokio::time::sleep(deadline);
    tokio::pin!(sleep);
    let mut total = 0;
    loop {
        tokio::select! {
            _ = &mut sleep => break,
            maybe = rx.recv() => match maybe {
                Some(v) => total += v,
                None => break,
            },
        }
    }
    total
}`,
      },
    },
  ],
  edges: [
    // Concept spine
    { from: "async-map", to: "future-poll-machine" },
    { from: "async-map", to: "readiness-vs-completion" },
    { from: "future-poll-machine", to: "desugar-state-machine" },
    { from: "future-poll-machine", to: "waker-contract" },
    { from: "waker-contract", to: "block-on-anatomy" },
    { from: "future-poll-machine", to: "select-grammar" },
    { from: "select-grammar", to: "cancel-safety" },
    { from: "readiness-vs-completion", to: "cancel-safety" },
    { from: "desugar-state-machine", to: "pin-seam" },
    { from: "select-grammar", to: "pin-seam" },
    { from: "block-on-anatomy", to: "spawn-vs-join" },
    { from: "desugar-state-machine", to: "spawn-vs-join" },
    // Drills
    { from: "future-poll-machine", to: "poll-vs-callbacks" },
    { from: "future-poll-machine", to: "write-countdown" },
    { from: "waker-contract", to: "write-countdown" },
    { from: "block-on-anatomy", to: "write-block-on" },
    { from: "write-countdown", to: "write-block-on" },
    { from: "write-block-on", to: "executor-poll-count" },
    { from: "write-countdown", to: "executor-poll-count" },
    { from: "desugar-state-machine", to: "write-chain-desugar" },
    { from: "write-countdown", to: "write-chain-desugar" },
    { from: "cancel-safety", to: "cancel-safe-arms" },
    { from: "select-grammar", to: "write-race" },
    { from: "write-countdown", to: "write-race" },
    { from: "pin-seam", to: "pin-shadow-trick" },
    { from: "spawn-vs-join", to: "spawn-bounds-leak" },
    { from: "spawn-vs-join", to: "size-boxing-dispatch" },
    { from: "readiness-vs-completion", to: "cancel-across-models" },
    { from: "cancel-safety", to: "cancel-across-models" },
    { from: "pin-seam", to: "write-select-loop" },
    { from: "cancel-safety", to: "write-select-loop" },
  ],
};
