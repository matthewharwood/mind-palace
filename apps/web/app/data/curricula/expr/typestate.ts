import type { Curriculum } from "@mind-palace/curriculum";

import { ioUringSource } from "./_sources";

// Typestate, Sealing & Compile-Checked Boundaries — "people MUST use it that
// way": protocols as types (consuming self, phantom states), tokio-uring's
// built ≠ submitted ≠ complete flagship, sealed traits & sealed argument
// polymorphism, unsafe marker-trait capabilities, newtype walls, witnesses,
// privacy-as-grammar and the typestate builder. All drills are pure std
// (io-uring is linux-only — its shapes are recreated); rustc-verified by
// scripts/verify-rust-cards.ts. Trade-off spine: compile-time guarantees vs
// unnameable types and error-message quality.
export const exprTypestate: Curriculum = {
  id: "c-expr-typestate",
  title: "Typestate, Sealing & Compile-Checked Boundaries",
  source: ioUringSource,
  nodes: [
    {
      id: "ts-illegal-states",
      title: "Make Illegal Sequences Unrepresentable",
      content: {
        type: "read",
        markdown:
          'Some APIs document their protocol; the APIs in this curriculum ==refuse to compile when the protocol is broken==. Three call-sites set the scene:\n\n- `pin.into_push_pull_output()` — an embedded HAL reconfigures a GPIO pin by changing its TYPE. Writing to a pin still configured as input is not a runtime panic; the write method simply does not exist on the type you hold.\n- `file.write_at(buf, 0).submit().await` — tokio-uring splits one I/O operation into built, submitted, and complete: one type per phase. Forget `.submit()` and you are holding a value that is not even a future.\n- `Config::builder().host("a").port(80).build()` — a typed builder where `.build()` with a required field missing is a missing method, not a runtime `panic!("host not set")`.\n\n## The design move\nEvery API has a protocol — call this before that, set this before building, never touch it after close. The default is to write the protocol in docs and check it at runtime. The move this curriculum teaches: ==encode the protocol state in the type system== so the wrong sequence is not an error you catch but a program that cannot be written. "Make illegal states unrepresentable" is the slogan; the sharper version here is illegal SEQUENCES.\n\n## The toolkit ahead\n- **Typestate** — consuming `self`, returning a different type: a state machine made of types\n- **PhantomData** — naming states that never exist at runtime\n- **Sealed traits** — closed worlds users can call into but never extend\n- **`unsafe` marker traits** — proof obligations pinned to the implementor\n- **Newtype walls** — parse once at the boundary, infallible ever after\n- **Witnesses and privacy** — values that ARE proofs, constructors kept out of reach\n- **The typestate builder** — required fields checked at compile time\n\n## The bill, up front\nEvery guarantee here is bought with type-surface area: more names, docs fragmented across states, error messages that speak in `PhantomData` and missing methods instead of plain English. Each lesson prices its guarantee honestly, and the final card asks when NOT to pay. You already own generics, traits, and move semantics from earlier paths — nothing below re-teaches them; nearly every mechanism leans on a move doing the enforcement.',
      },
    },
    {
      id: "ts-protocol-machinery",
      title: "Typestate: Consuming self, New Type",
      content: {
        type: "read",
        markdown:
          'Cliff Biffle\'s canonical example (cliffle.com, "The Typestate Pattern in Rust"): `r.status_line(200, "OK").header("X-Foo", "bar").body("Hello!")`. Call `.header(...)` before `.status_line(...)` and the program does not compile — not because a check fired, but because ==the method does not exist on the type you are holding==.\n\n## Machinery\nEach transition method takes `self` by value and returns a DIFFERENT type: `fn status_line(self, ...) -> HttpResponse<Headers>`. The move does the enforcement — after the call the old binding is moved-from, so touching the stale state is a borrow-check error, and the new state\'s impl block simply lacks the methods that are no longer legal. Biffle catalogs three layouts:\n\n- **One struct per state** — `Start`, `Headers` as separate nominal types. Each state carries exactly the fields it needs, which eliminates unnecessary `Option` wrappers and any access to not-yet-initialized data.\n- **One generic struct + a phantom state parameter** — `HttpResponse<S>`; the next lesson\'s machinery.\n- **A hybrid** — a generic struct whose concrete state types carry state-specific fields.\n\n## Zero cost, proven\nThe Embedded Rust Book\'s `GpioConfig<Enabled, Input, HighZ>` is the load-bearing citation: state types erase at monomorphization, and a fully compile-checked pin reconfiguration boils down to roughly ==a single assembly instruction==. The guarantee costs nothing at runtime.\n\n## The same shape in the wild\n- **axum**: `Router<S>` is a typestate. `.with_state(db)` transforms `Router<AppState>` into `Router<()>`, and ==only `Router<()>` can be served== — forgetting to provide state is a type error at the `serve` call, not a 3 a.m. panic (axum `routing/mod.rs`).\n- **serde**: `let mut m = ser.serialize_map(len)?; m.serialize_entry(k, v)?; m.end()` — begin consumes the serializer, `end(self)` consumes the map state. A begin → step → end session protocol, enforced entirely by ownership (`serde_core/src/ser/mod.rs`).\n\n## Trade-off\nWhole misuse classes — write-after-close, use-before-init, header-after-body — become unrepresentable at zero runtime cost. In exchange: a state change inside a loop needs rebinding (`let r = r.step();`), branching into two possible next states needs an enum-of-states escape hatch, rustdoc fragments into one impl block per state, and a protocol violation reads as "no method named `header` found" — precise, but only self-explanatory once you know the pattern.',
      },
    },
    {
      id: "ts-consuming-mcq",
      title: "Why the Receiver Must Be self",
      content: {
        type: "multiple-choice",
        question:
          'Every typestate transition takes `self` by value and returns the next state\'s type. A colleague proposes `&mut self` setters mutating an internal state enum instead — "same protocol, fewer moves." What guarantee dies?',
        options: [
          "None — the two designs are equivalent; by-value receivers are a style preference",
          "Performance — `&mut self` forces a heap allocation on every transition",
          "The compile-time protocol itself: with `&mut self` the binding keeps its old type forever, so calling a stale-state method stays well-typed and the wrong-order check moves to runtime",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "ts-protocol-code",
      title: "Build: A Compile-Checked Protocol",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Build cliffle\'s response protocol as compile-checked phases. Define `pub struct Start;` and `pub struct Headers` holding a private `out: String`. Implement `Start::status_line(self, code: u16, reason: &str) -> Headers` seeding `out` with `format!("{code} {reason}")`; `Headers::header(mut self, name: &str, value: &str) -> Headers` appending `format!(" | {name}: {value}")` via `push_str` and returning `self`; and `Headers::body(self, text: &str) -> String` returning `format!("{} | {text}", self.out)`. Calling `.header(...)` before `.status_line(...)` must be a missing-method error — the protocol lives in the types.',
        solution: `pub struct Start;

pub struct Headers {
    out: String,
}

impl Start {
    pub fn status_line(self, code: u16, reason: &str) -> Headers {
        Headers { out: format!("{code} {reason}") }
    }
}

impl Headers {
    pub fn header(mut self, name: &str, value: &str) -> Headers {
        self.out.push_str(&format!(" | {name}: {value}"));
        self
    }

    pub fn body(self, text: &str) -> String {
        format!("{} | {text}", self.out)
    }
}`,
      },
    },
    {
      id: "ts-phantom-roles",
      title: "PhantomData: States Without Storage",
      content: {
        type: "read",
        markdown:
          '`GpioConfig<Enabled, Input, HighZ>` names a pin\'s entire configuration in its type. tokio-uring\'s `Op<T, CqeType>` picks how completions behave with a parameter that stores nothing. The machinery for both: ==types that exist only at compile time==.\n\n## Zero-variant enums: pure names\n`pub enum Locked {}` has no variants, so no value of it can EVER exist. That is exactly what a state name should be — a type-level symbol with no runtime life. Constructing one is impossible; mentioning one is free.\n\n## PhantomData: the "I use it" claim\nWrite `struct Door<S> { marker: PhantomData<S> }`. Rust rejects a generic parameter that appears in no field (error E0392) because an unused parameter has no variance or drop story to reason about. `PhantomData<S>` is the zero-sized answer: it declares "this type logically uses an `S`" without storing one. After monomorphization, `Door<Locked>` and `Door<Unlocked>` are distinct types with identical layout — the marker vanishes.\n\n## The phantom parameter as dispatch\nThe parameter need not be inert decoration. In tokio-uring, `Op<T, CqeType = SingleCQE>` uses the phantom `CqeType` to ==select which `Future` impl applies== — single-shot and multi-shot completions poll differently, on the same struct, chosen by a type that is never constructed (`runtime/driver/op/mod.rs`). io-uring\'s `IoUring<Entry, Entry128>` plays the wire-format version of the trick: marker types for submission- and completion-entry width, each carrying an associated const that feeds ring-setup flags (`squeue.rs`).\n\n## Trade-off\nPhantom states keep one struct definition shared across every state — contrast the one-struct-per-state layout, where each state owns its fields but nothing is shared. The costs are legibility taxes: rustdoc scatters `impl Door<Locked>` blocks by state, and misuse arrives as "no method named `unlock` found for `Door<Unlocked>`" — accurate, and only readable when the state names read like documentation. Name states `Unsubmitted`, not `S1`.',
      },
    },
    {
      id: "ts-phantom-code",
      title: "Build: A Phantom-Typed State Machine",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Build a phantom-typed state machine. Define zero-variant states `pub enum Locked {}` and `pub enum Unlocked {}`, then `pub struct Door<S>` holding `marker: PhantomData<S>` (import `std::marker::PhantomData`). On `impl Door<Locked>`, write `pub fn new() -> Door<Locked>` and the transition `pub fn unlock(self) -> Door<Unlocked>`; on `impl Door<Unlocked>`, write `pub fn lock(self) -> Door<Locked>`. Each method builds the next state with a fresh `PhantomData` — the states never exist at runtime.",
        solution: `use std::marker::PhantomData;

pub enum Locked {}
pub enum Unlocked {}

pub struct Door<S> {
    marker: PhantomData<S>,
}

impl Door<Locked> {
    pub fn new() -> Door<Locked> {
        Door { marker: PhantomData }
    }

    pub fn unlock(self) -> Door<Unlocked> {
        Door { marker: PhantomData }
    }
}

impl Door<Unlocked> {
    pub fn lock(self) -> Door<Locked> {
        Door { marker: PhantomData }
    }
}`,
      },
    },
    {
      id: "ts-unsubmitted",
      title: "Built ≠ Submitted ≠ Complete",
      content: {
        type: "read",
        markdown:
          "tokio-uring's write is a sentence with an unusual verb: `let (res, buf) = file.write_at(buf, 0).submit().await;`. The surprise sits in `fs/file.rs`: `write_at` is ==not an async fn==. Its signature is `pub fn write_at<T: BoundedBuf>(&self, buf: T, pos: u64) -> UnsubmittedWrite<T>` — it returns a value describing an operation that has not happened yet.\n\n## Three phases, three types\n- **Built** — `UnsubmittedWrite<T>`: an inert description. You can hold it, collect several in a `Vec`, attach link flags.\n- **Submitted** — `.submit()` consumes it and returns `InFlightOneshot`, the actual `Future`. The kernel now owns the operation.\n- **Complete** — awaiting yields `(res, buf)`: result and buffer handed back, exactly once.\n\n## The machinery\nIn `runtime/driver/op/mod.rs`, `UnsubmittedOneshot<D, T>` holds three fields: `stable_data: D` — the buffer and file handle, owned so their addresses survive the wait; `post_op: T` — an `OneshotOutputTransform` that maps the raw completion entry into the typed output; and `sqe` — the prepared submission-queue entry, inert until pushed. `submit(self)` is the consuming typestate transition. The transform's `transform_oneshot_output(self, data, cqe)` fires exactly once because it takes everything by value. `UnsubmittedWrite<T>` is only an alias: `pub type UnsubmittedWrite<T> = UnsubmittedOneshot<WriteData<T>, WriteTransform<T>>` (`io/write.rs`). All three types are ==public== — downstream users can define brand-new ops without touching the crate.\n\n## Why the seam exists\nAn `async fn` is lazy until polled — a fact that surprises people. `UnsubmittedWrite` is ==lazy until submitted, and says so in its name==. Better: the gap between build and submit is a place to STAND. Build ten ops, push them into the submission queue together, enter the kernel once — batching is the entire economic argument for io_uring, and the typestate gives it a type-level home. (Why `buf` moves in and comes back out is the Ownership curriculum's story; here we care about the phase types.)\n\n## Trade-off\nBuys: an explicit batching seam, honest laziness, user extensibility. Costs: `.submit().await` noise on every call-site; a name for every phase (`UnsubmittedWrite`, `InFlightOneshot`, `WriteTransform` — the type count triples); and tokio-uring ships this newer architecture alongside its older sealed `Completable` one, so readers meet two op systems in one crate. Typestate multiplies vocabulary, and vocabulary is cognitive load.",
      },
    },
    {
      id: "ts-batching-mcq",
      title: "Why write_at Isn't an async fn",
      content: {
        type: "multiple-choice",
        question:
          "tokio-uring's `write_at` returns `UnsubmittedWrite<T>` instead of being an `async fn`, so every call-site pays an extra `.submit()`. Which documented benefit justifies the noise?",
        options: [
          "The unsubmitted op is a real value: callers can build several, link them with flags, and push them into the ring together — batching before entering the kernel, which is io_uring's whole economy",
          "It lets `write_at` avoid taking ownership of the buffer",
          "Futures returned by async fns cannot carry generic parameters, so a named type was required",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "ts-unsubmitted-code",
      title: "Build: The Unsubmitted Op in std",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Recreate tokio-uring's unsubmitted typestate in pure std. Define `pub struct Unsubmitted` and `pub struct InFlight`, each holding a private `buf: Vec<u8>`. Implement `Unsubmitted::new(buf: Vec<u8>) -> Unsubmitted`, the consuming transition `pub fn submit(self) -> InFlight`, and `InFlight::complete(self, result: i32) -> (Result<u32, i32>, Vec<u8>)` returning `(Err(result), self.buf)` when `result` is negative, else `(Ok(result as u32), self.buf)` — the buffer leaves exactly once, by move.",
        solution: `pub struct Unsubmitted {
    buf: Vec<u8>,
}

pub struct InFlight {
    buf: Vec<u8>,
}

impl Unsubmitted {
    pub fn new(buf: Vec<u8>) -> Unsubmitted {
        Unsubmitted { buf }
    }

    pub fn submit(self) -> InFlight {
        InFlight { buf: self.buf }
    }
}

impl InFlight {
    pub fn complete(self, result: i32) -> (Result<u32, i32>, Vec<u8>) {
        if result < 0 {
            (Err(result), self.buf)
        } else {
            (Ok(result as u32), self.buf)
        }
    }
}`,
      },
    },
    {
      id: "ts-sealed-kit",
      title: "Sealed Traits: Closing the World",
      content: {
        type: "read",
        markdown:
          'From downstream, a sealed trait is a one-way mirror: `fn takes<T: EntryMarker>(t: T)` works, bounding works, calling works — but `impl EntryMarker for MyEntry` dies with an error naming a module you cannot reach.\n\n## The core trick (API Guidelines C-SEALED)\nOne line plus one module: `pub trait TheTrait: private::Sealed {}` and `mod private { pub trait Sealed {} impl Sealed for usize {} }`. The supertrait is `pub`, but it lives in a private module — downstream crates ==cannot name it, so they cannot implement it==, so no new type can ever satisfy the bound. The guideline states the payoff plainly: the crate is free to add methods to the trait in a non-breaking release.\n\n## The kit at scale\nSealing is the visibility system used as grammar, and a whole stability practice is built on it:\n\n- **io-uring** seals `EntryMarker` — exactly two submission-entry widths exist (`Entry`, `Entry128`), ever, and ring construction trusts that closed world (`squeue.rs`).\n- **syn** seals its `Token` types; **tower** seals `MakeService` as a ==trait alias== — one blanket impl is the only impl, so the trait means precisely "a `Service` that makes `Service`s" and nothing else can claim the name.\n- **thiserror** seals `AsDynError`, the trait its derive expands through — the macro\'s ABI is not your API.\n- **serde\'s** `__private` modules go further: version-stamped internal names mean even a crate that reaches in cannot survive a patch release. ==A decade of serde 1.x== rests on this discipline.\n\n## Trade-off\nBuys: every accidental extension point is closed, so adding a method, a supertrait, or an associated item is a MINOR version — sealing is why these crates stayed 1.x for years. Costs: a genuinely closed world — the downstream user with a legitimate new case is told no, and the denial is famously cryptic ("the trait bound `MyType: private::Sealed` is not satisfied", pointing at a path rustdoc barely shows). Seal what you must evolve; leave open what you want an ecosystem around.',
      },
    },
    {
      id: "ts-sealed-arg",
      title: "A Closed Sum in an Open Slot",
      content: {
        type: "read",
        markdown:
          "io-uring opcodes accept file descriptors from two universes: a plain OS `RawFd`, or an index into the ring's registered-files table. The call-sites: `opcode::Read::new(types::Fd(fd), ptr, len)` and `opcode::Read::new(types::Fixed(3), ptr, len)` — ==the same constructor slot takes both==. Meanwhile an op that needs a real descriptor bounds on `UseFd` only, so handing it `types::Fixed(3)` is a compile error.\n\n## Machinery\nIn `src/types.rs`, a `pub(crate) mod sealed` holds `pub enum Target { Fd(RawFd), Fixed(u32) }` plus two tiny traits, `UseFd` and `UseFixed`. `Fd` implements both; `Fixed` implements only `UseFixed`. An opcode whose kernel op can address the fixed-file table bounds its constructor on `impl UseFixed`; one that cannot bounds on `impl UseFd`. `impl Trait` over a sealed trait in ==argument position is a closed sum type in disguise==: it reads as open polymorphism at the call-site, but the universe has exactly two members and can never grow.\n\n## The invariant fused to the impl\nThe detail that lifts this above taste: the `opcode!` macro stores the argument as the `Target` enum, and `assign_fd!` (`opcode.rs`) branches on it at build time — setting `Flags::FIXED_FILE` automatically whenever the argument was `Fixed`. The fd-kind and its flag bit ==cannot disagree==, because the impl choice IS the flag. A correctness invariant moved out of documentation and into coherence.\n\n## Capability subsetting via bound choice\nWhich sealed trait an op bounds on is its capability statement. The misuse — a fixed-slot fd passed to an op the kernel cannot service that way — is rejected before any syscall exists. Compare `types::Fd(x)` against passing a bare integer: the newtype call-site self-documents, the C-CUSTOM-TYPE instinct applied to descriptors.\n\n## Trade-off\nBuys: one constructor per opcode instead of `new`/`new_fixed` pairs across a ~70-op surface; self-documenting call-sites; an un-forgeable flag invariant. Costs: `impl sealed::UseFixed` appearing in public signatures is the classic sealed-trait rustdoc wart, and the fd universe is deliberately unextendable — that is the point, and it still surprises people.",
      },
    },
    {
      id: "ts-sealed-code",
      title: "Build: Sealed Argument Polymorphism",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Build io-uring's sealed argument polymorphism. Create `mod private { pub trait Sealed {} }`, newtypes `pub struct Fd(pub i32);` and `pub struct Fixed(pub u32);`, and implement `private::Sealed` for both. Declare `pub trait FdKind: private::Sealed { const FIXED_FILE: bool; }`, implement it with `false` for `Fd` and `true` for `Fixed`, then write `pub fn op_flags<T: FdKind>(_target: &T) -> u8` returning `1` when `T::FIXED_FILE` and `0` otherwise — the flag falls out of the impl choice and can never be wrong.",
        solution: `mod private {
    pub trait Sealed {}
}

pub struct Fd(pub i32);
pub struct Fixed(pub u32);

impl private::Sealed for Fd {}
impl private::Sealed for Fixed {}

pub trait FdKind: private::Sealed {
    const FIXED_FILE: bool;
}

impl FdKind for Fd {
    const FIXED_FILE: bool = false;
}

impl FdKind for Fixed {
    const FIXED_FILE: bool = true;
}

pub fn op_flags<T: FdKind>(_target: &T) -> u8 {
    if T::FIXED_FILE { 1 } else { 0 }
}`,
      },
    },
    {
      id: "ts-sealed-mcq",
      title: "Sealed Trait vs Public Enum",
      content: {
        type: "multiple-choice",
        question:
          "io-uring could have made every opcode take a public `enum Target { Fd(RawFd), Fixed(u32) }` directly. The maintainers chose sealed `impl UseFd` / `impl UseFixed` bounds instead. What does the trait version express that the public enum cannot?",
        options: [
          "Sealed traits monomorphize, and enums cannot be used in generic code",
          "Capability subsetting: an op that cannot address the registered-file table bounds on `UseFd` only, making `Fixed(3)` at that call-site a type error — a public enum would force every op to accept both and defer the check to runtime",
          "Enums cannot carry payload data in argument position",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "ts-iobuf",
      title: "unsafe trait: Proof as a Bound",
      content: {
        type: "read",
        markdown:
          "The call-site never says unsafe: `file.read_at(vec![0u8; 4096], 0)` — pass a plain `Vec<u8>`, a `bytes::Bytes`, a pooled `FixedBuf`. Yet the kernel is about to write into that memory ==while your program keeps running==. Where did the danger go?\n\n## The proof moved to the impl\ntokio-uring (`buf/io_buf.rs`): `pub unsafe trait IoBuf: Unpin + 'static` with three perfectly safe methods — `stable_ptr`, `bytes_init`, `bytes_total`. The `unsafe` is on the TRAIT: calling its methods is safe; IMPLEMENTING it is a promise. The documented contract: while the runtime holds the buffer, ==the pointer from `stable_ptr` must stay valid even if the value moves==. `Vec<u8>` qualifies because moving a Vec moves three words of header while the heap block stays put — stability by heap indirection. Note what the bounds do NOT say: no `Pin` anywhere. `Unpin + 'static` plus a prose contract is a deliberate, lighter-weight alternative to pinning the handle.\n\n## Calibrating unsafe to its owner\nThe mutable twin `IoBufMut: IoBuf` adds `stable_mut_ptr` and one genuinely unsafe METHOD, `unsafe fn set_init(&mut self, pos)`: there the CALLER (the runtime) asserts \"the kernel initialized this many bytes\" — Vec's impl is just `set_len`. Trait-level `unsafe` marks the implementor's obligation; method-level `unsafe` marks the caller's. Each keyword sits with ==whoever actually owns the invariant== — the same calibration that makes `register_files` safe (kernel validates fds) but `register_buffers` unsafe (only you can promise the memory lives) in io-uring's `Submitter` (`submit.rs`).\n\n## The precedent you already trust\n`Send` and `Sync` are this exact genre — unsafe marker traits whose impl is the audited claim (taught in g-std; cited here, not re-taught). `IoBuf` proves the pattern is not std-magic: any crate can mint a capability whose `unsafe impl` line is the one place a human must review.\n\n## Trade-off\nBuys: the unsafe surface scales with buffer TYPES — a handful of `unsafe impl` blocks to audit — not with buffer USES, which number thousands of clean call-sites. Costs: the invariant lives in prose; the compiler verifies nothing about pointer stability, so a wrong impl is silent UB. And `'static` bans borrowed buffers outright — a deliberate amputation whose reasoning belongs to the Ownership curriculum.",
      },
    },
    {
      id: "ts-iobuf-mcq",
      title: "Where the unsafe Should Live",
      content: {
        type: "multiple-choice",
        question:
          "tokio-uring declares `pub unsafe trait IoBuf` with safe methods, rather than a safe trait plus `unsafe fn read_at`. Why put the `unsafe` on the trait?",
        options: [
          "An `unsafe fn` cannot appear in a public API",
          "The two spellings are equivalent; the trait form is only documentation style",
          "The invariant belongs to the buffer TYPE, not the call: whoever writes `unsafe impl IoBuf` proves pointer stability once, and every read/write call-site inherits the proof — unsafe scales with types, not uses",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "ts-newtype-walls",
      title: "Newtype Walls: Parse, Don't Validate",
      content: {
        type: "read",
        markdown:
          "One-field tuple structs, three different walls (API Guidelines C-NEWTYPE, C-NEWTYPE-HIDE; the patterns book's newtype chapter):\n\n- `struct Miles(f64)` vs `struct Kilometers(f64)` — ==unit safety==: adding them is a type error; the Mars-orbiter class of bug becomes uncompilable.\n- `pub struct MyIter(Enumerate<Skip<vec::IntoIter<u8>>>)` — ==representation hiding==: the gnarly inner type can change in a patch release because no downstream code can name it.\n- `NonZeroUsize::new(x)?` and iggy's `WireName::new(s)?` — ==parse, don't validate==: a constructor that refuses to produce invalid values.\n\n## Parse, don't validate\nThe discipline: keep the field private, make the smart constructor the only door, reject bad input there — and every function past the door takes the newtype and is INFALLIBLE. iggy's `WireName` guarantees 1–255 bytes at construction; the invariant is so baked in that its `is_empty` is `const fn is_empty(&self) -> bool { false }` — ==an invariant promoted to a constant== — and the `WireEncode` path is infallible because of it. Validation stops being something you remember to do and becomes something the signature demands.\n\n## Walls as architecture\nScale the move up and it becomes compiler-enforced layering. iggy's inner server functions take `ResolvedPartition` — plain `Copy` integers — never the user-facing `Identifier`. Name-to-ID resolution happens ==exactly once, at the protocol edge==; because inner signatures demand the resolved type, unvalidated input cannot leak inward. That is a module boundary the compiler patrols, not a code-review convention.\n\n## The one-line cousin\nC-CUSTOM-TYPE: `Widget::new(Small, Round)` instead of `Widget::new(true, false)`. Transposed booleans compile and ship; transposed types do not. The cheapest misuse-resistance in this whole chapter.\n\n## Trade-off\nThe newtype is the cheapest static guarantee in the language — zero runtime cost by construction. The tax: the wrapper inherits NOTHING. `Display`, arithmetic, serde impls must be re-implemented or derived — and the tempting shortcut, `impl Deref` to expose the inner type wholesale, is the patterns book's documented anti-pattern, because it leaks the representation the wall was built to hide. Boundary families also multiply near-identical structs; that is the visible price of making the compiler your border guard.",
      },
    },
    {
      id: "ts-newtype-code",
      title: "Build: A Parse-Don't-Validate Wall",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Build a parse-don't-validate wall. Define `#[derive(Debug)] pub struct NameError;` and `pub struct WireName(String);` — the tuple field stays private. Implement `WireName::new(raw: &str) -> Result<WireName, NameError>` rejecting names that are empty or longer than 255 bytes, plus `pub fn as_str(&self) -> &str`. Then write the infallible `pub fn encode(name: &WireName) -> Vec<u8>`: a length byte (`name.as_str().len() as u8`) followed by the name's bytes via `extend_from_slice` — no `Result`, because the constructor already proved the invariant.",
        solution: `#[derive(Debug)]
pub struct NameError;

pub struct WireName(String);

impl WireName {
    pub fn new(raw: &str) -> Result<WireName, NameError> {
        if raw.is_empty() || raw.len() > 255 {
            return Err(NameError);
        }
        Ok(WireName(raw.to_string()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

pub fn encode(name: &WireName) -> Vec<u8> {
    let mut out = vec![name.as_str().len() as u8];
    out.extend_from_slice(name.as_str().as_bytes());
    out
}`,
      },
    },
    {
      id: "ts-witness-grammar",
      title: "Witnesses, Privacy & #[non_exhaustive]",
      content: {
        type: "read",
        markdown:
          "## Values that are proofs\n`db.delete_user(id, &token)` — uncallable without an `AuthToken`, and the only expression in the program that produces one is `auth.login(creds)?`. No flag to check, no is-logged-in branch: ==the argument's existence is the proof==. Will Crichton's *Type-Driven API Design in Rust* catalogs these as witnesses — types with no public constructor, so holding one certifies the prerequisite ran.\n\n## The branded witness\nstd's scoped threads (usage taught in g-std) are the design's high end: `thread::scope(|s| ...)` hands your closure `s: &Scope<'scope, 'env>`, and `s.spawn` exists nowhere else. The detail worth stealing is the brand: `'scope` is ==invariant==, so a token from one scope cannot be smuggled into another and cannot outlive its closure. A temporal rule — these threads join before `scope` returns — became a lexical one the borrow checker enforces (`library/std/src/thread/scoped.rs`).\n\n## Privacy is the grammar\nEvery mechanism in this curriculum bottoms out in visibility:\n\n- A **sealed trait** is a supertrait you cannot name.\n- A **witness** is a constructor you cannot reach.\n- A **typestate** holds fields you cannot fabricate — `Headers { out }` will not build outside its module, so the protocol cannot be skipped by literal construction.\n\n==What cannot be named cannot be forged.== Visibility is not politeness; it is the enforcement layer under every compile-checked boundary here.\n\n## #[non_exhaustive]: privacy aimed at the future\nThe attribute makes a public type behave as if it had one hidden member: downstream `match` on the enum must add a `_` arm, and downstream code loses literal construction and struct-update on the struct (both mechanics taught in g-rust/g-std). The author reserves the right to add variants and fields in a ==minor release== — the semver kill-switch for data definitions, doing for types what sealing does for traits.\n\n## Trade-off\nWitnesses buy capability security in vanilla types — no framework, no runtime check. Costs: the token threads through every signature it guards; branded lifetimes produce some of the hardest-to-read signatures in Rust; and `#[non_exhaustive]` taxes every downstream match with a wildcard arm that will silently swallow the very variants it was added to announce.",
      },
    },
    {
      id: "ts-typed-builder",
      title: "The Typestate Builder",
      content: {
        type: "read",
        markdown:
          "typed-builder's promise, straight from its README shape:\n\n- `Foo::builder().x(1).y(2).build()` — ✓ any setter order\n- `Foo::builder().build()` — ✗ compile error: required `x` never set\n- `Foo::builder().x(1).x(2).build()` — ✗ compile error: set twice\n\nTwo classic runtime bugs — missing field, silent overwrite — become programs that cannot be written.\n\n## Machinery: Door<Locked>, industrialized\nThe builder's completion state is encoded in its ==generic parameters==. Each required field is a type-level slot starting at `()`; a setter consumes the builder and returns it with that slot flipped to the filled type; the setter is only defined while its slot is `()`, so double-set is a missing method; and `build()` exists only on the impl where every slot is filled. It is exactly this curriculum's phantom-state machinery, generated across n fields by a derive — typed-builder describes it as encoding the builder's state in the generics arguments. bon derives the same lattice from an ordinary `fn new(...) -> Result` signature: `Option` parameters become optional setters, a `Result` return makes `build()` fallible.\n\n## Where you have already met it\nleptos `#[component]` lowers a component function's arguments into a TypedBuilder props struct, so a missing prop in `view!` surfaces as a missing-method error ==manufactured three macros deep==. The magic-fn lesson in c-expr-shapes owns that story; the point here is that the error a leptos user sees is the builder typestate's error, with all its texture.\n\n## Trade-off\nBuys: misuse-proof construction — the constructor's contract fully compile-checked. Costs, all real: baroque error text (typed-builder resorts to a generated deprecation-warning hack just so \"missing x\" appears at all); the half-built builder's type is generic-encrusted and effectively ==unnameable== — you cannot store it in a struct field, return it from a helper, or clone it; the typestate lattice costs compile time; and a proc macro now sits between the user and every diagnostic. This is the chapter's trade-off spine at its sharpest: the strongest guarantee and the worst error message live on the same design.",
      },
    },
    {
      id: "ts-builder-code",
      title: "Build: A Typed Builder by Hand",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Hand-roll a typed builder with two required fields. Define `pub struct Config { pub host: String, pub port: u16 }` and `pub struct Builder<H, P>` with private fields `host: H` and `port: P`. Implement `Builder::<(), ()>::new()` starting both slots at `()`; on `impl<P> Builder<(), P>`, the setter `pub fn host(self, host: &str) -> Builder<String, P>` (convert with `to_string`, carry `port` over); on `impl<H> Builder<H, ()>`, the setter `pub fn port(self, port: u16) -> Builder<H, u16>`; and `pub fn build(self) -> Config` only on `impl Builder<String, u16>`. Setting a field twice or building early is now a missing method.",
        solution: `pub struct Config {
    pub host: String,
    pub port: u16,
}

pub struct Builder<H, P> {
    host: H,
    port: P,
}

impl Builder<(), ()> {
    pub fn new() -> Builder<(), ()> {
        Builder { host: (), port: () }
    }
}

impl<P> Builder<(), P> {
    pub fn host(self, host: &str) -> Builder<String, P> {
        Builder { host: host.to_string(), port: self.port }
    }
}

impl<H> Builder<H, ()> {
    pub fn port(self, port: u16) -> Builder<H, u16> {
        Builder { host: self.host, port }
    }
}

impl Builder<String, u16> {
    pub fn build(self) -> Config {
        Config { host: self.host, port: self.port }
    }
}`,
      },
    },
    {
      id: "ts-cost-mcq",
      title: "When Typestate Is the Wrong Tool",
      content: {
        type: "multiple-choice",
        question:
          "A crate exposes `HttpConfig` with 14 optional knobs and zero required ones. Users configure it inside branches (`if tls { cfg = cfg.port(443); }`), and frameworks want to store a half-built config in their own structs. Which construction surface fits, and why?",
        options: [
          "A plain `&mut self` builder or a struct of defaults: every intermediate state has ONE nameable type, so branching, loops, and storage all work — typestate would price those flows in unnameable generic states while having no required-field or ordering guarantee to enforce",
          "A typestate builder — compile-time checking is always worth the cost",
          "A sealed trait per knob, so the set of options can never grow",
        ],
        answerIndex: 0,
      },
    },
  ],
  edges: [
    // Typestate spine
    { from: "ts-illegal-states", to: "ts-protocol-machinery" },
    { from: "ts-protocol-machinery", to: "ts-consuming-mcq" },
    { from: "ts-consuming-mcq", to: "ts-protocol-code" },
    { from: "ts-protocol-machinery", to: "ts-phantom-roles" },
    { from: "ts-phantom-roles", to: "ts-phantom-code" },
    // Flagship: the unsubmitted op (needs both the protocol drill and phantom roles)
    { from: "ts-protocol-code", to: "ts-unsubmitted" },
    { from: "ts-phantom-roles", to: "ts-unsubmitted" },
    { from: "ts-unsubmitted", to: "ts-batching-mcq" },
    { from: "ts-batching-mcq", to: "ts-unsubmitted-code" },
    // Sealing branch
    { from: "ts-illegal-states", to: "ts-sealed-kit" },
    { from: "ts-sealed-kit", to: "ts-sealed-arg" },
    { from: "ts-sealed-arg", to: "ts-sealed-code" },
    { from: "ts-sealed-arg", to: "ts-sealed-mcq" },
    { from: "ts-sealed-kit", to: "ts-iobuf" },
    { from: "ts-iobuf", to: "ts-iobuf-mcq" },
    // Newtype branch
    { from: "ts-illegal-states", to: "ts-newtype-walls" },
    { from: "ts-newtype-walls", to: "ts-newtype-code" },
    // Privacy-as-grammar unites sealing and newtype privacy
    { from: "ts-newtype-walls", to: "ts-witness-grammar" },
    { from: "ts-sealed-kit", to: "ts-witness-grammar" },
    // Typestate builder rides both the protocol and phantom machinery
    { from: "ts-protocol-machinery", to: "ts-typed-builder" },
    { from: "ts-phantom-roles", to: "ts-typed-builder" },
    { from: "ts-typed-builder", to: "ts-builder-code" },
    // Capstone trade-off judgment
    { from: "ts-unsubmitted-code", to: "ts-cost-mcq" },
    { from: "ts-builder-code", to: "ts-cost-mcq" },
    { from: "ts-witness-grammar", to: "ts-cost-mcq" },
  ],
};
