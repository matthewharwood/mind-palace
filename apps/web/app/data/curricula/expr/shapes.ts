import type { Curriculum } from "@mind-palace/curriculum";

import { axumSource } from "./_sources";

// Call-Site Shapes: The Magic Fn — the flagship of the Expressive Rust path.
// Why any plain `async fn(State(db), Path(id), Json(body)) -> Json<User>` is
// accepted with zero registration: Handler blanket impls over fn types,
// all_the_tuples! variadics, marker-type coherence (taught ONCE here, shared
// with bevy's SystemParamFunction and leptos props), the FromRequestParts vs
// FromRequest body-slot split, the tuple response grammar, and the
// error-message bill with #[debug_handler] as repayment. Bare-rust drills are
// rustc-verified; axum drills are cargo-sandbox checked (axum 0.8) by
// scripts/verify-rust-cards.ts.
export const exprShapes: Curriculum = {
  id: "c-expr-shapes",
  title: "Call-Site Shapes: The Magic Fn",
  source: axumSource,
  nodes: [
    {
      id: "shapes-map",
      title: "Call-Site Shapes: The Map",
      content: {
        type: "read",
        markdown:
          'Sketch the call site you wish existed: `async fn create_user(State(db): State<Db>, Path(id): Path<Uuid>, Json(body): Json<CreateUser>) -> (StatusCode, Json<User>)` — then hand the bare function to `post(create_user)`. No trait implemented by you, no registration macro, no ceremony. It compiles, extracts, and responds. This curriculum answers one question: ==who did the work, and where?==\n\n## The method: shape → machinery → trade-off\nEvery lesson in the Expressive Rust path follows one triple:\n\n- **The shape** — the call site someone *designed*, shown exactly as users write it\n- **The machinery** — the traits, blanket impls, markers, and macros that make it legal\n- **The trade-off** — what the aesthetic buys, and the bill it runs up\n\nYou are switching sides. g-rust and g-std taught you to *use* APIs like this; here you learn to *build* them. Traits, generics, closures, and `async fn` syntax are assumed cold — they are raw material now, not lessons.\n\n## Why this shape is the flagship\nThe pattern above — call it the ==magic fn== — is the most copied call-site in the Rust ecosystem. axum accepts any `async fn` as an HTTP handler. bevy accepts any `fn sys(time: Res<Time>, q: Query<&mut Health>)` as an ECS system. leptos accepts plain functions as components. Three frameworks, three domains, ==one identical trick==: a trait describing "things valid in this position," blanket-implemented over ordinary function types, made coherent by marker generics, stamped out per arity by a tuple macro.\n\nBy the end of this curriculum you can build that trick from scratch in plain std — and you will know exactly what it costs.',
      },
    },
    {
      id: "magic-fn",
      title: "The Magic Fn: Any Fn Is a Handler",
      content: {
        type: "read",
        markdown:
          '## The shape\n`Router::new().route("/users/{id}", post(create_user))` — where `create_user` is any plain `async fn`. Zero arguments works. Sixteen works. Reordering the non-body extractors works. Nothing at the call site hints at why.\n\n## The machinery\n`Handler<T, S>` in `axum/src/handler/mod.rs` is a trait implemented *for function types themselves*, once per arity, by the `impl_handler!` macro. The generated impl reads: for any `F: FnOnce(T1, ..., Tn) -> Fut` where every parameter type is an extractor and the future\'s output is `IntoResponse`, `F` is a `Handler`. Your function never opts in — ==the blanket impl reaches out and claims it==.\n\nThe generated `call` body is a straight-line pipeline:\n\n- split the request: `let (mut parts, body) = req.into_parts()`\n- for each non-final parameter, await `Ti::from_request_parts(&mut parts, &state)` — on failure, ==early-return `rejection.into_response()`==\n- await the final parameter\'s `from_request(req, &state)`\n- run your function and convert: `self(t1, ..., tn).await.into_response()`\n\nNote where errors go: a failed extractor never reaches your function body. Its `Rejection: IntoResponse` becomes the HTTP response directly — ==error handling is pre-userland==.\n\n## The trade-off\nBuys: near-zero ceremony, one mental model ("arguments in, response out"), and handlers stay ==plain testable functions== — call `create_user(...)` in a unit test with hand-built arguments, no framework running. Costs: when a signature does not fit, the compiler reports `the trait Handler<_, _> is not implemented` for the whole fn — not *which argument* is wrong; a `Box::pin` allocation per call; a hard 16-arity ceiling; a wall of macro-generated impls in the docs. The costs get their own lesson — expressiveness debt always comes due.',
      },
    },
    {
      id: "all-tuples",
      title: "all_the_tuples!: Fake Variadics",
      content: {
        type: "read",
        markdown:
          "Rust has no variadic generics — yet axum's `Handler` works at every arity from 0 to 16. The gap is bridged by ==one higher-order macro==.\n\n## The shape\nInvisible. It is *why* `post(f)` accepts `f` with one argument or seven, identically.\n\n## The machinery\n`all_the_tuples!` in `axum-core/src/macros.rs` takes ==a macro as its argument== and calls it once per arity: `$name!([T1], T2);`, then `$name!([T1, T2], T3);`, up through sixteen. Each invocation hands the callback a *prefix list* plus the *last element split off*, so the final position can carry different bounds — that asymmetry becomes the body-slot rule.\n\nOne list, many consumers: `impl_handler!` (handlers), `impl_from_request!` (tuple extractors), `impl_into_response!` (tuple responses), `impl_service!` (middleware fns). Fix the arity list once and every impl family follows. bevy rides the same machinery through the `variadics_please::all_tuples` crate; its `impl_system_function!` is a sibling of `impl_handler!`.\n\nA second variant, `all_the_tuples_no_last_special_case!`, hands over flat lists instead — used when every position is homogeneous. The two variants are themselves a design signal: ==does your grammar privilege one position, or treat all positions alike?==\n\n## The trade-off\nBuys: variadic generics in a language without them, and a single source of truth for the arity ceiling. Costs: 16 × N generated impls inflate compile time and rustdoc into a wall; the cap is arbitrary and hard-coded (a 17-argument handler is simply illegal); and macro-generated impls are invisible to go-to-definition — ==the machinery hides from the very tools that could teach it==.",
      },
    },
    {
      id: "body-slot",
      title: "Ownership Becomes Argument Position",
      content: {
        type: "read",
        markdown:
          '## The shape\n`async fn ok(State(s): State<App>, Json(b): Json<T>)` compiles. Swap the two parameters and it does not. Users feel this as a rule learned out-of-band: ==the body extractor goes last==.\n\n## The machinery\nTwo traits split by ownership in `axum-core/src/extract/mod.rs`. `FromRequestParts` receives `&mut Parts` — headers, URI, extensions: shareable, extractable many times. `FromRequest` receives the whole `Request` *by value* — because the body is a stream that can be ==consumed exactly once==.\n\n`impl_handler!` then encodes the rule positionally: every non-final parameter is bounded by `FromRequestParts<S>`, and only the last by `FromRequest<S, M>`. A *runtime* streaming fact — you cannot read the body twice — becomes an *argument-position* rule the compiler enforces. The ownership semantics (`&mut` borrow vs by-value move) carry the resource-linearity proof.\n\nContrast the alternative: actix-web historically surfaced the same constraint as a runtime "payload already consumed" failure. axum moved the failure to compile time by ==spending an argument position on it==. bevy mirrors the move from the other end — its `In<T>` pipeline input must be the *first* parameter of a system.\n\n## The trade-off\nBuys: double-consuming the body is unrepresentable, so an entire runtime-panic class does not exist. Costs: positional rules are invisible until violated — and the violation error is the *symptom* (`Json<T>` does not implement `FromRequestParts`), not the rule. Nothing in the signature says "last is special." Designed constraints that live in argument order must be taught, because they cannot be discovered.',
      },
    },
    {
      id: "marker-coherence",
      title: "Marker Types: Rust's Overloading",
      content: {
        type: "read",
        markdown:
          'This is the load-bearing trick of the whole path — taught once, here. axum, bevy, and leptos all depend on it.\n\n## The shape\nMany shapes valid in ONE slot: `add_systems(Update, my_fn)` accepts fns of any arity; `add_plugins((physics_fn, AudioPlugin::default()))` accepts bare fns, structs, and tuples of both; `post(handler)` accepts every handler arity. Overloading — in a language that has none.\n\n## The machinery\nCoherence forbids what these APIs need. `impl Handler for F where F: Fn(A)` and `impl Handler for F where F: Fn(A, B)` overlap: rustc ==cannot prove a type implements only one Fn signature==, so the two blanket impls are rejected. The dodge: add a generic parameter the impls instantiate *differently*. `Handler<T, S>` carries the tuple of extractor types — one-arg fns implement `Handler<(M, T1), S>`, two-arg fns `Handler<(M, T1, T2), S>` — ==distinct trait instantiations, no overlap==. axum\'s own docs call `T` "a workaround for trait coherence rules." Inference resolves it silently at every real call site.\n\nEach framework picks its own marker vocabulary:\n\n- **bevy systems** — `SystemParamFunction<Marker>` uses the function-pointer type itself as the marker: `fn(A, B) -> Out` (`bevy_ecs/src/system/function_system.rs`)\n- **bevy plugins** — sealed unit structs `PluginMarker`, `PluginGroupMarker`, `PluginsTupleMarker` in `bevy_app/src/plugin.rs` keep struct-plugins, fn-plugins, and tuple-plugins coherent\n- **axum extractors** — `FromRequest<S, M = ViaRequest>` plus *uninhabited private enums* `ViaParts` and `ViaRequest`: the blanket impl "anything `FromRequestParts` also works by value" lives at `M = ViaParts`, concrete impls at the default `M = ViaRequest` — which is how `Path<T>` may legally sit in the body slot\n- **leptos** — `IntoReactiveValue<T, M>` overload sets let plain values, closures, and signals share one prop position\n\nThe marker is then laundered out of stored types via `PhantomData<fn() -> M>` — and the `fn() -> M` phantom shape grants `Send + Sync` regardless of `M`, a second idiom hiding in that one line.\n\n## The trade-off\nBuys: overlapping blanket impls become legal — Rust\'s de-facto overloading, the entire "many shapes, one position" aesthetic. Costs: mystery parameters surface in rustdoc and error text (`expected Plugins<M2>`); inference occasionally cliffs ("type annotations needed," naming a marker you never wrote); and every API generic over the trait must thread `<M>` through, forever.',
      },
    },
    {
      id: "extractor-newtypes",
      title: "Newtypes as Type-Level Keywords",
      content: {
        type: "read",
        markdown:
          "## The shape\n`Path(user_id): Path<Uuid>` — the wrapper is destructured *in the parameter list*, so the body starts with the naked value. The type annotation doubles as the extraction instruction: ==the signature reads as a declarative spec==.\n\n## The machinery\nEvery extractor is a single-field tuple struct with a `pub` field: `pub struct Path<T>(pub T)`, `pub struct Json<T>(pub T)`, `pub struct State<S>(pub S)` (`axum/src/extract/`). Rust's irrefutable-pattern function parameters do the unwrapping. The newtype exists *only* to select which extraction impl runs — it is ==a type-level keyword argument==.\n\nThree designs ride the same wrapper shape:\n\n- **`Json<T>` wears two trait hats** — `FromRequest` where `T: DeserializeOwned` coming in, `IntoResponse` where `T: Serialize` going out (`axum/src/json.rs`). One name means \"JSON on the wire, either direction,\" with the asymmetric bounds tracked automatically.\n- **`State<T>` is compile-time dependency injection** — its `FromRequestParts` impl is bounded by the projection trait `FromRef<OuterState>` and declares ==`Rejection = Infallible`==: extraction *cannot* fail at runtime, because the router's `S` parameter proved availability at compile time. `#[derive(FromRef)]` turns a state struct's fields into peelable substates. Contrast `Extension<T>`, the `TypeId`-map fallback: zero coupling, but a missing extension is a 500 at request time — the docs frame the pair as *compile error vs runtime error*.\n- **`Option<Extractor>` is opt-in, not mechanical** — a dedicated `OptionalFromRequestParts` trait (`axum-core/src/extract/option.rs`) lets each extractor define tri-state semantics: absent flows as `None`, ==malformed still rejects==. Deriving `Option` mechanically from `Err → None` would erase that distinction.\n\n## The trade-off\nBuys: zero cost (the newtype compiles away), self-documenting signatures, and the \"annotation = behavior\" property. Costs: pattern-in-parameter syntax reads like a doubled type to newcomers; a wrapper zoo to memorize (`Json`, `Form`, `Query`, `Path`, `State` are shaped identically but ride different traits); and `Json`'s symmetric surface hides asymmetric failure modes — a bad request body is a 4xx rejection, a failed response serialization is a 500.",
      },
    },
    {
      id: "bevy-signature",
      title: "Bevy: The Signature Is the Schedule",
      content: {
        type: "read",
        markdown:
          "You already write bevy systems — g-gfx owns that skill. This lesson is the author's view: ==why is a bare fn allowed to be a system, and what is the signature really for?==\n\n## The shape\n`fn ai(time: Res<Time>, mut q: Query<&mut Health, With<Player>>)` handed bare to `add_systems`. The same magic-fn silhouette as axum — but here the signature is doing a second job.\n\n## The machinery\n`SystemParamFunction<Marker>` (`bevy_ecs/src/system/function_system.rs`) is blanket-implemented per arity over fn types, marker = the fn-pointer type. Two tricks live inside the impl that axum never needed:\n\n- **The double `FnMut` bound.** `for<'a> &'a mut Func` must be `FnMut` over the *nominal* types you wrote AND over the `SystemParamItem<...>` projections — the lifetime-reapplied GAT views the world actually hands the system each frame. This bridges \"the type in your signature\" and \"a borrow valid for exactly this frame\" ==without you writing a single lifetime==.\n- **`call_inner`.** Calling the function directly fails inference against that double bound; a monomorphic helper fn funnels the call so the compiler picks the right `FnMut` view.\n\n## Where the two magic fns diverge\n- **When extraction is validated.** axum runs `from_request_parts` ==per request at runtime== — failure is a 4xx response. bevy resolves `SystemParam::init_state` and `init_access` ==once at schedule build== — failure is a startup panic. The cost moves from per-call to boot.\n- **What the signature is for.** axum's parameters only describe deserialization. bevy's are a ==parallelism contract==: `init_access` registers each parameter's reads and writes into a `FilteredAccessSet`; the executor intersects the sets and runs non-conflicting systems concurrently. `Res<T>` vs `ResMut<T>` in a signature IS the concurrency plan — conflicts panic at startup as `error[B0002]`.\n- **The query is a type-level DSL.** `Query<(Entity, &A, &mut B), (With<C>, Without<D>)>` is SQL in generic position — the data slot and filter slot are separate type parameters, and ZST filters like `With<T>(PhantomData)` prune whole archetypes while adding zero read-access to the contract. Even private per-system state is a parameter: `Local<u32>`.\n\n## The trade-off\nBuys: plain testable fns, plus ==auditable data-race freedom read straight off fn headers== — for free, forever. Costs: the same error-message bill as axum, paid across 16 candidate arities; compile time scaling with generated impls and distinct query instantiations; and total call-site opacity — nothing says *why* a fn qualifies, so learnability lives entirely in the docs.",
      },
    },
    {
      id: "response-grammar",
      title: "Tuples as a Response Grammar",
      content: {
        type: "read",
        markdown:
          '## The shape\nResponse construction by juxtaposition — a tuple literal where ==position carries meaning==: `"ok"` alone; `(StatusCode::CREATED, Json(user))`; `(StatusCode::OK, [(header::CACHE_CONTROL, "no-store")], Json(data))`. Optional status first, any number of decorations in the middle, body last.\n\n## The machinery\n`impl_into_response!` (`axum-core/src/response/into_response.rs`) generates *three* impl families at every arity: bare `(parts..., body)`, status-first, and `http::response::Parts`-first. Evaluation is deliberately ==inside-out==: the body converts first, the middle elements fold over it, and the status stamps last so it always wins.\n\nThe middle positions are governed by their own trait: `IntoResponseParts` is ==a fold step over an owned accumulator==. `ResponseParts` wraps the in-progress response and exposes `headers_mut()` and `extensions_mut()` — but *not* the body. Cookie jars, cache headers, and trace ids compose without knowing about each other, because the accumulator type structurally limits what a "part" may touch. Each step is fallible with its own `Error: IntoResponse`, so a bad header short-circuits into an error response. A zero-sized sentinel, `IntoResponseFailed`, lets an inner error response ==suppress outer decoration== — a failure does not get the success path\'s headers stapled on.\n\nTwo more grammar rules earn their keep:\n\n- **Header literals** — `[(K, V); N]` gets one const-generic impl with double `TryInto<HeaderName>` / `TryInto<HeaderValue>` bounds: any length, `&str` allowed, validation deferred to runtime with a structured key-vs-value error.\n- **`Result` is a response** — `impl IntoResponse for Result<T, E>` where both arms are `IntoResponse`: four lines that wire `?` in handlers straight into HTTP semantics.\n\n## The trade-off\nBuys: an ad-hoc response is a *literal*, not a builder chain, and positions are type-checked — a body in the middle is a compile error. Costs: 3 families × 16 arities of impl explosion; a positional grammar users must simply learn ("why can\'t status go last?"); and the `Result` impl erases status discipline — nothing stops an `Ok` arm from rendering a 500.',
      },
    },
    {
      id: "error-bill",
      title: "The Bill: Error-Message Debt",
      content: {
        type: "read",
        markdown:
          'Every technique in this curriculum bought call-site beauty with the same currency: ==error-message quality==. Mature crates pay the debt back deliberately — axum spends an entire proc-macro crate on it.\n\n## The failure mode\nBreak one argument of a six-argument handler and the compiler reports `the trait Handler<_, _> is not implemented for fn item ...` — one monolithic error naming a phantom tuple you never wrote, across 16 candidate impls, with ==no hint which argument is wrong==. Blanket-impl magic concentrates all diagnostic information into the single bound that failed.\n\n## Repayment 1: #[debug_handler]\n`axum-macros/src/debug_handler.rs` is ==a diagnostic decompiler for the blanket impl==. The attribute re-derives, from the fn signature alone, every obligation `impl_handler!` would impose — but as *separate generated check functions*, each `quote_spanned!` to the specific argument: one check demanding `FromRequestParts<S>` per non-final argument, one demanding `FromRequest<S>` for the last, one feeding the return type into a `check<T: IntoResponse>` fn, one asserting the handler\'s future is `Send`. One unreadable error becomes N precise ones, and expansion is a no-op at runtime.\n\nThe catch: the macro must mirror `impl_handler!`\'s rules *exactly* — ==a second implementation of the same contract==, which can drift as the trait evolves.\n\n## Repayment 2: steering the compiler\nStable diagnostic attributes let the author curate rustc\'s guess-path through their own impl graph. `#[diagnostic::on_unimplemented]` on `Handler` makes ==the compiler itself advertise the escape hatch== ("Consider using `#[axum::debug_handler]`"). `#[diagnostic::do_not_recommend]` on the `Option<T>` extractor blankets stops rustc from suggesting an irrelevant chain through `OptionalFromRequestParts`. bevy deploys the same attributes on `SystemParam`.\n\n## The meta-lesson\nWhen you design a magic call site of your own, ==budget the repayment up front==: what will the error say when a user gets it wrong? If the answer is "a monolithic unsatisfied bound," you owe a `#[debug_*]` attribute, `#[diagnostic::*]` steering, or a simpler shape. And the mitigations have costs of their own: they are opt-in (users meet the raw error first), and curated messages rot as APIs move.',
      },
    },
    {
      id: "registry-run-output",
      title: "Trace the mini magic fn",
      content: {
        type: "multiple-choice",
        question:
          "This is axum's Handler pattern in miniature — per-arity blanket impls over plain fn types, extractors pulled from a context by type, the arity tuple as coherence witness. What does this program print?",
        language: "rust",
        code: `struct Ctx {
    id: u32,
    name: &'static str,
}

trait FromCtx {
    fn from_ctx(ctx: &Ctx) -> Self;
}

struct Id(u32);
struct Name(&'static str);

impl FromCtx for Id {
    fn from_ctx(ctx: &Ctx) -> Self {
        Id(ctx.id)
    }
}

impl FromCtx for Name {
    fn from_ctx(ctx: &Ctx) -> Self {
        Name(ctx.name)
    }
}

trait Handler<Args> {
    fn call(self, ctx: &Ctx) -> String;
}

impl<F: Fn(A) -> String, A: FromCtx> Handler<(A,)> for F {
    fn call(self, ctx: &Ctx) -> String {
        self(A::from_ctx(ctx))
    }
}

impl<F: Fn(A, B) -> String, A: FromCtx, B: FromCtx> Handler<(A, B)> for F {
    fn call(self, ctx: &Ctx) -> String {
        self(A::from_ctx(ctx), B::from_ctx(ctx))
    }
}

fn dispatch<Args, H: Handler<Args>>(handler: H, ctx: &Ctx) -> String {
    handler.call(ctx)
}

fn show(Name(name): Name, Id(id): Id) -> String {
    format!("{name}#{id}")
}

fn main() {
    let ctx = Ctx { id: 7, name: "ada" };
    let a = dispatch(show, &ctx);
    let b = dispatch(|Id(id): Id| format!("id={id}"), &ctx);
    println!("{a} {b}");
}`,
        options: ["7#ada id=7", "ada#7 id=7", "ada#7 id=ada"],
        answerIndex: 1,
      },
    },
    {
      id: "body-slot-rule",
      title: "The body-slot rule",
      content: {
        type: "multiple-choice",
        question:
          "This handler compiles. Which rule governs why `Json(body): Json<Value>` must stay in the final position?",
        language: "rust",
        code: `use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::post;
use axum::{Json, Router};
use serde_json::Value;

async fn update_item(
    State(store): State<String>,
    Path(id): Path<u32>,
    Json(body): Json<Value>,
) -> (StatusCode, Json<Value>) {
    let _ = (store, id);
    (StatusCode::OK, Json(body))
}

pub fn app(store: String) -> Router {
    Router::new()
        .route("/items/{id}", post(update_item))
        .with_state(store)
}`,
        options: [
          "Only the last parameter is bounded by `FromRequest`, the by-value trait allowed to consume the request body once — every earlier parameter must be a `FromRequestParts` borrow of the metadata",
          "Extractors run in reverse declaration order, so the body extractor must be declared last to run first",
          "There is no rule — axum reorders extractors internally, and putting `Json` last is only a style convention",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "marker-why",
      title: "Why Handler carries T",
      content: {
        type: "multiple-choice",
        question:
          '`Handler<T, S>` never uses `T` inside the trait body, and axum\'s docs call it "a workaround for trait coherence rules." What does `T` actually do?',
        options: [
          "It stores the extractor tuple at runtime so the router can rebuild the argument list per request",
          "It lets the compiler defer monomorphization of handlers, cutting compile times on large routers",
          "It makes each per-arity blanket impl a distinct trait instantiation — rustc cannot prove `Fn(A)` and `Fn(A, B)` impls are disjoint for an arbitrary type, so without `T` the impl family would be rejected as overlapping",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "extraction-timing",
      title: "When extraction is checked",
      content: {
        type: "multiple-choice",
        question:
          "axum and bevy both blanket-implement a trait over bare fn types. Per their actual designs, when does each validate that a function's parameters can be produced?",
        options: [
          "Both purely at compile time — that is the whole point of the magic-fn pattern",
          "axum re-validates per request at runtime (a failed extractor becomes a 4xx rejection response); bevy resolves params once at schedule build, and access conflicts panic at startup with error[B0002]",
          "axum validates once at router construction; bevy re-validates every frame before running each system",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "infallible-state",
      title: "Reading Infallible",
      content: {
        type: "multiple-choice",
        question:
          "`State<T>`'s `FromRequestParts` impl declares `type Rejection = Infallible`. As a design statement, what is that type communicating?",
        options: [
          "State extraction cannot fail at runtime — the router's `S` type parameter already proved at compile time that a matching state exists, so no error path is representable",
          "Missing state panics instead of rejecting, so the rejection type is never constructed",
          "`Infallible` is a placeholder axum uses wherever a rejection type has not been designed yet",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "parts-fold-limit",
      title: "What the fold forbids",
      content: {
        type: "multiple-choice",
        question:
          "`ResponseParts` — the accumulator threaded through every `IntoResponseParts` fold step — exposes `headers_mut()` and `extensions_mut()` but not the body. What is that restriction buying?",
        options: [
          "Performance: response bodies can be large, and hiding them prevents accidental clones during the fold",
          "Send-safety: streaming bodies are not always `Send`, so decoration types must never hold one",
          'A structural invariant: any mix of third-party decorations can compose in the tuple middle, and none of them can replace or corrupt the body — the accumulator\'s type enforces what a "part" may touch',
        ],
        answerIndex: 2,
      },
    },
    {
      id: "debug-handler-role",
      title: "What #[debug_handler] does",
      content: {
        type: "multiple-choice",
        question:
          "A six-extractor handler fails to compile with one monolithic `Handler<_, _> is not implemented` error. What does adding `#[axum::debug_handler]` change?",
        options: [
          "It enables runtime logging of each extractor so the failure can be reproduced under a debugger",
          "It re-derives the blanket impl's obligations as separate generated check functions, each spanned to a specific argument — the wall-of-text error becomes per-argument diagnostics, with zero runtime effect",
          "It relaxes the Handler trait's bounds in debug builds so the handler compiles while you iterate",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "write-magic-registry",
      title: "Write: a mini magic-fn registry",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Build axum's Handler pattern in miniature, in pure std. Define `pub struct Ctx { pub id: u32, pub name: String }`; a `pub trait FromCtx { fn from_ctx(ctx: &Ctx) -> Self; }`; extractor newtypes `pub struct Id(pub u32)` and `pub struct Name(pub String)` implementing it (cloning `name`). Then `pub trait Handler<Args> { fn call(self, ctx: &Ctx) -> String; }` blanket-implemented for `F: Fn(A) -> String` at `Handler<(A,)>` and for `F: Fn(A, B) -> String` at `Handler<(A, B)>`, each extractor bounded by `FromCtx`. Finish with `pub fn dispatch<Args, H: Handler<Args>>(handler: H, ctx: &Ctx) -> String` that calls `handler.call(ctx)`. The arity tuple in trait position is what keeps the two blanket impls coherent.",
        solution: `pub struct Ctx {
    pub id: u32,
    pub name: String,
}

pub trait FromCtx {
    fn from_ctx(ctx: &Ctx) -> Self;
}

pub struct Id(pub u32);
pub struct Name(pub String);

impl FromCtx for Id {
    fn from_ctx(ctx: &Ctx) -> Self {
        Id(ctx.id)
    }
}

impl FromCtx for Name {
    fn from_ctx(ctx: &Ctx) -> Self {
        Name(ctx.name.clone())
    }
}

pub trait Handler<Args> {
    fn call(self, ctx: &Ctx) -> String;
}

impl<F: Fn(A) -> String, A: FromCtx> Handler<(A,)> for F {
    fn call(self, ctx: &Ctx) -> String {
        self(A::from_ctx(ctx))
    }
}

impl<F: Fn(A, B) -> String, A: FromCtx, B: FromCtx> Handler<(A, B)> for F {
    fn call(self, ctx: &Ctx) -> String {
        self(A::from_ctx(ctx), B::from_ctx(ctx))
    }
}

pub fn dispatch<Args, H: Handler<Args>>(handler: H, ctx: &Ctx) -> String {
    handler.call(ctx)
}`,
      },
    },
    {
      id: "write-marker-overload",
      title: "Write: marker-keyed overloads",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Overload dispatch on closure shape, the marker way. Define `pub trait Callable<Marker> { fn describe(&self) -> &'static str; }` with marker units `pub struct UnaryMarker;` and `pub struct BinaryMarker;`. Blanket-implement it for `F: Fn(u32) -> u32` at `Callable<UnaryMarker>` (returning \"unary\") and for `F: Fn(u32, u32) -> u32` at `Callable<BinaryMarker>` (returning \"binary\") — without the markers, those two impls would be rejected as overlapping. Add `pub fn describe<Marker, F: Callable<Marker>>(f: &F) -> &'static str`, plus `pub fn demo() -> (&'static str, &'static str)` proving inference picks each marker: describe a `|x: u32| x * 2` closure and a `|x: u32, y: u32| x + y` closure.",
        solution: `pub trait Callable<Marker> {
    fn describe(&self) -> &'static str;
}

pub struct UnaryMarker;
pub struct BinaryMarker;

impl<F: Fn(u32) -> u32> Callable<UnaryMarker> for F {
    fn describe(&self) -> &'static str {
        "unary"
    }
}

impl<F: Fn(u32, u32) -> u32> Callable<BinaryMarker> for F {
    fn describe(&self) -> &'static str {
        "binary"
    }
}

pub fn describe<Marker, F: Callable<Marker>>(f: &F) -> &'static str {
    f.describe()
}

pub fn demo() -> (&'static str, &'static str) {
    let double = |x: u32| x * 2;
    let add = |x: u32, y: u32| x + y;
    (describe(&double), describe(&add))
}`,
      },
    },
    {
      id: "write-all-tuples",
      title: "Write: your own all_the_tuples!",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write your own all_the_tuples!. Define `pub trait Labels { fn labels(&self) -> Vec<String>; }`. Write `macro_rules! impl_labels` taking `$(($T:ident, $field:ident)),+` pairs and implementing `Labels` for the tuple `($($T,)+)` where each `$T: std::fmt::Display` — destructure with `let ($($field,)+) = self;` and return `vec![$($field.to_string()),+]`. Then write the higher-order `macro_rules! all_the_tuples` taking `$name:ident` and invoking `$name!` once per arity 1-3 with pairs `(T1, a)`, `(T2, b)`, `(T3, c)`. Finish with `all_the_tuples!(impl_labels);`.",
        solution: `pub trait Labels {
    fn labels(&self) -> Vec<String>;
}

macro_rules! impl_labels {
    ($(($T:ident, $field:ident)),+) => {
        impl<$($T: std::fmt::Display),+> Labels for ($($T,)+) {
            fn labels(&self) -> Vec<String> {
                let ($($field,)+) = self;
                vec![$($field.to_string()),+]
            }
        }
    };
}

macro_rules! all_the_tuples {
    ($name:ident) => {
        $name!((T1, a));
        $name!((T1, a), (T2, b));
        $name!((T1, a), (T2, b), (T3, c));
    };
}

all_the_tuples!(impl_labels);`,
      },
    },
    {
      id: "write-extractor",
      title: "Write: a FromRequestParts extractor",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Author an axum extractor. Define `pub struct ExtractUserAgent(pub String);` and implement `FromRequestParts<S>` for any `S: Send + Sync`, with `type Rejection = (StatusCode, &\'static str);`. In `async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection>`, read `parts.headers.get(USER_AGENT)`: wrap the `to_owned()` string on success, and return a `BAD_REQUEST` rejection for a missing header ("`User-Agent` header is missing") or a non-text value ("`User-Agent` is not valid text"). Imports: `axum::extract::FromRequestParts`, `axum::http::header::USER_AGENT`, `axum::http::request::Parts`, `axum::http::StatusCode`.',
        solution: `use axum::extract::FromRequestParts;
use axum::http::header::USER_AGENT;
use axum::http::request::Parts;
use axum::http::StatusCode;

pub struct ExtractUserAgent(pub String);

impl<S: Send + Sync> FromRequestParts<S> for ExtractUserAgent {
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let Some(value) = parts.headers.get(USER_AGENT) else {
            return Err((StatusCode::BAD_REQUEST, "\`User-Agent\` header is missing"));
        };
        match value.to_str() {
            Ok(text) => Ok(ExtractUserAgent(text.to_owned())),
            Err(_) => Err((StatusCode::BAD_REQUEST, "\`User-Agent\` is not valid text")),
        }
    }
}`,
      },
    },
    {
      id: "write-api-error",
      title: "Write: IntoResponse for an error",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Author the response side. Define `pub enum ApiError { NotFound, Invalid(String) }` and implement `IntoResponse`: match self into a `(status, message)` pair — `NOT_FOUND` with "not found" `.to_owned()`, and `UNPROCESSABLE_ENTITY` with the reason — then delegate to the tuple grammar: `(status, Json(json!({ "error": message }))).into_response()`. Add `pub async fn find_user(id: u32) -> Result<Json<Value>, ApiError>` returning `Err(ApiError::NotFound)` for id 0 and `Ok(Json(json!({ "id": id })))` otherwise — `Result` is a response because both arms are. Imports: `axum::http::StatusCode`, `axum::response::{IntoResponse, Response}`, `axum::Json`, `serde_json::{json, Value}`.',
        solution: `use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::{json, Value};

pub enum ApiError {
    NotFound,
    Invalid(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            ApiError::NotFound => (StatusCode::NOT_FOUND, "not found".to_owned()),
            ApiError::Invalid(reason) => (StatusCode::UNPROCESSABLE_ENTITY, reason),
        };
        (status, Json(json!({ "error": message }))).into_response()
    }
}

pub async fn find_user(id: u32) -> Result<Json<Value>, ApiError> {
    if id == 0 {
        return Err(ApiError::NotFound);
    }
    Ok(Json(json!({ "id": id })))
}`,
      },
    },
  ],
  edges: [
    // Concept spine
    { from: "shapes-map", to: "magic-fn" },
    { from: "magic-fn", to: "all-tuples" },
    { from: "magic-fn", to: "body-slot" },
    { from: "all-tuples", to: "marker-coherence" },
    { from: "body-slot", to: "marker-coherence" },
    { from: "magic-fn", to: "extractor-newtypes" },
    { from: "body-slot", to: "extractor-newtypes" },
    { from: "marker-coherence", to: "bevy-signature" },
    { from: "extractor-newtypes", to: "response-grammar" },
    { from: "all-tuples", to: "response-grammar" },
    { from: "marker-coherence", to: "error-bill" },
    { from: "bevy-signature", to: "error-bill" },
    { from: "response-grammar", to: "error-bill" },
    // Drills
    { from: "magic-fn", to: "write-magic-registry" },
    { from: "all-tuples", to: "write-magic-registry" },
    { from: "write-magic-registry", to: "registry-run-output" },
    { from: "marker-coherence", to: "write-marker-overload" },
    { from: "write-magic-registry", to: "write-marker-overload" },
    { from: "body-slot", to: "body-slot-rule" },
    { from: "extractor-newtypes", to: "body-slot-rule" },
    { from: "marker-coherence", to: "marker-why" },
    { from: "bevy-signature", to: "extraction-timing" },
    { from: "extractor-newtypes", to: "infallible-state" },
    { from: "response-grammar", to: "parts-fold-limit" },
    { from: "error-bill", to: "debug-handler-role" },
    { from: "all-tuples", to: "write-all-tuples" },
    { from: "body-slot", to: "write-extractor" },
    { from: "extractor-newtypes", to: "write-extractor" },
    { from: "response-grammar", to: "write-api-error" },
  ],
};
