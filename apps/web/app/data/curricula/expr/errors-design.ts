import type { Curriculum } from "@mind-palace/curriculum";

import { thiserrorSource } from "./_sources";

// Errors & Diagnostics as Designed Surfaces — error TYPES as architecture and
// failure messages (runtime and compile-time) as first-class outputs: the
// dtolnay library/application split as a design value, thiserror's attribute
// DSL + convention ladder, anyhow's sentence-builder, serde's error grammar
// (vocabulary trait, Expected blanket, Impossible plug), iggy's numbered wire
// enum, and compile-time diagnostics curation. Propagation mechanics (?, From,
// Box<dyn Error>) are assumed from g-rust/g-std and never re-taught. thiserror
// drills are cargo-sandbox checked; std recreations and the behavioral chain
// walker are rustc-verified by scripts/verify-rust-cards.ts.
export const exprErrors: Curriculum = {
  id: "c-expr-errors",
  title: "Errors & Diagnostics as Designed Surfaces",
  source: thiserrorSource,
  nodes: [
    {
      id: "errors-map",
      title: "Errors Are a Designed Surface",
      content: {
        type: "read",
        markdown:
          "You already own the mechanics: `?`, `From`-powered conversion, and the hand-written `impl Error` were settled back in the Rust and std paths, and this curriculum never re-teaches them. The question here is different. When a crate's failures feel *good* — the message reads like a sentence, the compile error names the fix — ==someone designed that surface==. Error types are architecture, and failure messages are outputs co-equal with the happy path.\n\n## The dtolnay split\nThe ecosystem's error doctrine is encoded as two crates by one author, each recommending the other. ==thiserror is for libraries==: callers must be able to `match` on your failure, so errors are typed vocabulary under semver control. ==anyhow is for applications==: the caller is a human reading a terminal, so errors are narrative — one erased type with context sentences layered on. thiserror's docs close by pointing application code at anyhow; anyhow's open by pointing library code at thiserror.\n\n## The one-? boundary\nWhat makes the split composable is a pair of one-way bridges. A blanket `From<E: Error>` flows any library error *into* `anyhow::Error`, so a single `?` crosses the boundary silently. And `downcast_ref::<FetchError>()` plus `error.chain()` flow back *out* when an application layer must react to one specific library failure.\n\n## The surfaces ahead\nthiserror's attribute DSL and its convention ladder; anyhow's sentence-builder; serde's error *grammar* — a vocabulary trait, a visitor that is its own error message, and a type that cannot exist; iggy's numbered enum that IS a wire protocol; and the compile-time half — diagnostics you aim before the program ever runs.\n\n## The cost worth naming\nThe split is ==socially enforced, not compiler-enforced==. Nothing stops anyhow from leaking into a library's public API — it happens constantly, and anyhow's docs must specify downcast-through-context semantics precisely *because* people build on the erased type. Mid-size codebases sit awkwardly between the dialects. A doctrine, not a guarantee.",
      },
    },
    {
      id: "thiserror-display-dsl",
      title: "thiserror: Errors as Annotated Types",
      content: {
        type: "read",
        markdown:
          '## The shape\nA library\'s entire error module, with zero imperative code: an enum deriving `Error`, each variant annotated in place — `#[error("invalid header (expected {expected:?}, found {found:?})")]`. Positional fields interpolate as `{0}`, named fields as `{name}`, and each message sits ==on the variant it describes== — docs-as-code adjacency.\n\n## The machinery\n`#[derive(Error)]` expands in `thiserror-impl`. `impl/src/attr.rs` parses the attribute grammar; `impl/src/fmt.rs` then runs a ==hand-written scanner over your format string== — it walks the `{…}` groups, resolves `{0}` and `{expected}` against the variant\'s fields, and rewrites everything into a plain `write!`. No runtime formatting engine, no trait objects: the output is exactly the `Display` impl you would have written by hand.\n\n## Bounds you never wrote\nWhile scanning, thiserror reads the ==trailing format-spec character== and maps it to a trait: `?` means `Debug`, `x` means `LowerHex`, `o` means `Octal`, bare means `Display` (`impl/src/fmt.rs` L94). Each pair feeds `InferredBounds`, which emits a where-clause naming ==only the traits actually used==. `#[error("{0}; {1:?}")]` on a generic `Pair<A, B>` generates a `Display` impl bounded `A: Display, B: Debug` — minimal, accurate, and never written by you.\n\n## The design value: zero footprint\nFirst bullet of the docs: thiserror ==deliberately does not appear in your public API==. There is no `thiserror::Error` type to name in a signature, and switching between hand-written impls and the derive is not a breaking change. Contrast: `anyhow::Error` is a type you commit to. The constraint forecloses features — no context chains, no runtime helpers — and that foreclosure IS the design.\n\n## The trade-off\nBuys: the Display/Error/From boilerplate for a whole error taxonomy collapses to strings adjacent to their variants, with hand-quality output. Costs: a format-string sub-language ==three quoting levels deep== — a mini-language inside an attribute inside a derive — that rustc cannot syntax-check (thiserror reimplements format-spec parsing itself), plus inference so invisible that bound errors point at generated code.',
      },
    },
    {
      id: "convention-ladder",
      title: "Convention over Annotation",
      content: {
        type: "read",
        markdown:
          "thiserror's second act: the attributes mostly ==disappear==, replaced by conventions.\n\n## The detection ladder\nA documented contract in `thiserror/src/lib.rs`: a field ==named `source`== is wired up as `Error::source()` with NO attribute at all. A field ==of type `Backtrace`== is detected by its type name and captured. And `#[from]` on a field implies all three at once — a `From` impl, `#[source]`, and backtrace capture from inside the generated `From`. One token buys the whole wrap-a-lower-error taxonomy.\n\n## Transparent forwarding\n`#[error(transparent)]` forwards ==both `Display` and `source()` wholesale== to a single field. Its blessed use (docs L233–252): a public newtype over a ==private enum== — `pub struct StoreError(#[from] Repr)` — so a library can add, split, and rename failure cases forever without a semver break. The public type stays opaque; the taxonomy stays private.\n\n## The machinery under source()\nGenerated code never calls your field's `source()` directly — it routes through `.as_dyn_error()` on a ==sealed, doc(hidden) trait== (`thiserror/src/aserror.rs`, fifty lines): one blanket impl for `T: Error` plus one per trait-object marker combination (`dyn Error`, `+ Send`, `+ Send + Sync`, …), because trait objects don't implement `Error` themselves. Sealing freezes what machine-written code can resolve to — the derive's private ABI, closed by construction. `Option` sources get an auto-inserted `.as_ref()?`.\n\n## The trade-off\nBuys: the common taxonomy costs ==zero to one tokens per field==, and `transparent` gives semver-safe opacity. Costs: convention magic cuts both ways — ==rename `source` to `cause` and the causal chain silently vanishes== from every report; detecting `Backtrace` by type name is stringly typing at the meta level; and the `#[from]` restriction (no other fields besides source and backtrace) is a rule you learn from an error message.",
      },
    },
    {
      id: "anyhow-narrative",
      title: "anyhow: The Application Sentence-Builder",
      content: {
        type: "read",
        markdown:
          '## The shape\n`read(path).with_context(|| format!("failed to read {}", path.display()))?` — error handling that reads as ==annotation, not plumbing==. `?` stays the only control flow, and the report renders as the context line followed by a `Caused by:` chain. It works on `Option` too: `maybe.context("no active session")?`.\n\n## The machinery\n`Context<T, E>` is a ==sealed extension trait== (`anyhow/src/context.rs`) implemented for exactly two types: `Result` and `Option`. Each layer builds a `ContextError<C, E>` whose `Display` shows ==only the context== and whose `source()` returns the cause — that split is what makes the `Caused by:` chain render. Eager `.context(…)` versus lazy `.with_context(|| …)` decides when the message is built: the closure variant defers all allocation to the ==error path only==. Craft detail: the impls avoid `map_err` closures specifically to keep two junk frames out of captured backtraces.\n\n## Result<T>, one import\n`type Result<T, E = Error> = core::result::Result<T, E>` (`anyhow/src/lib.rs` L468) — a re-alias with a ==defaulted second parameter==. Application signatures shrink to `Result<T>`, yet `Result<T, OtherError>` still works through the same import, because it IS std\'s `Result`.\n\n## One word wide\n`anyhow::Error` is deliberate type erasure with unusual engineering: instead of a fat two-word `Box<dyn Error>` pointer, the vtable lives ==inside the allocation==, so the handle is one word. Downcast-through-context is specified by contract — `downcast_ref::<E>()` succeeds no matter how many context layers wrap the original — and `chain()` exposes the causes as a std iterator. The erasure bill: a page of `unsafe` with hand-maintained vtable invariants, a required allocation, and a type that says nothing about what failed.\n\n## The trade-off\nBuys: narrative reports assembled at the failure site, cheap enough to sprinkle everywhere, plus `Option → Result` unification. Costs: contexts are ==Display blobs, not structured data== — no i18n, no programmatic field access; every layer allocates on the error path; and sealing means your own result-like types can never grow `.context(…)`.',
      },
    },
    {
      id: "serde-vocabulary",
      title: "serde: A Grammar for Failure",
      content: {
        type: "read",
        markdown:
          'serde faces a problem neither thiserror nor anyhow has: ==generic code must construct rich errors without knowing the error type==. A `Deserialize` impl runs inside serde_json, postcard, and a hundred other formats — each owning its own error representation.\n\n## The vocabulary trait\nEvery format threads its error through the signatures as an associated type (`Deserializer::Error: de::Error`), and the `de::Error` trait (`serde_core/src/de/mod.rs` L165) is a ==vocabulary==: one required constructor, `custom`, plus seven provided ==sentence-constructors== — `invalid_type`, `invalid_value`, `invalid_length`, `unknown_variant`, `unknown_field`, `missing_field`, `duplicate_field` — each rendering a standard grammatical sentence (an internal `OneOf` adapter renders the "expected one of" list). Derived code speaks the vocabulary; formats override any constructor to attach line and column.\n\n## The visitor IS the error message\nThe strangest shape in the system: `Error::invalid_type(Unexpected::Str(s), &self)` — passing ==`&self` as the "expected …" clause==. The machinery: the `Expected` trait has a single `fmt` method, and a ==blanket impl covers every `Visitor`== by forwarding to the `expecting()` method every visitor was already forced to write (`de/mod.rs` L484). A second impl on `&str` rides the same parameter slot for ad-hoc messages. One mandatory method, reused as the second half of every mismatch error in the ecosystem: `invalid type: string "abc", expected a duration in seconds`.\n\n## The plug that cannot exist\nSerializer authors must ==name== every associated type — even for functionality their format doesn\'t support. `Impossible<Ok, Error>` (`serde_core/src/ser/impossible.rs`) is the canonical plug: it contains a field of `enum Void {}` — ==uninhabited by construction== — and implements every `Serialize*` sub-trait with bodies of `match self.void {}`, the empty match that type-checks to any return type because the code is provably unreachable. Declaring `type SerializeSeq = Impossible<(), Error>` states "this format has no sequences" as a ==type-level fact==: no panics, no `unreachable!()` lies, zero code size for the dead protocol.\n\n## The trade-off\nBuys: uniformly grammatical errors across every format, rich mismatch messages for free at every error site, unsupportedness encoded in types. Costs: error data is ==stringly at the trait boundary== — a format cannot structurally recover "which field" from a `custom` message — and both tricks read like typos until explained: `&self` as a message, a builder that cannot exist.',
      },
    },
    {
      id: "wire-contract",
      title: "iggy: The Enum IS the Protocol",
      content: {
        type: "read",
        markdown:
          "Apache iggy's message-streaming server speaks TCP, QUIC, and HTTP to SDKs in half a dozen languages. Its error architecture answers a question thiserror never asks: what if the error type must be ==stable on the wire==?\n\n## The numbered enum\n`IggyError` (`core/common/src/error/iggy_error.rs`) is a ~300-variant enum with `#[repr(u32)]` and ==explicit discriminants== — `StreamIdNotFound(Identifier) = 1009`. The server responds with `err.as_code()`; clients rebuild the variant with `IggyError::from_code(status)`. The code space is ==range-partitioned by subsystem== — 1000s streams, 2000s topics, 5000s consumer groups — so the number itself is documentation. The derive stack: thiserror for `Display`, strum's `EnumDiscriminants` + `FromRepr` for code round-trips, `IntoStaticStr` with `snake_case` for stable log names. `PartialEq` compares ==by code only==, and the discipline is append-only: renumbering is forbidden, forever.\n\n## One error, three faces\nEach transport writes only its ==projection== of the canonical enum. TCP sends the u32. Logs print the snake_case name. HTTP maps variant families to status codes — `impl IntoResponse for CustomError` (`core/server/src/http/error.rs`) sends the `*NotFound` family to 404 and auth failures to 401/403, with a JSON body carrying a per-variant `field` hint — and a deliberate `_ =>` default means ==new errors degrade safely== to 400 instead of breaking the match.\n\n## The firewall and the algebra\nTwo more layers complete the system. The protocol crate returns its own small `WireError`, and its doc comment states the policy: ==intentionally decoupled from IggyError, to keep the protocol crate free of domain dependencies== — conversion happens at the boundary, and `Cow<'static, str>` keeps static messages allocation-free. Internal server errors go the other way entirely: the `error_set!` macro declares errors as ==set algebra== — `ServerError := NumaError || ConfigError || …` — generating the union enums plus the whole `From` lattice between subsets and supersets. The contrast is the lesson: ==wire errors optimize for serialization stability; internal errors optimize for composition==.\n\n## The trade-off\nBuys: cross-language stable status codes, greppable by number, O(1) round-trips. Costs: a monolithic enum every subsystem depends on, an append-only discipline enforced by review rather than the compiler, and per-transport projections that can drift as variants are added.",
      },
    },
    {
      id: "diagnostics-surface",
      title: "Compile-Time Failure Is UX Too",
      content: {
        type: "read",
        markdown:
          "The other half of an error surface fires ==before the program runs==: what the compiler says when someone misuses your API is a designed output too.\n\n## Steering the compiler's guess\nWhen a user forgets a derive, serde doesn't settle for a bare trait-bound error. `#[diagnostic::on_unimplemented(message = …, note = …)]` on the trait definition (`serde_core/src/ser/mod.rs` L224) makes rustc add: ==consider adding `#[derive(serde::Serialize)]`== plus a note about crate feature flags — the single most common serde failure self-diagnoses with its exact fix. A detail worth savoring: the message deliberately says `serde::Serialize`, papering over the internal serde_core crate split — ==the facade is preserved even in diagnostics==. The companion `#[diagnostic::do_not_recommend]` marks private helper impls so rustc never suggests internal machinery in its \"following implementations were found\" list.\n\n## Aiming the blame — recall\nYou built both of these tools in the macros curriculum; here they slot in as the compile-time half of error design. `quote_spanned!` generates a ==deliberately failing assertion spanned at the user's tokens== — the compiler writes the message, you only aim it. And `syn::Error::new_spanned` + `combine` + `to_compile_error()` treats diagnostics as ==values that accumulate== — every bad attribute reported in one compile, each underlining its own tokens. serde_derive's write-once accumulator cells (`internals/attr.rs`) are that doctrine at scale: never fail fast, never lose a span.\n\n## Fail without falling over\nthiserror adds containment: `try_expand(input).unwrap_or_else(|e| fallback::expand(input, e))` (`impl/src/expand.rs` L12). On a typo'd attribute it emits the error ==plus a best-effort Error impl skeleton==, so downstream code that bounds on your error type doesn't erupt in fifty secondary \"doesn't implement Error\" cascades. One error, at the typo, and the IDE stays calm mid-edit.\n\n## The rest of the kit\nSame value, other tools: axum marks every fallible-by-contract builder method `#[track_caller]`, so a duplicate route panics ==pointing at YOUR line== with a curated message; anyhow's `ensure!` parses your boolean through a 935-line tt-muncher so failures print operand values — assert_eq!-grade output from an arbitrary expression.\n\n## The trade-off\nBuys: recovered learnability at ==zero runtime cost== — the failure modes users actually hit come with authored guidance. Costs: messages rot (no CI asserts on them), curation only tunes the compiler's guess-path — it cannot close a real inferential gap — and every curated diagnostic is a second implementation that can drift from the first.",
      },
    },
    {
      id: "split-values-mcq",
      title: "Two crates, one doctrine",
      content: {
        type: "multiple-choice",
        question:
          "thiserror and anyhow are written by the same author, and each crate's docs recommend the other. Judged as API design: why ship TWO error crates instead of one?",
        options: [
          "anyhow predates std's Error trait; thiserror is its modern replacement, kept separate only for backward compatibility",
          "Compile time: derive macros are too expensive to justify in application crates, so anyhow avoids them",
          "The requirements differ in kind: libraries need typed, matchable errors under semver control; applications need cheap human-readable context — each side gets a locally optimal dialect, bridged by one `?`",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "format-bounds-mcq",
      title: "Bounds you never wrote",
      content: {
        type: "multiple-choice",
        question:
          "thiserror generates the `Display` impl for this generic error. What bound does it infer for `T`?",
        language: "rust",
        code: `use thiserror::Error;

#[derive(Error, Debug)]
#[error("device answered with code {0:x}")]
pub struct DeviceCode<T>(pub T);

pub fn demo() -> DeviceCode<u32> {
    DeviceCode(0x2a)
}`,
        options: [
          "`T: std::fmt::LowerHex` — the trailing `x` in the format spec maps to exactly the trait it uses",
          "`T: std::fmt::Display + std::fmt::Debug` — the derive always requires both, to be safe",
          "None — the impl is unconditional, and formatting fails at runtime if `T` has no hex representation",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "source-rename-mcq",
      title: "The rename trap",
      content: {
        type: "multiple-choice",
        question:
          "A thiserror struct carries its underlying error in a field named `source`, wired with no attribute — detection is by name. During a refactor someone renames the field to `cause` and touches nothing else. What happens?",
        options: [
          "Compile error: the derive requires either a `source` field or an explicit `#[source]` attribute",
          "It compiles cleanly — but `Error::source()` now returns `None`, and the causal chain silently disappears from every error report",
          "Nothing changes: thiserror also detects source fields by their type",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "context-report-output",
      title: "Render the chain",
      content: {
        type: "multiple-choice",
        question:
          "This is anyhow's `ContextError` split hand-rolled in std — `Display` shows only the context, `source()` exposes the cause, and main walks the chain like a report renderer. What does this program print?",
        language: "rust",
        code: `use std::error::Error;
use std::fmt;

#[derive(Debug)]
struct Leaf(&'static str);

impl fmt::Display for Leaf {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.0)
    }
}

impl Error for Leaf {}

#[derive(Debug)]
struct WithContext {
    context: &'static str,
    cause: Leaf,
}

impl fmt::Display for WithContext {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.context)
    }
}

impl Error for WithContext {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        Some(&self.cause)
    }
}

fn main() {
    let err = WithContext {
        context: "failed to load config",
        cause: Leaf("invalid number at line 3"),
    };
    println!("{err}");
    let mut link = err.source();
    while let Some(cause) = link {
        println!("Caused by: {cause}");
        link = cause.source();
    }
}`,
        options: [
          "failed to load config: invalid number at line 3",
          "invalid number at line 3\nCaused by: failed to load config",
          "failed to load config\nCaused by: invalid number at line 3",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "impossible-void-mcq",
      title: "Impossible vs unreachable!()",
      content: {
        type: "multiple-choice",
        question:
          "serde's `Impossible` fills required associated types for unsupported functionality. Every method body is the empty match shown here. Why is this preferred over `unreachable!()`?",
        language: "rust",
        code: `pub enum Void {}

pub struct Impossible {
    void: Void,
}

impl Impossible {
    pub fn end(self) -> Result<(), String> {
        match self.void {}
    }
}`,
        options: [
          "`match self.void {}` is a compile-time proof: no `Void` value can ever exist, so the method is dead by construction and compiles to nothing — `unreachable!()` is a runtime claim that panics if it turns out false",
          "`unreachable!()` was deprecated in the 2021 edition in favor of empty matches",
          "The empty match is faster: `unreachable!()` inserts a branch the optimizer cannot remove",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "wire-renumber-mcq",
      title: "One enum, three hundred variants",
      content: {
        type: "multiple-choice",
        question:
          "iggy's `IggyError` is a single ~300-variant `#[repr(u32)]` enum with explicit discriminants (`StreamIdNotFound(Identifier) = 1009`), range-partitioned by subsystem and append-only — renumbering is forbidden. What is that discipline protecting?",
        options: [
          "Enum layout: reordering variants would change the enum's size and break `transmute`-based decoding",
          "The discriminant IS the wire contract: SDKs in other languages match on the same u32 codes, so renumbering silently breaks every deployed client while still compiling everywhere",
          "Exhaustiveness checking: match arms must stay in discriminant order for the compiler to prove coverage",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "write-thiserror-surface",
      title: "Write: a semver-safe error surface",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Author a library error surface with thiserror. Start with `use std::io;` and `use thiserror::Error;`. Define a private `#[derive(Error, Debug)] enum Repr` with two variants: `#[error("key `{key}` is not present")] Missing { key: String }` and `#[error("store io failed")] Io(#[from] io::Error)`. Add the public face — `#[derive(Error, Debug)] #[error(transparent)] pub struct StoreError(#[from] Repr);` — the blessed newtype-over-private-enum idiom. Finish with `pub fn missing(key: &str) -> StoreError` building `Repr::Missing` (via `key.to_string()`) and converting with `.into()`.',
        solution: `use std::io;
use thiserror::Error;

#[derive(Error, Debug)]
enum Repr {
    #[error("key \`{key}\` is not present")]
    Missing { key: String },
    #[error("store io failed")]
    Io(#[from] io::Error),
}

#[derive(Error, Debug)]
#[error(transparent)]
pub struct StoreError(#[from] Repr);

pub fn missing(key: &str) -> StoreError {
    Repr::Missing { key: key.to_string() }.into()
}`,
      },
    },
    {
      id: "write-context-ext",
      title: "Write: context chaining",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Hand-roll anyhow's context machinery in std. Start with `use std::error::Error;` and `use std::fmt;`. Define `pub struct ContextError<E> { context: &'static str, cause: E }` deriving Debug. Implement `fmt::Display` for it (for any `E`) writing just `self.context` via `f.write_str`. Implement `Error` for it where `E: Error + 'static`, with `source()` returning `Some(&self.cause)`. Finish with the extension trait `pub trait Context<T, E> { fn context(self, context: &'static str) -> Result<T, ContextError<E>>; }` implemented for `Result<T, E>` where `E: Error + 'static`, wrapping the error with `map_err`.",
        solution: `use std::error::Error;
use std::fmt;

#[derive(Debug)]
pub struct ContextError<E> {
    context: &'static str,
    cause: E,
}

impl<E> fmt::Display for ContextError<E> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.context)
    }
}

impl<E: Error + 'static> Error for ContextError<E> {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        Some(&self.cause)
    }
}

pub trait Context<T, E> {
    fn context(self, context: &'static str) -> Result<T, ContextError<E>>;
}

impl<T, E: Error + 'static> Context<T, E> for Result<T, E> {
    fn context(self, context: &'static str) -> Result<T, ContextError<E>> {
        self.map_err(|cause| ContextError { context, cause })
    }
}`,
      },
    },
    {
      id: "write-expected-blanket",
      title: "Write: the Expected blanket",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Recreate serde's Expected trick in std. Start with `use std::fmt;`. Define `pub trait Visitor { fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result; }` and `pub trait Expected { fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result; }`. Add the blanket `impl<T: Visitor> Expected for T` forwarding to `expecting`, an `impl Expected for &str` using `f.write_str(self)`, and `impl fmt::Display for dyn Expected + '_` forwarding to `Expected::fmt(self, f)`. Finish with `pub fn invalid_type(unexpected: &str, expected: &dyn Expected) -> String` returning `format!(\"invalid type: {unexpected}, expected {expected}\")`.",
        solution: `use std::fmt;

pub trait Visitor {
    fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result;
}

pub trait Expected {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result;
}

impl<T: Visitor> Expected for T {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.expecting(f)
    }
}

impl Expected for &str {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self)
    }
}

impl fmt::Display for dyn Expected + '_ {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        Expected::fmt(self, f)
    }
}

pub fn invalid_type(unexpected: &str, expected: &dyn Expected) -> String {
    format!("invalid type: {unexpected}, expected {expected}")
}`,
      },
    },
    {
      id: "write-impossible",
      title: "Write: Impossible",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Build serde's uninhabited plug in std. Define `pub enum Void {}` and `pub struct Impossible { void: Void }`. Define a mini protocol trait `pub trait SerializeSeq { fn serialize_element(&mut self, value: &str) -> Result<(), String>; fn end(self) -> Result<(), String>; }` where `end` takes `self` by value. Implement it for `Impossible` with both bodies as the empty match `match self.void {}` (prefix the unused parameter with `_`).",
        solution: `pub enum Void {}

pub struct Impossible {
    void: Void,
}

pub trait SerializeSeq {
    fn serialize_element(&mut self, value: &str) -> Result<(), String>;
    fn end(self) -> Result<(), String>;
}

impl SerializeSeq for Impossible {
    fn serialize_element(&mut self, _value: &str) -> Result<(), String> {
        match self.void {}
    }

    fn end(self) -> Result<(), String> {
        match self.void {}
    }
}`,
      },
    },
    {
      id: "write-wire-codes",
      title: "Write: wire error codes",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Recreate iggy's numbered wire contract for three errors. Define `#[repr(u32)] #[derive(Debug, Clone, Copy, PartialEq, Eq)] pub enum WireError` with explicit discriminants: `StreamIdNotFound = 1009`, `TopicIdNotFound = 2010`, `InvalidConsumerGroupName = 5005`. Implement `pub fn as_code(self) -> u32` casting with `self as u32`, and `pub fn from_code(code: u32) -> Option<Self>` matching each code back to its variant (unknown codes return `None`).",
        solution: `#[repr(u32)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WireError {
    StreamIdNotFound = 1009,
    TopicIdNotFound = 2010,
    InvalidConsumerGroupName = 5005,
}

impl WireError {
    pub fn as_code(self) -> u32 {
        self as u32
    }

    pub fn from_code(code: u32) -> Option<Self> {
        match code {
            1009 => Some(Self::StreamIdNotFound),
            2010 => Some(Self::TopicIdNotFound),
            5005 => Some(Self::InvalidConsumerGroupName),
            _ => None,
        }
    }
}`,
      },
    },
  ],
  edges: [
    // Doctrine spine
    { from: "errors-map", to: "thiserror-display-dsl" },
    { from: "errors-map", to: "anyhow-narrative" },
    { from: "errors-map", to: "serde-vocabulary" },
    { from: "thiserror-display-dsl", to: "convention-ladder" },
    { from: "thiserror-display-dsl", to: "wire-contract" },
    { from: "thiserror-display-dsl", to: "diagnostics-surface" },
    { from: "serde-vocabulary", to: "diagnostics-surface" },
    // The split verdict needs both dialects
    { from: "thiserror-display-dsl", to: "split-values-mcq" },
    { from: "anyhow-narrative", to: "split-values-mcq" },
    // thiserror drills
    { from: "thiserror-display-dsl", to: "format-bounds-mcq" },
    { from: "convention-ladder", to: "source-rename-mcq" },
    { from: "thiserror-display-dsl", to: "write-thiserror-surface" },
    { from: "convention-ladder", to: "write-thiserror-surface" },
    // anyhow drills
    { from: "anyhow-narrative", to: "context-report-output" },
    { from: "anyhow-narrative", to: "write-context-ext" },
    { from: "context-report-output", to: "write-context-ext" },
    // serde drills
    { from: "serde-vocabulary", to: "write-expected-blanket" },
    { from: "serde-vocabulary", to: "impossible-void-mcq" },
    { from: "serde-vocabulary", to: "write-impossible" },
    { from: "impossible-void-mcq", to: "write-impossible" },
    // iggy drills
    { from: "wire-contract", to: "wire-renumber-mcq" },
    { from: "wire-contract", to: "write-wire-codes" },
  ],
};
