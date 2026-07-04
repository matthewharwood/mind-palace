# Rust Expressiveness Atlas

**A unique map of Rust expressiveness techniques — 213 techniques in 10 categories, each recorded as call-site SHAPE → author MACHINERY → TRADE-OFF, with real crate citations.**

Compiled 2026-07-04 from a nine-dossier mining pass over production Rust source (tokio/bytes/mio, io-uring/tokio-uring, tower/tower-http, axum, leptos, bevy_ecs/bevy_reflect, Apache Iggy, serde/thiserror/anyhow, the syn/quote/proc-macro2 DSL machinery) plus the written idiom canon (design-patterns book, API Guidelines, without.boats, dtolnay case studies, and the rest of §15.2). This file is the durable deliverable — the companion to `docs/ff-attack-vfx-catalog.md` and, like it, the raw reference a curriculum draws from.

---

## 1. What this atlas is and how to read it

### 1.1 The thesis

Mastery of Rust expressiveness is a three-part skill: **if you can visualize the call-site shape you want, you know the machinery that produces it, and you understand what the aesthetic buys and costs.** Every entry in this atlas is one instance of that triple.

This is deliberately **not** a design-patterns catalog. Patterns catalogs organize by *problem* ("I need to construct a complex object"); this atlas organizes by *surface* — what the code at the point of use looks like — because in Rust the call-site shape is the design decision. axum and bevy did not set out to implement "the strategy pattern"; they set out to make `async fn(State(db), Json(body))` and `fn sys(time: Res<Time>, q: Query<…>)` legal sentences, and then built whatever trait machinery that required. Reading direction matters: **shape first, machinery second, trade-off always.**

### 1.2 Anatomy of an entry

Every technique table uses the same six columns:

| Column | Meaning |
|---|---|
| **id** | A stable kebab-case name for the technique (used in the dedup log and cross-references). |
| **shape sketch** | What the *user of the API* writes — the call-site. If the technique is invisible at the call-site (pure machinery), the sketch says so. |
| **machinery** | What the *author of the API* wrote to produce that shape: the traits, impls, macros, and unsafe blocks behind the curtain. |
| **best exemplar** | The primary real-source citation (crate + file), plus recorded recurrences in other crates. Recurrences matter: a technique seen in three ecosystems is a lever, not a trick. |
| **trade-off axis** | What the aesthetic *buys* vs what it *costs*. No entry is free; the cost column is the curriculum. |
| **tags** | Paradigm registers the technique inhabits (func, OO, imper, decl, data, DSL, type-level, meta, …) — tags, not taxonomy; see §1.3. |

### 1.3 The registers of Rust — one effect, many call-site shapes

The single most teachable framing in the source material is without.boats' **four registers**: the same semantic effect can surface at a call-site in four different shapes, and the shape predicts the machinery.

1. **Core register** — hand-implement the trait: `impl Iterator`, `impl Future`, `impl Service`. Maximum control, maximum ceremony.
2. **Consuming register** — drive someone else's implementation: `for` loops, `match`, executors, `collect()`.
3. **Combinatoric register** — adapter pipelines: `.map().filter()`, `.and_then()`, `.timeout()`. The dialect serde, tower, and rayon all mimic.
4. **Control-flow register** — compiler sugar: `?`, `async/await`. The scarcest register: only the effects the language blesses get it, which is why `select!` and `stream!` exist as macros (register patches).

Boats' key observation — *"asynchrony is in the control-flow register, whereas iteration is in the core register"* — explains why some Rust call-sites feel finished and others don't. This atlas demotes the classic paradigm labels (functional, OO-ish, imperative, declarative, data-oriented, DSL) to per-technique **tags**, because the register framing classifies the *shape itself* while paradigm labels only describe its accent.

### 1.4 Four meta-framings worth keeping

Carried over from the mining pass; each is confirmed against multiple dossiers, and each is a lesson bigger than any single technique:

- **One lever, many aesthetics** (bevy): `blanket impl over ordinary syntax + marker generic + all_tuples!` generates at least six different-*feeling* APIs (systems, bundles, queries, conditions, observers, plugins). Teach the lever once; the aesthetics are instantiations.
- **The trust spectrum** (io-uring vs tokio-uring): the same kernel interface yields two idiomatic APIs; the visible difference is which invariants moved from doc comments into types. Expressiveness is partly a decision about *where proofs live*.
- **Every expressiveness win is purchased with an error-message debt, and mature crates budget for repayment** (axum): hence Category 10 — errors and diagnostics as designed surfaces — is as large as the tricks it repays.
- **The registers demoted paradigms** (literature): the four-register spine (§1.3) predicts machinery; paradigm labels survive only as tags.

### 1.5 About the code sketches

Each category closes with **Spotlights**: short prose blocks on its most load-bearing techniques, each with a small fenced sketch of the SHAPE — *call-site only*. **These sketches are shape illustrations, not compilable programs.** Imports, error types, and irrelevant arguments are elided; a few lines are condensed from multi-file examples. For the real, compiling text, follow the exemplar citation in the technique table.

---

## 2. Master index

| § | Category | Techniques | Flagship exemplar |
|---|---|---|---|
| 3 | **1. Plain-syntax call-site shapes** — the magic-fn lever & tuple grammars | 19 | axum handlers / bevy systems (`magic-fn-signature-dsl`) |
| 4 | **2. Trait architecture** — vocabularies, lattices & the adapter dialect | 22 | tower `Service` + serde's hourglass data model |
| 5 | **3. Type-state, sealing & compile-checked boundaries** | 14 | typestate protocol (cliffle/embedded → axum `Router<S>`) |
| 6 | **4. Ownership as protocol & data-contract views** (4a choreography · 4b wire/layout/const) | 28 (20 + 8) | tokio-uring `let (res, buf) = read_at(buf, 0).await` |
| 7 | **5. Async & I/O models from first principles** | 17 | the readiness↔completion fork (mio vs io_uring) |
| 8 | **6. Control-flow & reactivity expression** | 17 | `tokio::select!` |
| 9 | **7. Construction & configuration surfaces** | 17 | tower `ServiceBuilder` order-inversion |
| 10 | **8. Type erasure & the static↔dynamic dial** | 12 | bytes' hand-rolled vtable; tachys ↔ bevy_reflect as the dial's poles |
| 11 | **9. Macro & DSL machinery** (9a macro_rules · 9b syn/quote · 9c proc-macro architecture) | 40 (8 + 10 + 22) | `all_tuples!` variadics + serde_derive's attribute grammar |
| 12 | **10. Errors & diagnostics as designed surfaces** (10a architecture · 10b failure UX) | 27 (13 + 14) | thiserror/anyhow doctrine + `#[diagnostic::on_unimplemented]` |
| | **Total** | **213** | |

Provenance: 274 raw dossier entries − 61 merged in deduplication = 213 unique techniques. The full merge log is §13; territories the mining did *not* reach are §14.

---

## 3. Category 1 — Plain-syntax call-site shapes (the magic-fn lever & tuple grammars)

Ordinary Rust — bare fns, tuples, newtypes, closures, generic argument slots — is retrofitted with framework meaning. The recurring machinery: a trait describing "things valid in position X," blanket-implemented over ordinary syntax, made coherent by marker generics, stamped per arity by all-tuples macros (that machinery itself is catalogued in §11/9a). The flagship is the **magic-fn signature DSL** — the axum handler / bevy system shape — with axum and bevy as deliberately contrasted co-primaries: same call-site, opposite binding time.

### 3.1 Technique table

