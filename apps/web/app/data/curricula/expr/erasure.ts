import type { Curriculum } from "@mind-palace/curriculum";

import { towerSource } from "./_sources";

// The Static↔Dynamic Dial — where libraries deliberately stand between
// monomorphization and erasure: tower's BoxService pressure valve (map_future
// + SyncWrapper), the private clone_box object-safety trick, Bytes' hand-rolled
// &'static Vtable, enum dispatch (iggy/leptos/Either), tokio's size-based
// boxing, and tower's inline type-check probes. dyn-Trait basics are assumed
// (g-rust ty-impl-vs-dyn); erasure appears ONLY as a designed valve with cost
// accounting. All drills are pure std, rustc-verified; behavioral MCQs are
// run-checked by scripts/verify-rust-cards.ts.
export const exprErasure: Curriculum = {
  id: "c-expr-erasure",
  title: "The Static↔Dynamic Dial",
  source: towerSource,
  nodes: [
    {
      id: "dial-map",
      title: "The Static↔Dynamic Dial",
      content: {
        type: "read",
        markdown:
          "You already know what `dyn Trait` is and what monomorphization does — that machinery is assumed cold here. This curriculum asks the question library authors actually face: ==where do you deliberately stand== between 'the whole program is types' and 'call anything at runtime'?\n\n## The dial\nPicture a dial. At the static pole, leptos's tachys renderer encodes an entire view tree in one type — `HtmlElement<Div, (Class<&str>,), (&str,)>` — and rebuilds it with a monomorphized walk, no VDOM. At the dynamic pole, bevy_reflect lets scene files set fields and call functions ==by string name==. Neither pole is 'correct': every maximally static system ships ==pressure valves== (tachys has `into_any()`), and every dynamic boundary hand-rolls its own dispatch.\n\n## The moves this chapter teaches\n- **The boxed pressure valve** — tower's `BoxService`, flattening an unnameable middleware onion into three type parameters\n- **Clone through an object** — the private `clone_box` supertrait trick\n- **The hand-rolled vtable** — how `Bytes` is one concrete type over static, heap, and refcounted memory\n- **The enum alternative** — iggy's `ClientWrapper`: dispatch with no box and no vtable at all\n- **Size-based boxing** — `tokio::spawn` choosing a representation per monomorphization, invisibly\n- **Type-check probes** — tower shipping a debugging DSL for its own deep generics\n\n## The design stance\nIn these codebases erasure is never a shortcut — it is a ==designed valve== placed at a boundary, with the costs (allocation, vtable dispatch, eagerly-fixed auto-traits, closed sets) accounted against the static alternative. Read each move as a position on the dial, chosen ==per boundary, not per crate==.",
      },
    },
    {
      id: "box-service-valve",
      title: "BoxService: The Pressure Valve",
      content: {
        type: "read",
        markdown:
          "## The shape\nA tower onion a few layers deep has a type name measured in kilobytes — unnameable in a struct field, unreturnable from a function. One call flattens it:\n\n`let svc: BoxService<Request, Response, BoxError> = builder.boxed();`\n\nThree type parameters, storable anywhere. That is the ==pressure valve==: the escape hatch a maximally-generic library ships for the moment its own types become unusable.\n\n## The machinery\n`BoxService` lives in tower's `util/boxed/sync.rs`, and its constructor stacks three tricks:\n\n- **Fix the associated type first.** A `dyn Service` object must pin `type Future` to ONE concrete type — but every service has a different future. So `BoxService::new` first adapts the input with tower's own combinator, `inner.map_future(|f| Box::pin(f))`, normalizing every future to `BoxFuture`. ==The library dogfoods its adapter dialect to build its own eraser.==\n- **`SyncWrapper` does one precise auto-trait job.** Wrapping the box in `sync_wrapper::SyncWrapper` makes `BoxService` be `Sync` without demanding the inner service is — sound because all access goes through `&mut`. A `#[test] fn is_sync()` pins exactly this.\n- **Erasure joins the dialect.** `BoxService::layer()` returns a `LayerFn`, so the eraser itself slots into `ServiceBuilder` chains like any other layer.\n\nA sibling valve erases the *layer* instead: `BoxLayer` is an `Arc<dyn Layer>` — `Arc`, not `Box`, because layers are shared and cloned where services are owned — and it re-boxes every service it ever produces.\n\n## The trade-off\nBuys: nameable, storable types; compile-time and error-message relief — the canonical fix for 'the type name is 4KB'; API stability, since internals can change without moving the public type. Costs: one allocation per service plus ==one per call== (the boxed future), vtable dispatch on the hot path, and auto-trait decisions made eagerly — which is why the valve ships in four variants.",
      },
    },
    {
      id: "dyn-clone-trick",
      title: "Clone Through a Trait Object",
      content: {
        type: "read",
        markdown:
          "## The shape\n`let svc2 = svc.clone();` — where `svc` is a `BoxCloneService<Req, Res, Err>`. Cloning THROUGH a trait object. axum leans on exactly this: every incoming request gets its own clone of the erased middleware stack.\n\n## The machinery\nYou cannot write `Box<dyn Service + Clone>`: `Clone: Sized`, so `Clone` can never be part of a trait object. tower's `util/boxed_clone.rs` routes around the rule with a ==private helper trait==:\n\n- `trait CloneService<R>: Service<R>` adds one method — `clone_box(&self) -> Box<dyn CloneService<...>>`. Returning a box IS object-safe.\n- A ==blanket impl== covers every `T: Service + Clone + Send + 'static`, so nobody ever implements the helper by hand.\n- `impl Clone for BoxCloneService` simply calls `self.0.clone_box()`.\n\nThe helper trait is private — pure machinery, zero public API surface. This is the general-purpose 'dyn-Clone' idiom (the standalone `dyn-clone` crate is the same trick), here specialized with associated-type equality constraints so the clone keeps the same erased signature.\n\n## The trade-off\nBuys: `Clone` semantics for erased stacks — the thing per-request server architectures need — with invisible machinery. Costs: an allocation per clone; the `Send + 'static` bounds propagate to everything boxed; and every auto-trait combination needs its own boxed type — which is precisely why `BoxCloneSyncService` exists as a separate valve.",
      },
    },
    {
      id: "bytes-vtable",
      title: "Bytes: The Hand-Rolled Vtable",
      content: {
        type: "read",
        markdown:
          "## The shape\n`fn consume(data: Bytes)` — one concrete, non-generic type, no lifetime, whether the memory is `Bytes::from_static(b\"hi\")`, a heap `Vec`, or a refcounted view of another buffer. hyper, h2, tonic, and reqwest all speak this one type.\n\n## Three aesthetics, one problem\n- `Arc<dyn AsRef<[u8]>>` — works, but: fat pointer, double indirection, and a ==mandatory refcount even for static memory==\n- `Bytes<T: Storage>` — zero-cost, but the generic ==infects every downstream signature==; ecosystem interop dies when one crate's `Bytes<A>` meets another's `Bytes<B>`\n- what bytes actually ships: a ==hand-rolled vtable stored in the value==\n\n## The machinery\nIn `bytes/src/bytes.rs`, `Bytes` is four words: `ptr`, `len`, an `AtomicPtr<()>` of representation data, and `vtable: &'static Vtable` — a plain struct of `unsafe fn` pointers (`clone`, `drop`, `into_vec`, `is_unique`, …). Each representation gets its own static table: `STATIC_VTABLE`'s clone is a pointer copy and its drop is a no-op; `SHARED_VTABLE` bumps an atomic refcount. `Clone for Bytes` is one indirect call through the table. anyhow plays the same move one better: `anyhow::Error` stores the vtable ==inside the allocation==, making the erased error exactly one word wide — and its extra vtable entries buy bespoke ops like downcast-through-context that `dyn Trait` could never express.\n\n## The trade-off\nBuys: a single nameable type the WHOLE ecosystem can put in signatures, per-representation behavior, and zero cost for the static case. Costs: pages of hand-audited `unsafe` whose invariants the compiler cannot check, and a ==closed set of representations== — third parties cannot add one.",
      },
    },
    {
      id: "enum-dispatch",
      title: "Enum Dispatch: The Closed Set",
      content: {
        type: "read",
        markdown:
          "## The shape\n`ClientWrapper::Tcp(client).get_streams().await?` — polymorphic over transports with ==no box and no vtable==. Or leptos: a component prop typed `Signal<f64>` accepts a signal, a memo, a derived closure, or a plain value, while the component stays non-generic.\n\n## The machinery\nWhen the set of implementations is known and closed, an enum replaces erasure. iggy's `client_wrappers/client_wrapper.rs` wraps each transport client in a variant and hand-writes ==match-delegation impls==: every trait method matches on `self` and forwards to the arm. leptos's `wrappers.rs` does it with `SignalTypes { ReadSignal / Memo / DerivedSignal / Stored }` behind a `Copy` handle — and the `Stored` variant means passing a constant costs no reactive machinery at all.\n\ntower's `Either<A, B>` is the two-variant version: it implements BOTH `Service` and `Layer` by delegation, and `option_layer` turns `Option<L>` into `Either<L, Identity>` — ==conditional middleware with zero boxing==, the identity layer filling the `None` arm.\n\n## The trade-off\nBuys: matchable, `Sized`, no allocation, no vtable — and a stable, non-generic type for public APIs. Costs: ==galactic delegation boilerplate== (every method times every variant); a closed world — adding a variant breaks every `match`; and arms must agree where types meet — `Either` requires both services to share `Response` and `Error`, the exact wall the `BoxError` funnel exists to fix.",
      },
    },
    {
      id: "size-based-boxing",
      title: "The Invisible Boxing Threshold",
      content: {
        type: "read",
        markdown:
          "## The shape\nThere is no shape — that is the point. `tokio::spawn(fut)` looks identical whether the future is 48 bytes or 48 kilobytes. The dial position is chosen ==with no API surface at all==.\n\n## The machinery\nIn tokio's `task/spawn.rs`, spawn reads `std::mem::size_of::<F>()` — a ==compile-time constant per instantiation== — and branches: futures above `BOX_FUTURE_THRESHOLD` go through `Box::pin` before entering the scheduler; small ones move in by value. Because the size is const, the branch ==folds away at monomorphization time==: each call site compiles down to exactly one arm. One call-site shape, two representations, selected per type.\n\n## The trade-off\nBuys: protection from a silent performance cliff — an `async fn` that grows a huge local array would otherwise be memcpy'd by value through every queue in the scheduler — with no API change, no second function, no lint to teach. Costs: a ==hidden heap allocation the user never asked for==, and behavior that differs across an opaque, undocumented threshold. tokio judged the cliff worse than the hidden alloc — a documented aesthetic call, not an accident.",
      },
    },
    {
      id: "type-check-probes",
      title: "Probes for the Deep Onion",
      content: {
        type: "read",
        markdown:
          "## The shape\nA deep `ServiceBuilder` chain fails to compile, and the error points at the final `.service(svc)` — forty lines of trait bounds later, naming none of the layers at fault. The fix is a ==no-op method dropped into the middle of the chain==: `.check_clone()` asserts the stack is `Clone` at that exact line; `.check_service::<S, T, U, E>()` asserts the full signature between two specific layers.\n\n## The machinery\nIn tower's `builder/mod.rs`, `check_service` is an `#[inline]` ==identity function whose entire value is its where-clause==: it takes `self`, returns `self`, and constrains `L: Layer<S>, L::Service: Service<T, Response = U, Error = E>`. Instantiating the method forces the trait solver to prove the property AT THAT POINT in the chain — so one monolithic 'trait bound not satisfied' at the end becomes a pinpointed failure between layer three and layer four. The docs state the purpose plainly: for debugging type errors in builders with lots of layers. This is a library ==shipping a debugging DSL for its own type gymnastics==.\n\n## The trade-off\nBuys: bisectable type errors in deep generic code, at exactly zero runtime cost. Costs: you must know the probes exist (they are for the initiated), and the assertions are written in turbofish. The deeper lesson: when a library chooses the static end of the dial, ==the error-message bill is real== — mature libraries budget for it with tooling instead of pretending it is not there.",
      },
    },
    {
      id: "dial-verdict",
      title: "Choosing Your Spot on the Dial",
      content: {
        type: "read",
        markdown:
          "Every technique in this chapter answers one question: ==where does this boundary sit on the dial?== Here is the rubric the exemplar crates actually follow.\n\n## Stay generic when…\n- the code is a ==hot inner path== — monomorphization buys inlining and zero allocation\n- auto-traits must stay transparent: a generic wrapper is `Send`/`Sync` exactly when its contents are, while a box fixes them ==eagerly== (four `Box*Service` variants say hello)\n- the type never escapes — deep generics inside a crate are free if the public surface hides them\n\n## Erase when…\n- the type crosses a ==public API boundary== — return types, struct fields, collections of heterogeneous implementations\n- compile time or error messages have become the bottleneck — `.boxed()` is the canonical fix\n- configuration happens at ==runtime== — `BoxLayer` lets an environment variable choose middleware while the program keeps one return type\n\n## Take the enum when…\n- the set is ==closed and known== — you get `Sized`, matchable, vtable-free dispatch, and you accept the delegation boilerplate\n\n## The error-channel version\nThe same dial governs errors. tower's `BoxError = Box<dyn Error + Send + Sync>` plus middleware declaring `S::Error: Into<BoxError>` is erasure applied to the error type. `Timeout` MUST widen: it merges the inner service's failures with its own `Elapsed` into one channel, and `Into<BoxError>` (rather than `= BoxError`) keeps concrete-error services compatible. Buys: onions with mixed failure sources compose. Costs: ==type-level error information is destroyed== — recovery is `downcast_ref` and string matching — and the ecosystem bifurcates into typed-error land and BoxError land at exactly the layer where widening appears.\n\n## The verdict\nThe dial is set ==per boundary, not per crate==. tower is maximally generic inside and ships four boxed valves at the edge; bytes is a hand-rolled vtable all the way down; tokio flips representation invisibly per monomorphization. Visualize the call-site you owe your users, name the machinery that produces it, and pay its bill knowingly.",
      },
    },
    {
      id: "fix-future-mcq",
      title: "Why box the future first?",
      content: {
        type: "multiple-choice",
        question:
          "`BoxService::new` does not box the service directly — it first adapts it: `Box::new(inner.map_future(|f| Box::pin(f)))`. What forces that first step?",
        options: [
          "`Box::pin` is the only way to move a `!Unpin` service onto the heap",
          "Boxing the future first starts it eagerly, so the erased service never blocks",
          "A `dyn Service` object must fix `type Future` to one concrete type, so every service's future is normalized to `BoxFuture` before erasure",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "variant-zoo-mcq",
      title: "Why four boxed variants?",
      content: {
        type: "multiple-choice",
        question:
          "tower ships `BoxService`, `UnsyncBoxService`, `BoxCloneService`, AND `BoxCloneSyncService`. Why four erased types instead of one?",
        options: [
          "Erasure fixes auto-trait answers eagerly — Send, Sync, and Clone must be decided at boxing time, so each useful combination needs its own erased type",
          "Each variant targets a different tokio runtime flavor (current-thread vs multi-thread)",
          "They accept different request types; the split keeps request parsing monomorphized",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "clone-object-safety-mcq",
      title: "The clone_box detour",
      content: {
        type: "multiple-choice",
        question:
          "To make `BoxCloneService` cloneable, tower defines a private `CloneService` trait with `fn clone_box(&self) -> Box<dyn CloneService<…>>` plus a blanket impl — instead of just writing `Box<dyn Service + Clone>`. Why the detour?",
        options: [
          "Cloning a trait object directly would also clone its vtable, doubling static memory",
          "`Clone: Sized`, so `Clone` can never be part of a trait object — but a method RETURNING a box is object-safe, and the blanket impl writes it for every `Service + Clone` automatically",
          "Trait objects may only name one lifetime, and adding `Clone` introduces a second",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "bytes-dial-mcq",
      title: "Why Bytes hand-rolls its vtable",
      content: {
        type: "multiple-choice",
        question:
          "`Bytes` needs one type over static, Vec-backed, and refcounted memory. It rejects both `Arc<dyn AsRef<[u8]>>` and a generic `Bytes<T: Storage>` in favor of a hand-written `&'static Vtable` field. What is the win that justifies the unsafe?",
        options: [
          "The manual vtable avoids all the unsafe code that `Arc<dyn>` would require",
          "It lets third-party crates register new memory representations at runtime",
          "One non-generic type the whole ecosystem can name in signatures, with per-representation fn pointers and a zero-cost static case — no refcount tax, no generics infection",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "vtable-behavior-output",
      title: "Vtable dispatch by hand",
      content: {
        type: "multiple-choice",
        question:
          "Bytes' move recreated in safe std: two static vtables of fn pointers, one concrete `Handle` type, per-representation behavior. What does this program print?",
        language: "rust",
        code: `struct Vtable {
    name: fn() -> &'static str,
    double: fn(usize) -> usize,
}

static STATIC_VT: Vtable = Vtable { name: || "static", double: |n| n };
static HEAP_VT: Vtable = Vtable { name: || "heap", double: |n| n * 2 };

struct Handle {
    len: usize,
    vtable: &'static Vtable,
}

impl Handle {
    fn describe(&self) -> String {
        format!("{}:{}", (self.vtable.name)(), (self.vtable.double)(self.len))
    }
}

fn main() {
    let a = Handle { len: 3, vtable: &STATIC_VT };
    let b = Handle { len: 3, vtable: &HEAP_VT };
    println!("{} {}", a.describe(), b.describe());
}`,
        options: ["static:3 heap:6", "static:6 heap:6", "static:3 heap:3"],
        answerIndex: 0,
      },
    },
    {
      id: "size-dispatch-output",
      title: "The threshold branch",
      content: {
        type: "multiple-choice",
        question:
          "tokio's size-based dispatch, miniaturized: `size_of::<T>()` is a compile-time constant, so each instantiation const-folds to one arm. What does this program print?",
        language: "rust",
        code: `fn repr_of<T>(_: &T) -> &'static str {
    if std::mem::size_of::<T>() > 16 { "boxed" } else { "inline" }
}

fn main() {
    let small = [0u8; 8];
    let big = [0u8; 64];
    println!("{} {}", repr_of(&small), repr_of(&big));
}`,
        options: ["inline inline", "inline boxed", "boxed boxed"],
        answerIndex: 1,
      },
    },
    {
      id: "write-box-erase",
      title: "Write: erase a stack by hand",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "The pressure valve, in miniature. Given `pub trait Step { fn run(&self, input: i32) -> i32; }`, write `pub struct BoxStep(Box<dyn Step + Send>);` with a generic constructor `pub fn new<S: Step + Send + 'static>(step: S) -> Self`, and implement `Step` for `BoxStep` by forwarding to the boxed inner — so the erased type still composes like any other Step.",
        solution: `pub trait Step {
    fn run(&self, input: i32) -> i32;
}

pub struct BoxStep(Box<dyn Step + Send>);

impl BoxStep {
    pub fn new<S: Step + Send + 'static>(step: S) -> Self {
        BoxStep(Box::new(step))
    }
}

impl Step for BoxStep {
    fn run(&self, input: i32) -> i32 {
        self.0.run(input)
    }
}`,
      },
    },
    {
      id: "write-fixed-assoc",
      title: "Write: fix the associated type",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "The map_future move. Given `pub trait Parser { type Out; fn parse(&self, input: &str) -> Self::Out; }`, write an adapter `pub struct MapOut<P, F> { inner: P, f: F }` implementing `Parser` (where `P: Parser, F: Fn(P::Out) -> T`, with `type Out = T`), then `pub type BoxParser = Box<dyn Parser<Out = String>>;` and `pub fn boxed<P>(parser: P) -> BoxParser` where `P: Parser + 'static, P::Out: ToString` — wrap `parser` in `MapOut` with a closure calling `.to_string()`, normalizing the associated type so the object is nameable.",
        solution: `pub trait Parser {
    type Out;
    fn parse(&self, input: &str) -> Self::Out;
}

pub struct MapOut<P, F> {
    inner: P,
    f: F,
}

impl<P, F, T> Parser for MapOut<P, F>
where
    P: Parser,
    F: Fn(P::Out) -> T,
{
    type Out = T;
    fn parse(&self, input: &str) -> T {
        (self.f)(self.inner.parse(input))
    }
}

pub type BoxParser = Box<dyn Parser<Out = String>>;

pub fn boxed<P>(parser: P) -> BoxParser
where
    P: Parser + 'static,
    P::Out: ToString,
{
    Box::new(MapOut {
        inner: parser,
        f: |out: P::Out| out.to_string(),
    })
}`,
      },
    },
    {
      id: "write-clone-box",
      title: "Write: the clone_box trick",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Make an erased type Clone. Given `pub trait Step { fn run(&self, input: i32) -> i32; }`, write a private `trait CloneStep: Step` with `fn clone_box(&self) -> Box<dyn CloneStep>;`, a blanket `impl<T: Step + Clone + 'static> CloneStep for T`, then `pub struct BoxCloneStep(Box<dyn CloneStep>);` with `impl Clone for BoxCloneStep` calling `clone_box`.",
        solution: `pub trait Step {
    fn run(&self, input: i32) -> i32;
}

trait CloneStep: Step {
    fn clone_box(&self) -> Box<dyn CloneStep>;
}

impl<T: Step + Clone + 'static> CloneStep for T {
    fn clone_box(&self) -> Box<dyn CloneStep> {
        Box::new(self.clone())
    }
}

pub struct BoxCloneStep(Box<dyn CloneStep>);

impl Clone for BoxCloneStep {
    fn clone(&self) -> Self {
        BoxCloneStep(self.0.clone_box())
    }
}`,
      },
    },
    {
      id: "write-enum-dispatch",
      title: "Write: match-delegation enum",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'iggy\'s ClientWrapper shape. Given `pub trait Backend { fn send(&self, msg: &str) -> String; }` and two impls — `Tcp` returning `format!("tcp:{msg}")` and `Quic` returning `format!("quic:{msg}")` — write `pub enum Client { Tcp(Tcp), Quic(Quic) }` and implement `Backend` for `Client` by matching on `self` and delegating to the arm.',
        solution: `pub trait Backend {
    fn send(&self, msg: &str) -> String;
}

pub struct Tcp;
pub struct Quic;

impl Backend for Tcp {
    fn send(&self, msg: &str) -> String {
        format!("tcp:{msg}")
    }
}

impl Backend for Quic {
    fn send(&self, msg: &str) -> String {
        format!("quic:{msg}")
    }
}

pub enum Client {
    Tcp(Tcp),
    Quic(Quic),
}

impl Backend for Client {
    fn send(&self, msg: &str) -> String {
        match self {
            Client::Tcp(t) => t.send(msg),
            Client::Quic(q) => q.send(msg),
        }
    }
}`,
      },
    },
    {
      id: "write-check-probe",
      title: "Write: a type-check probe",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "tower's check_service, in miniature. Write `pub struct Builder<L> { layer: L }` with `pub fn new(layer: L) -> Self` and `pub fn into_inner(self) -> L`, plus two `#[inline]` identity probes: `pub fn check_clone(self) -> Self where L: Clone` and `pub fn check_transform<T, U>(self) -> Self where L: Fn(T) -> U` — no-op methods whose entire value is their where-clause.",
        solution: `pub struct Builder<L> {
    layer: L,
}

impl<L> Builder<L> {
    pub fn new(layer: L) -> Self {
        Builder { layer }
    }

    pub fn into_inner(self) -> L {
        self.layer
    }

    #[inline]
    pub fn check_clone(self) -> Self
    where
        L: Clone,
    {
        self
    }

    #[inline]
    pub fn check_transform<T, U>(self) -> Self
    where
        L: Fn(T) -> U,
    {
        self
    }
}`,
      },
    },
  ],
  edges: [
    // Concept spine
    { from: "dial-map", to: "box-service-valve" },
    { from: "dial-map", to: "bytes-vtable" },
    { from: "dial-map", to: "enum-dispatch" },
    { from: "dial-map", to: "size-based-boxing" },
    { from: "box-service-valve", to: "dyn-clone-trick" },
    { from: "box-service-valve", to: "type-check-probes" },
    { from: "bytes-vtable", to: "enum-dispatch" },
    { from: "bytes-vtable", to: "dial-verdict" },
    { from: "enum-dispatch", to: "dial-verdict" },
    { from: "size-based-boxing", to: "dial-verdict" },
    { from: "type-check-probes", to: "dial-verdict" },
    // Drills
    { from: "box-service-valve", to: "fix-future-mcq" },
    { from: "box-service-valve", to: "variant-zoo-mcq" },
    { from: "box-service-valve", to: "write-box-erase" },
    { from: "fix-future-mcq", to: "write-fixed-assoc" },
    { from: "write-box-erase", to: "write-fixed-assoc" },
    { from: "dyn-clone-trick", to: "clone-object-safety-mcq" },
    { from: "dyn-clone-trick", to: "write-clone-box" },
    { from: "write-box-erase", to: "write-clone-box" },
    { from: "bytes-vtable", to: "bytes-dial-mcq" },
    { from: "bytes-vtable", to: "vtable-behavior-output" },
    { from: "enum-dispatch", to: "write-enum-dispatch" },
    { from: "size-based-boxing", to: "size-dispatch-output" },
    { from: "type-check-probes", to: "write-check-probe" },
  ],
};
