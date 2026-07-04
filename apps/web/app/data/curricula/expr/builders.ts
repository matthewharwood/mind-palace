import type { Curriculum } from "@mind-palace/curriculum";

import { tokioSource } from "./_sources";

// Construction & Configuration Surfaces — the builder taxonomy as aesthetics:
// consuming vs &mut vs typestate builders (tokio runtime::Builder as the
// flagship case study), TraceLayer's defaulted policy slots and hook traits,
// ServiceBuilder's domain vocabulary (order-inversion recalled from
// c-expr-traits), serde's derive-attribute register, the init-struct rung and
// its #[non_exhaustive] kill-switch, and when a plain struct beats a builder.
// Bare-std drills are rustc-verified; the serde drill is cargo-sandbox checked
// by scripts/verify-rust-cards.ts.
export const exprBuilders: Curriculum = {
  id: "c-expr-builders",
  title: "Construction & Configuration Surfaces",
  source: tokioSource,
  nodes: [
    {
      id: "builder-ladder",
      title: "Construction Surfaces: The Ladder",
      content: {
        type: "read",
        markdown:
          "Every API you admire made a decision about the same mundane moment: ==how a value gets configured and born==. `Runtime`, `Command`, `Regex`, a traced HTTP stack — each picked a construction surface, and that pick is visible at every call site forever. This curriculum tours the ladder, from zero machinery to compile-checked.\n\n## The failure mode that starts the ladder\nConstructors stop scaling. One required argument is `Pool::new(4)`; add options and you breed `Pool::with_name`, `Pool::with_threads_and_name`, `Pool::with_threads_name_and_stack_size`... The Rust API Guidelines name this constructor proliferation, and ==C-BUILDER exists precisely because C-CTOR does not scale== past a few arguments.\n\n## Rung zero: the config struct\n`Config { verbose: true, ..Default::default() }` — struct-update syntax over a `Default` impl, the poor man's named-and-optional arguments. Both mechanics are assumed from the core path (struct-update syntax, implementing `Default`); the *design* content is what the idiom demands: ==public fields==. A public representation is a frozen representation — every added field breaks downstream literals. The escape, `#[non_exhaustive]`, ==kills this exact syntax==: struct literals (and therefore `..Default::default()`) are rejected outside the defining crate. The zero-machinery rung self-destructs the moment the type must evolve in public.\n\n## The builder family\nWhen the config struct dies, you buy a second type that owns the half-built state. The rest of this curriculum is the family portrait:\n\n- **Consuming** — `mut self` setters returning `Self`, terminal `build(self)`: `std::thread::Builder`\n- **Borrowing** — `&mut self` setters returning `&mut Self`: `Command`, tokio's `runtime::Builder`, bevy's `App`\n- **Type-changing** — setters move the builder to a NEW type: typed-builder's checked required fields, `TraceLayer`'s policy slots, `ServiceBuilder`'s growing stack\n- **Off the value entirely** — configuration on the type definition (`#[serde(...)]` attributes, defaulted type parameters) or in Cargo features, resolved at compile time\n\n## Three questions pick the rung\n1. Who holds the half-built state — can it be lent to foreign code (`&mut`), or does it flow linearly (consuming)?\n2. What is checked when — a runtime `assert!`, a `Result`, or a method that simply does not exist until the state is legal?\n3. Where does the config live — at the call site, on the type definition, or in Cargo.toml?",
      },
    },
    {
      id: "consuming-builder",
      title: "Consuming Builders: mut self → Self",
      content: {
        type: "read",
        markdown:
          "## The shape\n`thread::Builder::new().name(name).stack_size(64 * 1024).spawn(f)?` — std's own thread builder. Each link takes the builder by value and hands it back; the terminal call ==consumes it and moves its fields into the product==. iggy's client builders push the aesthetic further with ==verb pairs== — `.auto_join_consumer_group()` / `.without_encryptor()` — boolean knobs renamed until configuration reads as prose.\n\n## The machinery\nReceiver forms (`mut self`, `&mut self`) are assumed from the core path; the design content is *choosing* by-value. Every setter is `fn name(mut self, val: String) -> Self`: mutate a field, return the whole builder. The terminal `build(self)` (or `spawn(self)`) takes ownership, so fields move straight into the target — ==no clone-out at the end, and move-only fields work for free==. The API Guidelines' C-BUILDER names this the variant for when ownership must transfer: `thread::Builder::spawn` moves the name and stack size into the new thread, and the builder is gone.\n\nBecause every link returns `Self` by value, the whole chain is one expression — storable as `let b = Builder::new().name(n);`, returnable from a helper, passable to a function.\n\n## The trade-off\nBuys: chainable one-liners; the builder itself is a first-class value. Costs: ==conditional configuration forces rebinding== — `builder = builder.stack_size(n);` inside every `if` and loop, because each call eats the previous builder (the guidelines call this out explicitly). Verb pairs double the method count. And like every member of the family, it is a whole second type to document and keep drift-free against the target.",
      },
    },
    {
      id: "mutref-builder",
      title: "&mut Builders: The tokio Runtime Case",
      content: {
        type: "read",
        markdown:
          '## The shape\nThe borrowing builder has ==two shapes at once==. The one-liner: `Command::new("cat").arg("file.txt").spawn()?`. And the staged form the consuming style cannot do without rebinding: `let mut cmd = Command::new("ls");` then `cmd.arg("-S");`, an `if` that adds `cmd.arg("-a");`, and finally `cmd.spawn()?`. C-BUILDER names this the non-consuming variant and prefers it: it enables one-liners and complex configuration equally well.\n\n## The machinery: tokio\'s runtime Builder\n`tokio::runtime::Builder` (tokio/src/runtime/builder.rs) is the load-bearing case study. Factory constructors select the scheduler — `new_current_thread()` vs `new_multi_thread()` — recorded in a private `Kind` enum, not a type parameter. Every setter is `fn worker_threads(&mut self, val: usize) -> &mut Self`, and validation is a ==runtime assert== ("Worker threads cannot be set to 0"). The terminal `build(&mut self) -> io::Result<Runtime>` reads config out of the borrowed builder, so ==one recipe can stamp out two runtimes==. Thread hooks are stored type-erased as `Arc<dyn Fn() + Send + Sync>`: cheap to hand to N worker threads, dynamic dispatch that costs nothing at thread-spawn frequency.\n\nbevy\'s `App` shows WHY `&mut` gets chosen: `Plugin::build(&self, app: &mut App)` threads the builder through ==foreign code== — a by-value builder could never be lent to N plugins in turn.\n\nAnd `#[tokio::main]` is this builder wearing a macro: it rewrites your `async fn main` into a sync main around `Builder::new_multi_thread().enable_all().build()` plus `block_on`. The item-rewrite machinery belongs to the macros curriculum; here it is the on-ramp that hides the builder until you need a knob.\n\n## The trade-off\nBuys: dual-shape ergonomics, a shareable builder, conditional config with no rebinding, `build()` callable twice. Costs: ==no compile-time completeness== — misconfiguration is an assert or an `io::Result`, never a missing method. The terminal must clone config out of the borrow. And the classic paper-cut: `let b = Builder::new_multi_thread().worker_threads(4);` ==fails to compile==, because the chain returns `&mut` into a temporary that dies at the semicolon. tokio chose reusability over move purity; `std::thread::Builder` chose the opposite. Same language, two documented aesthetics.',
      },
    },
    {
      id: "typed-builder",
      title: "Typestate Builders: Checked Fields",
      content: {
        type: "read",
        markdown:
          "## The shape\n`Foo::builder().x(1).build()` compiles. `Foo::builder().build()` ==does not compile== — required field `x` was never set. `Foo::builder().x(1).x(2)` does not compile either — set twice. The typed-builder and bon crates sell exactly this contract, generated by `#[derive(TypedBuilder)]` on a plain struct.\n\n## The machinery\nThe builder's completion state is encoded in ==its generic parameters==. Conceptually: the builder starts life as `Builder<(Unset, Unset)>`; calling `.x(1)` returns `Builder<(Set, Unset)>`; and `build()` is defined by a bounded impl that only exists on the all-slots-filled instantiation. Each setter is a ==type-changing method== — it consumes the builder and rebuilds it at a new type, so \"is `x` set?\" becomes a question the type system answers. typed-builder's README says it plainly: the state lives in the generics arguments. This is the typestate pattern — the typestate curriculum owns the general machinery — industrialized by a derive macro and aimed squarely at construction.\n\n## The trade-off\nBuys: the two runtime failure modes of every lower rung — ==missing required field and silent double-set== — become compile errors, at zero runtime cost. Maximum misuse resistance. Costs: **error-message quality** — typed-builder's own docs admit misuse surfaces as deprecation-warning-shaped diagnostics rather than a clean \"you forgot x\"; **nameability** — the half-built builder's generic-encrusted type is effectively ==unnameable==, so it cannot sit in a struct field or return from a helper without heroics; compile time spent generating the typestate lattice; and a proc macro standing between the user and every diagnostic.",
      },
    },
    {
      id: "trace-slots",
      title: "TraceLayer: Seven Defaulted Slots",
      content: {
        type: "read",
        markdown:
          "## The shape\n`TraceLayer::new_for_http().make_span_with(f).on_response(g)` — tower-http's tracing middleware has ==seven customization points==, and you name only the ones you change. Each slot accepts a closure, OR a configured strategy struct like `DefaultOnRequest::new().level(Level::INFO)`, OR `()` to switch the hook off entirely.\n\n## Machinery 1: defaulted type parameters\n`TraceLayer<M, MakeSpan = DefaultMakeSpan, OnRequest = DefaultOnRequest, OnResponse = DefaultOnResponse, ...>` (tower-http/src/trace/layer.rs). Defaulted type params keep the common case invisible — `TraceLayer<HttpMakeClassifier>` stays a nameable type. Each setter is ==type-changing==: `on_request<New>(self, new: New)` rebuilds the struct with ONE parameter substituted, hand-moving every other field across (struct-update cannot cross a type change). Configuration is recorded ==in the type==, flows into the produced `Trace<S, M, MakeSpan, ...>` service, and stays statically dispatched. Constructors pin policy per protocol: `new_for_http()` vs `new_for_grpc()` select the classifier ==by constructor, not by runtime flag==. leptos repeats the trick: `RwSignal<T>` defaults its storage policy; only `!Send` exotics spell `RwSignal<T, LocalStorage>`.\n\n## Machinery 2: three impl families per hook\nEach slot is a ==trait per hook== (tower-http/src/trace/on_request.rs): `OnRequest<B>` has exactly one method, and three impls define the whole dialect. `impl OnRequest<B> for ()` — an empty body, the ==compile-time off switch==. A blanket `impl<F> OnRequest<B> for F where F: FnMut(&Request<B>, &Span)` — closures are first-class. And named strategy structs like `DefaultOnRequest` carry configuration. This is tower-http's answer to an options object, with no `Option<Box<dyn Fn>>` anywhere.\n\n## The trade-off\nBuys: ==zero-cost callbacks== — every slot is a concrete type, statically dispatched, and the `()` no-op inlines away to nothing. Costs: seven type parameters ride along in ==every error message== that touches the layer; storing a half-configured `TraceLayer` means naming the monster type; and the `FnMut` blanket ==freezes the closure signature forever== — adding an argument to the hook is a breaking change, and a wrong-arity closure fails as an opaque trait-bound error, never a friendly arity error.",
      },
    },
    {
      id: "serde-register",
      title: "serde Attributes: Config at the Type",
      content: {
        type: "read",
        markdown:
          '## The shape\n`#[serde(rename_all = "camelCase", tag = "type")]` on the container; `#[serde(default, skip_serializing_if = "Option::is_none")]` and `#[serde(flatten)]` on fields. No builder in sight: ==the configuration left the call site entirely== and moved to the type definition. Data layout and wire contract read in one place — and there is no runtime object to configure, because the mapping is ==per-type, not per-value==.\n\n## The machinery\n`attributes(serde)` claims the namespace on the derive; parsing lives in serde_derive/src/internals/attr.rs, where `attr::Container::from_ast`, `attr::Variant::from_ast`, and `attr::Field::from_ast` lower ==three nesting levels of attributes== into plain config structs. Codegen then reads config, never raw attributes — wire names are baked into the generated impl as `&\'static str`s, ==zero runtime interpretation==. Two register gems: `rename_all`\'s legal values live in a static table whose ==keys are written in the convention they name== — `"SCREAMING-KEBAB-CASE"` is its own example (serde_derive/src/internals/case.rs, applied at compile time). And `tag` / `content` / `untagged` form one orthogonal switch — the `TagType` enum — selecting four industry-standard JSON layouts. The parsing infrastructure itself (write-once `Attr` cells, all-at-once spanned duplicate errors) is the macros curriculum\'s subject; here the lesson is the register: ==configuration as declarations, not statements==.\n\n## The trade-off\nBuys: the 95% case of serialization is fully declarative; the schema and its wire mapping are visible on the type; nothing is interpreted at runtime. Costs: an ==unbounded mini-language== accreted over a decade, whose interactions only prose documents; string-embedded paths (`skip_serializing_if = "Option::is_none"` names a function inside a string) get weak IDE support; and the most beloved attributes are not free — `flatten` and `untagged` work by ==buffering the input into a `Content` value tree and replaying it== (hidden allocation, self-describing formats only, degraded error positions). Declarative surfaces hide their machinery best exactly where the machinery is most expensive.',
      },
    },
    {
      id: "builder-vocab",
      title: "ServiceBuilder: A Named Vocabulary",
      content: {
        type: "read",
        markdown:
          "## The shape\n`ServiceBuilder::new().buffer(100).concurrency_limit(10).timeout(d).service(svc)` — tower's middleware pipeline as a ==discoverable, IDE-completable vocabulary==. You met the Layer onion and its order inversion in the traits curriculum; the recall is two lines: the builder is a fold that reverses wrap order, so ==reading order equals request-flow order== — `buffer` sees the request first.\n\n## The machinery\nEvery named method (tower/src/builder/mod.rs) is ==one line of cfg-gated sugar== over the generic escape hatch: `fn timeout(self, d: Duration) -> ServiceBuilder<Stack<TimeoutLayer, L>>` simply calls `self.layer(TimeoutLayer::new(d))`. Note the receiver: consuming AND type-changing, like `TraceLayer`'s setters — but ==accumulating== a `Stack<New, Old>` cons list instead of substituting one slot. Three hatches keep the vocabulary open: `.layer(any_layer)` for arbitrary middleware, `.layer_fn(closure)`, and `.service_fn(async_fn)` at the terminal. Other crates can even splice words into the sentence — tower-http's `ServiceBuilderExt` adds `.trace_for_http()` cross-crate through a sealed extension trait.\n\n## The trade-off\nBuys: the pipeline reads as a top-down diagram; `cfg` gating keeps compiles pay-for-what-you-use; each method's fully spelled return type keeps the accumulated type precise, so the next word still resolves. Costs: ==N methods maintained in lockstep with N layers== — every new layer wants a verb on the builder; the precise types surface in any signature that stores one (`ServiceBuilder<Stack<TimeoutLayer, Stack<BufferLayer, Identity>>>`); and ordering is ==semantics wearing style's clothes== — tower's own docs show `.buffer(100).concurrency_limit(10)` versus the reverse producing 110 vs 10 maximum in-flight requests, a behavioral difference the types never show.",
      },
    },
    {
      id: "plain-struct-wins",
      title: "When a Plain Struct Wins",
      content: {
        type: "read",
        markdown:
          "Builders are so idiomatic it is easy to forget they are ==a cost center==: a second type, a second docs page, and permanent drift risk against the target. The final skill of this curriculum is refusing the ladder's upper rungs when a lower one serves.\n\n## The rubric\n- **Two or three required values, nothing optional** — a plain constructor. When construction can fail, the fallible smart-constructor convention (`Regex::new(src)?`) applies; the typestate curriculum's parse-don't-validate lesson owns that move.\n- **All-optional knobs, application-internal** — config struct + `Default` + struct-update. Zero machinery; the frozen public fields cost nothing inside your own crate.\n- **Public and still evolving** — `#[non_exhaustive]` plus a builder. The attribute rejects downstream struct literals, which ==closes the struct-update door on purpose==: once consumers cannot name your fields, adding one stops being a breaking change — and the builder becomes the only door in.\n- **Ownership must transfer into the product** — consuming builder (`thread::Builder::spawn` moves the config into the new thread).\n- **Builder must be lent to foreign code or configured conditionally** — `&mut` builder (bevy's `App` and its plugins, `Command`, tokio's `runtime::Builder`).\n- **Misuse is catastrophic and required fields are many** — typestate builder; pay the error-message tax knowingly.\n- **The config belongs to the TYPE for all instances** — attributes and defaulted type parameters (`#[serde(...)]`, `TraceLayer`'s slots), not a per-value builder.\n\n## One more surface\nSometimes the construction surface is not in the code at all: tokio's `cfg_net!`-family macros (tokio/src/macros/cfg.rs) stamp `#[cfg(feature = ...)]` across whole impl blocks, so ==Cargo.toml is the builder== — `Builder::enable_io` does not even exist without an io driver compiled in. Pay-for-what-you-use compile times, sculpted discoverability; the misconfiguration error becomes method not found.\n\n## The mastery claim\nVisualize the call site your users deserve, then buy ==the cheapest rung that produces it==. Every rung up costs a type, an error message, or a compile — spend only where the call site or the invariant earns it back.",
      },
    },
    {
      id: "tokio-mutref-why",
      title: "Why tokio Chose &mut Setters",
      content: {
        type: "multiple-choice",
        question:
          "tokio's `runtime::Builder` setters take `&mut self` and return `&mut Self`, while `std::thread::Builder`'s setters consume `mut self`. Judged by tokio's documented design, what does the `&mut` choice buy?",
        options: [
          "Conditional configuration without rebinding, and a reusable builder — `build()` can be called twice to stamp out two runtimes from one recipe",
          "Invalid configurations like zero worker threads become compile errors instead of runtime asserts",
          "The chain can be stored as an expression: `let b = Builder::new_multi_thread().worker_threads(4);`",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "builder-rebind-output",
      title: "Builder Rebinding Check",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `struct Builder {
    threads: usize,
    name: String,
}

impl Builder {
    fn new() -> Self {
        Builder { threads: 1, name: String::from("main") }
    }
    fn threads(mut self, threads: usize) -> Self {
        self.threads = threads;
        self
    }
    fn name(mut self, name: &str) -> Self {
        self.name = name.to_string();
        self
    }
    fn build(self) -> String {
        format!("{}x{}", self.name, self.threads)
    }
}

fn main() {
    let tuned = true;
    let mut builder = Builder::new().threads(4);
    if tuned {
        builder = builder.name("pool");
    }
    println!("{}", builder.build());
}`,
        options: ["mainx4", "poolx4", "poolx1"],
        answerIndex: 1,
      },
    },
    {
      id: "typed-builder-cost",
      title: "The Typestate Builder's Bill",
      content: {
        type: "multiple-choice",
        question:
          "typed-builder and bon encode which fields are set in the builder's generic parameters, so `Foo::builder().build()` with a missing required field fails to compile. What is the documented cost of this aesthetic?",
        options: [
          "Each setter allocates a fresh builder on the heap, so construction gets slower at runtime",
          "Required fields can no longer have defaults, so every field must always be set explicitly",
          "Diagnostics and nameability: misuse surfaces as cryptic trait/deprecation-shaped errors, and the half-built builder's generic-encrusted type is effectively unnameable",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "non-exhaustive-kill",
      title: "The #[non_exhaustive] Kill-Switch",
      content: {
        type: "multiple-choice",
        question:
          "A library adds `#[non_exhaustive]` to its public `Config` struct so that future fields stop being breaking changes. What happens to downstream code written as `Config { verbose: true, ..Default::default() }`?",
        options: [
          "It keeps compiling — `..Default::default()` fills in whatever fields exist at any version",
          "It stops compiling — struct-literal syntax (including struct-update) is rejected outside the defining crate, forcing every consumer through a constructor or builder",
          "It compiles, but panics at runtime if the library later adds a field",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "unit-hook-why",
      title: "Why Implement the Hook for ()?",
      content: {
        type: "multiple-choice",
        question:
          "This is tower-http's `OnRequest` dialect recreated in std: a trait per hook, with a unit impl and an `FnMut` blanket. Why ship the `impl Hook for ()` alongside the blanket?",
        language: "rust",
        code: `pub trait Hook {
    fn call(&mut self, event: &str);
}

impl Hook for () {
    fn call(&mut self, _event: &str) {}
}

impl<F: FnMut(&str)> Hook for F {
    fn call(&mut self, event: &str) {
        self(event)
    }
}

pub struct Server<H = ()> {
    hook: H,
}

impl Server<()> {
    pub fn new() -> Self {
        Server { hook: () }
    }
}

impl<H: Hook> Server<H> {
    pub fn on_event<N: Hook>(self, hook: N) -> Server<N> {
        Server { hook }
    }

    pub fn start(&mut self) {
        self.hook.call("started");
    }
}`,
        options: [
          "`()` is the compile-time off switch: the default slot statically dispatches to a no-op that inlines away — no `Option<Box<dyn Fn>>` checked at runtime",
          "Without it, `Server::new()` could not exist, because every generic parameter needs a `Default` implementation",
          "It enables dynamic dispatch, so differently-typed hooks can be swapped into the same `Server` at runtime",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "attr-register-why",
      title: "Why Attributes, Not a Builder?",
      content: {
        type: "multiple-choice",
        question:
          "serde's wire configuration (`rename_all`, `skip_serializing_if`, `tag`) lives in derive attributes on the type rather than in a runtime `SerializerBuilder`. What is the design rationale?",
        options: [
          "A runtime builder could not express per-field options like `skip_serializing_if` at all",
          "Proc-macro attributes are validated by the type system, while builder methods can only assert at runtime",
          "The mapping is per-TYPE, not per-value: attributes bake it into the generated impl at compile time — wire names become `&'static str`s with zero runtime interpretation, and the data layout and wire contract read in one place",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "write-consuming-builder",
      title: "Write: A Consuming Builder",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Author the consuming rung for one config type. Define `pub struct Pool { pub threads: usize, pub name: String }` and `pub struct PoolBuilder` with private `threads: usize` and `name: String` fields. Give `PoolBuilder` a `pub fn new() -> Self` starting at 1 thread named "worker" (`String::from("worker")`), chainable setters `pub fn threads(mut self, threads: usize) -> Self` and `pub fn name(mut self, name: &str) -> Self` (store `name.to_string()`), and a terminal `pub fn build(self) -> Pool` that moves both fields into `Pool`.',
        solution: `pub struct Pool {
    pub threads: usize,
    pub name: String,
}

pub struct PoolBuilder {
    threads: usize,
    name: String,
}

impl PoolBuilder {
    pub fn new() -> Self {
        PoolBuilder { threads: 1, name: String::from("worker") }
    }

    pub fn threads(mut self, threads: usize) -> Self {
        self.threads = threads;
        self
    }

    pub fn name(mut self, name: &str) -> Self {
        self.name = name.to_string();
        self
    }

    pub fn build(self) -> Pool {
        Pool { threads: self.threads, name: self.name }
    }
}`,
      },
    },
    {
      id: "write-mutref-builder",
      title: "Write: A Command-Style Builder",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Same `Pool`, Command style. Define `pub struct Pool { pub threads: usize, pub name: String }` again, then `pub struct PoolConfig` with private `threads` and `name` fields and a `pub fn new() -> Self` (1 thread, "worker"). Setters borrow: `pub fn threads(&mut self, threads: usize) -> &mut Self` and `pub fn name(&mut self, name: &str) -> &mut Self`. The terminal `pub fn build(&self) -> Pool` clones the config out (`self.name.clone()`) — the builder stays usable for a second build.',
        solution: `pub struct Pool {
    pub threads: usize,
    pub name: String,
}

pub struct PoolConfig {
    threads: usize,
    name: String,
}

impl PoolConfig {
    pub fn new() -> Self {
        PoolConfig { threads: 1, name: String::from("worker") }
    }

    pub fn threads(&mut self, threads: usize) -> &mut Self {
        self.threads = threads;
        self
    }

    pub fn name(&mut self, name: &str) -> &mut Self {
        self.name = name.to_string();
        self
    }

    pub fn build(&self) -> Pool {
        Pool { threads: self.threads, name: self.name.clone() }
    }
}`,
      },
    },
    {
      id: "write-typed-builder",
      title: "Write: A Typestate Builder",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Hand-roll the compile-checked rung. Declare `pub struct NoName;` as the unset marker and `pub struct PoolBuilder<N> { name: N, threads: usize }`. On `impl PoolBuilder<NoName>`, write `pub fn new() -> PoolBuilder<NoName>` (marker in the slot, 1 thread). On `impl<N> PoolBuilder<N>`, write `pub fn threads(mut self, threads: usize) -> PoolBuilder<N>` and the slot-flipping setter `pub fn name(self, name: &str) -> PoolBuilder<String>` that rebuilds the struct with `name.to_string()`, carrying `threads` across. Gate the terminal on the filled state: `impl PoolBuilder<String>` gets `pub fn build(self) -> (String, usize)` returning the name and thread count — so `PoolBuilder::new().build()` cannot compile.",
        solution: `pub struct NoName;

pub struct PoolBuilder<N> {
    name: N,
    threads: usize,
}

impl PoolBuilder<NoName> {
    pub fn new() -> PoolBuilder<NoName> {
        PoolBuilder { name: NoName, threads: 1 }
    }
}

impl<N> PoolBuilder<N> {
    pub fn threads(mut self, threads: usize) -> PoolBuilder<N> {
        self.threads = threads;
        self
    }

    pub fn name(self, name: &str) -> PoolBuilder<String> {
        PoolBuilder { name: name.to_string(), threads: self.threads }
    }
}

impl PoolBuilder<String> {
    pub fn build(self) -> (String, usize) {
        (self.name, self.threads)
    }
}`,
      },
    },
    {
      id: "write-policy-slot",
      title: "Write: A Callback Slot",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Recreate TraceLayer's slot dialect in std. Write `pub trait OnBuild { fn on_build(&mut self, threads: usize); }` with the two impl families: `impl OnBuild for ()` (empty body — the off switch) and a blanket `impl<F: FnMut(usize)> OnBuild for F` that calls the closure. Then `pub struct PoolBuilder<C = ()> { threads: usize, callback: C }`: on `impl PoolBuilder<()>`, `pub fn new(threads: usize) -> PoolBuilder<()>` with callback `()`; on `impl<C> PoolBuilder<C>`, the type-changing setter `pub fn on_build<N: OnBuild>(self, callback: N) -> PoolBuilder<N>` (carry `threads` across); and on `impl<C: OnBuild> PoolBuilder<C>`, `pub fn build(mut self) -> usize` that fires `self.callback.on_build(self.threads)` and returns the thread count.",
        solution: `pub trait OnBuild {
    fn on_build(&mut self, threads: usize);
}

impl OnBuild for () {
    fn on_build(&mut self, _threads: usize) {}
}

impl<F: FnMut(usize)> OnBuild for F {
    fn on_build(&mut self, threads: usize) {
        self(threads)
    }
}

pub struct PoolBuilder<C = ()> {
    threads: usize,
    callback: C,
}

impl PoolBuilder<()> {
    pub fn new(threads: usize) -> PoolBuilder<()> {
        PoolBuilder { threads, callback: () }
    }
}

impl<C> PoolBuilder<C> {
    pub fn on_build<N: OnBuild>(self, callback: N) -> PoolBuilder<N> {
        PoolBuilder { threads: self.threads, callback }
    }
}

impl<C: OnBuild> PoolBuilder<C> {
    pub fn build(mut self) -> usize {
        self.callback.on_build(self.threads);
        self.threads
    }
}`,
      },
    },
    {
      id: "write-serde-register",
      title: "Write: The serde Register",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Configure a wire shape declaratively. With `use serde::Serialize;`, derive `Serialize` on `pub struct PoolConfig` carrying `pub worker_threads: usize` and `pub thread_name: Option<String>`. Set the container attribute `#[serde(rename_all = "camelCase")]` and put `#[serde(skip_serializing_if = "Option::is_none")]` on `thread_name`. Then write `pub fn to_wire(config: &PoolConfig) -> String` returning `serde_json::to_string(config).unwrap()` — the camelCase wire names were baked into the generated impl at compile time.',
        solution: `use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PoolConfig {
    pub worker_threads: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thread_name: Option<String>,
}

pub fn to_wire(config: &PoolConfig) -> String {
    serde_json::to_string(config).unwrap()
}`,
      },
    },
  ],
  edges: [
    // Concept spine
    { from: "builder-ladder", to: "consuming-builder" },
    { from: "builder-ladder", to: "serde-register" },
    { from: "consuming-builder", to: "mutref-builder" },
    { from: "consuming-builder", to: "typed-builder" },
    { from: "consuming-builder", to: "serde-register" },
    { from: "consuming-builder", to: "builder-vocab" },
    { from: "typed-builder", to: "trace-slots" },
    { from: "typed-builder", to: "builder-vocab" },
    { from: "mutref-builder", to: "plain-struct-wins" },
    { from: "typed-builder", to: "plain-struct-wins" },
    { from: "serde-register", to: "plain-struct-wins" },
    { from: "builder-vocab", to: "plain-struct-wins" },
    // Drills
    { from: "consuming-builder", to: "write-consuming-builder" },
    { from: "consuming-builder", to: "builder-rebind-output" },
    { from: "mutref-builder", to: "tokio-mutref-why" },
    { from: "mutref-builder", to: "write-mutref-builder" },
    { from: "write-consuming-builder", to: "write-mutref-builder" },
    { from: "typed-builder", to: "typed-builder-cost" },
    { from: "typed-builder", to: "write-typed-builder" },
    { from: "write-consuming-builder", to: "write-typed-builder" },
    { from: "trace-slots", to: "unit-hook-why" },
    { from: "trace-slots", to: "write-policy-slot" },
    { from: "write-typed-builder", to: "write-policy-slot" },
    { from: "serde-register", to: "attr-register-why" },
    { from: "serde-register", to: "write-serde-register" },
    { from: "builder-ladder", to: "non-exhaustive-kill" },
    { from: "plain-struct-wins", to: "non-exhaustive-kill" },
  ],
};
