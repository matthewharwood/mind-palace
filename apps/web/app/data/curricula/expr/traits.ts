import type { Curriculum } from "@mind-palace/curriculum";

import { towerSource } from "./_sources";

// Trait Architecture & the Adapter Dialect — how library authors shape traits
// so call-sites read as sentences: tower's Service (one trait to rule them
// all), the Layer onion and ServiceBuilder's order inversion, the adapter
// dialect (Iterator's register transplanted onto services), tokio's two-layer
// poll-trait + ext-trait split, leptos's verb lattice, and iggy's N+M funnel
// blanket. Bare-std drills are rustc-verified; tower drills compile against
// tower 0.5 in the cargo sandbox via scripts/verify-rust-cards.ts.
export const exprTraits: Curriculum = {
  id: "c-expr-traits",
  title: "Trait Architecture & the Adapter Dialect",
  source: towerSource,
  nodes: [
    {
      id: "traits-map",
      title: "Trait Architecture: The Map",
      content: {
        type: "read",
        markdown:
          "You already write traits, bounds, blanket impls, and default methods cold — the mechanics live back in the Rust fundamentals. This curriculum flips you to the other side of the API: traits as ==architecture==, shaped so that the call-site someone else writes reads exactly the way its designer visualized it.\n\n## Four architectures ahead\n- **One trait to rule them all** — tower's `Service`: an async function frozen as an interface, and why its inputs are generic but its outputs associated\n- **The middleware onion** — `Layer`, `Stack`, `Identity`, and the builder that reverses the wrap order so source order equals request order\n- **The adapter dialect** — `map_request` / `and_then` / `ServiceExt`: the `Iterator` register transplanted onto services\n- **Blanket vocabularies** — tokio's `AsyncRead` / `AsyncReadExt` split, leptos's verb lattice, iggy's N+M transport funnel\n\n## The lens, always\nEvery lesson runs the same triple. ==SHAPE==: the call-site a designer wanted — `svc.ready().await?.call(req).await?`. ==MACHINERY==: the trait shapes that make it legal. ==TRADE-OFF==: what the aesthetic buys and what it costs — because every one of these designs pays real bills in error messages, compile time, or boilerplate, and the authors knew it when they shipped.",
      },
    },
    {
      id: "one-trait-shape",
      title: "Service: One Trait to Rule Them All",
      content: {
        type: "read",
        markdown:
          "## The shape\nEvery client, every server, every middleware in the tower ecosystem is driven identically: `svc.ready().await?.call(request).await?`. hyper, tonic, axum, and tower-lsp all speak this one sentence — middleware written for any of them works with all of them, client-side and server-side alike.\n\n## The machinery\n`tower_service::Service` is an ==async function desugared into a trait by hand==. It declares `trait Service<Request>` with three associated types — `Response`, `Error`, and `Future: Future<Output = Result<Self::Response, Self::Error>>` — plus two methods: `poll_ready` and `fn call(&mut self, req: Request) -> Self::Future`.\n\nWhy hand-desugared? The trait predates async-fn-in-traits, but the nameable `type Future` is still the load-bearing choice: it is what lets middleware chains compose with ==zero boxing==, because each wrapper can name the exact future type of the service it wraps.\n\nThe crate `tower-service` contains *only this trait* — `#![no_std]`, `#![forbid(unsafe_code)]` — deliberately split out so its ==semver can freeze independently== of the middleware zoo in `tower` proper. The docs say it outright: the `Service` and `Layer` traits are integration points for the whole ecosystem, so they live in separate crates and are kept as stable as possible.\n\nAt the bottom of the same file sit three-line ==forwarding impls==: `&mut S` and `Box<S>` implement `Service` whenever `S` does (`?Sized` included, which is what makes `Box<dyn Service>` itself a `Service`). Note what is missing: `&S` is deliberately NOT a `Service` — `call` takes `&mut self`, and the impl set itself encodes the single-caller discipline.\n\n## The trade-off\nBuys: universal interoperability — one trait, an entire ecosystem of protocol-agnostic middleware. Costs: three associated types and two methods of ceremony for one conceptual `async fn`; the `&mut self` receiver forces `Clone`-based sharing idioms; and a real learnability cliff — to implement it, you must understand the desugaring of async itself.",
      },
    },
    {
      id: "in-generic-out-assoc",
      title: "Inputs Generic, Outputs Associated",
      content: {
        type: "read",
        markdown:
          "## The shape\nOne client type can serve two protocols — `impl Service<HttpRequest> for MyClient` and `impl Service<GrpcRequest> for MyClient` coexist on the same type. And generic callers write bounds that read like function signatures: `where S: Service<Job, Response = Receipt>`.\n\n## The machinery\nYou know what generic parameters and associated types *are*; here is the design axis they form. `Service` is deliberately asymmetric:\n\n- `Request` sits in ==input position as a generic parameter== — a type may implement `Service<A>` and `Service<B>` simultaneously, exactly as a closure can be `Fn(A)` and another `Fn(B)`. Overloading-like polymorphism, without overloading.\n- `Response`, `Error`, `Future` sit in ==output position as associated types== — functionally determined by the `(Self, Request)` pair, so callers never spell them and inference flows *outward* from the impl.\n\nThe split mirrors the `Fn` traits themselves: `FnMut<Args>` with its `Output` associated type. tower exploits it downstream — `MakeService` binds the *same* trait at two request types in one where-clause (`M: Service<Target>`, `S: Service<Request>`), and `Layer<S>` repeats the identical input-generic/output-associated split one level up.\n\nThe design rule worth memorizing: ==type parameter = the caller may instantiate many; associated type = the implementor fixes one==.\n\n## The trade-off\nBuys: overload-style flexibility on inputs, unambiguous inference on outputs, bounds that read as signatures. Costs: when a value really does implement `Service` for several requests, the caller pays a turbofish — `ServiceExt::<Cmd>::ready(&mut client)` appears in tower's own docs — and error messages name the whole `(Self, Request)` pair.",
      },
    },
    {
      id: "poll-ready-protocol",
      title: "poll_ready: Backpressure as Protocol",
      content: {
        type: "read",
        markdown:
          "## The shape\nReadiness is a *separate awaitable step* the caller drives: `let svc = svc.ready().await?;` then `svc.call(req)`. Backpressure is not hidden inside the library — it is ==visible at the call-site== as a two-phase sentence: reserve, then spend.\n\n## The machinery\n`Service::poll_ready` is a poll-style ==reservation protocol==, and the docs define the contract precisely: `Poll::Ready(Ok(()))` means you may `call` *once*; `Poll::Ready(Err)` means the service is dead — discard it; and implementations are permitted to *panic* if `call` arrives without a prior ready. This is a protocol, not a hint.\n\nThe reason it propagates: every middleware's `poll_ready` delegates to `self.inner.poll_ready(cx)` — `Timeout` does, `MapRequest` does, all of them do — so a concurrency limit three layers deep ==suspends the outermost caller==. And it is a true reservation: tower's concurrency limiter acquires its semaphore permit *inside* `poll_ready`, not in `call`.\n\nThe famous footgun lives in the docs under \"Be careful when cloning inner services\": ==readiness is state on the specific value you polled== — a clone is not ready just because the original was. The sanctioned idiom is the swap trick: clone the inner service, then `std::mem::replace(&mut self.inner, clone)` to *take the ready original* into your future and leave the fresh clone behind for next time.\n\n## The trade-off\nBuys: composable backpressure and load-shedding with zero allocation — it is just a poll method — plus genuine resource reservation. Costs: a two-phase protocol every caller must honor, the clone-readiness trap, and a permanent tax on the API's reputation: `poll_ready` is the most-debated method in tower's history, kept because removing it would break the backpressure story.",
      },
    },
    {
      id: "layer-onion",
      title: "Layer: Middleware as Values",
      content: {
        type: "read",
        markdown:
          '## The shape\nMiddleware is a *value* you hold, store, and apply: `TimeoutLayer::new(dur).layer(inner_svc)`. Raw composition nests — `l1.layer(l2.layer(l3.layer(svc)))` — and axum rents the whole idea wholesale: `router.layer(anything_from_tower)` applies one layer to every route.\n\n## The machinery\n`tower_layer::Layer` is another one-trait crate, frozen for the same semver reason as `Service`: `trait Layer<S>` with `type Service` and `fn layer(&self, inner: S) -> Self::Service`. The docs frame it exactly: if a `Service` is an async function from request to response, a ==Layer is a function from services to services==. Same input-generic/output-associated split you already know, one level up — and the output type is *statically computed*: `Layer<S> for TimeoutLayer` fixes `type Service = Timeout<S>`.\n\nComposition is itself a type. `Stack<Inner, Outer>` is a ==cons cell for layers==: its `Layer` impl requires `Inner: Layer<S>` and `Outer: Layer<Inner::Service>` — the associated type of one bound *feeds the next bound*. Applying it runs `self.outer.layer(self.inner.layer(service))`. Name this idiom: ==threading associated types through where-clauses is how Rust does type-level function composition==.\n\nThe unit exists too: `Identity` with `type Service = S` just hands `inner` back. Together `Identity` (unit) and `Stack` (associative product) make layers a ==monoid== — which is why `ServiceBuilder::new()` is a valid do-nothing pipeline and `Option<Layer>` gets a well-typed `None` arm via `Either<L, Identity>`.\n\n## The trade-off\nBuys: middleware as first-class values — storable, clonable, conditionally applicable, reusable across protocols and across client/server. Costs: one wrapper type per application — `Timeout<LogService<Buffer<S>>>` — so every layer doubles the angle-bracket depth in diagnostics. tower even hand-tuned `Stack`\'s `Debug` impl to flatten the nesting because the raw output was "very noisy" — a confession, committed to the repo.',
      },
    },
    {
      id: "builder-inversion",
      title: "ServiceBuilder: The Order Inversion",
      content: {
        type: "read",
        markdown:
          "## The shape\nThe builder reads top-down like the request's journey: in `ServiceBuilder::new().buffer(100).concurrency_limit(10).timeout(d).service(svc)`, the buffer sees the request *first* and `svc` sees it *last*. Compare the raw onion, where the last-written layer runs first — `buffer.layer(limit.layer(timeout.layer(svc)))` reads inside-out.\n\n## The machinery\nOne line does it. `ServiceBuilder::layer` returns `ServiceBuilder<Stack<T, L>>`, built as `Stack::new(layer, self.layer)` — the ==new layer is pushed into Stack's *inner* slot== with everything added earlier as `outer`. Since `Stack` applies inner first and then wraps with outer, ==earlier-added layers end up outermost==. The builder is a fold that reverses the wrap order so that source order equals flow order. The doc header states the contract: layers that are added first will be called with the request first.\n\nEvery named method is one-line sugar over `.layer(...)` — `.timeout(d)` is `self.layer(TimeoutLayer::new(d))` with a fully spelled return type, feature-gated per middleware — and the generic `.layer()` escape hatch is what lets *other crates* join the sentence.\n\n## Ordering is semantics\nThis is not style. tower's docs show `.buffer(100).concurrency_limit(10)` versus the reverse: buffer-outside queues up to 100 requests *while* 10 hold the limit, roughly 110 in flight; limit-outside caps everything at 10 and the buffer starves. Same two layers, different program.\n\n## The trade-off\nBuys: the single biggest readability win in the library — middleware config reads as a pipeline diagram. Costs: two mental models now circulate (raw `.layer()` nesting versus builder order), a classic source of off-by-one-onion bugs — and the inversion is invisible in the types. Only behavior reveals it.",
      },
    },
    {
      id: "adapter-dialect",
      title: "The Adapter Dialect",
      content: {
        type: "read",
        markdown:
          '## The shape\nServices compose exactly like `Iterator` chains: `base.map_request(f).and_then(g).map_err(Error::from)`. One import — `use tower::ServiceExt;` — and the combinators light up on *every* service, including foreign types like a hyper client. Muscle memory from `Iterator`, `Option`, and `futures` transfers wholesale: this is ==the adapter dialect==, Rust\'s most portable API register.\n\n## The machinery\nEach combinator is a wrapper struct `{ inner: S, f: F }` implementing `Service` with bounds that mirror `Iterator` adapters. `MapRequest` is the minimal specimen: it forwards `Response`, `Error`, and even ==`type Future = S::Future`== — zero new future type — and its `call` is one line: `self.inner.call((self.f)(request))`.\n\nThe methods hang off `ServiceExt`, a ==blanket extension trait==: every method has a default body that just constructs the adapter, and one unconditional blanket impl — `impl<T: ?Sized, Request> ServiceExt<Request> for T where T: Service<Request>` — retrofits the whole vocabulary onto every implementor (the RFC 445 pattern). The split is architectural: the frozen interface crate stays one trait; the ergonomics evolve freely in the utility crate. A `where Self: Sized` on each method keeps the trait dyn-compatible.\n\nEvery adapter also ships as ==twins==: `MapRequest` the value-position combinator, `MapRequestLayer where F: Clone` the pipeline-position layer, plus a mirrored `ServiceBuilder` method. One behavior, three spellings, one implementation.\n\n## The trade-off\nBuys: instant familiarity, laziness, zero-cost inlineable composition. Costs: each adapter is ~100 lines of struct + impls + Layer twin for what an HKT language writes in one; `F: Clone` leaks into the layer twins; type names accrete (`MapErr<AndThen<MapRequest<S, F1>, F2>, F3>`); and the import is invisible at the call-site — "where did this method come from" is the price of every extension trait. Blankets are forever: you can never un-blanket without breaking the world.',
      },
    },
    {
      id: "two-layer-ext",
      title: "Two Audiences: AsyncRead + AsyncReadExt",
      content: {
        type: "read",
        markdown:
          "## The shape\nConsumers write async one-liners and never meet `Pin`: `stream.read(&mut buf).await?`, `stream.write_all(b\"hi\").await?`, `stream.read_u32().await?`. Implementors write poll functions where `Pin` is explicit: `fn poll_read(self: Pin<&mut Self>, cx: &mut Context, buf: &mut ReadBuf) -> Poll<io::Result<()>>`. ==Two audiences, two shapes, one trait family.==\n\n## The machinery\ntokio splits the surface in two layers. The core trait `AsyncRead` is minimal and poll-shaped — the principled contract adapters and protocol libraries implement. The ergonomics live in `AsyncReadExt` with the blanket `impl<R: AsyncRead + ?Sized> AsyncReadExt for R {}` — the same extension-trait move as `ServiceExt`, now carrying async I/O.\n\nThe trick that hides `Pin`: every ext method bounds ==`Self: Unpin` and takes `&mut self`==, so the future it returns can call `Pin::new(&mut *reader)` internally. `Pin` never reaches the caller. Each method returns a ==named future struct== — `Read<'a, R>`, `ReadExact<'a, R>` — and the numeric families (`read_u8` through `read_i128_le`) are macro-generated. Deref-forwarding macros implement `AsyncRead` for `&mut T` and `Box<T>` so call-sites stay uniform across ownership shapes.\n\nThis two-layer pattern — poll-shaped core for implementors, blanket ext trait with `Unpin`-bounded methods for consumers — is ==the single most reusable API idiom in the async ecosystem==. futures, tokio, and tower all use it.\n\n## The trade-off\nBuys: both audiences served without compromise — implementors get a small honest contract, consumers get `std::io`-familiar sentences with `.await`. Named futures buy API stability and visible where-clauses in docs. Costs: an enormous volume of hand- and macro-written future structs for the library author, and the `Self: Unpin` bound excludes self-referential readers from the ext methods — the rare `!Unpin` stream must be pinned first, exactly where the seam shows.",
      },
    },
    {
      id: "verb-lattice",
      title: "Verb Lattices: Blanket Pyramids",
      content: {
        type: "read",
        markdown:
          '## The shape\nIn leptos, one small verb vocabulary works uniformly on *every* reactive type — signal, memo, resource, store field: `count.get()`, `count.set(1)`, `count.with(|v| v.len())`, `count.update(|v| *v += 1)`, `count.get_untracked()`, `count.read()`. Roughly twenty verbs, and none of them is an inherent method.\n\n## The machinery\n`reactive_graph/src/traits.rs` defines ==four primitive capability traits== — `Track` (subscribe), `Notify` (wake subscribers), `ReadUntracked` (raw read, carries `type Value`), and `Write` (raw mutable access) — and composes everything else as ==blanket impls stacked into a pyramid==:\n\n- `impl<T: Track + ReadUntracked> Read for T` — track, then read raw\n- `impl<T: Read> With for T` — read, then borrow into a closure\n- `impl<T: With> Get for T where T::Value: Clone` — `with` plus `Clone::clone` *as* the closure\n\nA mirror stack runs on the write side (`Write` → `Update` → `Set`), plus `*_untracked` parallels of everything. The module docs state the design plainly: most traits are combinations of more primitive base traits, blanket implemented for all types that implement those. A new reactive type implements ==2–4 primitives and inherits the entire vocabulary==.\n\nThe subtlety that makes it art: the ==read cost is chosen syntactically at the call-site==. `.get()` clones, `.with()` borrows, `.read()` returns a guard — and the `Clone` bound exists *only* on the verb that copies. Signals of non-`Clone` values still get the whole `with`/`read` side of the lattice.\n\n## The trade-off\nBuys: enormous API uniformity — docs, muscle memory, and generic code transfer across every reactive type — plus cheap extension and pay-for-what-you-write performance transparency. Costs: prelude dependence (`use leptos::prelude::*` or nothing resolves); bound-soup diagnostics — `.get()` on a non-`Clone` value complains through `Get` via `With` via `Read`, and rustc never says "use `.with()` instead"; and a guard-deadlock edge if `.read()` is held across a write.',
      },
    },
    {
      id: "funnel-blanket",
      title: "Iggy's Funnel: N+M, Not N×M",
      content: {
        type: "read",
        markdown:
          "## The shape\nOne bound, eleven domains of methods: `async fn admin(c: &impl Client)` can call `c.create_stream(...)`, `c.create_user(...)`, `c.ping()`. And on the implementor side, a transport author writes ==one raw method== — `send_raw_with_response(code, payload)` — and inherits ~70 typed client methods for free.\n\n## The machinery\nTwo moves in apache/iggy. First, the ==facet supertrait==: `trait Client: StreamClient + TopicClient + UserClient + ...` — the fat trait is a union of per-domain facet traits, each in its own file under `core/common/src/traits/`, mirroring the wire protocol's command namespaces. Callers who want less accept less: `fn f(c: &impl StreamClient)` is a narrow bound on demand.\n\nSecond, the ==funnel blanket==: `impl<B: BinaryClient> StreamClient for B` (and eleven siblings) implements every facet method as the same four-step body — auth-guard, build the typed request struct, push it through `self.send_raw_with_response(CODE, bytes)`, decode the typed response. TCP, QUIC, and WebSocket clients each implement the raw funnel once. ==N transports × M command families collapses to N + M code.==\n\nThis is the same economics serde runs at planetary scale — mirrored trait pairs meeting at a narrow waist so N formats and M types never multiply — here in a form small enough to read in one sitting.\n\n## The trade-off\nBuys: the cross-product economy, and a ==single choke point== for cross-cutting concerns — auth, tracing, and version gating live in one blanket body instead of N transports × M methods. Costs: blanket rigidity — coherence rules mean a transport cannot override just one command's behavior without opting out of the entire blanket — plus eleven traits' worth of indirection between a caller and the wire.",
      },
    },
    {
      id: "why-assoc-output",
      title: "Why Outputs Are Associated",
      content: {
        type: "multiple-choice",
        question:
          "In `tower_service::Service`, the request is a generic parameter (`Service<Request>`) while `Response`, `Error`, and `Future` are associated types. What does putting the outputs in associated position buy?",
        options: [
          "It lets one service type produce several different response types for the same request type",
          "It makes `Box<dyn Service>` possible, since associated types are erased automatically",
          "Outputs become functionally determined by `(Self, Request)` — inference flows outward, and generic callers write `Service<Job, Response = Receipt>` like a fn signature",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "clone-ready-trap",
      title: "The Clone-Readiness Trap",
      content: {
        type: "multiple-choice",
        question:
          'tower\'s `Service` docs warn: "Be careful when cloning inner services." After `self.inner` reports ready, the sanctioned idiom clones the inner service and then calls `std::mem::replace(&mut self.inner, clone)`. Why swap instead of just calling the fresh clone?',
        options: [
          "Readiness is state on the specific value you polled — the clone starts unready, so you take the READY original into your future and leave the clone behind for next time",
          "Clones share a readiness flag with the original, so calling the clone would consume the original's permit twice",
          "`mem::replace` is required because `call` consumes the service by value",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "builder-order-mcq",
      title: "Ordering Is Semantics",
      content: {
        type: "multiple-choice",
        question:
          "A stack is assembled with `ServiceBuilder::new().buffer(100).concurrency_limit(10).service(svc)`. Which layer sees an incoming request first, and what behavior does this order produce?",
        options: [
          "The concurrency limit — builder methods wrap outward, so the last-added layer is outermost and at most 10 requests ever reach the buffer",
          "The buffer — layers added first sit outermost, so up to 100 requests queue in it while at most 10 hold the limit into `svc`",
          "Neither — `Stack` normalizes layer order at the type level, so both spellings produce identical services",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "onion-order-output",
      title: "Trace the Onion",
      content: {
        type: "multiple-choice",
        question:
          "This mini ServiceBuilder folds layers the way tower does — each earlier-added layer must wrap outermost, so the fold iterates the added layers in reverse. What does this program print?",
        language: "rust",
        code: `trait Service {
    fn call(&mut self, req: String) -> String;
}

struct Echo;
impl Service for Echo {
    fn call(&mut self, req: String) -> String {
        req
    }
}

struct Tag {
    name: &'static str,
    inner: Box<dyn Service>,
}
impl Service for Tag {
    fn call(&mut self, req: String) -> String {
        self.inner.call(format!("{req}>{}", self.name))
    }
}

fn main() {
    let added = ["a", "b"]; // builder order: .layer(a).layer(b)
    let mut svc: Box<dyn Service> = Box::new(Echo);
    for name in added.into_iter().rev() {
        svc = Box::new(Tag { name, inner: svc });
    }
    println!("{}", svc.call(String::from("req")));
}`,
        options: ["req>a>b", "req>b>a", "req"],
        answerIndex: 0,
      },
    },
    {
      id: "two-layer-why",
      title: "Why Hide Pin Behind Ext?",
      content: {
        type: "multiple-choice",
        question:
          "tokio's `AsyncRead::poll_read` takes `self: Pin<&mut Self>`, yet consumers write `stream.read(&mut buf).await` and never see `Pin`. What makes that ergonomic shape work?",
        options: [
          "`read` is a provided method on `AsyncRead` itself, and provided methods are exempt from the `Pin` receiver requirement",
          "The compiler automatically pins any receiver whose method returns a future, so the pinning is implicit",
          "`AsyncReadExt::read` bounds `Self: Unpin` and takes `&mut self`, so the returned `Read<'a, R>` future can call `Pin::new(&mut *reader)` internally",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "get-clone-bound",
      title: "The Clone Bound on .get()",
      content: {
        type: "multiple-choice",
        question:
          "In leptos, `sig.get()` requires the signal's value type to be `Clone`, but `sig.with(|v| v.len())` works for any value type. Where does the difference come from?",
        options: [
          "Signals store values in a shared arena, and the arena requires `Clone` to hand values out",
          "`Get`'s blanket impl is literally `With` plus `Clone::clone` as the closure — the bound lives only on the verb that copies the value out",
          "`.get()` subscribes the caller to the signal, and subscription requires cloning the value into the subscriber list",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "funnel-why",
      title: "Why Blanket the Facets?",
      content: {
        type: "multiple-choice",
        question:
          "iggy ships ~12 command facets (`StreamClient`, `TopicClient`, ...) and several transports (TCP, QUIC, WebSocket). Why implement each facet once as `impl<B: BinaryClient> StreamClient for B` instead of hand-implementing every facet on every transport?",
        options: [
          "N transports × M facets collapses to N + M — each transport writes one raw send funnel, and auth/tracing get a single choke point in the blanket body",
          "Blanket impls let each transport override individual commands with transport-specific optimizations",
          "Rust's coherence rules require a blanket impl whenever a trait and its implementors live in different crates",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "write-service-layer",
      title: "Write: a Service + Layer Twin",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Build real tower middleware. Write `pub struct Prefix<S> { inner: S, prefix: &'static str }` and implement `Service<String>` for it where `S: Service<String>`: reuse the inner future directly (`type Future = S::Future`), forward `poll_ready` to `self.inner`, and in `call` prepend `self.prefix` to the request with `format!` before delegating. Then write its twin `pub struct PrefixLayer { pub prefix: &'static str }` implementing `Layer<S>` with `type Service = Prefix<S>`. Start with `use std::task::{Context, Poll};` and `use tower::{Layer, Service};`.",
        solution: `use std::task::{Context, Poll};
use tower::{Layer, Service};

pub struct Prefix<S> {
    inner: S,
    prefix: &'static str,
}

impl<S: Service<String>> Service<String> for Prefix<S> {
    type Response = S::Response;
    type Error = S::Error;
    type Future = S::Future;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: String) -> Self::Future {
        self.inner.call(format!("{}{req}", self.prefix))
    }
}

pub struct PrefixLayer {
    pub prefix: &'static str,
}

impl<S: Service<String>> Layer<S> for PrefixLayer {
    type Service = Prefix<S>;

    fn layer(&self, inner: S) -> Self::Service {
        Prefix {
            inner,
            prefix: self.prefix,
        }
    }
}`,
      },
    },
    {
      id: "write-stack-identity",
      title: "Write: Stack & Identity",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Rebuild tower-layer's composition machinery against the real trait. With `use tower::Layer;`, write `pub struct Identity;` implementing `Layer<S>` with `type Service = S` (hand `inner` straight back), then `pub struct Stack<Inner, Outer>` with private fields, a `pub fn new(inner: Inner, outer: Outer)` constructor, and `impl<S, Inner, Outer> Layer<S> for Stack<Inner, Outer>` where `Inner: Layer<S>` and `Outer: Layer<Inner::Service>` — apply the inner layer first, then wrap the result with the outer layer.",
        solution: `use tower::Layer;

pub struct Identity;

impl<S> Layer<S> for Identity {
    type Service = S;

    fn layer(&self, inner: S) -> Self::Service {
        inner
    }
}

pub struct Stack<Inner, Outer> {
    inner: Inner,
    outer: Outer,
}

impl<Inner, Outer> Stack<Inner, Outer> {
    pub fn new(inner: Inner, outer: Outer) -> Self {
        Stack { inner, outer }
    }
}

impl<S, Inner, Outer> Layer<S> for Stack<Inner, Outer>
where
    Inner: Layer<S>,
    Outer: Layer<Inner::Service>,
{
    type Service = Outer::Service;

    fn layer(&self, service: S) -> Self::Service {
        self.outer.layer(self.inner.layer(service))
    }
}`,
      },
    },
    {
      id: "write-ext-trait",
      title: "Write: an Extension Trait",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "ServiceExt, distilled to std. Write `pub trait Transform { fn apply(&self, input: i32) -> i32; }`, an adapter `pub struct Chained<A, B> { pub first: A, pub second: B }` implementing `Transform` by feeding `first`'s output into `second`, then the extension trait `pub trait TransformExt: Transform` with a default-body method `then<B: Transform>(self, second: B) -> Chained<Self, B>` (bounded `where Self: Sized`) that constructs the adapter — and finally the unconditional blanket `impl<T: Transform + ?Sized> TransformExt for T {}`.",
        solution: `pub trait Transform {
    fn apply(&self, input: i32) -> i32;
}

pub struct Chained<A, B> {
    pub first: A,
    pub second: B,
}

impl<A: Transform, B: Transform> Transform for Chained<A, B> {
    fn apply(&self, input: i32) -> i32 {
        self.second.apply(self.first.apply(input))
    }
}

pub trait TransformExt: Transform {
    fn then<B: Transform>(self, second: B) -> Chained<Self, B>
    where
        Self: Sized,
    {
        Chained {
            first: self,
            second,
        }
    }
}

impl<T: Transform + ?Sized> TransformExt for T {}`,
      },
    },
    {
      id: "write-verb-lattice",
      title: "Write: a Verb Lattice",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Build leptos's pyramid in std (simplified: reads return owned values instead of guards). Write the primitives `pub trait Track { fn track(&self); }` and `pub trait ReadUntracked { type Value; fn read_untracked(&self) -> Self::Value; }`. Then stack the blankets: `Read: ReadUntracked` blanket-implemented for `T: Track + ReadUntracked` (track, then read raw); `With: Read` blanket-implemented for `T: Read` with `fn with<U>(&self, f: impl FnOnce(&Self::Value) -> U) -> U`; and `Get: With` blanket-implemented for `T: With where T::Value: Clone` whose `get` is `self.with(Self::Value::clone)`. Finish with `pub struct Constant(pub i32);` implementing only the two primitives (`track` is a no-op) — it inherits `read`, `with`, and `get` for free.",
        solution: `pub trait Track {
    fn track(&self);
}

pub trait ReadUntracked {
    type Value;
    fn read_untracked(&self) -> Self::Value;
}

pub trait Read: ReadUntracked {
    fn read(&self) -> Self::Value;
}

impl<T: Track + ReadUntracked> Read for T {
    fn read(&self) -> Self::Value {
        self.track();
        self.read_untracked()
    }
}

pub trait With: Read {
    fn with<U>(&self, f: impl FnOnce(&Self::Value) -> U) -> U;
}

impl<T: Read> With for T {
    fn with<U>(&self, f: impl FnOnce(&Self::Value) -> U) -> U {
        f(&self.read())
    }
}

pub trait Get: With {
    fn get(&self) -> Self::Value;
}

impl<T: With> Get for T
where
    T::Value: Clone,
{
    fn get(&self) -> Self::Value {
        self.with(Self::Value::clone)
    }
}

pub struct Constant(pub i32);

impl Track for Constant {
    fn track(&self) {}
}

impl ReadUntracked for Constant {
    type Value = i32;
    fn read_untracked(&self) -> i32 {
        self.0
    }
}`,
      },
    },
    {
      id: "write-funnel",
      title: "Write: the Transport Funnel",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Recreate iggy\'s N+M economics in std. Write the funnel trait `pub trait BinaryTransport { fn send_raw(&self, code: u32, payload: String) -> String; }` and a facet `pub trait StreamOps` with `create_stream(&self, name: &str) -> String` and `delete_stream(&self, name: &str) -> String`. Blanket-implement `StreamOps` for every `T: BinaryTransport`: `create_stream` sends code 1 with payload `format!("create:{name}")`, `delete_stream` sends code 2 with `format!("delete:{name}")`. Then write `pub struct TcpTransport;` implementing only `send_raw` (return `format!("tcp[{code}]:{payload}")`) — one method written, the whole facet inherited.',
        solution: `pub trait BinaryTransport {
    fn send_raw(&self, code: u32, payload: String) -> String;
}

pub trait StreamOps {
    fn create_stream(&self, name: &str) -> String;
    fn delete_stream(&self, name: &str) -> String;
}

impl<T: BinaryTransport> StreamOps for T {
    fn create_stream(&self, name: &str) -> String {
        self.send_raw(1, format!("create:{name}"))
    }

    fn delete_stream(&self, name: &str) -> String {
        self.send_raw(2, format!("delete:{name}"))
    }
}

pub struct TcpTransport;

impl BinaryTransport for TcpTransport {
    fn send_raw(&self, code: u32, payload: String) -> String {
        format!("tcp[{code}]:{payload}")
    }
}`,
      },
    },
  ],
  edges: [
    // Concept spine
    { from: "traits-map", to: "one-trait-shape" },
    { from: "one-trait-shape", to: "in-generic-out-assoc" },
    { from: "one-trait-shape", to: "poll-ready-protocol" },
    { from: "one-trait-shape", to: "layer-onion" },
    { from: "layer-onion", to: "builder-inversion" },
    { from: "one-trait-shape", to: "adapter-dialect" },
    { from: "layer-onion", to: "adapter-dialect" },
    { from: "adapter-dialect", to: "two-layer-ext" },
    { from: "adapter-dialect", to: "verb-lattice" },
    { from: "adapter-dialect", to: "funnel-blanket" },
    // Drills
    { from: "in-generic-out-assoc", to: "why-assoc-output" },
    { from: "poll-ready-protocol", to: "clone-ready-trap" },
    { from: "builder-inversion", to: "builder-order-mcq" },
    { from: "layer-onion", to: "onion-order-output" },
    { from: "builder-inversion", to: "onion-order-output" },
    { from: "two-layer-ext", to: "two-layer-why" },
    { from: "verb-lattice", to: "get-clone-bound" },
    { from: "funnel-blanket", to: "funnel-why" },
    { from: "poll-ready-protocol", to: "write-service-layer" },
    { from: "layer-onion", to: "write-service-layer" },
    { from: "write-service-layer", to: "write-stack-identity" },
    { from: "builder-inversion", to: "write-stack-identity" },
    { from: "adapter-dialect", to: "write-ext-trait" },
    { from: "verb-lattice", to: "write-verb-lattice" },
    { from: "write-ext-trait", to: "write-verb-lattice" },
    { from: "funnel-blanket", to: "write-funnel" },
    { from: "write-ext-trait", to: "write-funnel" },
  ],
};