| id | shape sketch | machinery | best exemplar | trade-off axis | tags |
|---|---|---|---|---|---|
| `magic-fn-signature-dsl` | any plain `async fn(State(db), Path(id), Json(b)) -> impl IntoResponse` / `fn sys(time: Res<Time>, q: Query<…>)` is accepted with zero registration; the signature *is* the spec | per-arity blanket impls of a `Handler<T,S>`/`SystemParamFunction<Marker>` trait over fn types; extraction pipeline generated per arity; bevy adds double-FnMut HRTB + `call_inner` inference funnel | axum `axum/src/handler/mod.rs` (`impl_handler!`) + bevy `bevy_ecs/src/system/function_system.rs` — the deep contrast: axum validates extraction **per request at runtime**, bevy resolves params **once at schedule build** and doubles the signature as a parallelism contract. Recurs: axum `middleware::from_fn` (magic-fn re-aimed at middleware with `Next`), bevy conditions & observers (§8), iggy `#[iggy_harness]` signature-based param injection (§11/9c), actix `FromRequest` | peak call-site ergonomics + testable plain fns vs catastrophic trait errors (repaid in §12), 16-arity cap, compile-time impl explosion | decl, func, DSL |
| `marker-generic-coherence` | invisible — many shapes (fns of any arity, closures, tuples, values, signals) accepted in ONE argument slot | an otherwise-unused `Marker` type parameter gives each blanket impl a distinct trait instantiation, dodging overlap; inference picks the marker; `PhantomData<fn() -> M>` launders it out | bevy `marker-type-coherence` (`SystemParamFunction<fn(A,B)->Out>`, sealed `PluginMarker` structs; bevy_app/src/plugin.rs). Recurs: axum `Handler<(M, T…), S>` phantom-arity witness + `FromRequest<S, M = ViaRequest>` uninhabited-marker overlap dodge; leptos `IntoReactiveValue<T, M>` / `EffectFunction<T, M>` overload sets | overlapping blanket impls become legal (Rust's de-facto overloading) vs mystery params in errors/rustdoc, inference cliffs ("type annotations needed" naming hidden markers) | type-level, func |
| `last-argument-body-slot` | body extractor must be the final fn argument; wrong order = compile error | trait split by ownership: `FromRequestParts(&mut Parts)` for all-but-last, `FromRequest(Request)` by value for last — runtime streaming linearity encoded as argument position | axum `axum-core/src/extract/mod.rs`. Mirror: bevy reserves the *first* position for `In<T>` pipeline input (§8 `system-piping-in-position`) | compile-time body linearity vs invisible positional rule learned out-of-band | ownership-driven, decl |
| `newtype-extractor-keyword` | `Path(id): Path<Uuid>` — the parameter type is a type-level keyword argument; destructured in the param list | single-field tuple structs `pub struct Path<T>(pub T)` selecting which extraction impl runs; irrefutable patterns in fn params unwrap | axum `axum/src/extract/path/mod.rs`, `json.rs`, `state.rs` | zero-cost self-documenting signatures vs pattern-in-parameter surprise, wrapper-zoo memorization | data, decl, newtype |
| `dual-role-wire-newtype` | `async fn f(Json(input): Json<In>) -> Json<Out>` — same wrapper on both sides of the arrow | one newtype wearing two trait hats with asymmetric bounds: `FromRequest` (DeserializeOwned) in, `IntoResponse` (Serialize) out | axum `axum/src/json.rs` | conceptual compression ("Json = JSON on the wire, either direction") vs hidden asymmetric failure modes (rejection vs 500) | decl, data |
| `option-wrapped-fallible-slot` | `Option<AuthUser>` / `Option<Res<T>>` in a magic-fn slot = "absent is fine, malformed is not" | dedicated opt-in trait (`OptionalFromRequestParts` with tri-state `Ok(Some)/Ok(None)/Err`) rather than mechanical Err→None; bevy: `Option<Res<T>>` SystemParam impl turns missing-resource skip into `None` | axum `axum-core/src/extract/option.rs`. Recurs: bevy `system_param.rs` `Option<Res<T>>` | correct absent-vs-invalid semantics vs parallel trait surface / third-party opt-in gap | decl |
| `param-position-access-contract` | `Res<T>` vs `ResMut<T>` in the signature *is* the parallelism plan; conflicts panic at startup with error codes | `SystemParam::init_access` registers reads/writes into a `FilteredAccessSet`; executor intersects sets to schedule concurrency; `unsafe trait` + safe wrappers discharge the proof once | bevy `bevy_ecs/src/system/system_param.rs` (error[B0002] panic) | auditable data-race freedom from fn headers vs cross-param borrow limits (`ParamSet`, `Without<>` refinement tax) | decl, data, type-level |
| `local-parameter-state` | `fn count(mut n: Local<u32>)` — per-system persistent private state declared as a parameter | `SystemParam::State = SyncCell<T>` cached in the `FunctionSystem` across runs; `Local` is a `&'s mut` view; `FromWorld` init | bevy `system_param.rs`; generalizes to `Deferred<T: SystemBuffer>` (Commands is morally one) | zero-ceremony state, no accidental coupling vs unaddressable from outside, hidden statefulness | func, decl |
| `type-level-query-dsl` | `Query<(Entity, &A, &mut B), (With<C>, Without<D>, Changed<E>)>` — SQL in generic position; data slot ≠ filter slot | `WorldQuery`/`QueryData`/`QueryFilter` trait stack with `Item<'w,'s>` GATs; ZST filters (`With<T>(PhantomData)`) with `const IS_ARCHETYPAL` selecting iteration strategy per monomorphization; `#[derive(QueryData)]` for named-field queries | bevy `bevy_ecs/src/query/{fetch,filter}.rs`. Kin: diesel's type-level SQL (not mined — see §14) | zero-cost declarative queries + precise scheduler access metadata vs long types, data-vs-filter-slot confusion | decl, data, DSL, type-level |
| `bundle-tuple-vocabulary` | `spawn((Player, Health(100), (Transform::default(), Visibility::default()), weapon()))` — tuples of components nest and flatten | `unsafe trait Bundle`/`DynamicBundle` with by-move `MovingPtr` visitor straight into archetype storage; every Component is a 1-bundle; tuple impls via all_tuples | bevy `bevy_ecs/src/bundle/mod.rs` | anonymous zero-cost composition, one-generic `spawn` forever vs nameless fields, duplicate-component runtime panic | data, decl |
| `tuple-response-grammar` | `(StatusCode::CREATED, [(k, v)], Json(user))` — response by juxtaposition; position carries meaning | 3 impl families × 16 arities (`impl_into_response!`): status-first / parts-first / bare; inside-out evaluation with status stamped last; `IntoResponseFailed` sentinel suppresses decoration of error responses | axum `axum-core/src/response/into_response.rs` | ad-hoc responses as literals, positions type-checked vs impl explosion + learned positional grammar | decl, DSL, data |
| `into-response-parts-fold` | anything "decoration-shaped" (headers, cookies, extensions) slots into the tuple middle and composes | `IntoResponseParts` fold over an owned `ResponseParts` accumulator that exposes headers/extensions but structurally hides the body; per-step fallible with `Error: IntoResponse` | axum `axum-core/src/response/into_response_parts.rs` | open extension point + compiler-enforced "parts can't replace body" vs one more trait to learn | func (fold), data |
| `header-pair-array-tryinto` | `[(header::CONTENT_TYPE, "text/x-custom"), ("x-trace", id)]` inline header literals | const-generic `impl<K, V, const N: usize> IntoResponseParts for [(K, V); N]` with double `TryInto<HeaderName/Value>` bounds; validation deferred to runtime with structured key-vs-value error | axum `axum-core/src/response/into_response_parts.rs` | literal ergonomics + any length via const generics vs per-request runtime validation | data, decl |
| `tuple-layer-composition` | `router.layer((trace, timeout, cors))` — a tuple of layers *is* a layer, ordering = ServiceBuilder order | hand-written `Layer` impls for arities 0..=16, head-wraps-tail recursion; `()` as identity | tower `tower-layer/src/tuple.rs` | lightest composition syntax in the ecosystem vs hard arity-16 ceiling, hint-free overflow errors | decl, data, DSL |
| `plugin-flat-composition` | `add_plugins((PhysicsPlugin::default(), audio_fn))` — bare fns, configured structs, groups, and tuples all valid in one slot | `Plugin` lifecycle trait (`build/ready/finish/cleanup` defaults) + `impl<T: Fn(&mut App)> Plugin for T` + sealed `Plugins<Marker>` tuples; identity = `type_name`, dupes panic | bevy `bevy_app/src/plugin.rs` | ecosystem-wide contract + graduated disclosure (fn → struct → group) vs `&self` config limits, two-phase init surprises | OO, decl, func |
| `closure-lifting` | `service_fn(\|req\| async { Ok(handle(req).await?) })` / `commands.queue(\|world: &mut World\| …)` — a plain closure becomes a full trait citizen | blanket impl of the trait over `Fn*` types with all associated types inferred from the closure (`type Future = F` — the async block's own future, no box) | tower `tower/src/util/service_fn.rs` + `tower-layer/src/layer_fn.rs`. Recurs: bevy `Command for FnOnce(&mut World)` (commands/command.rs), bevy fn-as-plugin, tower-http `FnMut` callback impls (§9) | zero-boilerplate on-ramp, inference does everything vs unnameable types (motivates §10 boxing), always-ready poll_ready opts out of backpressure | func, DSL |
| `impl-asref-args` | `fs::read("a.txt")`, `fs::read(path_buf)`, `fs::read(&path)` — one fn, many argument shapes | `P: AsRef<Path>` conversion-trait generics + monomorphization (C-GENERIC, C-CONV-TRAITS) | std `library/std/src/fs.rs` (literature) | caller ergonomics at zero runtime cost vs code bloat per instantiation, weaker inference errors | func, decl |
| `collect-return-type-inference` | `let r: Result<Vec<i32>, E> = results.collect();` — the annotation *is* the program (incl. error short-circuiting) | `Iterator::collect<B: FromIterator>` dispatches on return type; `impl FromIterator<Result<A,E>> for Result<V,E>` | std `library/core/src/result.rs` (literature) | maximal call-site economy vs discoverability (nothing hints the Result collect exists), inference failures | func, decl |
| `polymorphic-identifier` | `client.get_stream(&1.try_into()?)` or `&"orders".try_into()?` — same method takes id-or-name | tagged `Identifier { kind, length, value }` + `TryFrom<u32>/&str` + sniffing `FromStr` + `Validatable` cross-field invariants | iggy `core/common/src/types/identifier/mod.rs` | halves the API surface (no `_by_id`/`_by_name` pairs) vs runtime tagging + `"123"`-as-name ambiguity | data, OO |

### 3.2 Spotlights

> Sketches are SHAPE only — call-site illustrations, not compilable programs (§1.5).

#### `magic-fn-signature-dsl` — the signature is the spec

The single most imitated call-site shape in modern Rust: write a plain function, and the framework reverse-engineers everything from its signature. No registration, no interface to name, nothing to subclass. The deep lesson is the axum/bevy contrast — the *same shape* is bound at opposite times (per-request extraction vs once-at-schedule-build parallelism planning), so the shape alone doesn't tell you the cost model; the machinery does.

```rust
// axum — arguments declare inputs, the return type declares the output
async fn update_user(
    State(db): State<Db>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateUser>,
) -> impl IntoResponse { /* … */ }

// bevy — same lever; the signature doubles as a parallelism contract
fn move_players(time: Res<Time>, mut q: Query<(&Velocity, &mut Transform)>) { /* … */ }
```

#### `marker-generic-coherence` — Rust's de-facto overloading

You never see this technique; you see its *absence of friction*. One argument slot accepts fns of any arity, closures, tuples, and bare values because each blanket impl carries an otherwise-unused `Marker` type parameter that makes overlapping impls coherent — inference picks the marker. Every magic-fn framework (axum, bevy, leptos) carries this gear.

```rust
app.add_systems(Update, gravity);            // fn of 1 param
app.add_systems(Update, (physics, render));  // tuple of fns
route("/", get(|| async { "hi" }));          // zero-extractor closure
route("/u/{id}", get(show_user));            // fn of N extractors
// one slot, many shapes — an unused Marker generic keeps the impls legal
```

#### `type-level-query-dsl` — SQL in generic position

Bevy's `Query` puts a whole query language inside a type: the first slot says what data you touch, the second slot filters *which entities* — and the distinction is load-bearing, because the type is also the scheduler's access metadata. Zero-cost at runtime; the price is paid in type length and in learning that data and filters live in different slots.

```rust
fn enemy_ai(
    q: Query<(Entity, &Position, &mut Brain),
             (With<Enemy>, Without<Stunned>, Changed<Target>)>,
) {
    for (e, pos, mut brain) in &mut q { /* … */ }
}
```

#### `tuple-response-grammar` — response by juxtaposition

axum lets you build a response by *writing values next to each other*: optional status first, any number of "decoration-shaped" parts in the middle, body last. The positions are type-checked (three impl families × 16 arities), so an ad-hoc response is a literal, not a builder chain.

```rust
async fn create() -> impl IntoResponse {
    (StatusCode::CREATED,
     [(header::LOCATION, "/users/42")],   // parts compose in the middle
     Json(user))                          // body is always last
}
```

---

## 4. Category 2 — Trait architecture: vocabularies, lattices & the adapter dialect

How traits are *shaped* so call-sites read as sentences: input-generic/output-associated splits, blanket lattices that turn primitives into vocabularies, hourglass waists that make N+M out of N×M, and the Iterator-derived adapter dialect. Two flagships anchor the category: tower's `Service` — an entire ecosystem betting on one trait — and serde's bidirectional data model, the deepest hourglass in production Rust.

### 4.1 Technique table

| id | shape sketch | machinery | best exemplar | trade-off axis | tags |
|---|---|---|---|---|---|
| `one-trait-async-fn` | `svc.ready().await?.call(req).await?` — every client, server, middleware used identically | `Service<Request> { type Response; type Error; type Future; poll_ready; call }` — async fn desugared by hand into a nameable-future trait, frozen in its own `no_std` crate for semver | tower `tower-service/src/lib.rs`. Recurs: axum rents it wholesale (`Route: Service`, `Error: Into<Infallible>`) | universal ecosystem interop vs hand-desugar verbosity, `&mut self` forces Clone-sharing idioms | func, OO, decl |
| `input-generic-output-associated` | one type impls `Service<A>` and `Service<B>`; callers write `where S: Service<Job, Response = Receipt>` like a fn signature | inputs as generic params (overloading-like), outputs as associated types (inference flows outward) — mirrors `FnMut<Args>/Output` | tower `tower-service/src/lib.rs`; same split one level up in `Layer<S> -> type Service` | overload-style polymorphism + unambiguous outputs vs occasional turbofish, paired error messages | func, decl |
| `layer-as-service-transformer` | `TimeoutLayer::new(d).layer(svc)`; `.layer(anything-from-tower)` on a router applies to every route | `Layer<S> { type Service; fn layer(&self, S) -> Self::Service }` — middleware as first-class *values*; statically computed output types | tower `tower-layer/src/lib.rs`. Recurs: axum `Router::layer` bounds (routing/mod.rs), literature `service-layer-onion` | middleware as storable/conditional values, whole-ecosystem reuse vs one wrapper type per application (the debt §10 pays) | func, decl |
| `stack-type-level-list` | pipelines leak as `ServiceBuilder<Stack<TimeoutLayer, Stack<LimitLayer, Identity>>>` | `Stack<Inner, Outer>` cons cell where composition of two layers is itself a Layer; `Outer: Layer<Inner::Service>` threads associated types through where-clauses — type-level function composition | tower `tower-layer/src/stack.rs` | static, clonable, zero-cost pipelines vs angle-bracket blowup (own custom Debug flattening as confession) | decl, data, func |
| `identity-unit-monoid` | `ServiceBuilder::new()` = the do-nothing pipeline; `Option<Layer>` has a well-typed None arm | `Identity: Layer<S, Service = S>` — unit of the layer monoid; enables folds, `option_layer` | tower `tower-layer/src/identity.rs` | algebraic closure nearly free vs users meeting `Identity` in type errors | func, decl |
| `either-conditional-composition` | `.option_layer(cfg.map(TimeoutLayer::new))`; `if use_cache { Either::Left(a) } else { Either::Right(b) }` — branchy config, no boxing | `Either<A, B>` implements both `Service` (arms must agree on Response/Error) and `Layer`; `Option<L>` → `Either<L, Identity>` | tower `tower/src/util/either.rs` | zero-dispatch conditional middleware vs arms-must-match associated-type error walls | func, decl, data |
| `blanket-extension-trait` | `use tower::ServiceExt;` / `use itertools::Itertools;` — one import lights up combinators on every implementor, including foreign types | extension trait with default-body methods + unconditional blanket impl over the base trait (RFC 445) | tower `tower/src/util/mod.rs` (`ServiceExt`) + itertools (literature). Recurs: tokio `AsyncReadExt` (the Pin-hiding two-layer split: poll-shaped core for implementors, `Self: Unpin` ext methods returning named futures for consumers — tokio/src/io/util/async_read_ext.rs), iggy `IggyConsumerMessageExt` | frozen core + evolvable ergonomics, zero implementor burden vs invisible-import discoverability, blankets are forever | func, OO, decl |
| `adapter-layer-twins` | same `map_request(f)` available as value-position combinator AND builder-position layer | each combinator file exports `X` + `XLayer where F: Clone` + a ServiceBuilder method — one behavior, three spellings, one implementation | tower `tower/src/util/map_request.rs` et al. | dialect continuity vs `F: Clone` leakage, triple docs surface | decl, func, DSL |
| `iterator-adapter-pipeline` | `(0..n).filter(f).map(g).collect()` — lazy, zero-cost, the flagship Rust shape | each adapter is a concrete lazy struct implementing `Iterator`; consumers drive; monomorphization + inlining collapse to a loop (Turon) | std / literature `iterator-adapter-pipeline` | zero-cost FP vs monster types, compile time, error towers | func, decl |
| `same-shape-mimicry` | `data.iter()…` → `data.par_iter()…` — one token changed, whole pipeline vocabulary transfers to a new domain | mirror a known adapter vocabulary on new traits, entered via extension trait | rayon `IntoParallelRefIterator` (literature). Recurs: tower's `map_request/and_then/map_err` mirroring Iterator (tower/src/util/), bytes `Buf::chain/take`, tokio-uring `.slice(1..5)` echoing std slicing | near-zero migration cost, portable muscle memory vs imperfect isomorphism precisely where users least expect | func, data |
| `minimal-core-fat-defaults` | implementors write 3 methods (`remaining/chunk/advance`); consumers get sixty (`get_u32`, `chain`, `take`) | small required trait core + macro-generated/provided defaults; overrides as the performance ceiling (`Bytes` overrides `copy_to_bytes` to be zero-copy) | bytes `bytes/src/buf/buf_impl.rs`. Recurs: serde `Serializer::collect_seq/collect_str/is_human_readable` (provided methods, cfg can flip provided→required), serde `Visitor` ~26 defaulted visits, syn `visit` (hundreds of defaults), bevy `Plugin` lifecycle defaults | tiny impl burden + huge consumer surface vs perf hinging on invisible overrides | func, decl, data |
| `capability-primitive-trait-lattice` | `.get() / .set() / .with() / .update() / .read() / *_untracked` work uniformly on every reactive type | 4 primitive capability traits (`Track/Notify/ReadUntracked/Write`) + blanket compositions (`Read→With→Get where Value: Clone`) = a ~20-verb vocabulary from 2–4 impls; the `Clone` bound appears only if you use `.get()` — read cost chosen syntactically at the call-site (`get` clones, `with` borrows, `read` returns a guard) | leptos `reactive_graph/src/traits.rs` | enormous API uniformity + cheap extension + pay-for-what-you-write perf transparency vs prelude dependence, bound-soup errors, guard deadlock edge | func, OO, decl |
| `facet-supertrait` | `fn admin(c: &impl Client)` — one bound, eleven domains of methods; or accept narrow `&impl StreamClient` | fat trait = supertrait union of per-domain facet traits, each in its own file mirroring the protocol namespaces | iggy `core/common/src/traits/client.rs` | discoverability-by-domain + narrow bounds on demand vs 11 traits of indirection | OO, decl |
| `funnel-blanket-facade` | implement ONE `send_raw_with_response`; inherit ~70 typed methods | `impl<B: BinaryClient> StreamClient for B` (×12 facets): auth-guard → typed request → raw funnel → typed decode; N transports × M commands = N + M code | iggy `core/common/src/traits/binary_impls/` | cross-product economy + single choke point for auth/tracing vs blanket rigidity (no per-transport overrides) | func, decl |
| `bidirectional-data-model` | `impl Serialize` once ⇒ works with every format; `serde_json::to_string(&v)?` | mirrored trait pairs (Serialize/Serializer, Deserialize/Deserializer) meeting at a closed 29-type data model — the hourglass waist; static double dispatch, no reflection, no value tree | serde `serde_core/src/ser/mod.rs`, `de/mod.rs` | N+M universality, handwritten-speed codegen vs frozen-forever model, monomorphization bloat | decl, data, OO, DSL |
| `visitor-driven-deserialization` | `d.deserialize_u64(DurationVisitor)` + `visit_u64` — "here's what I want, you know what you have" | `Visitor<'de>`: 1 required method + ~26 defaulted `visit_*` (type-error defaults + integer-widening forwards); hint-not-command inversion; no intermediate AST | serde `serde_core/src/de/mod.rs` L1317 | single-pass zero-tree decoding + format/type negotiation vs the pattern's famous ceremony cliff, inverted control flow | OO, func, data |
| `seed-stateful-deserialization` | `seq.next_element_seed(ExtendVec(&mut v))?` — thread arenas/registries INTO recursive deserialization | `DeserializeSeed<'de>` takes `self` by value (the seed IS the state); blanket `impl DeserializeSeed for PhantomData<T: Deserialize>` makes statelessness the zero-cost degenerate case | serde `de/mod.rs` L803 | DI into recursion without globals, common case pays nothing vs invisible-until-needed, one-shot seeds | func, data |
| `value-as-deserializer` | `Setting::deserialize(s.into_deserializer())` — reuse the derived matcher on plain values | `IntoDeserializer` + `de::value` family treating an in-memory value as a one-item "format" | serde `de/mod.rs` L2316. Recurs: axum `Path<T>` (custom `PathDeserializer` over URL captures — serde-as-DSL with capture-naming ErrorKinds; axum/src/extract/path/de.rs), `Query<T>` via serde_urlencoded | massive reuse of derive logic for env/CLI/config/routing vs 26-method wrapper cost, serde errors not domain errors | data, func, DSL |
| `buffer-and-replay` | `#[serde(untagged)]` / `#[serde(flatten)]` "just work" | deserialize into `Content<'de>` generic value tree (paired owned/borrowed variants preserve zero-copy), replay via `ContentDeserializer`; flatten shares unclaimed keys through `Vec<Option<(Content, Content)>>` | serde `serde_core/src/private/content.rs`, `serde/src/private/de.rs` | beloved attrs inside the visitor model, zero format-crate changes vs hidden alloc + double traversal, self-describing-only | data, imper, func |
| `transparent-pointer-impls` | `&mut S` and `Box<S>` are Services; `Box<dyn Service>` is itself a Service | `?Sized` forwarding impls at the trait definition site; `&S` deliberately excluded (encodes single-caller discipline) | tower `tower-service/src/lib.rs`, `tower-layer/src/lib.rs` | smart-pointer composition for free; three-line impls load-bearing for half the crate | OO, decl |
| `sealed-extension-of-foreign-builder` | `ServiceBuilder::new().timeout(d).trace_for_http()` — another crate's methods join the sentence | extension trait over `ServiceBuilder<L>` returning exact `ServiceBuilder<Stack<X, L>>` types, sealed via `Sealed<L>` supertrait so it's pure method injection | tower-http `tower-http/src/builder.rs` | cross-crate DSL continuity + free API evolution vs coupling to Stack's representation | DSL, OO, decl |
| `strategy-trait-shipped-impls` | `.sharding(Box::new(OrderedSharding))` or implement `Sharding` yourself | small object-safe strategy trait + shipped impls whose doc contracts teach the trait (BalancedSharding warns it breaks ordering) | iggy `core/sdk/src/clients/producer_sharding.rs`, `Partitioner`. Kin: tower retry `Policy` (§8) | open extension with defaults-as-documentation vs dyn dispatch, object-safety constraints | OO, func |

### 4.2 Spotlights

> Sketches are SHAPE only — call-site illustrations, not compilable programs (§1.5).

#### `one-trait-async-fn` — the ecosystem's shared sentence

tower froze `async fn(Request) -> Result<Response, Error>` into a hand-desugared trait (`Service`) in its own `no_std` crate, and the whole networking ecosystem — clients, servers, middleware — became interchangeable values. The verbosity of the hand-desugar (`type Future`, `poll_ready`) is the price of nameable futures and semver stability.

```rust
let response = svc.ready().await?.call(request).await?;
// client, server, and every middleware in the ecosystem: the same two lines
```

#### `blanket-extension-trait` — one import lights up the world

An extension trait with default-body methods plus a blanket impl over the base trait retrofits a combinator vocabulary onto every implementor — including types in other people's crates. The core trait stays frozen; ergonomics evolve in the extension. tokio's `AsyncReadExt` adds the twist: the poll-shaped core is for implementors, the ext methods (bounded `Self: Unpin`, returning named futures) are for consumers — the extension trait as a Pin-hiding device.

```rust
use tower::ServiceExt;   // the import IS the feature flag
let svc = base.map_request(tag_request).and_then(validate).boxed();

use itertools::Itertools;
let pairs = xs.iter().tuple_windows::<(_, _)>();
```

#### `bidirectional-data-model` — the hourglass waist

serde's whole value: N data types and M formats meet at a closed 29-type data model, so the ecosystem writes N+M implementations instead of N×M. Static double dispatch, no reflection, no intermediate value tree — the derive writes the same code you would by hand. The cost is the waist is frozen forever.

```rust
#[derive(Serialize, Deserialize)]
struct Config { name: String, retries: u32 }

let s = serde_json::to_string(&cfg)?;      // works with every format,
let cfg: Config = toml::from_str(&text)?;  // written once
```

#### `capability-primitive-trait-lattice` — a verb vocabulary from four primitives

leptos builds a ~20-verb reactive vocabulary (`get/set/with/update/read/write/*_untracked`) out of 4 primitive capability traits plus blanket compositions. The design detail worth stealing: the `Clone` bound appears only on `.get()` — the *call-site spelling* chooses the read cost.

```rust
count.set(5);
count.update(|n| *n += 1);
let n = count.get();            // clones — requires Value: Clone
let len = name.with(|s| s.len()); // borrows — no Clone needed
let guard = rows.read();          // lock-style guard for bigger reads
```

---

## 5. Category 3 — Type-state, sealing & compile-checked boundaries

Making illegal states and illegal *sequences* unrepresentable: state machines in types, one-way transitions, proofs-as-values, closed trait worlds, and validated boundary types. The flagship is the **typestate protocol** — canonized in embedded Rust's `GpioConfig<Enabled, Input, HighZ>` and industrialized by axum's `Router<S>` and tokio-uring's submit-lifecycle types.

### 5.1 Technique table

| id | shape sketch | machinery | best exemplar | trade-off axis | tags |
|---|---|---|---|---|---|
| `typestate-protocol` | `r.status_line(200, "OK").header(…).body(…)` — wrong order won't compile; `pin.into_push_pull_output()` | consuming-`self` methods returning a different type / same type at a new state parameter; zero-variant state enums via `PhantomData`; states can carry state-specific fields | cliffle.com typestate post + Embedded Rust Book `GpioConfig<Enabled, Input, HighZ>` (zero-cost proven). Recurs: axum `Router<S>` → `.with_state()` → `Router<()>` (only `Router<()>` serves; routing/mod.rs), tokio-uring `UnsubmittedOneshot → .submit() → InFlightOneshot` (explicit batching seam between build and submit; driver/op/mod.rs), tower-http `TraceLayer` type-changing setters | whole misuse classes unrepresentable at zero runtime cost vs loops/branches get awkward, docs fragment across states, PhantomData-flavored errors | typestate, func, OO |
| `typestate-builder` | `Foo::builder().x(1).build()` — missing required field or double-set = compile error | builder completion state encoded in generic parameters; setters flip type-level slots; `build()` exists only on the complete state; bon derives it from a plain `fn new(…) -> Result` signature (Option params → optional setters, Result → fallible build) | typed-builder + bon READMEs (literature). Recurs: iggy `IggyMessage::builder()` via `#[bon]` (iggy_message.rs), leptos `#[component]` props (fn args → TypedBuilder struct; missing prop = missing-method error manufactured three macros deep — leptos_macro/src/component.rs; the `Props`-trait rendezvous between `#[component]` and `view!` shows macros coordinating through a small trait interface) | runtime failure modes become compile errors vs baroque typestate error messages, unnameable/unstorable builder types, proc-macro opacity | decl, typestate, DSL |
| `session-typed-compound-builders` | `let mut m = ser.serialize_map(len)?; m.serialize_entry(k, v)?; m.end()` — begin/step/end enforced by ownership | 7 associated types on `Serializer`, each bound to a sub-trait with `Ok`/`Error` equality constraints; begin consumes the serializer, `end(self)` consumes the sub-state | serde `serde_core/src/ser/mod.rs` L373–409 | protocol misuse = compile error, per-format state threading vs 7-associated-type ceremony, breaking change to extend | OO, imper, data |
| `freeze-phase-transition` | `BytesMut → buf.freeze() → Bytes` — unique&mutable becomes shared&immutable, forever | typestate by type-*pair*: two nominal types + a consuming zero-cost one-way edge; uniqueness invariant makes it sound; O(1) `split()` carves while unique | bytes `bytes/src/bytes_mut.rs`. Recurs: iggy `IggyMessagesBatchMut::freeze() → IggyMessagesBatch` — the same shape at domain level (server_common/messages_batch_mut.rs) | compiler-enforced aliasing phases at zero cost vs doubled type surface | typestate, data |
| `witness-token` | `db.delete_user(id, &token)` — uncallable without proof you logged in; `thread::scope`'s `s` | a type with no public constructor whose existence is the proof; lifetime-branded variants (invariant `'scope`) prevent escape | Crichton *Type-Driven API Design* + std `thread::scope` (literature) | capability security in vanilla types vs witness plumbing through every signature, brand lifetimes are hard reading | typestate, func, capability |
| `sealed-trait-stability-kit` | downstream can call/bound on the trait but `impl TheTrait for MyType` won't compile; internals unreachable *by construction* | the full kit: private-supertrait sealing (`pub trait T: private::Sealed`), doc-hidden sealed ABI traits, version-stamped `__private{PATCH}` modules via OUT_DIR (cross-version reaching becomes unlinkable), doc-hidden-but-stable APIs, alias traits for bounds | API Guidelines C-SEALED + the consolidated dtolnay toolkit (serde/thiserror/anyhow — serde-errors dossier §35). Recurs: iggy `VsrSessionControl` (dangerous methods kept off `dyn BinaryTransport`), tower `MakeService` (sealed trait-alias: sole blanket impl over `Service<Target, Response: Service<Request>>` with renamed associated types), thiserror `AsDynError` (sealed derive-ABI normalization), syn sealed `Token` types, io-uring sealed `EntryMarker` | a decade of 1.x semver, every accidental extension point closed vs closed worlds, "why can't I impl this" confusion | decl, OO, design-value |
| `sealed-argument-polymorphism` | `Read::new(types::Fd(x))` or `types::Fixed(3)` in the same slot; ops needing a real fd bound on `UseFd` only | `impl Trait` in argument position over a `pub(crate)`-sealed trait = a closed sum type in disguise; the impl choice auto-sets the `FIXED_FILE` flag so it can never be wrong | io-uring `src/types.rs` + `assign_fd!` (opcode.rs) | one constructor instead of pairs, invariant fused to type vs `impl sealed::…` doc wart, deliberately unextendable | OO, decl, data |
| `newtype-three-jobs` | `Miles(f64)` (unit safety) / `pub struct MyIter(Enumerate<Skip<I>>)` (rep hiding) / `NonZeroUsize::new(x)?` & `WireName::new(s)?` (parse-don't-validate) | one-field tuple structs; smart constructors refuse invalid values so all downstream code is infallible | patterns book + C-NEWTYPE/C-NEWTYPE-HIDE (literature). Recurs: iggy `WireName` (1–255 bytes; `const fn is_empty() { false }` — invariant so baked-in it's a constant) making `WireEncode` infallible | cheapest static guarantee in the language vs trait re-impl boilerplate (Deref shortcut is the documented anti-pattern) | data, func |
| `custom-type-not-bool` | `Widget::new(Small, Round)` not `Widget::new(true, false)` | dedicated enums/unit structs per argument (C-CUSTOM-TYPE, C-BITFLAG) | API Guidelines (literature) | self-documenting call-sites, transposition = type error vs nominal-type proliferation | decl, data |
| `typed-state-from-ref` | `State<Db>` peels a substate out of `AppState`; asking for un-provided state = **compile error**, `Rejection = Infallible` | `State<Inner>: FromRequestParts<Outer> where Inner: FromRef<Outer>`; `#[derive(FromRef)]` turns a struct into a DI graph; the router's `S` param carries the proof | axum `axum/src/extract/state.rs`, `axum-core/src/extract/from_ref.rs` | compile-time DI, refactor-safe vs `S` infecting every signature (axum's classic confusing errors) | type-level DI, decl |
| `resolved-id-boundary-types` | inner server fns take `ResolvedPartition` (plain Copy usizes), never `Identifier` | boundary newtypes: name→ID resolution happens exactly once at the protocol edge; inner signatures demand the resolved type so unvalidated input can't leak inward | iggy `core/server/src/shard/transmission/message.rs` | compiler-enforced layering + cheap Copy hot-path IDs vs near-identical struct family, edge conversions | data, typestate-lite |
| `uninhabited-assoc-type-plug` | `type SerializeSeq = Impossible<(), Error>;` — "this format has no sequences," said in types | `Impossible` holds `enum Void {}`; every method body is `match self.void {}` — unreachable code that typechecks to anything; associated types must be named even for unsupported features | serde `serde_core/src/ser/impossible.rs`. Kin: axum `match err {}` on Infallible (`Next::run`), `Rejection = Infallible` | no panics/lies, dead paths erased vs the ⊥-type concept load | func, data |
| `typed-path-reverse-routing` | route string lives on the struct; handler's first arg type registers the path; `UsersMember { id: 7 }.to_uri()` reverse-routes | `#[derive(TypedPath)]` emits `PATH` const + `FromRequestParts` + percent-encoding Display, validates captures-vs-fields at expansion; `RouterExt::typed_get` reads the path off the handler signature via sealed `SecondElementIs<P>` | axum-extra `axum-extra/src/routing/typed.rs` | route/type mismatch becomes compile error + URLs can't drift vs three-impl proc-macro depth, exotic errors | DSL, decl, meta |
| `capability-split-types` | one value can wait (`poll.poll(&mut events)`), many can register (`registry.register(...)` is `&self + Send + Sync + try_clone`); `let (count, set_count) = signal(0)` — the reader closure *cannot* write | the concurrency/capability contract encoded as a type split: `&mut self` on the exclusive half, `&self` on the shareable half; or read/write handles returned as a tuple | mio `src/poll.rs` (`Poll`/`Registry`). Recurs: leptos `signal() -> (ReadSignal, WriteSignal)` + `RwSignal::split()` (type-level CQS) | misuse unrepresentable, no visible locks vs two types where naive design has one | OO, data, func |

### 5.2 Spotlights

> Sketches are SHAPE only — call-site illustrations, not compilable programs (§1.5).

#### `typestate-protocol` — sequences the compiler can check

Consuming-`self` methods that return a *different type* turn a protocol's legal order into the only order that compiles. Zero runtime cost (the states are phantom); the classic embedded proof is a GPIO pin that cannot be read until configured. axum's `Router<S>` is the same technique wearing web clothes: only `Router<()>` — all state provided — can serve.

```rust
let resp = HttpResponse::new()
    .status_line(200, "OK")            // -> Builder<HeadersNext>
    .header("Content-Type", "text/plain")
    .body("hello");                    // calling .body() first simply doesn't exist

let pin = pin.into_push_pull_output(); // GpioConfig<Enabled, Output, PushPull>
```

#### `typestate-builder` — required fields as type-level slots

The builder variant of typestate: each setter flips a type-level slot, and `build()` only exists on the complete state — a missing required field is a missing-method error, not a runtime panic. Modern derives (typed-builder, bon) manufacture the whole ladder from a plain struct or fn signature.

```rust
let msg = IggyMessage::builder()
    .payload(bytes)          // required — without it, .build() is not a method
    .id(7)                   // optional — Option-typed params become optional setters
    .build()?;               // bon: Result-returning new() => fallible build
```

#### `freeze-phase-transition` — aliasing phases as a type pair

Two nominal types plus a consuming one-way edge encode a value's *lifecycle phase*: `BytesMut` (unique, mutable) freezes into `Bytes` (shared, immutable, O(1)-cloneable) and can never go back. Iggy repeats the identical shape at domain level (`IggyMessagesBatchMut::freeze()`), which is the tell that this is a general lever, not a bytes-ism.

```rust
let mut buf = BytesMut::with_capacity(4096);
buf.extend_from_slice(&header);
let frozen: Bytes = buf.freeze();  // unique&mutable -> shared&immutable, forever
let view = frozen.slice(0..4);     // zero-copy views are now sound
```

#### `sealed-trait-stability-kit` — closed worlds, decade-long semver

The dtolnay toolkit for keeping a public trait callable but not implementable: private supertraits, doc-hidden ABI traits, and version-stamped `__private{PATCH}` modules that make reaching into internals *unlinkable* across releases, not just discouraged. This is how serde/thiserror/anyhow have shipped a decade of 1.x.

```rust
// downstream crate — using and bounding on the trait: fine
fn encode<T: WireFrame>(t: &T) { /* … */ }

// implementing it: impossible by construction
impl WireFrame for MyType {}
// error[E0277]: the trait bound `MyType: private::Sealed` is not satisfied
```

---

## 6. Category 4 — Ownership as protocol & data-contract views

Ownership transfer, borrowing discipline, and buffer/layout contracts *as the API itself* — the category where Rust's move semantics become the design language. The flagship is tokio-uring's completion tuple `let (res, buf) = file.read_at(buf, 0).await` — a type signature that *is* the mental model of completion-based I/O. Sub-category 4a covers ownership choreography; 4b covers wire, layout, and const-time data contracts, anchored by iggy's validated wire views.

### 6.1 Technique table — 4a. Ownership choreography

| id | shape sketch | machinery | best exemplar | trade-off axis | tags |
|---|---|---|---|---|---|
| `buf-result-ownership-tuple` | `let (res, buf) = file.read_at(buf, 0).await;` — buffer MOVED in, handed back win or lose | `type BufResult<T, B> = (io::Result<T>, B)` + by-value `buf: T` params; per-op `Completable::complete` returns `(res, self.buf)` — the type signature IS the completion-model mental model | tokio-uring `src/lib.rs`, `fs/file.rs` | zero-copy soundness with no user unsafe + cancellation safety vs verbosity (re-bind every call), no AsyncRead interop | func (linear), data |
| `owned-slice-view` | `buf.slice(1..5)` instead of `&buf[1..5]`; `slice.into_inner()` recovers the buffer | `BoundedBuf { fn slice(self, range) -> Slice<Self::Buf> }` + blanket impl; `Slice<T>` re-implements IoBuf by offsetting — rebuilding std slicing for a world without borrows | tokio-uring `src/buf/{bounded,slice}.rs` | std-familiar call-sites across the ownership rupture vs a parallel abstraction stack + into_inner ceremony | func, decl |
| `unsafe-marker-trait-capability` | users pass `Vec<u8>`/`Bytes`/`FixedBuf` freely; adding a NEW buffer type is the audited act (`unsafe impl IoBuf for MyArena`) | `pub unsafe trait IoBuf: Unpin + 'static { stable_ptr; bytes_init; bytes_total }` — the prose contract ("pointer stays valid even if the value moves") is pinned to the `unsafe impl` keyword; stability via heap indirection, NOT Pin | tokio-uring `src/buf/io_buf.rs` | unsafe scales with buffer *types*, not *uses* vs invariant is prose (wrong impl = silent UB), `'static` excludes borrows by design | OO, decl |
| `unsafe-as-precise-specification` | `sub.register_files(&fds)?` safe; `unsafe { sub.register_buffers(&iovecs)? }`; one `unsafe { sq.push(&entry) }` waist in an otherwise-safe pipeline | unsafe placement keyed to *who owns the invariant*: kernel-validated ops are safe (bad fd = EBADF), caller-validated memory is unsafe fn with a flight-window doc contract; entry construction and completion harvesting stay safe (hourglass topology) | io-uring `src/squeue.rs` (`unsafe fn push`), `src/submit.rs` (registration split) | `unsafe fn` read as a specification, not a vibe; zero-cost flexibility vs zero compiler enforcement of the flight window | imper, data |
| `complete-consumes-self` | (op-author template) `fn complete(self, cqe) -> (res, self.buf)` — the only way out is by move | `Completable { fn complete(self, …) }` + `Updateable` for multi-CQE; `CqeType` phantom picks the Future impl; the SQE-building closure `FnOnce(&mut T) -> Entry` runs only after the data reaches its final owned home (pointer soundness by construction) | tokio-uring `src/runtime/driver/op/mod.rs`, `driver/mod.rs` | buffer-out-exactly-once enforced by moves vs pub(crate)-sealed extension | func, OO |
| `checkout-handle` | `registry.check_out(0) -> Option<FixedBuf>` — uniqueness enforced at runtime; Drop checks it back in; `pool.next(4096).await` waits for a free buffer | `Rc<RefCell<Registry>>` + RAII handle carrying its kernel `buf_index`; ops gate on the associated-type **equality** bound `T: BoundedBufMut<BufMut = FixedBuf>` so plain Vecs statically can't reach `read_fixed_at` | tokio-uring `src/buf/fixed/` | a runtime linear type for a kernel-shared resource, same call-site shape as normal reads vs `None`-not-compile-error, single-thread pinned | OO (RAII), data |
| `fd-refcount-protocol` | ops in flight keep the file open; `file.close().await?` reports the close error (Drop can't) | `SharedFd { Rc<Inner> }`; every op clones it into stored data; `Rc::get_mut` succeeding == "no ops in flight"; async close op after uniqueness | tokio-uring `src/io/shared_fd.rs` | use-after-close structurally impossible + reportable close vs subtle Rc-count signaling | OO, imper |
| `split-borrow-views` | `let (submitter, mut sq, mut cq) = ring.split();` then `cq.sync()` / `sq.sync()` as explicit memory-barrier verbs | `&mut self` proves exclusivity once, hands out three disjoint views; queues cache head/tail locally and touch the mmap'd Acquire/Release atomics only in `sync()` — batching made visible and controllable | io-uring `src/lib.rs`, `squeue.rs` | lock-free interleaving + explicit batching control vs forgetting `sync()` is a liveness bug types can't see | imper, data |
| `cheap-clone-as-contract` | APIs take `Bytes` by value; callers `.clone()` guilt-free; `frame.slice(0..4)` is a zero-copy view | **documented performance as API**: O(1) clone promise changes downstream design — owned `Bytes` instead of `&[u8] + 'a` erases lifetimes from whole protocol stacks (why hyper's body has no borrows) | bytes `bytes/src/bytes.rs` | lifetime-free protocol APIs vs deliberately breaking the "clone might be expensive" cultural heuristic | data, func |
| `pointer-tagging-lazy-promotion` | invisible: `Bytes::from(vec)` pays for a refcount only on first clone | KIND flag in the pointer's LSB; promotable vtables upgrade Vec-backed to Shared on first clone; `into_vec` reclaims when unique | bytes `bytes/src/bytes.rs` | pay-for-sharing-only vs some of the hairiest unsafe in the ecosystem | data, imper |
| `copy-handle-arena` | `move \|\| count.get()` — signals captured by copy into any number of closures, no `.clone()` dance | handle = `Copy` NodeId + `PhantomData<fn() -> T>` into a static `SlotMap<NodeId, Box<dyn Any + Send + Sync>>`; type safety recovered by downcast at access; the `Arc*` twin family (`ArcRwSignal` etc.) is the same API without Copy — the escape hatch from the arena and the best A/B demo of why Copy matters | leptos `reactive_graph/src/{signal/rw.rs, owner/arena.rs}` | spreadsheet-grade closure ergonomics vs lifetime errors become runtime absence (panic/`try_*`), per-access lock+downcast; doubled Arc/Copy API surface | data, OO |
| `owner-tree-not-lifetimes` | create `'static` UI state anywhere; it dies with its component scope; `on_cleanup` = free unmount hook | a runtime ownership tree replaces the borrow checker: `OwnerInner { parent, nodes, cleanups, children }`; arena items auto-register with the current thread-local OWNER; `Drop` cascades cleanups then frees arena nodes — "a garbage collector you can predict" | leptos `reactive_graph/src/owner.rs` | RAII at UI granularity, leak-free Copy handles vs runtime bookkeeping, use-after-dispose is a runtime error | OO, data, imper |
| `raii-guard` | `let g = mutex.lock()?; g.foo();` — the *absence* of a release call is the expressiveness | guard struct holding a borrow + `Deref`/`DerefMut` + `Drop` releasing; borrows can't outlive the guard | std `MutexGuard` (patterns book). Recurs: iggy `PooledBuffer` (Drop returns memory to the right pool bucket; implements compio IoBuf so pooled buffers ARE io_uring owned buffers — server_common/buffer.rs) | forget-proof cleanup vs hidden Drop control flow, guard-across-await hazards | OO, imper |
| `mem-take-transition` | `*e = MyEnum::B { name: mem::take(name) }` — enum transition in place through `&mut`, no clone | `mem::take`/`mem::replace` swap ownership out of a borrow | std (patterns book). Recurs: tower's documented clone-readiness idiom `mem::replace(&mut self.inner, clone)` — take the READY service, leave the clone | escapes clone-to-satisfy-borrowck vs verbosity, `Default` bound | imper, data |
| `closure-scoped-capability` | `thread::scope(\|s\| { s.spawn(\|\| use(&local)); })` — temporal guarantee made lexical | HOF owns setup/teardown; hands the closure a lifetime-branded token; invariant `'scope` prevents escape | std `thread::scope` (literature) | borrows across threads, joins guaranteed vs rightward drift, hardest borrow errors | func, capability |
| `entry-api` | `*counts.entry(word).or_insert(0) += 1` — one lookup, reified | the lookup result as a first-class `Entry` enum (Occupied/Vacant) reusing the found slot (C-INTERMEDIATE) | std `hash_map::Entry` (literature) | one lookup + declarative site vs whole intermediate type, exclusive borrow held | func, data |
| `borrowed-args-and-temporary-mutability` | `fn f(s: &str)` accepts `&String`; `let data = { let mut d = get(); d.sort(); d };` | deref coercion at call boundaries; shadowing/block freezing — paired pure-win micro-idioms | patterns book (literature) | free flexibility; only cost is knowing them | imper, func |
| `gat-lending-iterator-views` | `while let Some(mut view) = iter.next() { view.set_offset(…) }` — sequential mutable windows over ONE buffer | `LendingIterator` with `type Item<'next>` GAT — items borrow from `&mut self`, impossible for std `Iterator` | iggy `core/common/src/types/message/message_view_mut.rs` | safe zero-copy mutable iteration vs no `for` loops/adapters, third-party crate until std | func, data |
| `ecs-data-oriented` | systems as free fns over component queries; entities are generational indices, not pointers | struct-of-arrays component storage + `GenerationalIndex { index, generation }` — OO object graphs need aliased mutability the borrow checker forbids; indices align with it | Catherine West RustConf 2018 (literature); industrialized as bevy (§3 queries) | borrow-checker alignment, cache locality, parallel systems vs ID indirection, no `entity.method()` | data, imper |
| `routing-envelope-shard-protocol` | `ShardRequest::data_plane(ns, payload)` / `::control_plane(payload)` — thread-per-core shards speak typed envelopes | routing envelope + payload enum reusing the wire request types; `SocketTransfer { fd: OwnedFd, … }` hands live connections between shards with FD ownership in the type | iggy `core/server/src/shard/transmission/message.rs` | exhaustively-matched ownership-correct internal protocol vs giant enum every subsystem touches | data, imper, actor |

### 6.2 Technique table — 4b. Wire, layout & const-time data contracts

| id | shape sketch | machinery | best exemplar | trade-off axis | tags |
|---|---|---|---|---|---|
| `buffer-first-encode` | `req.encode(&mut buf)` + `req.encoded_size()`; cold path `to_bytes()` | trait with caller-owned-buffer core + provided pre-sizing convenience; companion `RawMessage::encode_header` writes only the fixed header, payload rides as its own iovec (vectored zero-copy send) | iggy `core/binary_protocol/src/codec.rs` (+ `requests/messages/send_messages.rs`) | allocation control on hot paths vs duplicated size logic (encode/encoded_size drift hazard), split-responsibility API | data, imper |
| `offset-cursor-decode` | `let (req, consumed) = T::decode(buf)?` — decoders are pure functions of a slice | decode returns value + bytes consumed; helpers return coordinate-carrying errors `UnexpectedEof { offset, need, have }`; `capped_capacity(count, remaining, min_item)` caps prealloc hints so hostile counts can't OOM | iggy `codec.rs` | composable forensic decoding + DoS defense vs manual offset arithmetic, convention-held defenses | func, data |
| `validated-wire-views` | `let view = WireMessageView::new(buf)?;` then infallible `view.id()`, `view.payload()`; mutable twin patches `set_offset/set_timestamp/set_checksum` in place | validate once in the constructor, then `#[inline]` infallible accessors over `&[u8]`; `WireMessageViewMut` over `split_at_mut` patches server-assigned header fields inside the client's bytes — zero re-serialization | iggy `core/binary_protocol/src/message_view.rs` | the constructed value is the certificate (no Result noise, no copies) vs discipline-held bounds invariant, frozen wire layout | data, typestate-lite, imper |
| `const-assert-layout-contract` | edit a layout offset wrongly → the crate stops compiling | `pub const` offsets + anonymous `const _: () = { assert!(…) }` blocks proving contiguity and totals; one home for the layout | iggy `message_layout.rs` | free compile-time layout proof — closest thing to a free lunch in the map | decl |
| `const-dispatch-table` | `lookup_command(code)?.name` — O(1), usable in const | const slice of `CommandMeta` built by `const fn` named constructors + `const fn` match jump table; index-consistency tests make hand-sync tamper-evident | iggy `dispatch.rs` | O(1) const lookup, single source of truth vs manually synchronized indices | decl, data |
| `const-packed-semver` | `IGGY_PROTOCOL_VERSION` auto-bumps with every release; compatibility = one integer compare | `const fn parse_packed_semver(env!("CARGO_PKG_VERSION"))` — 10 bits per component, order-preserving | iggy `version.rs` | unforgeable handshake (cargo bumps it) vs 1024-per-component ceilings | decl, data |
| `const-code-probe` | `probe.is_supported(opcode::Read::CODE)` — the constructor identifier doubles as the feature-query token | every `opcode!` expansion exports `const CODE: u8`; repr(C) `Probe` wrapper with safe query | io-uring `opcode.rs`, `register.rs` | drift-free kernel capability detection vs user-side runtime-check discipline | decl, data |
| `lifetime-encoded-zero-copy` | `struct Record<'a> { #[serde(borrow)] name: &'a str }` — points INTO the input; bounds pick the contract (`Deserialize<'a>` may borrow, `DeserializeOwned` must not) | trait lifetime `'de`; three string channels (`visit_str`/`visit_borrowed_str`/`visit_string`); `DeserializeOwned: for<'de> Deserialize<'de>` — a universally-quantified lifetime as a *negative* capability statement | serde `de/mod.rs` L554/L1543/L632 | zero-copy proven in signatures vs serde's single biggest learnability tax, HRTB error walls | func, data, decl |

### 6.3 Spotlights

> Sketches are SHAPE only — call-site illustrations, not compilable programs (§1.5).

#### `buf-result-ownership-tuple` — the completion model in one signature

In a completion-based world the kernel owns your buffer while the op is in flight, so borrowing is unsound; tokio-uring's answer is to make the *type signature* the mental model: the buffer moves in, and comes back in the result tuple whether the op succeeded or not. No user-visible unsafe, cancellation-safe by construction; the price is re-binding on every call and losing `AsyncRead` interop.

```rust
let buf = vec![0u8; 4096];
let (res, buf) = file.read_at(buf, 0).await;  // buffer MOVED in, handed back win or lose
let n = res?;
process(&buf[..n]);
```

#### `cheap-clone-as-contract` — documented performance as API

`Bytes` promises O(1) clone, and that *documented promise* is the technique: once cloning is free, protocol APIs take `Bytes` by value, lifetimes vanish from whole stacks (hyper's body has no borrows), and `.slice()` views replace borrow gymnastics. The cost is cultural — it deliberately breaks the "clone might be expensive" heuristic every Rust reader carries.

```rust
fn route(frame: Bytes) {
    let header = frame.slice(0..4);   // zero-copy view
    for tx in subscribers {
        tx.send(frame.clone());      // O(1) by contract — clone guilt-free
    }
}
```

#### `copy-handle-arena` — spreadsheet ergonomics via arena indirection

leptos signals are `Copy` handles (a NodeId + phantom type) into a hidden arena, so they can be captured by copy into any number of closures with no `.clone()` dance — the ergonomic foundation of the whole framework. The trade is honest: lifetime errors become runtime absence, and the `Arc*` twin family exists as the escape hatch (same API, minus Copy) — the best A/B demo of what Copy buys.

```rust
let (count, set_count) = signal(0);
view! {
    <button on:click=move |_| set_count.set(count.get() + 1)>
        "Clicks: " {move || count.get()}   // same handle, N closures, zero clones
    </button>
}
```

#### `unsafe-as-precise-specification` — unsafe placement keyed to invariant ownership

io-uring places `unsafe` exactly where the *caller* owns an invariant the kernel can't check: registering file descriptors is safe (kernel validates, bad fd = EBADF), registering memory is `unsafe fn` (the kernel will trust those pointers), and one `unsafe { sq.push(&entry) }` waist carries the "entry data must stay valid while in flight" contract. `unsafe fn` read as specification, not vibe.

```rust
sub.register_files(&fds)?;                  // kernel-validated: safe
unsafe { sub.register_buffers(&iovecs)? };  // caller-validated memory: unsafe fn
unsafe { sq.push(&read_entry)?; }           // THE waist: valid-while-in-flight contract
```

#### `validated-wire-views` (4b) — the constructed value is the certificate

Iggy's wire views validate a byte slice once in the constructor, then expose infallible `#[inline]` accessors — no per-field `Result` noise, no copies, because holding a `WireMessageView` *is* the proof the bytes are well-formed. The mutable twin patches server-assigned header fields (offset, timestamp, checksum) in place inside the client's own bytes, eliminating re-serialization.

```rust
let view = WireMessageView::new(&buf)?;   // validate once
let id = view.id();                       // infallible, zero-copy from here on
let payload = view.payload();

view_mut.set_checksum(crc);               // patch in place — no re-encode
```

---

## 7. Category 5 — Async & I/O models from first principles

The readiness↔completion fork and everything it forces: backpressure protocols, cancellation semantics, the Pin seam, and runtime-agnostic cores. The flagship is the fork itself — mio's readiness contract ("the kernel never holds your buffer," which is what makes `select!`-style drop-to-cancel sound) versus io_uring's completion model (which forces ownership transfer into the API, producing Category 4's flagship).

### 7.1 Technique table

| id | shape sketch | machinery | best exemplar | trade-off axis | tags |
|---|---|---|---|---|---|
| `readiness-model-contract` | drain-until-`WouldBlock` loop per event; the loop tells you *when to try*, never hands you data | behavioral contract in docs (spurious events legal, draining mandatory, WouldBlock is a signal); epoll/kqueue native, IOCP adapted to a readiness facade. THE design stance: kernel never holds your buffer ⇒ borrowed `&mut [u8]` I/O is sound and cancellation is free — which is what makes `select!`'s drop-to-cancel sound; completion models (io_uring) force ownership transfer into the API (§6 `buf-result-ownership-tuple`) | mio `src/poll.rs` (contrast anchored in both tokio and io-uring dossiers) | free cancellation + no kernel buffer coupling vs syscall-per-try, contract lives in an essay not types | imper, data, contract-by-doc |
| `correlation-token-demux` | `registry.register(&mut src, Token(0), READABLE)`; later `match event.token()`; io_uring: `.user_data(0x42)` → `cqe.user_data()` | return-a-correlation-id instead of accept-a-closure: newtype integer threaded through the OS and echoed back; no stored callbacks, no allocation — demux is the user's match/slab. Managed tier: tokio-uring stamps its op-slab index as user_data automatically | mio `src/token.rs`. Recurs: io-uring raw `user_data` + tokio-uring `driver.submit_op` slab stamping | zero-alloc callback-less core (the blank slate tokio builds its waker table on) vs manual slab bookkeeping, stale tokens unchecked | data, imper |
| `source-trait-delegation` | any wrapper joins the event loop by forwarding `register/reregister/deregister` to its inner handle | `event::Source` trait with delegate-to-inner as the documented norm; `Box<T>` forwarding impls | mio `src/event/source.rs` | open uniform extension, ~10-line wrappers vs lifecycle-only (I/O logic still manual) | OO, decl |
| `poll-ready-readiness-split` | `svc.ready().await?.call(req)` — backpressure visible as a separate awaitable step | `poll_ready` reservation protocol propagating through middleware onions (each layer delegates inward); semaphore permits acquired at readiness | tower `tower-service/src/lib.rs` | allocation-free composable backpressure vs two-phase protocol every caller must honor, the clone-readiness trap | imper, data |
| `nameable-future-state-machines` | invisible: middleware chains compile with zero boxes | because `Service::Future` must be nameable, every combinator hand-writes its future as a `pin_project!` struct/enum state machine (`Oneshot`'s NotReady→Called→Done loop is a hand-desugared async fn) | tower `tower/src/util/oneshot.rs`, `either.rs` | zero alloc/layer + auto-trait transparency vs enormous authoring cost — the axis where tower pays most | imper, data |
| `oneshot-owned-drive-to-completion` | `svc.oneshot(req).await?` — ready + call + await in one expression, misuse impossible | owned pin-projected enum state machine consuming the service (`req: Option<Req>` moved out at transition) | tower `tower/src/util/oneshot.rs` | safest call-site (can't forget ready) vs consumes the service | imper, func |
| `lending-ready-future` | `svc.ready().await?` resolves to `&mut S` — borrow, call, borrow ends | `Ready<'a>` defined by instantiating `ReadyOneshot` at `T = &'a mut S` (reuse via reference-instantiation, legal via the `&mut S` Service impl); `PhantomData<fn() -> Request>` variance/auto-trait engineering; manual `impl Unpin` | tower `tower/src/util/ready.rs` | zero-cost readiness borrow returning the original service vs borrow-scope constraints | func, imper, data |
| `spawn-detached-handle` | `tokio::spawn(fut)` fire-and-forget or `let v = handle.await??` | `F: Send + 'static` bounds (work-stealing leaks into types on purpose); `JoinHandle` detaches on drop, is `Unpin` (select-friendly), reifies panics as `Result<T, JoinError>`; `abort()` as the explicit escape | tokio `task/spawn.rs`, `runtime/task/join.rs` | thread::spawn familiarity vs no structured concurrency (leaked-task failure class), bounds are the #1 compile error | imper, OO, func |
| `drop-detach-lifecycle` | drop an in-flight read future in `select!`; nothing dangles | driver parks the dropped op's owned state in `Lifecycle::Ignored(Box<dyn Any>)` until the CQE lands — only possible because the buffer was *moved* in | tokio-uring `runtime/driver/op/mod.rs` | absolute cancellation safety in a completion world vs drop doesn't cancel the syscall, invisible held memory | func, imper |
| `pin-shadowing-seam` | `tokio::pin!(future);` then `_ = &mut future =>` across select iterations — the ONE place users meet Pin | shadowing trick: rebind by move, then shadow the name with `Pin::new_unchecked(&mut x)` — the original binding becomes unnameable, discharging the pin obligation *syntactically*; the seam's location (only "hold a future across poll sites") is a design decision | tokio `macros/pin.rs` | safe stack pinning in one line vs deep magic, the worst error messages in async Rust when forgotten | DSL, imper, unsafe-encapsulation |
| `readbuf-tristate-buffer` | implementors receive `&mut ReadBuf<'_>`, not `&mut [u8]` — the buffer knows what's initialized | view struct tracking filled/initialized/unfilled regions; progress read structurally from `filled()` growth | tokio `io/async_read.rs` | safe uninit reads, no zeroing tax vs new vocabulary type in the crate's most fundamental trait | data, imper |
| `lifecycle-promoted-into-trait` | `stream.shutdown().await?` composes through BufWriter-over-TLS-over-TCP | `poll_shutdown` required in `AsyncWrite` (shutdown-implies-flush): if a lifecycle event must traverse wrappers, it must live in the trait | tokio `io/async_write.rs` | composable graceful close vs boilerplate in trivial impls | OO, decl |
| `sans-io-core` | `machine.handle_input(&datagram, now); while let Some(t) = machine.poll_transmit() { socket.send(...)?; }` — a protocol library with no I/O | pure state machine with `handle_*`/`poll_*` pairs; async-vs-blocking and runtime choice deferred to the caller; functional core, imperative shell | quinn-proto / Firezone essay (literature). Recurs: iggy `RequestFrame<'a>`/`ResponseFrame<'a>` sans-IO framing shared by 4 transports incl. completion-I/O part-wise construction (framing.rs) | runtime-agnosticism + deterministic no-network tests vs every consumer writes an event loop | func-core/imper-shell, data |
| `not-send-by-design` | `tokio_uring::spawn(task)` — no `Send` bound; `Rc`/`RefCell` flow across `.await` | thread-per-core as an *absence* of bounds: `spawn_local` + `LocalSet` + thread-local driver context; every internal structure is Rc-cheap because the type-system decision came first | tokio-uring `runtime/mod.rs` | lock-free internals matching per-thread rings vs no work stealing, invisible-until-violated regime change | imper, data |
| `impl-stream-interop` | `while let Some(Ok(msg)) = consumer.next().await` — the whole futures combinator ecosystem for free | hand-rolled `impl futures::Stream` state machine (buffering, polling, auto-commit) + a justified 4-point `unsafe impl Sync` | iggy `core/sdk/src/clients/consumer.rs:923` | ecosystem interop (`take_until`, select loops) vs hand-written poll_next machine | func, imper |
| `trait-variant-send-duality` | one trait definition; Send and non-Send handler variants; `consume_messages(&MyHandler, shutdown)` push-style | `#[trait_variant::make(MessageConsumer: Send)]` generates the Send-bounded twin from the local definition (native AFIT, no boxing) + `impl for &T` | iggy `core/sdk/src/consumer_ext/mod.rs` | both threading models + push/pull duals from one definition vs niche macro, doubled concepts | func, OO |
| `async-await-registers` | `client.get(url).send().await?` — imperative-looking, suspension-capable | compiler builds an inert, exactly-sized state machine per async fn; executors are the consuming register, combinators the combinatoric, hand-`impl Future` the core — the four-register grid, with its gaps (no async iteration sugar) explaining where APIs feel unfinished | without.boats (literature) | intra-task concurrency (heterogeneous select) has no thread equivalent vs two-colored ecosystem, Pin | control-flow, func-core |

### 7.2 Spotlights

> Sketches are SHAPE only — call-site illustrations, not compilable programs (§1.5).

#### `readiness-model-contract` — a contract that lives in an essay

mio hands you *when to try*, never data; the drain-until-`WouldBlock` loop is the whole API, and the load-bearing consequence is invisible: because the kernel never holds your buffer, borrowed `&mut [u8]` I/O is sound and dropping a future is a complete cancellation. Every readiness-world ergonomic (tokio's `select!`, borrowed reads) rests on this doc-borne contract.

```rust
poll.poll(&mut events, None)?;
for ev in &events {
    loop {
        match sock.read(&mut buf) {                       // borrowed buffer: sound here
            Err(e) if e.kind() == WouldBlock => break,    // drained — wait for next event
            r => handle(r?),
        }
    }
}
```

#### `poll-ready-readiness-split` — backpressure as a visible step

tower splits "may I?" from "do it": `ready()` is a separate awaitable that reserves capacity, propagating inward through the middleware onion (semaphore permits are acquired at readiness). Backpressure becomes composable and allocation-free; the cost is a two-phase protocol every caller must honor, plus the documented clone-readiness trap.

```rust
let svc = svc.ready().await?;    // reserve capacity first…
let resp = svc.call(req).await?; // …then spend it
// or, misuse-proof: svc.oneshot(req).await?
```

#### `pin-shadowing-seam` — the one place users meet Pin

`tokio::pin!` discharges the pinning obligation *syntactically*: it rebinds the value by move, then shadows the name with a `Pin<&mut _>`, making the original binding unnameable. The design decision is where the seam sits — users only meet Pin when holding a future across poll sites (e.g. re-polling in a `select!` loop), and one macro line covers it.

```rust
let sleep = time::sleep(Duration::from_secs(5));
tokio::pin!(sleep);                      // `sleep` is now Pin<&mut Sleep>
loop {
    select! {
        _ = &mut sleep => break,         // same future polled across iterations
        msg = rx.recv() => handle(msg),
    }
}
```

#### `sans-io-core` — the protocol with no I/O

A protocol library shipped as a pure state machine: bytes and clock readings in, transmit-intents out, with `handle_*`/`poll_*` pairs and zero sockets. The caller owns the event loop, so async-vs-blocking and runtime choice are deferred — and tests run deterministically with no network. Iggy's `RequestFrame`/`ResponseFrame` reuse the shape to share one framing core across four transports.

```rust
machine.handle_input(&datagram, now);             // pure: bytes in…
while let Some(t) = machine.poll_transmit() {     // …intents out
    socket.send_to(&t.contents, t.destination)?;  // caller owns all real I/O
}
```

---

## 8. Category 6 — Control-flow & reactivity expression

Reifying "what happens next" as values and syntax: racing, joining, piping, deferral, fallibility flow, and the two reactivity models (bevy's tick-based change detection and leptos's observer graph — same promise, entirely different machinery, and the contrast is curriculum content). The flagship is `tokio::select!`, the single highest-leverage shape in async Rust.

### 8.1 Technique table

| id | shape sketch | machinery | best exemplar | trade-off axis | tags |
|---|---|---|---|---|---|
| `select-match-shaped-racing` | `select! { Some(m) = rx.recv() => …, _ = &mut shutdown => break, else => … }` — a match over "whichever finishes first," with patterns, guards, biased mode | TT-muncher normalizing branches into an `@`-state machine, unary `count!` arithmetic, a proc-macro-minted output enum + disabled-mask, all pinned into one `poll_fn` with random-start fairness; the doc essay defines cancellation safety because losers are DROPPED | tokio `macros/select.rs` | the single highest-leverage shape in async Rust vs the cancellation-safety semantic tax, 64-branch cap, macro errors | DSL, decl, func |
| `join-borrowing-concurrency` | `let (a, b) = join!(fetch(&db), posts(&db));` — concurrency as expression composition, borrows allowed | `maybe_done` wrappers pinned on the current task + rotating fairness counter; nothing leaves the task ⇒ no `Send`, no `'static` — the teaching pair with `spawn` (ownership transfer) | tokio `macros/join.rs` | zero-alloc structured completion with borrows vs no parallelism, all-cancelled-together | func, decl, DSL |
| `question-mark-from-conversion` | `let s = fs::read_to_string(p)?;` — linear happy-path prose; errors convert silently across types | `?` desugars through `Try` + `From::from` on the error branch; thiserror `#[from]` completes the shape | std `core/ops/try_trait.rs` (literature) | invisible type-directed plumbing vs *which* conversion fired is invisible too | control-flow, func |
| `result-either-response` | handlers return `Result<Json<T>, ApiError>` and use `?`; both arms render | `impl IntoResponse for Result<T: IntoResponse, E: IntoResponse>` — four lines wiring native error flow into HTTP | axum `axum-core/src/response/into_response.rs` | language-native error control flow vs no status discipline in types | func, decl |
| `retry-policy-option-future` | `.retry(Attempts(3))`; policy returns `None` = stop, `Some(sleep_fut)` = retry after backoff; may rewrite the request | `Policy` trait: `retry(&mut self, &mut Req, &mut Result) -> Option<Self::Future>` + `clone_request -> Option<Req>` ("is this replayable?" answered per request) | tower `tower/src/retry/policy.rs` | a whole retry DSL in one small trait vs the Option-future protocol must be learned, `&mut` powers are spooky | func, imper, data |
| `commands-deferred-mutation` | `commands.entity(e).despawn(); commands.spawn((A, B)).insert(C);` — imperative feel mid-parallel-iteration, semantically queued | commands as first-class values (`Command: FnOnce(&mut World)` blanket = escape hatch one closure away); Entity IDs reserved immediately from a lock-free allocator, mutations applied at `ApplyDeferred` sync points | bevy `system/commands/{mod,command}.rs` | structural mutation inside parallel iteration vs temporal indirection ("I spawned it, why can't I query it?") | imper surface, func core (reified effects), data |
| `tuple-schedule-dsl` | `add_systems(Update, ((input, ai).in_set(Decide), (move, collide).chain(), hud.after(Decide).run_if(cond)))` — a dependency subgraph as one value | chain methods fold metadata into a recursive `ScheduleConfigs` AST (leaves = systems); tuples via all_tuples; interpreted once at startup into a graph with auto sync points; `.after(some_fn)` names a system fn as an anchor | bevy `schedule/config.rs` | graphs-as-data with near-zero syntax vs cycle/ambiguity errors at runtime, execution order hidden from readers | decl, DSL, data, func |
| `conditions-as-composable-systems` | `.run_if(resource_exists::<Save>.and_then(on_timer(30s)))` | a condition is just any read-only system returning bool (`IntoSystem<In, bool, _, System: ReadOnlySystem>` — a soundness policy in one associated-type bound); combinators union access sets; `run_once(mut has_run: Local<bool>)` = the whole param system reused in 4 lines | bevy `schedule/condition.rs` | full DI in predicates, one uniform concept vs combinator type soup, eager/lazy evaluation subtlety | func, decl |
| `system-piping-in-position` | `find_target.pipe(aim)` where `aim(In(target): In<Option<Entity>>, …)` — reserved *first* position marks pipeline input | `SystemInput` first-param protocol (`In`, `InRef`, `InMut`) + `PipeSystem` unioning access; `Out = Result` routes `?` errors to the app-level handler | bevy `system/{input,combinator}.rs` | point-free composition over DI'd fns vs a pipe is one scheduling node, positional magic | func |
| `observer-on-event-param` | `add_observer(\|e: On<Explode>, mut commands: Commands\| …); world.trigger(Explode { power })` — callbacks with full DI | `On<E, B>` input param (Deref to the event); dispatch strategy is `Event::Trigger<'a>` GAT chosen by the event type (global / entity-targeted / propagating); observers are themselves entities | bevy `observer/`, `event/` | callback ergonomics without losing ECS access, type-routed dispatch vs re-entrant flow invisible to the schedule graph | decl, OO, func, DSL |
| `change-detection-smart-pointer` | mutate through `Mut<T>` normally; ask `.is_changed()`; filter `Changed<T>` — reactivity with zero subscriptions | instrumented `DerefMut` bumps a tick + records `Location::caller()`; ticks compared against per-system `last_run` so "changed" means "since THIS system last looked"; `set_if_neq` / `bypass_change_detection` as honest escapes | bevy `change_detection/` | free per-observer reactivity vs deref false-positives by design, tick memory/check overhead | data, decl, imper |
| `flag-verbs-for-op-graphs` | `.flags(Flags::IO_LINK)` — this op won't start until the previous completes; dependency DSL with zero new types | bitflags whose doc comments carry kernel semantics; machine-managed bits (`FIXED_FILE`) hidden from the human vocabulary; symmetric cqueue decoder fns | io-uring `squeue.rs`, `cqueue.rs` | op-graph pipelines/barriers as annotations vs position-sensitive semantics invisible in types | decl, DSL, data |
| `enum-match-state-machine` | exhaustive `match` over states; adding a variant breaks every match — on purpose | sum types + exhaustiveness as a *delivered feature*; state-specific data lives only in its variant; transitions under `&mut` via mem::take | patterns book / syn::visit (literature) | compiler-enforced completeness vs closed world (the expression-problem fork vs trait objects) | func, data |
| `implicit-subscription-tracking` | `Memo::new(move \|_\| format!("{} {}", first.get(), last.get()))` — reading IS subscribing; no deps array | thread-local current-observer + blanket `Track` impl; dependencies are dynamic (skipped `.get()` unsubscribes); `_untracked` verb column and `Effect::watch` as explicit escapes | leptos `reactive_graph/src/traits.rs`, `effect/effect.rs` | kills the stale-deps bug class with run-precision vs spooky action via thread-local, "who subscribed me?" debugging | func, decl, imper-underneath |
| `closure-is-a-view` | `<p>"Count: " {move \|\| count.get()}</p>` — a closure in child position updates itself forever | blanket `impl Render for F: Fn() -> V` wrapping itself in its own `RenderEffect`; components run ONCE, the UI becomes a swarm of per-hole micro-effects — fine-grained reactivity as a trait impl on Fn | leptos tachys `reactive_graph/mod.rs` | smallest possible update granularity vs the `{count.get()}` (static forever) vs `{move \|\| count.get()}` (reactive) one-character cliff | func, decl, dataflow |
| `prev-value-fold-closures` | `Memo::new(\|prev\| …)`, `Effect::new(\|prev_handle\| { cancel(prev); … })` — reactive computations as folds over time | `Fn(Option<&T>) -> T` with PartialEq damping; `new_with_compare` / `new_owning -> (T, bool)` dial the equality semantics | leptos `computed/memo.rs`, `effect/` | cancellation/diffing/cleanup fall out of the fold shape vs PartialEq bound, three constructors to choose | func, dataflow |
| `nightly-fn-call-sugar` | `count()` reads, `set_count(42)` writes — signals ARE functions (nightly) | direct `Fn*` impls via `extern "rust-call"` delegating to Get/Set; unifies signals with thunks everywhere `Fn() -> T` is accepted | leptos `reactive_graph/src/nightly.rs` | maximal terseness, beautiful equivalence vs nightly-only — forked the ecosystem's docs into two dialects (cautionary) | func |

### 8.2 Spotlights

> Sketches are SHAPE only — call-site illustrations, not compilable programs (§1.5).

#### `select-match-shaped-racing` — a match over "whichever finishes first"

`select!` gives racing the shape of a `match`: patterns, guards, an `else` arm, biased mode. Underneath is the heaviest macro_rules machinery in the ecosystem (TT-munching normalization, unary arithmetic, a proc-macro-minted enum), and the deepest cost is semantic, not syntactic — losing branches are *dropped*, so "cancellation safety" had to be defined in a doc essay. Teaching pair: `join!` composes concurrency with borrows inside one task (no `Send`, no `'static`), while `spawn` transfers ownership to the runtime.

```rust
select! {
    Some(msg) = rx.recv() => process(msg),
    _ = &mut shutdown => break,
    _ = interval.tick(), if !paused => flush(),
    else => continue,
}

let (user, posts) = join!(fetch_user(&db), fetch_posts(&db)); // borrows allowed
```

#### `tuple-schedule-dsl` — a dependency subgraph as one value

Bevy's scheduling DSL folds ordering metadata (`in_set`, `chain`, `after`, `run_if`) into a recursive config AST whose leaves are plain system fns, interpreted once at startup into an execution graph. A whole dependency subgraph is one expression — and execution order becomes something you *declare* rather than something the reader can trace line-by-line.

```rust
app.add_systems(Update, (
    (read_input, enemy_ai).in_set(Decide),
    (apply_moves, collide).chain(),                 // explicit sequencing
    update_hud.after(Decide).run_if(in_state(Playing)),
));
```

#### `implicit-subscription-tracking` — reading is subscribing

leptos kills the stale-dependencies bug class by making the read itself the subscription: a thread-local "current observer" records every `.get()` during a computation, and dependencies are re-derived every run (a skipped read unsubscribes). The cost is spooky action through a thread-local and harder "who subscribed me?" debugging; `_untracked` verbs are the honest escape.

```rust
let full_name = Memo::new(move |_| format!("{} {}", first.get(), last.get()));
// no deps array — the two .get() calls ARE the subscription, re-derived each run
```

#### `closure-is-a-view` — fine-grained reactivity as a trait impl on Fn

A blanket `impl Render for F: Fn() -> V` means any closure placed in child position wraps itself in its own `RenderEffect` — components run once, and the UI becomes a swarm of per-hole micro-effects. The famous one-character cliff is the price: `{count.get()}` renders once, statically, forever; `{move || count.get()}` updates itself for the life of the app.

```rust
view! { <p>"Count: " {move || count.get()}</p> }
//                    ^ closure = live view, updates itself forever
//      {count.get()} without the closure would render once and freeze
```

---

## 9. Category 7 — Construction & configuration surfaces

How values get built and configured: the builder family, defaulted type parameters, policy vocabularies, and the surfaces that make "hello world" three lines. The flagship pair: tower's `ServiceBuilder` (whose reading order *is* request-flow order — a fold that inverts the wrap order) and bevy's `&mut self` App builder (chosen because a by-value builder can't be handed to N plugins).

### 9.1 Technique table

| id | shape sketch | machinery | best exemplar | trade-off axis | tags |
|---|---|---|---|---|---|
| `consuming-fluent-builder` | `FooBuilder::new().name(x).build()`; iggy flavor: `.auto_join_consumer_group().without_encryptor()` — boolean knobs as named verb *pairs* | `mut self`-consuming setters returning `Self`; terminal `build(self)` | patterns book builder + std `thread::Builder` (literature). Recurs: iggy consumer/producer builders (verb pairs read as configuration prose; consumer_builder.rs) | chainable one-liners + move-only fields vs rebinding in branches/loops, 2× method count for verb pairs | OO, decl |
| `mut-ref-builder-chain` | `app.add_plugins(X).init_resource::<R>()…; if debug { app.add_systems(…); } app.run();` — chain AND interleaved statements | every method `(&mut self) -> &mut Self`; chosen where the object must be threaded through foreign code (`Plugin::build(&self, app: &mut App)` — a by-value builder can't be handed to N plugins) | bevy `bevy_app/src/app.rs`. Recurs: tokio `runtime::Builder` (conditional config + build() twice; runtime asserts instead of typestate), std `process::Command` (C-BUILDER's preferred non-consuming variant) | dual-shape ergonomics + shareable builder vs no compile-time completeness, `let app = App::new().foo()` temporary-lifetime paper-cut | imper, OO |
| `builder-order-inversion` | `ServiceBuilder::new().buffer(100).limit(10).timeout(d).service(svc)` — reading order = request-flow order | each `.layer()` pushes as the Stack's *inner* slot so earlier-added ends up outermost — a fold that reverses the wrap order; ordering is semantics (documented 110-vs-10 example) | tower `tower/src/builder/mod.rs` | top-down pipeline readability vs two mental models (raw onion vs builder order) | decl, DSL |
| `domain-vocabulary-builder-methods` | `.buffer(5).rate_limit(5, 1s).retry(p).timeout(10s)` — a discoverable, IDE-completable vocabulary | one-line cfg-gated sugar per layer over generic `.layer(…)`; `.layer()`/`.layer_fn()`/`.service_fn()` keep the vocabulary open | tower `builder/mod.rs` | discoverability vs N methods maintained in lockstep, precise return types surface in signatures | DSL, decl, OO |
| `default-type-param-policy-slots` | `TraceLayer::new_for_http().on_response(f)` — 7 slots, name only what you change; `RwSignal<T>` vs `RwSignal<T, LocalStorage>`; `IoUring<Entry128, Entry32>` for exotic kernels | defaulted type parameters keep the common case invisible; setters are type-*changing* (typestate-lite config-as-types); constructor-pinned params (`new_for_http`) select policy; io-uring wires an associated `const BUILD_FLAGS` so the type IS the syscall config | tower-http `trace/layer.rs`. Recurs: leptos `Storage` policy (`SyncStorage` default, `LocalStorage` = SendWrapper for !Send; owner/storage.rs), io-uring `IoUring<S = Entry, C = Entry>` + sealed `EntryMarker` (misconfig = type error). Kin: anyhow `Result<T, E = Error>` (§12/10a) | zero-cost static callbacks/policies, exotic cases pay in annotations only vs param soup in every error touching the type, policy generics leak downstream | decl, DSL, data |
| `callback-trait-closure-unit-strategy` | `.on_request(\|req, span\| …)` or `.on_request(DefaultOnRequest::new().level(INFO))` or `.on_request(())` to disable | a trait per hook + three impl families: `()` (compile-time off switch), blanket `FnMut` (closures), named strategy structs (configuration) | tower-http `trace/on_request.rs` | closure ergonomics + statically-eliminated no-op vs blanket freezes the closure signature forever | func, OO, DSL |
| `default-struct-update` | `Config { verbose: true, ..Default::default() }` | `#[derive(Default)]` + struct-update syntax — poor-man's named/optional args; requires public fields (collides with `#[non_exhaustive]`) | patterns book (literature) | zero machinery vs representation frozen by public fields | decl, data |
| `constructor-static-method` | `Regex::new(src)?`, `Vec::with_capacity(64)`; iggy: `Partitioning::messages_key_str("k")?`, `PollingStrategy::last()` | inherent `new`/`with_*` associated fns; fallible = smart constructor; iggy's named semantic constructors hide the `{kind, length, value}` wire encoding entirely | C-CTOR (literature). Recurs: iggy `partitioning.rs`/`polling_strategy.rs` (named-constructor enums) | discoverability + validation-at-construction vs constructor proliferation (the failure mode builders solve) | OO, func |
| `method-router-chain` | `route("/users", get(list).post(create))` — free fns name verbs, chaining adds verbs to a path | macro-stamped free constructors + `Self`-returning combinators over a plain per-verb-slot struct; overlap panics at construction | axum `routing/method_routing.rs` | reads like a route table, fail-fast dupes vs macro-stamped doc bloat, panic-not-Result misuse channel | OO fluent, decl, meta |
| `opcode-schema-builder-macro` | `Read::new(fd, ptr, len).offset(1024).build().user_data(0x42)` — required args positional in `new()`, optional as defaulted const setters | `opcode!` macro with a `;;` waistline splitting required/optional fields — declarative-macro-as-schema for ~70 syscall descriptors; hand-written `build()` bodies keep the irregular part literal | io-uring `src/opcode.rs` | structural required-vs-optional enforcement + 30-line new opcodes vs macro opacity in docs/IDE | DSL, decl |
| `delegated-builder` | `tokio_uring::builder().entries(64).uring_builder(uring_builder().setup_cqsize(1024)).start(…)` | the outer builder embeds the inner crate's builder as a field and forwards wholesale instead of mirroring ~20 setters; free fn re-export spares users the dependency | tokio-uring `src/lib.rs` | zero mirror-drift, honest layering vs semver coupling to the inner crate, two vocabularies at one call-site | OO, decl |
| `feature-gated-api-surface` | the same crate presents different APIs per `Cargo.toml` features; docs.rs shows "Available on crate feature `net` only" | `cfg_net!`-family macros stamping `#[cfg]` + `#[doc(cfg)]` onto whole item groups incl. entire impl blocks (`enable_io` doesn't exist without an io driver) | tokio `macros/cfg.rs` | pay-for-what-you-use compile + sculpted discoverable surface vs combinatorial test matrix, "method not found" failure mode | decl, data |
| `connection-string-dsl` | `IggyClient::from_connection_string("iggy://user:secret@host:8090?tls=true&heartbeat_interval=5s")?` | scheme dispatch + generic `ConnectionString<T: ConnectionStringOptions>` per-transport option vocabularies; credentials in `secrecy::SecretString`; values reuse the human-unit grammar | iggy `connection_string.rs` | twelve-factor deployability + cross-language parity vs stringly runtime errors (typed builder coexists as the checked path) | DSL, decl |
| `human-unit-newtypes` | `"5s".parse::<IggyDuration>()`, `"512 MiB"` in configs, CLI, TOML, test matrices — one unit grammar everywhere | newtypes over humantime/byte_unit with FromStr/Display/serde/arithmetic | iggy `utils/{duration,byte_size}.rs` | type-level unit safety + one grammar across every surface vs wrapper forwarding, two deps | data, DSL-enabling |
| `policy-enum-dsl` | `.auto_commit(AutoCommit::IntervalOrWhen(5s, ConsumingEveryNthMessage(25)))` | nested data-carrying enums composing a small policy language interpreted by the runtime; doc comments carry the semantic contracts | iggy `clients/consumer.rs` | exhaustively-matchable, serializable policy space (vs bags of booleans permitting nonsense) vs variant growth, doc-borne rules | decl, DSL, func |
| `facade-tuple-quickstart` | `let (client, producer, consumer) = IggyStream::with_client_from_connection_string(url, &config).await?;` | stateless facade composing lower builders + auto-provisioning, returning the working set as a tuple; lower layers stay reachable | iggy `stream_builder/iggy_stream.rs` | graduated API (3-line demo → builders → raw transport) vs parallel config vocabulary to keep in sync | OO (facade), decl |
| `prelude-module` | `use iggy::prelude::*;` — client, traits, units, consts in scope; blanket-impl methods resolve | curated flat re-export; load-bearing (facet traits must be in scope for their methods to exist), not cosmetic | iggy `sdk/src/prelude.rs` | it-just-works first experience vs namespace pollution, semver-sensitive surface | decl |

### 9.2 Spotlights

> Sketches are SHAPE only — call-site illustrations, not compilable programs (§1.5).

#### `mut-ref-builder-chain` — the builder you can hand to strangers

Bevy's `App` uses `(&mut self) -> &mut Self` setters, not consuming ones, for a structural reason: `Plugin::build(&self, app: &mut App)` must hand the builder to N plugins, and a by-value builder can't be lent. The payoff is dual-shape ergonomics — chain when linear, interleave statements when conditional — at the cost of no compile-time completeness checking.

```rust
let mut app = App::new();
app.add_plugins(DefaultPlugins).init_resource::<Score>();   // chain…
if cfg.debug { app.add_systems(Update, draw_gizmos); }      // …and interleave
app.run();
```

#### `builder-order-inversion` — reading order = request-flow order

`ServiceBuilder` performs a quiet inversion: each `.layer()` pushes *inner*, so the first line you read is the outermost wrapper — the builder chain reads top-down in the order a request travels. Ordering is semantics here (rate-limit-then-buffer differs from buffer-then-rate-limit), and the docs carry the canonical 110-vs-10 example.

```rust
ServiceBuilder::new()
    .buffer(100)                              // requests hit this first
    .rate_limit(10, Duration::from_secs(1))
    .timeout(Duration::from_secs(30))
    .service(svc);                            // …and this last
```

#### `default-type-param-policy-slots` — name only what you change

Defaulted type parameters keep the common case invisible while type-changing setters and constructor-pinned policies let exotic cases pay only in annotations. `TraceLayer` carries seven policy slots you never see until you override one; io-uring's `IoUring<S = Entry, C = Entry>` makes 128-byte-entry kernels a type argument, with an associated `const BUILD_FLAGS` so the *type is the syscall config*.

```rust
TraceLayer::new_for_http()                              // 7 slots, all defaulted
    .on_response(|res: &Response, dur: Duration, _: &Span| info!(?dur));

let ring: IoUring = IoUring::new(256)?;                 // common case: invisible
let ring: IoUring<Entry128, Entry32> = builder.build(256)?;  // exotic kernel: annotate
```

#### `opcode-schema-builder-macro` — a macro as a schema language

io-uring describes ~70 syscall opcodes in one `opcode!` declarative macro whose `;;` waistline splits required fields (positional in `new()`) from optional ones (defaulted const setters). The macro is a schema: adding an opcode is ~30 declarative lines, and required-vs-optional is enforced structurally rather than by convention.

```rust
let sqe = opcode::Read::new(types::Fd(fd), buf_ptr, len)  // required: positional
    .offset(1024)                                          // optional: defaulted setter
    .build()
    .user_data(0x42);
```

---

## 10. Category 8 — Type erasure & the static↔dynamic dial

Every maximally-static system ships pressure valves; every dynamic boundary hand-rolls its dispatch. The dial runs from "tree in the type system" (leptos tachys) to "call a fn by string at runtime" (bevy_reflect) — the two poles are the category's bookends, and the flagship machinery is the **hand-rolled vtable** (bytes, anyhow, tachys `AnyView`), which beats `dyn Trait` wherever the trait consumes `self` or the representation set is closed.

### 10.1 Technique table

| id | shape sketch | machinery | best exemplar | trade-off axis | tags |
|---|---|---|---|---|---|
| `hand-rolled-vtable` | `fn consume(data: Bytes)` — one concrete, non-generic type regardless of backing (static / Vec / refcounted); `anyhow::Error` is one word; `view.into_any()` | a struct carrying `&'static Vtable` of unsafe fn pointers (or fn-pointer fields) instead of `dyn Trait`: per-representation behavior, thin pointers, works for non-object-safe consuming traits, extra vtable entries buy bespoke ops (anyhow's downcast-through-context) | bytes `src/bytes.rs` (STATIC/PROMOTABLE/SHARED vtables). Recurs: anyhow `Error` (`repr(transparent)` over `Own<ErrorImpl>` — vtable stored IN the allocation ⇒ one-word erased error; error.rs/ptr.rs), leptos tachys `AnyView` (fn pointers + TypeId because `Render::build(self)` consumes self; any_view.rs), leptos `ServerFnTraitObj` fn-pointer records | ecosystem-nameable concrete types + minimum hot-path cost vs pages of hand-audited unsafe, closed representation sets | data, OO, imper |
| `boxed-erasure-pressure-valve` | `.boxed()` → `BoxService<Req, Res, Err>` — the onion's unnameable type flattens to three parameters; `BoxLayer` erases whole middleware choices for runtime config | `Box<dyn Service<Future = BoxFuture>>` built by self-applying the `map_future` combinator (dogfooding the dialect to build the eraser); `SyncWrapper` does one precise auto-trait job; `BoxLayer` = `Arc<dyn Layer>` (shared, cloneable) that re-boxes every produced service | tower `util/boxed/sync.rs` (+ `boxed/layer.rs`) | nameable/storable types + compile relief vs alloc + vtable per call, auto-trait choices made eagerly (hence 4 variants) | OO, imper |
| `dyn-clone-object-safety-trick` | `let svc2 = boxed_clone_svc.clone();` — Clone THROUGH a trait object | private helper trait `CloneService: Service` with `clone_box(&self) -> Box<dyn …>` + blanket impl; `Clone` for the box calls it | tower `util/boxed_clone.rs` | Clone semantics for erased stacks (axum's per-request cloning depends on it) vs alloc per clone, per-auto-trait-combo variants | OO, imper |
| `closed-enum-erasure` | `ClientWrapper::Tcp(client).get_streams().await?` — polymorphic, no `Box<dyn>`; `Signal<f64>` accepts value/signal/memo/closure while the component stays non-generic | an enum over the known set + match-delegation impls (iggy: hand-written per facet); leptos `SignalTypes { ReadSignal / Memo / DerivedSignal / Stored }` behind a Copy handle — the `Stored` variant means constants cost no reactive machinery | iggy `client_wrappers/client_wrapper.rs`. Recurs: leptos `wrappers.rs` (`Signal<T>`, `MaybeProp<T>`) | matchable, Sized, no vtable, stable component ABIs vs galactic delegation boilerplate / enum dispatch per read | OO, data, func |
| `size-based-boxing-dispatch` | invisible: `tokio::spawn(enormous_future)` silently boxes | monomorphization-time `size_of::<F>() > THRESHOLD` branch (const-folded) picks representation while keeping ONE call-site shape | tokio `task/spawn.rs` | protects a silent perf cliff with no API change vs hidden allocation, opaque threshold | data, imper |
| `dyn-trait-heterogeneity` | `Vec<Box<dyn Widget>>`; on-stack: `let r: &mut dyn Read = if flag { &mut stdin } else { &mut file };` | classic vtable trait objects + the deferred-initialization stack idiom | Turon + patterns book (literature) | pay-as-you-go runtime flexibility vs no inlining, no generic methods, object-safety rules | OO, imper |
| `typed-view-tree-no-vdom` | invisible: `view!` chains accumulate a type encoding the whole subtree — `HtmlElement<Div, (Class<&str>,), (&str,)>` | retained-mode renderer with the tree in the type system: `Render { type State: Mountable; build/rebuild }`; tuples of views are views; NO diffing pass — rebuild is a monomorphized walk touching only type-known-dynamic nodes; the static-maximalism pole whose designed valve is `into_any()` | leptos tachys `html/element/mod.rs`, `view/mod.rs` | no VDOM, no per-node alloc for static parts vs monstrous types, compile time scaling with view depth, branch unification via Either | data, func, decl |
| `typeid-typemap-injection` | `.layer(Extension(config))` → `Extension(cfg): Extension<Config>` argument → `(Extension(trace_id), "ok")` response part; `provide_context(Theme::Dark)` / `use_context::<Theme>()` | `TypeId → Box<dyn Any>` maps with the *type as the key*: axum's Extension wears three trait hats over request/response extensions; leptos scopes the map to the owner tree with `let`-style shadowing semantics | axum `extension.rs`. Recurs: leptos `owner/context.rs` (ancestor-walk + shadowing) | zero-coupling DI (middleware-authored data, prop-drilling elimination) vs runtime 500 / `expect_context` panic — the docs frame State-vs-Extension as compile-error vs runtime-error | OO (type-map), decl |
| `reflect-dual-trait-mirror` | `#[derive(Reflect)]` → field access by string, structural diff/patch, kind-visitors at runtime | `PartialReflect` (structural layer, implemented by dynamic proxies like `DynamicStruct`) split from `Reflect` (nominal layer + Any); `ReflectRef` closed sum over structural kinds each with a sub-trait vocabulary — the visitor-pattern replacement that gives a monomorphizing language scripting-grade tooling | bevy_reflect `src/reflect.rs` | one derive powers scenes/editors/serde-free serialization vs orders-of-magnitude slower path, two-trait learnability cliff | data, OO, dynamic |
| `type-data-capability-registry` | `registry.get_type_data::<ReflectSerialize>(type_id)` — ask at runtime whether a type supports a capability; scene files name `"my_game::Enemy"` and insert real components | `TypeRegistry` mapping TypeId (and type-path strings) → `TypeRegistration` holding `TypeData` structs = hand-rolled vtables of monomorphized fn pointers captured by `FromType<T>` at registration; `#[reflect(Serialize, Component)]` is sugar for inserting them; capability set open to third parties | bevy_reflect `src/type_registry.rs` | open-world plugin extensibility + escape from generics infection vs forgotten-registration silent absence, compiler verifies none of it | data, OO, dynamic |
| `reflect-path-micro-dsl` | `foo.path::<f32>(".bar.items[2]")` — a string is a typed accessor into nested data; animation clips store paths as data | `GetPath` blanket over all reflected types; `ReflectPath` implemented for BOTH `&str` (lazy one-off) and pre-parsed `ParsedPath` (AST cached, reusable) — the dual-representation move | bevy_reflect `src/path/mod.rs` | addresses-as-data for scenes/animation/networks vs all-runtime errors, per-hop dynamic dispatch | DSL, dynamic, data |
| `function-reflection-dynamic-call` | `add.into_function().call(ArgList::default().with_owned(25_i32))` — an ordinary fn becomes a runtime-callable value with reflected args | `IntoFunction` blanket over fn arities (all_tuples again) → `DynamicFunction` shim popping `ArgValue`s, downcasting, re-wrapping returns; `FunctionRegistry` mirrors the type registry — §3's magic-fn lever with the binding time flipped to *per call* | bevy_reflect `src/func/` | script/editor FFI without codegen vs boxing+downcast per call — strictly a cold-path tool | func, dynamic, DSL |

### 10.2 Spotlights

> Sketches are SHAPE only — call-site illustrations, not compilable programs (§1.5).

#### `hand-rolled-vtable` — erasure beyond what `dyn` can do

When the representation set is closed or the trait consumes `self`, a struct carrying a `&'static Vtable` of fn pointers beats `dyn Trait`: `Bytes` swaps behavior per backing store (static/Vec/refcounted) behind one concrete type; `anyhow::Error` stores the vtable *inside* the allocation to stay one machine word; tachys's `AnyView` erases a consuming `build(self)` that trait objects can't express.

```rust
fn consume(data: Bytes) { /* one concrete type — static, Vec-backed, or refcounted */ }
fn fallible() -> anyhow::Result<()> { /* anyhow::Error: one word, any error inside */ }
let view = branch_a.into_any();   // tachys: the designed valve out of the typed tree
```

#### `boxed-erasure-pressure-valve` — the valve every static system ships

tower's maximally-static onion produces unnameable types; `.boxed()` flattens them to `BoxService<Req, Res, Err>` — storable in struct fields, nameable in signatures, at the cost of an alloc and a vtable hop per call. Note the dogfooding: the eraser is built by self-applying the crate's own `map_future` combinator.

```rust
let svc: BoxService<Request, Response, BoxError> = ServiceBuilder::new()
    .timeout(t)
    .layer(auth)
    .service(inner)
    .boxed();          // unnameable onion -> three type parameters
```

#### `typed-view-tree-no-vdom` — the static-maximalism pole

tachys keeps the entire UI subtree *in the type system*: tuples of views are views, `build/rebuild` walk a monomorphized structure, and there is no diffing pass because the types already know which nodes can change. This is the far-static end of the dial — monstrous types and view-depth compile times, paid for by zero VDOM and zero per-node allocation for static parts; `into_any()` is the designed exit.

```rust
let v = view! { <div class="card"><span>{name}</span></div> };
// : HtmlElement<Div, (Class<&str>,), (HtmlElement<Span, (), (String,)>,)>
// rebuild touches only the type-known-dynamic holes — no diff, no VDOM
```

#### `typeid-typemap-injection` — the type is the key

A `TypeId → Box<dyn Any>` map turns the *type itself* into a dependency-injection key: axum's `Extension` moves middleware-authored data to handlers with zero coupling; leptos scopes the same map to the owner tree, giving `provide_context`/`use_context` `let`-style shadowing. The trade is the runtime failure mode — axum's docs explicitly frame State-vs-Extension as compile-error vs runtime-error DI.

```rust
router.layer(Extension(config));                       // provider
async fn handler(Extension(cfg): Extension<Config>) {} // consumer — Config IS the key

provide_context(Theme::Dark);                          // leptos: ancestor scope
let theme = use_context::<Theme>();                    // descendant, shadowing semantics
```

---

## 11. Category 9 — Macro & DSL machinery

The expressiveness ladder: matcher grammar → token munching → typed parsing → foreign grammar. The rule the whole category teaches: take the *lowest* rung that produces the target call-site. Flagships: `all_tuples!` (the variadics emulator behind every tuple grammar in the atlas), syn's `Parse` recursive descent, serde_derive's attribute mini-language, and leptos's `view!`/`#[server]` at the foreign-grammar summit.

### 11.1 Technique table — 9a. macro_rules! grammar engines

| id | shape sketch | machinery | best exemplar | trade-off axis | tags |
|---|---|---|---|---|---|
| `fragment-specifier-grammar` | `select! { msg = rx.recv() => …, _ = shut.notified(), if !draining => break, else => continue }` — a sentence in a mini-language | matcher fragments (`$p:pat = $f:expr => $h:block`) as BNF terminals; literal tokens (`else`, `, if`) grow contextual keywords for free; the compiler's parser conscripted per fragment | tokio `macros/select.rs` (dsl-machinery dossier) | full grammar with zero parser code vs fragment opacity (matched `:expr` is a black box), follow-set limits, "no rules expected token" default errors | decl, DSL |
| `incremental-tt-munching` | free-form statement sequences Rust can't parse | recursive rules peeling the head, recursing on `$($tail:tt)*`; tokio select normalizes one branch per step | TLBORM + tokio select (dsl-machinery) | arbitrary LL-ish grammars in decl macros vs O(n²) matching, recursion_limit, most-specific-first ordering | decl, func, DSL |
| `push-down-accumulation` | (internal) output built where partial constructs are illegal | accumulate finished tokens in a rule parameter, emit only at the end; combined with munching = the universal macro_rules computation pattern | TLBORM + tokio select `@{ }` bundles | completeness under expansion constraints vs doubly-quadratic compile, write-only macro source | func, decl |
| `unary-token-counting` | N branches ⇒ indices and an enum sized exactly N, with no arithmetic | `_` skip-tokens accumulated per branch; `count!`/`count_field!` (64 arms) convert unary→integers/field-access; a proc macro invoked BY the decl macro mints the per-branch output enum | tokio `macros/select.rs` | compile-time arithmetic at zero runtime cost vs 64-arm cap, expansion bloat (newer `${count()}` obsoletes parts) | data, decl |
| `internal-rules-namespace` | one public macro name; `@`-prefixed private rules hide the pipeline | `@` rules as private functions; state bundled in one `@{ … }` token tree threaded through recursion | tokio select + TLBORM | single exported name vs rule-ordering hazards, every call attempts every rule | decl, imper |
| `all-tuples-variadic-emulation` | user-invisible: every framework position accepts 0–N-ary tuples/fns as if Rust had variadics | the macro-callback pattern (pass a macro's *ident*, invoke `$callback!(args)`) driving an arity ladder; bevy externalized it as the `variadics_please::all_tuples!` proc macro (+ `_enumerated`, `_with_size`); `#[doc(fake_variadic)]` collapses 16 impls into one rendered doc | bevy/`variadics_please` `src/lib.rs`. Recurs: axum `all_the_tuples!` (axum-core/src/macros.rs — `[prefix], last` shape when the final position has different bounds), tower's hand-written tuple ladder (§3) | the single biggest call-site unlock in the ecosystem vs compile-time/doc bloat, arbitrary arity ceilings (15/16/20), every-arity error candidate lists | meta, type-level, func |
| `dollar-crate-hidden-support` | `use tokio as t; t::select! { … }` still works | every expansion path written `$crate::…` into a `#[doc(hidden)] pub` support module (expansion happens in the *user's* crate, so helpers must be public) | tokio `macros/support.rs` + syn `__private` | rename/re-export-proof macros vs a permanent shadow public surface, semver-exempt only by convention | decl, infra |
| `boilerplate-collapse-macro` | `forward_to_deserialize_any! { bool i8 … ignored_any }` — a 300-line impl becomes 10 | three-layer macro stack where each identifier maps to a known method signature; the token list IS the data-model vocabulary; convention override syntax as escape hatch | serde `serde_core/src/macros.rs` | massive ceremony collapse, visible list of ignored hints vs macro opacity, makes the lazy choice easy | decl, DSL |

### 11.2 Technique table — 9b. Typed metaprogramming (proc-macro2 / syn / quote)

| id | shape sketch | machinery | best exemplar | trade-off axis | tags |
|---|---|---|---|---|---|
| `quote-quasi-quoting` | output code written as a template of itself; `#( #names: #tys ),*` zips iterators like `$(…)*` | `quote!` is itself a decl macro engineered around TLBORM's pathology: non-munching sliding-window expansion (linear, not quadratic); `#(…)*` repetition discovers `#var`s, binds any IntoIterator, advances in lockstep with a `has_iter` witness | quote `src/lib.rs` | WYSIWYG codegen + linear expansion vs templates not validated until the downstream compile, consumed-iterator first-day bug | decl, DSL, func |
| `totokens-protocol` | anything can appear after `#` if it can print itself as tokens; syn AST nodes splice straight back in | `ToTokens { fn to_tokens(&self, &mut TokenStream) }` — the open codegen protocol every interpolation bottoms out in; intermediate builder types become quotable units | quote `src/to_tokens.rs` | open composable protocol vs alloc habits in hot derives | OO, func |
| `parse-quote-roundtrip` | `bounds.push(parse_quote!(HeapSize));` — typed AST nodes via quote syntax, parser chosen by inference | quote out, parse back in: `parse_quote_fn` runs `T::parse` on the fresh stream; composes with spans | syn `src/parse_quote.rs` | surgical AST edits without 5-deep struct literals vs hidden parse that panics at expansion time | func, decl |
| `parse-trait-recursive-descent` | a struct whose fields ARE the grammar; `input.parse()?` per field | `Parse` trait + `ParseBuffer` combinators (`peek`, `fork`, `call`, `parse_terminated`); `braced!` splits delimited sub-buffers; type inference is the production-selection mechanism | syn `src/parse.rs` | parse your own syntax with typed results, composable with Rust's grammar vs lexer-bound (tokens must lex, delimiters balance), Parse-vs-Parser hump | func, OO, DSL |
| `token-types-and-custom-keywords` | `struct Rule { arrow: Token![=>] }`; `if lookahead.peek(kw::transparent)` — tokens and contextual keywords as types | `Token!` maps ~100 literal tokens to generated unit structs (span-only payload) with Parse + peek impls, sealed; `custom_keyword!(ident)` generates the same triple for user keywords (thiserror's `mod kw` the canonical consumer) | syn `src/token.rs`, `src/custom_keyword.rs` | grammar structs are visually the grammar, unlimited keyword vocabulary vs macro-in-type-position surprise, contextual-only keywords | decl, DSL, data |
| `punctuated-separated-lists` | comma-separated-anything with trailing-comma tolerance as one typed value | `Punctuated<T, P>` preserving separators + spans (lossless round-trip); decl-macro twin: the `$(,)?` idiom | syn `src/punctuated.rs` (+ std `vec!`) | the most common list grammar in one line vs heavier than Vec, two subtly-different constructors | data, decl |
| `parse-macro-input-front-door` | `let ast = parse_macro_input!(input as DeriveInput);` — the ecosystem's uniform first line | match with a hidden early `return` emitting `to_compile_error()` tokens on failure; `DeriveInput` as the typed derive root | syn `src/parse_macro_input.rs` | whole error-plumbing ceremony in one idiom vs concealed control flow in a macro | imper, decl |
| `proc-macro2-portability-shim` | macro logic unit-tested in a plain `#[test]` / snapshot test / build.rs | mirror token types cfg-switched between wrapping the compiler's `proc_macro` and a pure-Rust fallback; the whole vocabulary is 5 types | proc-macro2 `src/lib.rs` | testable, engineered (vs artisanal) macros vs shadow-type layer, fallback capability gaps | data, imper |
| `hygiene-span-choice` | whether your generated `let guard` can collide with user variables is a *choice* | `Span::call_site()` (resolves at use site — the unsafe default for helper locals) vs `mixed_site()` (macro_rules-like hygiene) vs gated `def_site`; `resolved_at`/`located_at` split resolution from blame | proc-macro2 `src/lib.rs` | control over the capture/anti-capture axis vs heisen-collisions when defaulted wrong | decl |
| `derive-data-shape-dispatch` | the derive behaves per type shape and rejects unsupported shapes with a sentence ("Relationship can only be derived for structs.") | `DeriveInput`/`Data::{Struct,Enum,Union}` pattern matching makes the user's type a matchable value; API-design rules enforced as spanned rejections | syn `src/derive.rs` + bevy `macro_logic/component.rs` | derives as type-shape linters vs per-shape code growth, hand-written unsupported-shape errors | data, func, decl |

### 11.3 Technique table — 9c. Derive, attribute & proc-macro architecture

| id | shape sketch | machinery | best exemplar | trade-off axis | tags |
|---|---|---|---|---|---|
| `derive-additive-declarative` | `#[derive(Component, Serialize, Clone)]` — the type stays exactly as written; capability bolted alongside | `proc_macro_derive(..., attributes(...))`: read-only input, append-only impls; inert helper attributes as private config namespace; the struct IS the schema | serde_derive + bevy `macros/src/lib.rs` (dsl + literature merged) | maximum predictability + derive composition vs additive-only, attribute mini-languages escape the type checker | decl, DSL, OO |
| `attribute-mini-language` | `#[serde(rename_all = "camelCase", deny_unknown_fields, tag = "type")]`, `#[prop(optional, into)]`, `#[component(storage = "SparseSet")]` | three-level grammars (container/variant/field) parsed into plain config structs BEFORE codegen (`attr::Container::from_ast`); graduated impls in the wild: `parse_nested_meta` callbacks / custom `Parse` + custom_keyword / darling-style options structs | serde_derive `internals/attr.rs` (primary). Recurs: bevy `#[component]`/`#[require]` (expression grammar in an attribute), leptos `PropOpt`, thiserror attrs | the 95% case fully declarative, wire mapping visible at the data definition vs an unbounded accreted mini-language, stringly values, weak IDE support | decl, DSL, data |
| `orthogonal-strategy-enum` | `tag=`/`tag+content`/`untagged` — one attribute axis selects four wire layouts, JSON samples as the spec | `TagType` enum (doc comments ARE the spec) resolved by tuple-match validation with targeted spanned errors; per-strategy codegen modules keep strategies from bleeding | serde_derive `internals/attr.rs` L178, `de/enum_*.rs` | four standard encodings behind one switch vs asymmetric capability cliffs discovered at runtime | decl, data, DSL |
| `case-convention-table` | `rename_all = "SCREAMING-KEBAB-CASE"` — the value is its own example | static table whose keys are written in the convention they name (self-demonstrating, un-misspellable, error message = the table); conversions compose; applied at compile time | serde_derive `internals/case.rs` | perfect learnability + zero runtime vs closed ASCII set | decl, data, DSL |
| `remote-derive-mirror` | `#[serde(remote = "other::Duration")] struct DurationDef { secs: i64, nanos: i32 }` — derive impls for someone else's type | field-for-field mirror + `pretend.rs` type-compat checks (drift = compile error) + `with`-convention associated fns instead of trait impls | serde_derive `internals/attr.rs`, `pretend.rs` | orphan rule stops being a wall vs duplicated definitions, another sub-language | decl, DSL, data |
| `hygienic-const-anchor-version-lock` | invisible: derives never collide with user names and never break across versions | `const _: () = { use #path as _serde; …impls… }` anonymous scope + `__private{PATCH}` module name generated in build.rs — reaching into internals becomes *unlinkable* across patch versions, not just discouraged | serde_derive `dummy.rs`, `lib.rs` L95 (thiserror same OUT_DIR trick) | mechanical semver honesty (how the serde_core split shipped invisibly) vs version-locked link errors, unreadable expansions | decl, imper |
| `zero-footprint-derive` | downstream cannot tell thiserror from handwritten impls — nothing to name, switching is not a breaking change | stated invariant constraining everything: no marker traits, no wrapper types, runtime crate = doc-hidden helpers only (contrast anyhow, which IS a type you commit to) | thiserror `src/lib.rs` L40 | riskless reversible adoption + full semver control vs forecloses features needing runtime types — the constraint is the design | design-value, decl |
| `attribute-item-rewrite` | `#[tokio::main] async fn main()` → sync `fn main` wrapping the body in `Builder…block_on` | `proc_macro_attribute` *replaces* the item; args parsed as a config mini-language with prescriptive errors ("Use #[tokio::main(flavor = \"multi_thread\")]"), `quote_spanned!` pins generated code to the user's last statement, partial expansion preserved for IDEs; feature-off swaps in a `main_fail` that expands to a curated error | tokio-macros `src/entry.rs` (dsl + tokio merged) | transformation power derives can't have, "configuration not code" reading vs source ≠ compiled item, attribute-ordering minefield | imper, decl-facade, DSL |
| `function-like-foreign-grammar` | `view! { <div class:hidden={…}><ProgressBar progress=count/></div> }`; `json!({ "a": [1, 2] })`; `sqlx::query!("SELECT …")` type-checked against a live schema | `#[proc_macro]` on raw token trees — grammar limited only by the lexer; leptos delegates to rstml (recoverable parser built on syn's Parse); sqlx consults external truth at compile time | leptos_macro `src/lib.rs` (primary). Recurs: serde_json `json!`, sqlx `query!` (literature) | total syntactic freedom, the highest-expressiveness shape in Rust vs maximal ecosystem tax (rustfmt/RA breakage, leptosfmt exists because of this) | DSL, decl |
| `dsl-sugar-over-public-builder` | everything `view!` emits, you can hand-write: `div().class("x").on(click, h).child(…)` | the macro is pure syntax compression over a documented, stable public builder API — macros buy syntax, not capability; cheap mental model + escape hatch (contrast Yew's VDOM-targeting html!) | leptos_macro `view/mod.rs` → tachys builders | debuggability + non-load-bearing macro vs macro compile cost anyway | DSL, decl, design-value |
| `colon-namespaced-attributes` | `on:click=` `prop:value=` `class:invalid=` `style:width=` `bind:value=` `use:directive` — six typed sub-languages in one attribute position | prefix dispatch in the macro routes to *different typed methods* (`.on(click, h)` gets a typed event; `bind:` demands an attribute marker + RwSignal) — prefixes are routing, semantics live in the type system | leptos_macro `view/mod.rs` | huge per-character expressiveness, DOM attr-vs-prop footgun becomes syntax vs vocabulary to memorize | DSL, decl |
| `inert-subtree-constant-folding` | fully-static markup compiles to a single pre-rendered HTML string | `is_inert_element()` analysis in the macro → `InertElement::new("<div>…</div>")`; nightly moves static text into the *type* — a compile-time DSL earning its keep by *analyzing*, not just translating | leptos_macro `view/mod.rs` | build-time partial evaluation vs de-inerting cliffs (one dynamic attr re-materializes the subtree) | DSL, decl, data |
| `children-as-fnonce-let-bindings` | `fn Card(children: Children)` calls `{children()}`; `<For each=… let:row><p>{row.name}</p></For>` — typed data flows back into caller markup | `Children = Box<dyn FnOnce() -> AnyView>`; `let:` bindings switch codegen to `move \|row\| …` closures taking arguments — render props without naming a closure | leptos `children.rs`, `view/component_builder.rs` | lazy children (free Show/Suspense semantics) + typed render props vs FnOnce friction, a Box per component | func, DSL, decl |
| `required-components-derive` | `#[derive(Component)] #[require(Team(Team::red), Health { hp: 100.0, ..default() })]` — spawn the tip, get the iceberg | attribute expression grammar lowered to `Component::register_required_components` (a trait hook existing precisely so a derive can lower to ordinary trait code); recursive registration with override precedence; cost paid at archetype edges | bevy `macros/src/lib.rs` → `component/mod.rs` | call-sites shrink to intent, invariants can't be forgotten vs spooky invisible components, semantics living in prose | decl, DSL, data, OO |
| `server-fn-compile-target-split` | one `#[server] async fn add_todo(title: String)`, called identically from browser and server — the network vanishes | macro-as-architecture: args → serde struct (the wire format IS the argument list); body moved to a server-only fn behind `cfg(feature = "ssr")`; client build gets an HTTP stub with an identical signature; hashed `concatcp!` PATH collision-proofs endpoints; `ServerFn` trait swaps codecs/transports via associated types | leptos server_fn_macro `src/lib.rs` | the largest architectural compression in the ecosystem (client/server boundary = a fn signature) vs serialize-everything, feature-flag build model, locality is a lie you must remember | DSL, decl, data |
| `inventory-linker-registry` | defining `#[server] fn f` anywhere IS registering its route; one catch-all axum handler serves them all | `inventory::submit!` link-time distributed slices collected into a lazy `HashMap<(path, method), ServerFnTraitObj>` of monomorphized fn pointers | leptos server_fn `src/lib.rs` | zero-registration modularity (the `#[test]`/ctor property) vs link-section magic invisible in source, stringly dispatch at one boundary | decl, data |
| `config-env-derive` | `#[derive(ConfigEnv)] #[config_env(prefix = "IGGY_")]` — env-var names generated from the struct; renaming a field renames its env subtree | derive emits per-field env-name constants via recursive *relative* path algebra (parents prepend field names; only the root declares a prefix); `Vec` → indexed vars; `secret` masks logs | iggy `configs_derive/src/lib.rs` | config cannot drift from the struct vs proc-macro complexity, leaf/nested annotation burden | decl, DSL |
| `test-matrix-attribute` | `#[iggy_harness(transport = [Tcp, Http, Quic, WebSocket], server(segment_size = ["512B", "1MiB"]))]` — one fn becomes the Cartesian product of tests | attribute macro expanding infra dimensions × config values, with params injected by signature (declare `client: &IggyClient` and codegen supplies it — the magic-fn idea aimed at test harnesses) | iggy `harness_derive/` | exhaustive cross-infra coverage per line vs generated-name opacity, harness codegen upkeep | DSL, decl |
| `ffi-plugin-export-macro` | `sink_connector!(MySink);` — an entire C-ABI dylib plugin generated from one safe trait impl | macro_rules emitting `extern "C"` entry points, a trait-bound assertion for clear errors, a `LazyLock<DashMap>` instance registry, JSON-config deserialization, host-logging bridge, version export — the unsafe FFI surface written and audited once | iggy `connectors/sdk/src/sink.rs` | plugin authors write only safe async Rust vs C-ABI + JSON contract versioning fragility | DSL, imper, OO |
| `autoref-specialization` | `anyhow!(x)` keeps the source chain iff x is an Error; `#[error("{path}")]` works on PathBuf (no Display!) — one spelling, type-directed behavior on stable | method-resolution autoref ordering as stable pseudo-specialization: by-value impl wins when applicable, `&`/`&&` blanket catches the rest; tag types + `anyhow_kind()` dispatch | dtolnay case-studies (literature primary). Recurs: anyhow `kind.rs` (Adhoc/Trait/Boxed), thiserror `AsDisplay` (+ the `Placeholder` phantom impl stabilizing inference across features), anyhow `ensure!`'s BothDebug/NotBothDebug | compile-time overload on trait membership, on stable vs deep resolution-order arcana, macro-only applicability | DSL, trait-hacking, OO |
| `misuse-resistant-macro-values` | dropping `anyhow!(…)` on the floor warns | expression macros can't carry `#[must_use]`, so the value routes through a `#[must_use] fn must_use(e) -> e` identity; `#[cold]` constructors; closure-free code keeps junk frames out of backtraces | anyhow `macros.rs`, `kind.rs`, `context.rs` | lint coverage where the language provides none + clean traces vs plumbing indirection | imper, decl |
| `compile-time-budget-consciousness` | felt as faster `cargo build` for the whole ecosystem | `tri!` instead of `?` (measured 5.5–9% compile win — `?`'s Try/FromResidual resolution costs at serde scale), enforced by `deny(clippy::question_mark_used)`; the serde_core crate split exists for parallel codegen | serde `src/lib.rs` L236 | ecosystem-scale build savings vs unidiomatic internals, a lint wall against helpful contributors | imper, perf-engineering |

### 11.4 Spotlights

> Sketches are SHAPE only — call-site illustrations, not compilable programs (§1.5).

#### `all-tuples-variadic-emulation` — the ecosystem's missing variadics

Rust has no variadic generics, so the ecosystem fakes them: a macro-callback pattern (pass a macro's ident, invoke `$callback!(args)`) drives an arity ladder that stamps a trait impl for every tuple size. Bevy externalized it as `variadics_please::all_tuples!`; axum's `all_the_tuples!` adds a `[prefix], last` shape for when the final position has different bounds. Every tuple grammar in this atlas (systems, bundles, layers, responses) rides this one machine.

```rust
all_tuples!(impl_system_param_tuple, 0, 16, P);
// stamps: impl SystemParam for (), (P0,), (P0,P1), … (P0..=P15)
// user-visible result: tuples work everywhere, as if the language had variadics
```

#### `parse-trait-recursive-descent` — the struct is the grammar

syn's `Parse` trait makes a parser out of a type definition: each field parses itself in order, `Token![=>]` unit structs make the grammar visually legible, and type inference selects productions. Combined with `ParseBuffer`'s combinators (`peek`, `fork`, `parse_terminated`), custom macro syntax gets typed ASTs with almost no parser code.

```rust
struct Rule { lhs: Ident, arrow: Token![=>], rhs: Expr }

impl Parse for Rule {
    fn parse(input: ParseStream) -> Result<Self> {
        Ok(Rule { lhs: input.parse()?, arrow: input.parse()?, rhs: input.parse()? })
    }   // field order IS the grammar
}
```

#### `quote-quasi-quoting` — codegen as a template of itself

`quote!` writes output code in output-code syntax, with `#var` interpolation and `#(…)*` repetition that zips any `IntoIterator` in lockstep. The under-appreciated engineering: quote is itself a decl macro built to dodge TLBORM's pathologies — sliding-window (not munching) expansion keeps it linear rather than quadratic.

```rust
quote! {
    impl #impl_generics HeapSize for #name #ty_generics #where_clause {
        fn heap_size(&self) -> usize { 0 #(+ self.#fields.heap_size())* }
    }
}
```

#### `attribute-mini-language` — the derive's configuration grammar

serde_derive's `#[serde(...)]` is the canonical three-level attribute grammar (container/variant/field), parsed into plain config structs *before* any codegen. The 95% case is fully declarative and the wire mapping is visible at the data definition; the cost is an unbounded accreted mini-language with stringly values and weak IDE support — the expressiveness that escapes the type checker.

```rust
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields, tag = "type")]
struct Event {
    user_id: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    note: Option<String>,
}
```

#### `server-fn-compile-target-split` — the network as a fn signature

The largest architectural compression in the map: `#[server]` compiles one `async fn` into two programs. The body moves behind `cfg(feature = "ssr")`; the client build gets an HTTP stub with the identical signature; the argument list *is* the wire format (lowered to a serde struct). The call-site lie — "this is a local function" — is the point, and also the thing you must never forget is a lie.

```rust
#[server]
async fn add_todo(title: String) -> Result<(), ServerFnError> {
    db().insert_todo(&title).await          // exists only in the server binary
}
// browser and server call it identically — the network vanished into the signature
```

#### `autoref-specialization` — stable pseudo-specialization

dtolnay's method-resolution trick: a by-value impl wins when the type qualifies, and `&`/`&&` blanket impls catch the rest — type-directed overloading on stable, usable only inside macros. It is why `anyhow!` preserves source chains exactly when the argument is an `Error`, and why thiserror's `#[error("{path}")]` works on `PathBuf` despite `PathBuf` having no `Display`.

```rust
anyhow!(io_err);          // impl Error        -> source chain preserved
anyhow!("bad {}", name);  // not an Error      -> formatted ad-hoc error

#[derive(Error, Debug)]
#[error("failed at {path}")]        // PathBuf: no Display — autoref finds
struct E { path: PathBuf }          // the Path::display() route on stable
```

---

## 12. Category 10 — Errors & diagnostics as designed surfaces

This is the repayment category: the error *types* an API exposes are architecture, and the failure messages it emits — at runtime and at compile time — are first-class outputs co-equal with the code that runs. Every expressiveness win in §3–§11 was purchased with an error-message debt, and a mature crate budgets for repayment here, which is why this category is as large as the tricks it services (§1.4). Flagships: the thiserror/anyhow **library-vs-application split** (two error dialects shipped as two mutually-referencing crates by one author); **visitor-as-its-own-error-message** (serde reusing the mandatory `expecting()` as the second half of every mismatch); **format-spec-implied-bounds** (thiserror inferring a generic error's where-clause from the format specs you wrote); and the **numbered-error-enum-wire-contract** (iggy's `#[repr(u32)]` error enum that IS the protocol status). Two sub-tables: 10a treats error *types as architecture*, 10b treats *diagnostics and failure-UX* as an engineered surface.

### 12.1 Technique table — 10a. Error architecture

| id | shape sketch | machinery | best exemplar | trade-off axis | tags |
|---|---|---|---|---|---|
| `library-vs-application-error-split` | thiserror enums in libraries (callers match); `anyhow::Result` + `.context(…)` in applications (humans read) | a doctrine encoded as two crates by one author, mutually referencing; the composable hinge: blanket `From<E: Error>` into `anyhow::Error`, `downcast_ref`/`chain()` back out | thiserror + anyhow docs (serde-errors dossier) | locally-optimal dialects, one-`?` boundary vs socially- not compiler-enforced (anyhow leaks into libraries) | design-value, decl |
| `context-chaining` | `read(path).with_context(\|\| format!("failed to read {}", p.display()))?` — annotation, not plumbing; works on Option too | sealed extension trait on Result AND Option; `ContextError<C, E>` renders context as Display, cause as source (the "Caused by:" chain); eager/lazy variants; downcast-through-context specified by contract | anyhow `src/context.rs` | narrative error reports sprinkled cheaply vs unstructured Display blobs, alloc per layer, sealed = not extensible | func, decl, OO |
| `defaulted-type-param-alias` | `fn demo() -> Result<T>` — and `Result<T, OtherError>` still works with the same import | `type Result<T, E = Error> = core::result::Result<T, E>` — a re-alias with a defaulted parameter, full std interop | anyhow `src/lib.rs` L468 | signature brevity + drop-in compatibility vs import shadowing confusion | decl |
| `error-enum-as-annotated-type` | `#[error("invalid header (expected {expected:?}, found {found:?})")]` on the variant — a library's whole error module with zero imperative code | derive expansion: hand-written format-string scanner resolving `{0}`/`{name}` to field bindings, emitting a plain `write!` — hand-quality output, no runtime engine | thiserror `impl/src/fmt.rs` | Display/Error/From boilerplate collapses to strings adjacent to their variants vs a sub-language three quoting levels deep | decl, DSL, data |
| `format-spec-implied-bounds` | `#[error("{0}; {1:?}")] struct Pair<A, B>(A, B);` — bounds you'd hand-write appear from the specs you used | trailing spec char → trait map (`?`⇒Debug, `x`⇒LowerHex, bare⇒Display) feeding an inferred where-clause mentioning only traits actually used | thiserror `impl/src/fmt.rs` L94 | minimal accurate bounds, users never write error where-clauses vs invisible inference, errors point at generated code | decl, func, DSL |
| `convention-over-annotation` | field named `source` wired as source() with NO attribute; `Backtrace` detected by type; `#[from]` implies source + From + backtrace capture; `#[error(transparent)]` forwards wholesale | name/type-directed detection ladder; `transparent` newtype-over-private-enum blessed as the semver-safe opaque error idiom | thiserror `src/lib.rs` L131–252 | the common taxonomy costs 0–1 tokens per field vs renaming a field silently changes semantics | decl, DSL |
| `numbered-error-enum-wire-contract` | `err.as_code()` → u32 on the wire → `IggyError::from_code(n)` — the error type IS the protocol status | ~300-variant `#[repr(u32)]` enum with explicit discriminants, range-partitioned by subsystem (1000s streams, 5000s consumer groups); strum + thiserror derive stack; PartialEq by code | iggy `error/iggy_error.rs` | cross-language stable wire errors, greppable, O(1) round-trip vs monolithic append-only enum everyone depends on | data, decl |
| `recoverable-payload-error` | `Err(ProducerSendFailed { failed, .. }) => retry_later(failed)` — the un-sent batch rides inside the error | error variant carrying `Arc<Vec<IggyMessage>>` (recoverable without cloning) + `Box`ed cause (enum size control) | iggy `iggy_error.rs` (4056) | retry ergonomics without side channels vs variant size pressure, data doesn't survive as_code round-trips | func, OO |
| `error-projection-per-transport` | one error, three faces: u32 status (TCP), `"snake_name"` (logs), 404/401/403 + JSON `{code, reason, field}` (HTTP) | canonical enum in the common crate; each transport writes only its projection (`impl IntoResponse for CustomError` maps variant families → status + field hints) | iggy `server/src/http/error.rs` | consistent semantics per-transport-idiomatic vs hand-maintained match that can drift (deliberate `_ =>` safe default) | decl, OO |
| `layered-error-locality` | protocol crate fns return `WireError`, never domain errors; conversion happens at the boundary | a small structured error enum deliberately decoupled ("keep the protocol crate free of domain dependencies"); `Cow<'static, str>` messages; three-tier system: WireError (firewall) / IggyError (wire contract) / error_set! (internal composition) | iggy `binary_protocol/src/error.rs` | dependency-light reusable crates + forensic decode errors vs lossy boundary conversion | func, data |
| `error-set-algebra` | `error_set!(ServerError := NumaError \|\| ConfigError \|\| { CannotArchiveFile { path } } \|\| IoError)` | the `error_set` macro generates union enums + the whole `From` lattice between subsets and supersets so `?` flows uphill with zero hand-written conversions | iggy `server_error.rs` | rich composable internal errors with no From boilerplate vs macro-DSL learning curve — the contrast with the flat wire enum IS the lesson | DSL, decl |
| `box-error-unification` | `type BoxError = Box<dyn Error + Send + Sync>`; middleware widens `S::Error: Into<BoxError>` so onions with mixed failures type-check | alias + widening convention (`Timeout` must merge inner-failed with its own Elapsed); `Into<BoxError>` not `= BoxError` keeps concrete-error services compatible | tower `lib.rs`, `timeout/mod.rs` | heterogeneous composition + `?` everywhere vs type-level error info destroyed (downcast to recover) | OO, imper |
| `error-vocabulary-trait` | generic code writes `Error::unknown_field(f, FIELDS)`, `Error::invalid_length(n, &self)` without knowing the concrete error type | format-owned error types threaded as associated types + a vocabulary trait: 1 required `custom` + 7 provided sentence-constructors with standard grammar; formats override to attach spans | serde `de/mod.rs` L165 (`declare_error_trait!`) | consistent grammatical errors across every format vs stringly data at the trait boundary | decl, OO |

### 12.2 Technique table — 10b. Diagnostics & failure-UX engineering

| id | shape sketch | machinery | best exemplar | trade-off axis | tags |
|---|---|---|---|---|---|
| `diagnostic-attribute-steering` | rustc itself says: "consider adding `#[derive(serde::Serialize)]`" / "Consider using `#[axum::debug_handler]`" | `#[diagnostic::on_unimplemented(message/note)]` on traits + `#[diagnostic::do_not_recommend]` on private/blanket impls — the author curates the compiler's guess-path; serde's message deliberately names the facade crate, papering over the serde_core split | serde `ser/mod.rs` L224 (primary). Recurs: axum Handler note + Option-blanket do_not_recommend, bevy SystemParam notes, dsl-machinery impl_handler | recovered learnability at zero runtime cost vs message rot, only tunes — can't fix inferential distance | decl, DSL |
| `debug-handler-span-decomposition` | one attribute converts "the trait `Handler<_, _>` is not implemented" into per-argument, right-span errors | proc macro re-derives every obligation of the blanket impl as separate `quote_spanned!` check functions (per-arg extractor checks, return-type check, future-Send check) — a diagnostic *decompiler* for the blanket impl | axum-macros `debug_handler.rs` | best-in-class errors on demand, zero runtime vs opt-in (learners hit the wall first), a second implementation that can drift | meta, diagnostics |
| `inline-type-check-probes` | `.check_clone().check_service::<S, Req, Res, Err>()` dropped mid-chain to relocate the compile error to that line | identity methods whose entire value is their where-clause — instantiating forces the solver to prove the property *there*; the library ships a debugging DSL for its own type gymnastics | tower `builder/mod.rs` | bisectable type errors in deep generic code, zero cost vs insider knowledge, turbofish asserts | decl, DSL |
| `track-caller-builder-panics` | `.route("/{a}/{a}", …)` panics pointing at *your* line with a curated message | `#[track_caller]` on every fallible-by-contract builder method; route-table construction errors are programmer errors, so panic-with-good-span beats Result ceremony | axum `routing/` | unbroken fluent chains + located, human-written failures vs panics invisible in signatures | imper, diagnostics |
| `type-name-debug-and-flattened-stacks` | `dbg!(&builder)` prints `ServiceBuilder(TimeoutLayer, LimitLayer, Identity)` and closures print their type names | Debug as a *rendered view*, not a dump: `type_name::<F>()` for closure fields; Stack's custom flattening Debug ordered outer-first | tower `layer_fn.rs`, `stack.rs` | humane diagnostics for 12-deep stacks vs hand-maintained Debug contracts | imper, data |
| `quote-spanned-blame` | the end user's error points at *their* type: `struct Broken { field: Rc<u32> }` ← "`Rc<u32>` cannot be shared between threads safely" | `quote_spanned! {ty.span()=> struct _AssertSync where #ty: Sync;}` — generate a deliberately-failing assertion whose span is the user's tokens; the compiler writes the message, you aim it | quote docs/`src/lib.rs` | world-class error UX on stable with no diagnostics API vs invisible span bookkeeping, one `.to_string()` collapses blame | decl, DSL |
| `lookahead-expected-one-of` | ``error: expected one of: `bool`, `str`, identifier`` — for free | `Lookahead1` records every `peek` attempted; `.error()` composes the accumulated set — branch selection and diagnostics are the same code path, so they can't drift | syn `src/parse.rs` | parser-generator-quality messages by construction vs single-token dispatch only | func, decl |
| `spanned-errors-as-values` | several precise errors per compile, each underlining its tokens; `?`-composable inside the macro | `syn::Error::new_spanned` (first-to-last token span) + `combine` accumulation + `to_compile_error()` at the boundary; escalated variant: `abort!(span, msg; help = "…")` | syn `src/error.rs` + bevy messages; leptos proc_macro_error2 | batch, aimable, testable diagnostics on stable vs per-site span discipline | func, decl |
| `span-tracking-accumulator-cells` | ``duplicate serde attribute `rename` `` — ALL bad attributes reported at once, each at its exact token | write-once `Attr`/`BoolAttr`/`VecAttr` cells remembering the tokens that set them; errors accumulate in `Ctxt`, emitted together — the dtolnay doctrine: never fail fast, never lose a span | serde_derive `internals/attr.rs` L24 | compiler-grade DSL errors vs bespoke cell boilerplate every serious derive reinvents | imper, data, DSL-infra |
| `never-fail-silent-fallback` | one error at the typo — not fifty downstream "doesn't implement Error" cascades | `try_expand(input).unwrap_or_else(\|e\| fallback::expand(input, e))` — emit the error PLUS a best-effort impl skeleton so downstream bounds still resolve | thiserror `impl/src/expand.rs` L12 | diagnostic focus, calm IDE mid-edit vs fallback can mask breakage | imper |
| `compile-error-guardrail` | `error: select! requires at least one branch.` — a sentence, not a parser shrug | catch-all macro rules expanding to `compile_error!("…")`; the shared UX floor of both macro worlds (syn Errors lower to the same) | tokio `macros/select.rs` | authored diagnostics where the default is "no rules expected this token" vs misuse shapes must be enumerated ahead | decl, DSL |
| `visitor-as-its-own-error-message` | `Error::invalid_type(Unexpected::Str(s), &self)` — `&self` IS the "expected …" clause | blanket `impl Expected for T: Visitor` reuses the mandatory `expecting()` as the second half of every mismatch error; `&str` impl rides the same slot via autoref | serde `de/mod.rs` L484 | uniformly rich "invalid type: X, expected Y" for free vs reads like a typo until explained | OO, decl |
| `assertion-that-explains-itself` | `ensure!(user == 0 && depth <= MAX)` fails as ``Condition failed: `user == 0 && depth <= MAX` (1 vs 0)`` | a 935-line tt-muncher expression parser (with a literal fuel tape of `~` tokens bounding recursion) splits `a OP b`; autoref BothDebug/NotBothDebug prints values only when Debug exists; a separate `#[cfg(doc)]` definition keeps rustdoc readable | anyhow `src/ensure.rs`, `macros.rs` | assert_eq!-grade output from arbitrary booleans, no Debug bound imposed vs an extreme maintenance artifact, per-site expansion cost | DSL, imper, func |
| `recoverable-parse-abort-help` | a broken `view!` reports ALL its problems, each with `help = "e.g., view!{ class=\"my-class\", <div>…"` | rstml `parse_recoverable` returns partial AST + error list (IDE completions survive broken markup) + structured multi-part `abort!` diagnostics | leptos_macro + rstml | IDE-grade resilience, errors that teach vs recoverable parsers are much harder to write | DSL, decl |

### 12.3 Spotlights

> Sketches are SHAPE only — call-site illustrations, not compilable programs (§1.5).

#### `library-vs-application-error-split` — one author, two error dialects

dtolnay's thiserror and anyhow are the same person's answer to two audiences. A *library* error is matched by callers, so it is an enumerated type (thiserror). An *application* error is read by humans, so it is an erased, context-annotated sentence-builder (anyhow). The hinge that makes them compose is a blanket `From<E: Error>` into `anyhow::Error` — so a `?` at the application boundary swallows any library error — with `downcast_ref`/`chain()` to recover structure on the cold path. The split is doctrine, not compiler-enforced: anyhow leaking into a library's public API is the classic violation.

```rust
// library: callers will `match`, so enumerate
#[derive(thiserror::Error, Debug)]
pub enum ParseError {
    #[error("unexpected EOF at byte {0}")]
    Eof(usize),
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

// application: a human reads it, so narrate
fn load(path: &Path) -> anyhow::Result<Config> {
    let text = fs::read_to_string(path)
        .with_context(|| format!("reading config {}", path.display()))?;   // ParseError/io both flow up
    toml::from_str(&text).context("config is not valid TOML")
}
```

#### `visitor-as-its-own-error-message` — `&self` is the "expected" clause

serde's `Visitor` already carries an `expecting()` method (the one required non-`visit` method). A blanket `impl Expected for T: Visitor` reuses that method as the second half of every type-mismatch error, so `Error::invalid_type(unexpected, &self)` renders "invalid type: X, **expected** Y" with the visitor supplying the Y — no error strings written at the mismatch sites at all.

```rust
impl<'de> Visitor<'de> for U16Visitor {
    type Value = u16;
    fn expecting(&self, f: &mut fmt::Formatter) -> fmt::Result {
        f.write_str("an integer in 0..=65535")   // the ONLY place "expected …" is authored
    }
    fn visit_str<E: de::Error>(self, s: &str) -> Result<u16, E> {
        Err(E::invalid_type(Unexpected::Str(s), &self))   // &self ⇒ "expected an integer in 0..=65535"
    }
}
// error: invalid type: string "x", expected an integer in 0..=65535
```

#### `format-spec-implied-bounds` — the where-clause you never write

thiserror reads the format specifiers in `#[error("…")]` and infers exactly the trait bounds those specs require: a trailing `?` means `Debug`, `x` means `LowerHex`, a bare `{}` means `Display`. The generated `impl` mentions only the traits actually used — no more, no less — so a generic error type compiles with a correct where-clause its author never typed.

```rust
#[derive(thiserror::Error, Debug)]
#[error("{0}; {1:?}")]              // bare ⇒ Display on A, `?` ⇒ Debug on B
struct Pair<A, B>(A, B);
// generated: impl<A: Display, B: Debug> Display for Pair<A, B> { … }
//                   ^^^^^^^^      ^^^^^  precisely the specs you used, inferred
```

#### `numbered-error-enum-wire-contract` — the error type IS the protocol

iggy's error enum is a `#[repr(u32)]` with ~300 explicit discriminants range-partitioned by subsystem (1000s for streams, 5000s for consumer groups). The discriminant is not decoration — it is the wire status code. `as_code()` puts a `u32` on the socket and `from_code()` rebuilds the variant on the far side, giving every language talking the protocol a stable, greppable, O(1) error vocabulary. The cost is a single monolithic append-only enum the whole ecosystem depends on.

```rust
#[repr(u32)]
#[derive(thiserror::Error, Debug)]
pub enum IggyError {
    #[error("stream {0} was not found")]
    StreamIdNotFound(u32)      = 1009,   // explicit discriminant = wire status code
    #[error("consumer group {0} was not found")]
    ConsumerGroupNotFound(u32) = 5000,
    // …~300 variants, range-partitioned by subsystem
}

let code = err.as_code();               // u32 crosses the socket
let err  = IggyError::from_code(code);  // reconstructed identically on the far side
```

---

## 13. The dedup log

The atlas began as 274 raw entries mined across nine dossiers; 61 were absorbed or folded into 213 unique techniques. This log records every merge — which same-technique entries were collapsed and *why they are one thing* (the recurring lesson: a shape seen in three ecosystems is a lever, not a coincidence — e.g. the magic-fn signature reappears in axum, bevy, and leptos as one machine bound at different times). Format: **kept id** ← absorbed entries (dossier).

1. `magic-fn-signature-dsl` ← axum `magic-handler-fn` + bevy `fn-system-magic-params` (kept as co-primary contrast: runtime extraction vs schedule-build resolution) + literature `magic-handler-functions` + axum `from-fn-middleware-magic` (the pattern re-aimed at middleware; recorded as recurrence) + the shape-half of dsl-machinery `all-tuples-variadics` (its machinery half lives in `all-tuples-variadic-emulation`). Bevy `conditions-as-composable-systems` and `observer-on-event-param` are *recurrences at the call-site level* but kept as separate entries because their distinct machinery (ReadOnlySystem bound / Trigger GATs) is the teachable content.
2. `marker-generic-coherence` ← bevy `marker-type-coherence` (primary) + axum `via-marker-overlap-dodge` + axum `phantom-arity-witness` + leptos `marker-generic-overload-set`. Four dossiers, one lever: unused marker generic makes overlapping blanket impls coherent / builds overload sets.
3. `all-tuples-variadic-emulation` ← bevy `variadic-emulation-all-tuples` (primary, variadics_please) + axum `all-the-tuples-arity-family` + dsl-machinery `macro-callbacks` (the enabling mechanism — pass a macro's ident) + dsl-machinery `all-tuples-variadics` (machinery half). Tower's hand-written tuple ladder deliberately NOT merged (kept as `tuple-layer-composition` — hand-rolled, no macro).
4. `blanket-extension-trait` ← tower `blanket-extension-trait` (primary) + literature `extension-trait` (RFC 445/itertools) + tokio `poll-trait-plus-ext-trait-two-layer` (recurrence with a distinct purpose: the Pin-hiding two-audience split, noted in the row) + the ext-trait half of iggy `handler-loop-extension-trait`.
5. `mut-ref-builder-chain` ← bevy `mutref-builder-chain` (primary — richest rationale: the builder must be shareable with plugins) + tokio `builder-with-mut-ref-setters` + literature `mut-ref-builder` (std Command).
6. `consuming-fluent-builder` ← literature `consuming-fluent-builder` (primary) + iggy `consuming-builder-verb-pairs` (verb-pair flavor recorded in the row).
7. `typestate-builder` ← literature `typestate-builder` (primary, typed-builder/bon) + iggy `bon-fallible-builder` + leptos `component-fn-to-typed-builder` + dsl-machinery `builder-typestate-props` (same leptos machinery mined twice).
8. `typestate-protocol` ← literature `typestate-protocol` (primary, cliffle/embedded) + axum `state-threading-typestate` (Router<S>) + io-uring `unsubmitted-typestate` (UnsubmittedOneshot; its batching-seam facet noted).
9. `freeze-phase-transition` ← bytes/tokio `freeze-one-way-ownership-transition` (primary) + iggy `mut-freeze-batch-lifecycle` (the dossier itself flags it as the domain-level mirror).
10. `sealed-trait-stability-kit` ← literature `sealed-trait` + serde-errors `sealed-trait-and-private-module-idioms` (co-primary — it already consolidated the dtolnay kit) + iggy `sealed-privileged-surface` + tower `sealed-trait-alias` (MakeService; trait-alias-via-sole-blanket facet noted) + thiserror `sealed-normalization-trait` (AsDynError, the sealed derive-ABI facet).
11. `newtype-three-jobs` ← literature `newtype` (primary) + iggy `parse-dont-validate-newtype` (WireName as the parse-don't-validate exemplar).
12. `capability-split-types` ← mio/tokio `poll-registry-capability-split` (primary) + leptos `read-write-split-tuple` (same lever: capability contract as a type split).
13. `correlation-token-demux` ← mio/tokio `token-newtype-demux` (primary) + io-uring `user-data-correlation` (raw + managed altitudes both recorded).
14. `unsafe-as-precise-specification` ← io-uring `hourglass-unsafe-push` + io-uring `unsafe-split-by-invariant-owner` (one lesson: unsafe placement keyed to invariant ownership; hourglass topology + per-fn calibration are facets).
15. `default-type-param-policy-slots` ← tower `default-type-param-callback-slots` (primary) + leptos `storage-policy-type-parameter` + io-uring `generic-ring-entry-width` (associated-const wiring facet noted). anyhow's `defaulted-type-param-alias` deliberately NOT merged (an alias, not a policy slot) — kept in 10a with a kinship note.
16. `hand-rolled-vtable` ← bytes/tokio `manual-vtable-in-value` (primary) + anyhow `thin-vtable-error-object` + leptos `fn-pointer-type-erasure-valve` (AnyView). bevy `type-data-capability-registry` shares the vtable trick but kept separate — the registry/TypeId/open-capability dimension is its own technique; leptos `inventory-linker-registry` likewise (fn-pointer records noted there).
17. `boxed-erasure-pressure-valve` ← tower `boxed-service-pressure-valve` (primary) + tower `boxed-layer-arc-erasure` (Arc/double-erasure facet in the row).
18. `closed-enum-erasure` ← iggy `enum-wrapper-static-dispatch` (primary) + leptos `type-erased-reactive-prop` (SignalTypes).
19. `typeid-typemap-injection` ← axum `extension-type-map-triple-role` (primary) + leptos `context-typemap-shadowing`.
20. `minimal-core-fat-defaults` ← bytes/tokio `minimal-core-trait-fat-defaults` (primary) + serde `progressive-disclosure-defaults`; syn::visit and bevy Plugin lifecycle defaults recorded as recurrences.
21. `same-shape-mimicry` ← literature `same-shape-new-semantics` (primary, rayon) + tower `iterator-style-adapter-combinators` (the Iterator dialect transplanted to services); bytes Buf adaptors and tokio-uring `.slice()` std-mimicry noted.
22. `attribute-item-rewrite` ← dsl-machinery `attribute-item-rewrite` + tokio `attribute-macro-entrypoint` (same #[tokio::main] exemplar mined twice; tokio's diagnostics detail — span steering, prescriptive errors, IDE-resilient partial expansion — folded into the row).
23. `dollar-crate-hidden-support` ← dsl-machinery `dollar-crate-anchor` + tokio `doc-hidden-support-module`.
24. `function-like-foreign-grammar` ← dsl-machinery `function-like-foreign-grammar` (primary, view!/rstml) + literature `exact-shape-macro-dsl` (json!, sqlx::query! — the external-truth-at-compile-time facet noted).
25. `derive-additive-declarative` ← dsl-machinery `derive-additive-shape` + literature `derive-declarative`.
26. `attribute-mini-language` ← serde-errors `derive-attribute-grammar` (primary — richest instance) + dsl-machinery `attribute-mini-language` (the cross-crate survey: parse_nested_meta / custom Parse / options-struct tiers).
27. `autoref-specialization` ← literature `autoref-specialization` (primary, dtolnay case-studies) + anyhow `autoref-tagged-dispatch` + thiserror `autoref-display-override`; `ensure!`'s BothDebug fallback cross-referenced from `assertion-that-explains-itself`.
28. `diagnostic-attribute-steering` ← serde-errors `curated-compile-errors` (primary) + axum `diagnostic-attribute-steering` + bevy's on_unimplemented notes (from `fn-system-magic-params`) + dsl-machinery's do_not_recommend observations.
29. `sans-io-core` ← literature `sans-io-core` (primary, quinn-proto/Firezone) + iggy `sans-io-frame-codec`.
30. `option-wrapped-fallible-slot` ← axum `optional-extractor-opt-in` (primary) + the `Option<Res<T>>` facet of bevy `param-position-access-contract`.
31. `value-as-deserializer` ← serde `value-as-deserializer` (primary) + axum `serde-path-micro-dsl` (custom Deserializer over URL captures = the same reuse move; its structured ErrorKind diagnostics noted).
32. `layer-as-service-transformer` ← tower `layer-as-service-transformer` (primary) + literature `service-layer-onion` + axum `tower-service-onion` (renting the ecosystem; Error: Into<Infallible> bound noted).
33. `readiness-model-contract` ← tokio/mio `readiness-contract-not-data` (primary) + io-uring dossier §0 readiness-vs-completion framing (the completion side lives in `buf-result-ownership-tuple` and `drop-detach-lifecycle`).
34. `validated-wire-views` ← iggy `validate-once-infallible-view` + iggy `mutable-wire-view-patching` (read and write facets of one view technique).
35. `raii-guard` ← literature `raii-guard` (primary) + iggy `raii-pooled-buffer` (Drop-returns-to-pool recurrence). io-uring `checkout-handle` deliberately NOT merged — its runtime-linearity (Option checkout) + associated-type-equality gate is distinct machinery.
36. `constructor-static-method` ← literature `constructor-static-method` (primary) + iggy `named-constructor-enums` (smart constructors hiding wire encoding).
37. `offset-cursor-decode` ← iggy `offset-cursor-decode` (primary) + iggy `capped-capacity-defense` (folded as the defensive-decoding facet).
38. `buffer-first-encode` ← iggy `buffer-first-encode-trait` (primary) + iggy `raw-message-vectored-encode` (folded as the vectored zero-copy facet).
39. `complete-consumes-self` ← tokio-uring `complete-consumes-self` (primary) + tokio-uring `submit-op-closure-after-move` (folded — the closure-after-move soundness detail is part of the same op protocol).
40. `copy-handle-arena` ← leptos `copy-signal-arena-handle` (primary) + leptos `arc-copy-dual-api` (folded as the escape-hatch facet: Arc twins = same API minus Copy).
41. `capability-primitive-trait-lattice` ← leptos `verb-trait-lattice` (primary) + leptos `clone-cost-at-the-callsite` (folded — the get/with/read cost menu is the lattice's user-facing consequence).
42. `quote-quasi-quoting` ← dsl-machinery `quote-quasi-quoting` (primary) + dsl-machinery `pound-repetition` (folded as the repetition facet).
43. `token-types-and-custom-keywords` ← dsl-machinery `token-type-macro` + dsl-machinery `custom-keyword-structs` (built-in and user-defined halves of one idea: tokens as types).
44. `split-borrow-views` ← io-uring `split-borrow-triptych` + io-uring `explicit-sync-verb` (the dossier already presented them as one composite; kept composite).
45. `spawn-detached-handle` — considered merging tokio-uring's `not-send-by-design` spawn; kept separate (the technique there is the *absence* of bounds, not the handle contract).
46. Considered-and-kept-separate (recorded for transparency): bevy `change-detection-smart-pointer` vs leptos `implicit-subscription-tracking` (both "reactivity without manual subscriptions," entirely different machinery: tick comparison vs observer graph — the contrast is curriculum content); tower `box-error-unification` vs anyhow (different tier of the same erasure idea; both kept); iggy `layered-error-locality` vs `library-vs-application-error-split` (three-tier architecture vs two-dialect doctrine); iggy `funnel-blanket-facade` vs `blanket-extension-trait` (N+M economy vs ergonomics retrofit); serde `bidirectional-data-model` vs iggy funnel (both hourglass waists, different substrate); axum `last-argument-body-slot` vs bevy `system-piping-in-position` (mirror-image positional rules, cross-referenced); bevy `function-reflection-dynamic-call` vs `magic-fn-signature-dsl` (same lever, opposite binding time — kept as the static/dynamic bookends).

**Count reconciliation:** 274 dossier entries − 61 absorbed/folded = **213 unique techniques** in this atlas.

---

## 14. Known coverage gaps

The mining pass was deliberately library-first and source-anchored; the territories below are expressiveness surfaces it did NOT reach (or only grazed). They are recorded as **future-mining targets** — the next exemplar dossiers to add, and the places a curriculum built on this atlas must currently fill from general knowledge rather than a cited call-site.

1. **Operator overloading as DSL** — `std::ops` impls for domain math and embedded DSLs: nalgebra/glam vector algebra, `Duration * 2`, unit-safe arithmetic (uom), parser combinators using `|`/`+`. No dossier mined an ops-heavy crate; the atlas's only operator content is deref/index incidentals.
2. **Legitimate Deref-based layering** — the anti-pattern is recorded (patterns book: deref-polymorphism), and guards use Deref, but the positive design space (smart-pointer stacks, `Deref` in wrapper newtypes as a deliberate concession, `Cow`) is untreated. The negative space from the literature dossier (`deref-polymorphism-antipattern`, `clone-to-satisfy-borrowck`) should be taught as the boundary cases of §5/§6.
3. **Const-generic APIs beyond `[(K, V); N]`** — const-generic matrices/vectors (nalgebra), fixed-size crypto/buffer APIs, `generic_const_exprs` frontier, typenum/generic-array legacy vs native const generics, compile-time dimensional analysis. axum's header arrays are the atlas's only const-generic entry.
4. **unsafe-as-expressiveness beyond io-uring** — bytemuck/zerocopy derive-checked transmutes (`#[derive(Pod)]` as a capability), `Pin` projection library design (pin-project's proof machinery), SIMD intrinsics wrappers, allocator APIs. The atlas covers unsafe *placement discipline* well but not safe-transmute-style "unsafe capability derives."
5. **Branded/invariant lifetimes at full strength** — GhostCell, generativity, branded indices for proven-in-bounds indexing. The witness-token entry touches `'scope` branding only.
6. **Parser-combinator libraries as expression DSLs** — nom/winnow/chumsky: closure-composition grammars, error-recovery strategies, streaming inputs. dsl-machinery covers *proc-macro* parsing (syn) but not runtime parser combinators.
7. **Type-level SQL / query builders** — diesel's type-level schema DSL (the heaviest type-level API in production Rust) and sea-orm; bevy's Query is the closest analogue mined. sqlx got one row (compile-time-checked strings — the *opposite* strategy). The diesel-vs-sqlx axis (types vs external truth) is a ready-made lesson missing an exemplar dossier.
8. **FFI/interop bridge DSLs** — cxx (dtolnay's type-checked C++ bridge — arguably the most impressive expressiveness artifact not mined), PyO3 `#[pyfunction]`/`#[pyclass]`, wasm-bindgen, napi-rs. iggy's `sink_connector!` covers C-ABI export only.
9. **GATs beyond lending iterators** — async-trait-with-GATs patterns, lending streams, HKT emulation (the `family` pattern). One GAT entry (iggy lending iterator) + GAT uses inside bevy/tokio machinery, but no dedicated GAT-API-design treatment.
10. **Effect/keyword-generics frontier** — `const fn` as an effect system (const traits ahead), portable-simd/allocator-api genericity. The four-registers framing predicts these; nothing concrete mined.
11. **Property-based & fixture test DSLs** — proptest strategies (`prop_compose!`), quickcheck Arbitrary, rstest fixtures/cases, insta snapshots, criterion benchmark groups. iggy's `#[iggy_harness]` is the lone test-DSL entry.
12. **Global registration beyond inventory** — linkme distributed slices, ctor, typetag (serde for trait objects — a major dtolnay expressiveness artifact combining inventory + erased-serde). typetag would bridge §10 and §11/9c.
13. **Bit-level and binary-layout DSLs** — bitflags! as a macro technique (used but not analyzed), modular-bitfield, deku/binrw declarative binary parsing (the derive-based alternative to iggy's hand-rolled codec — a perfect compare/contrast).
14. **Actor-model APIs** — actix `Handler<M>` typed mailboxes, ractor, kameo: message-passing expressiveness vs iggy's one shard-envelope entry.
15. **Negative/auto-trait engineering as API** — deliberate `!Send`/`!Sync` via `PhantomData<*const ()>` markers, `PhantomPinned`, auto-trait leakage through `impl Trait` as a semver surface. tokio-uring's "absence of bounds" entry gestures at it; the marker-type toolkit deserves explicit treatment.
16. **Never type & Infallible as API vocabulary** — partially covered (axum `Rejection = Infallible`, `match err {}`, serde Impossible) but the general "`!`-adjacent API design" story (TryFrom<T> for T with Error = Infallible, infallible-to-fallible migration paths) is untold.
17. **Doc-driven expressiveness** — doctests as enforced examples (C-EXAMPLE), `#[doc = include_str!("../README.md")]`, intra-doc links as API navigation. The dossiers treat docs as contract carriers (cancellation safety, O(1) clone) but not doc *tooling* as expressiveness.
18. **Workspace/feature architecture as API** — the facade-crate pattern (serde/serde_core got one entry; the general pattern of `-core`/`-macros`/`-derive` triads and `full` features deserves its own treatment), semver-trick crates.
19. **Stream/Sink combinator ecosystem** — futures::stream adapters, async-stream's `stream! { yield }` macro (a control-flow-register patch for the missing async-iteration sugar boats identifies) — a natural companion to §7's registers row.
20. **Frunk-style type-level data** — HLists, Generic/LabelledGeneric derive-based structural conversion; the type-level cons list appears only as tower's Stack.

**Meta-gap:** the dossiers mined *libraries*; application-level expressiveness (how a large binary crate organizes modules, error boundaries, and internal APIs — iggy was the lone app) is underrepresented relative to how much curriculum time real projects deserve.

---

## 15. Sources

Every entry in this atlas is anchored to a real, readable call-site. The provenance is two-tier: production source mined dossier-by-dossier (§15.1) and the written idiom canon that supplied the meta-framings (§15.2).

### 15.1 Mined production source

Nine dossiers over the following crates (grouped as mined; constituent repos listed):

- **tokio** (with **bytes** and **mio**) — `select!`, the readiness contract, `AsyncReadExt`, `#[tokio::main]`, `Buf`/`freeze`.
- **io-uring** and **tokio-uring** — the completion model, ownership-transfer buffer protocols, the trust-spectrum contrast between the raw and managed APIs.
- **tower** (with **tower-http**) — `Service`/`Layer`, `ServiceBuilder`, the `Stack` type-level list, the adapter dialect, inline type-check probes.
- **axum** — magic-fn handlers, extractors, `IntoResponse` tuple grammar, `#[debug_handler]`, `track_caller` builder panics.
- **leptos** — `view!`/rstml, `#[server]`, colon-namespaced attributes, copy-signal arenas, the reactive trait lattice.
- **bevy_ecs** (with **bevy_reflect** and **bevy_app**) — systems, bundles, `Query` type-level DSL, `#[require]`, `variadics_please::all_tuples!`, plugins.
- **apache/iggy** — the numbered wire-error enum, `error_set!`, per-transport error projection, the `#[iggy_harness]` test matrix, `sink_connector!`, `#[derive(ConfigEnv)]`.
- **serde** — the bidirectional data model, Visitor-driven deserialization, the error-vocabulary trait, `forward_to_deserialize_any!`, diagnostic attribute steering.
- **thiserror** and **anyhow** (dtolnay's library-vs-application error pair) — annotated error enums, format-spec implied bounds, `context`, `ensure!`, autoref specialization, zero-footprint derives.
- **syn**, **quote**, and **proc-macro2** (the DSL-machinery dossier) — the `Parse` trait, quasi-quoting, token types and custom keywords, `Punctuated`, spanned errors as values, hygiene/span choice.

> **Note on provenance.** The original voice brief named a source "Izzy"; there is no notable crate by that name on crates.io or GitHub, and it was resolved to **`apache/iggy`** — the Rust message-streaming platform — which is what the iggy dossier actually mined.

### 15.2 The literature canon

The written idiom sources that supplied the register spine and the design-value framing:

- **rust-unofficial/patterns** — the community Rust Design Patterns book (idioms, patterns, and the anti-patterns, e.g. deref-polymorphism, cited as boundary cases).
- **The Rust API Guidelines** (rust-lang) — the `C-*` checklist (C-CONV-TRAITS, C-GENERIC, C-EXAMPLE, C-NEWTYPE, …) that names many of the small moves catalogued here.
- **boats / withoutboats' blog** — "the registers of Rust" (core / consuming / combinatoric / control-flow), the single most teachable framing in the material (§1.3).
- **cliffle (Cliff L. Biffle)** — "The Typestate Pattern in Rust," the primary exemplar for `typestate-protocol`.
- **dtolnay's case studies** — the autoref-specialization writeups and the thiserror/anyhow/serde design notes that ground much of §12 and §11/9c.
