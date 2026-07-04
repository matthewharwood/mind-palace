import type { Curriculum } from "@mind-palace/curriculum";

import { patternsSource } from "./_sources";

// The Registers of Rust — the capstone of the Expressive Rust path. boats'
// four-register grid (core / consuming / combinatoric / control-flow) as the
// coordinate system for every call-site shape, paradigm labels demoted to
// dialect tags with real verdicts, idiom-vs-anti-pattern judgment (the Deref
// fork, bool blizzards), the API Guidelines as an expressiveness checklist,
// two studio spec cards, and the mastery claim itself. All drills are pure
// std and rustc-verified; the behavioral run-check is compiled and executed
// by scripts/verify-rust-cards.ts.
export const exprRegisters: Curriculum = {
  id: "c-expr-registers",
  title: "The Registers of Rust",
  source: patternsSource,
  nodes: [
    {
      id: "registers-map",
      title: "The Capstone: Shape, Machinery, Trade-Off",
      content: {
        type: "read",
        markdown:
          "This path opened with a claim: ==if you can visualize the call-site shape you want, you know the machinery that produces it, and you understand what the aesthetic buys and costs==. Ten curricula of machinery later, the claim needs a coordinate system — a way to file every shape you have met, judge shapes you have never seen, and spec new ones. That is this capstone.\n\n## The instrument panel\n- **The register grid** — without.boats' essay \"The registers of Rust\" classifies not techniques but ==the four shapes the same effect can take at a call-site==. It is the most predictive instrument in this whole path: name the register and you have named the machinery bill.\n- **Dialects, not dogma** — functional, OO-ish, data-oriented, declarative. The labels survive as per-technique *tags* with real, measured verdicts — never as identities.\n- **The canon's courtroom** — the Rust Design Patterns book (rust-unofficial/patterns) sorts its inventory into *idioms*, *design patterns*, and ==anti-patterns== — verdicts attach to uses, not mechanisms — and the API Guidelines distill the ecosystem's defaults into a reviewable checklist.\n\n## Everything you built reports here\nThe magic fn (c-expr-shapes), `Service` and the adapter dialect (c-expr-traits), typestate walls, ownership-as-protocol and `BufResult` (c-expr-ownership), the hand-rolled `Waker` and executor (c-expr-async), arena-handle signals, the builder taxonomy, the erasure dial, macro grammars, the thiserror/anyhow split — each was machinery for one family of shapes. The grid files them all, two studio cards make you compose them, and the final card states the mastery claim you can now defend.",
      },
    },
    {
      id: "four-registers",
      title: "The Four Registers of Rust",
      content: {
        type: "read",
        markdown:
          'In linguistics, a *register* is the same meaning delivered at a different formality — "hello" versus "hey." without.boats\' "The registers of Rust" applies the idea to code: for any ==effect== — fallibility, iteration, asynchrony — Rust offers up to ==four call-site shapes with identical semantics== and wildly different feel.\n\n## The grid, walked with fallibility\n- ==Core register== — hand-implement the interface. Fallibility\'s core register is authoring the fallible surface itself: tower\'s `Service` fixing `type Error`, your own trait deciding what failure even is.\n- ==Consuming register== — drive the effect by hand: `match result { Ok(v) => .., Err(e) => .. }`. Maximum visibility, maximum ceremony.\n- ==Combinatoric register== — adapters thread the effect while closures do the work: `load().map_err(wrap).and_then(validate)`.\n- ==Control-flow register== — compiler sugar swallows the effect: `let cfg = load()?;`. The happy path reads as prose. (The desugar itself is g-rust material — assumed cold here.)\n\n## The same grid, twice more\n**Iteration**: `impl Iterator` (core), `for` loops (consuming), `.map().filter()` (combinatoric), and — nothing. Stable Rust has ==no generator sugar==; iteration\'s control-flow slot is empty. **Async**: a hand-implemented `impl Future` with a poll state machine — exactly what c-expr-async built (core); executors and `block_on` (consuming); `FutureExt::map` (combinatoric); `async/.await` (control-flow — the slot rustc filled in 2019).\n\n## The key line\nboats: =="asynchrony is in the control-flow register, whereas iteration is in the core register"== — Rust\'s effects are unevenly served, and the gaps are *felt*. That is why some call-sites glide and others grind, and why async iteration is a sore spot rather than a feature.\n\n## Trade-off\nThe registers are not ranked; they spend differently. Control-flow buys prose and hides the machine — but only rustc (or a macro) can mint it. Combinatoric buys dense composition at type-tower cost. Consuming buys explicitness with boilerplate. Core is the only register where a *protocol* can live — `poll_ready` backpressure has no sugar equivalent — and it demands the most from users.',
      },
    },
    {
      id: "register-machinery",
      title: "Registers Predict Machinery",
      content: {
        type: "read",
        markdown:
          "Say the register out loud and you have named your bill of materials. This is what makes the grid an engineering instrument rather than taxonomy trivia.\n\n## Combinatoric → the adapter kit\nCommitting to `fetch(url).retry(3).timeout(30)` commits you to a ==wrapper struct per verb== — `Retry<T>`, `Timeout<T>`, each re-implementing the core trait (the API Guidelines even name the convention: C-ITER-TY, adapter types named after their method) — plus an ==extension trait with a blanket impl== so the verbs appear on every existing value (`Itertools`, `FutureExt`, tower's `ServiceExt`), plus closures as type parameters. c-expr-traits built exactly this kit for services; the recurring cost is monomorphized type towers surfacing in error messages.\n\n## Control-flow → macros, or wait for rustc\nNo library can mint sugar: `?` and `.await` belong to the compiler. A library buys into this register with ==macro grammar== — `select!` building match-shaped racing syntax, `#[tokio::main]` rewriting your item (c-expr-macros) — and pays the DSL taxes: rustfmt and rust-analyzer go blind inside, and errors point at expansion smog unless spans are spent carefully.\n\n## Core → publish the trait itself\ntower publishes `Service` and asks the world to implement `poll_ready`/`call`. Hardest register for users — and the only one where a wire-level ==protocol== can live. Backpressure needs a two-phase contract; sugar cannot express one.\n\n## Consuming → reify states as data\nClosed enums the caller exhaustively matches, executors that drive polls, `Entry`-style ==reified intermediate steps==. The consuming register is where an effect's states become plain values — `Poll`, `ControlFlow`, `Entry` — the designable surfaces c-expr-reactive worked through.\n\n## Registers move under you\nWhen rustc fills an empty slot, ecosystems reshape overnight: futures 0.1's `and_then` combinator towers *were* the async dialect until `async/.await` stabilized — then ==the combinatoric register drained into the control-flow register== within a year. Design lesson: expose the core register honestly (real traits, real state) so a register shift extends your API instead of stranding it.",
      },
    },
    {
      id: "paradigm-dialects",
      title: "Paradigms as Dialects, Not Dogma",
      content: {
        type: "read",
        markdown:
          "Take one feature — *every entity takes damage each tick* — and write it in four dialects. The point is not to crown one; it is that each verdict is real, measured, and situational.\n\n## Functional: values through a pipeline\nCompute the next state as a lazy pipeline over the current one. Verdict: Aaron Turon's \"Abstraction without overhead\" documents Rust's flagship claim — monomorphized adapters inline into loops \"you couldn't hand code any better.\" Costs: monster intermediate types (the Guidelines added ==C-NEWTYPE-HIDE== for a reason), compile time, and error messages that print the whole adapter tower.\n\n## OO-ish: objects own state and behavior\n`Vec<Box<dyn Entity>>`, then `entity.take_damage(3)`. Verdict: an ==open set== — new entity kinds ship without touching the loop — and uniform handling. Costs: vtable indirection blocks inlining, and Catherine West's RustConf 2018 keynote names the deeper wound: object *graphs* demand aliased mutability the borrow checker forbids — \"every `Entity` implementation would need internal mutation\" — so `RefCell` creeps in.\n\n## Data-oriented: \"just use Vecs and indexes\"\nWest's fix: struct-of-arrays component storage, systems as free functions, and ==generational indices== (`GenerationalIndex { index, generation }`) so stale handles can never dangle. Verdict: *borrow-checker alignment* — disjoint column borrows replace `RefCell` — plus cache locality and trivially parallel systems. Costs: everything is an ID hop; there is no `entity.method()` navigation. Bevy's `Query` shape lives here, riding the magic-fn machinery from c-expr-shapes.\n\n## Declarative: the data is the schema\nDescribe the rule once and derive the behavior — serde's `#[derive(Deserialize)]` config, bevy's schedule tuples. Verdict: schema-once, behavior generated. Costs: opaque codegen and ==attribute mini-languages that escape the type checker== — a typo'd `#[serde(rename)]` is a runtime surprise.\n\n## Dialects mix; labels are tags\nsans-io libraries (quinn-proto's `poll_transmit` loop; Firezone's essay named the pattern) are a functional core *inside* an imperative shell. A builder is OO-ish, declarative, and imperative at once. The labels tag techniques; they do not define you. Choose per subsystem — ==this aesthetic yields flexibility, that one performance== — and say out loud which you bought.",
      },
    },
    {
      id: "idiom-antipattern",
      title: "Same Machinery, Opposite Verdict",
      content: {
        type: "read",
        markdown:
          'The canon\'s sharpest lesson: ==verdicts attach to uses, not mechanisms==. The same machinery can be a blessed idiom at one call-site and a documented anti-pattern at the next.\n\n## The Deref fork\n`MutexGuard<\'_, T>` implements `Deref<Target = T>` and the canon applauds: a guard truthfully *is* a smart pointer to its target (C-DEREF: "only smart pointers implement Deref"). Now take `impl Deref for AdminUser` with `type Target = User` — the identical mechanism, deployed to fake inheritance — and the patterns book files it under anti-patterns (anti_patterns/deref.md): it is =="subtly surprising to programmers used to Java inheritance"==, `User`\'s trait impls do NOT come along for the ride, and method shadowing bites (which is why C-SMART-PTR tells smart pointers to avoid inherent methods). Prescribed fixes: traits, explicit facade methods, delegation. Same trait, opposite verdicts — the judgment hangs on the ==semantic claim the call-site makes==. `Deref` says "I am a pointer to this," never "I extend this."\n\n## Clone-to-satisfy-the-borrow-checker\nA `.clone()` inserted to silence a borrow error is the book\'s second warning (anti_patterns/borrow_clone.md): it ==hides the design problem the checker just surfaced==. The honest alternatives are ownership transitions (`mem::take` in `&mut` position) or West\'s indices — redesigns, not silencers.\n\n## The stringly and booly call-site\n`widget("small", true, false)` compiles and says nothing. C-CUSTOM-TYPE is the antidote: `Widget::new(Size::Small, Shape::Round)` — per-argument types make the ==call-site self-documenting and the misuse unrepresentable==. Types are cheap; unreadable call-sites are not.\n\n## The taxonomy is a courtroom\nThe patterns book\'s split — *idioms* (small, local), *design patterns* (structural), *anti-patterns* (negative verdicts) — is a courtroom, not a catalog. Reading each entry as verdict-plus-reasoning is what turns pattern knowledge into design judgment.',
      },
    },
    {
      id: "api-guidelines",
      title: "The API Guidelines Checklist",
      content: {
        type: "read",
        markdown:
          "The Rust API Guidelines (rust-lang.github.io/api-guidelines) are the closest thing the ecosystem has to an ==expressiveness rulebook== — nearly every entry is a call-site-shape prescription with the trade-off already argued out. Read them as defaults: each records where the ecosystem landed after paying both sides of a trade.\n\n## A sampler, by quality dimension\n- **Naming** — ==C-CONV==: `as_` is free and borrowed, `to_` is expensive, `into_` transfers ownership — cost and ownership legible in the method *name*. C-ITER-TY: `.map()` returns `Map` — adapters named after their method.\n- **Predictability** — C-CTOR: constructors are static `new`/`with_` methods, fallible ones return `Result` (`Regex::new(src)?`). C-DEREF: only smart pointers.\n- **Flexibility** — ==C-INTERMEDIATE==: expose intermediate steps as types (`Entry` is the exemplar) so callers can stop halfway through an operation.\n- **Type safety** — C-NEWTYPE, C-CUSTOM-TYPE (no booly call-sites), C-BUILDER.\n- **Future proofing** — C-SEALED, C-STRUCT-PRIVATE, and ==C-NEWTYPE-HIDE==: wrap `Enumerate<Skip<I>>` in a newtype so the monster type never becomes your public contract.\n- **Macros** — ==C-EVOCATIVE==: input syntax mirrors output structure — `json!({..})` looks like the JSON it builds.\n\n## How to use it\nAs a review instrument. Walk any public API — yours or a dependency's — down the checklist, and every deviation becomes a question with exactly two answers: *deliberate* (name the trade you took — tower knowingly deviates from ease to keep `poll_ready`'s protocol) or *accidental* (fix it). The Guidelines do not forbid deviation; they forbid ==unexamined== deviation.\n\n## Where it sits in the capstone\nThe register grid gives you geometry, dialect tags give you accent, the patterns book gives you verdicts — the checklist gives you ==defaults==. Studio work from here on is judged against all four.",
      },
    },
    {
      id: "studio-four-registers",
      title: "Studio: One Feature, Four Registers",
      content: {
        type: "read",
        markdown:
          "Studio time: no new machinery, one design exercise. Take a small effect and ==design its call-site in all four registers==, then judge the designs like a maintainer.\n\n## The brief\nThe effect is *retry with backoff* for a fallible operation. Produce four call-site sketches:\n- ==Core== — a policy trait: `trait Backoff { fn next_delay(&mut self, attempt: u32) -> Option<Duration>; }`. Implementors own the policy; `None` means give up. Everything c-expr-traits taught about input-generic vs output-associated applies to each slot you add.\n- ==Consuming== — the caller drives: a loop matching on a reified attempt state — `Retry::Wait(delay)` / `Retry::Give(err)` — states as plain data.\n- ==Combinatoric== — verbs on the operation itself: `op.retry(Fixed(3)).with_jitter()` — the adapter kit: one wrapper struct per verb plus an extension trait.\n- ==Control-flow== — sugar: `retry!(policy, fetch(url))` — a macro front-end lowering to the consuming loop (you built exactly this shape in the `drive!` drill).\n\n## Judge them\nFor each register, answer: what does a wrong use look like, and ==at what time is it caught== — compile, review, or 2 a.m. in production? What does rustc print when the types miss? Which surface is discoverable from IDE dot-complete, and which is invisible until someone reads the docs? Which composes with async without a redesign?\n\n## The verdict you must write\nPick ONE register to ship as the primary surface and defend the bill in two sentences: what you bought, what you paid, and who pays it — the author once, or every caller forever. There is a defensible answer for every register. What is not defensible is shipping one without knowing the other three existed.",
      },
    },
    {
      id: "studio-own-dsl",
      title: "Studio: Spec Your Own DSL",
      content: {
        type: "read",
        markdown:
          "The final studio: ==spec your own embedded DSL==. Not build — spec. The skill assessed here is composing machinery from every curriculum in this path into one designed surface, with the taxes accounted.\n\n## The brief\nChoose a small closed domain you know well — a dialogue tree, a crafting recipe, a scene layout. Spec a two-layer surface:\n- ==Layer 1: a typestate builder core== (c-expr-typestate + c-expr-builders). Required steps become type-level states so an unfinished recipe ==cannot compile==; typed-builder and bon are your prior art. Decide: consuming or `&mut` receivers, and which fields are compile-checked versus defaulted.\n- ==Layer 2: a macro front-end== (c-expr-macros) that gives the domain its native notation — `recipe! { heat oven to 220; fold flour into water; }` — lowering to Layer 1 calls. C-EVOCATIVE is the bar: input syntax mirrors the thing described. Spend `compile_error!` and spans so a bad program blames the exact offending token.\n- ==The seams== — seal the traits users must not implement (c-expr-traits); pick a storage position on the erasure dial: a closed `enum` of steps versus `Box<dyn Step>` (c-expr-erasure); and design the error surface as a contract, not an afterthought (c-expr-errors).\n\n## Account for the taxes\nA DSL is a product: document what it costs its users. ==rustfmt and rust-analyzer go dark inside the macro==, the grammar itself becomes semver surface, and every new teammate learns a private language. Then write the kill criterion honestly: ==if the plain typestate builder reads 90% as well, ship the builder== and delete Layer 2 from the spec.\n\n## Deliverables\nA four-line grammar sketch, the builder's state list, one deliberately wrong program with the exact diagnostic you want rustc to emit for it, and the tax paragraph. If you can produce those four artifacts, you can build the rest on demand.",
      },
    },
    {
      id: "mastery-claim",
      title: "The Mastery Claim",
      content: {
        type: "read",
        markdown:
          'One loop, three moves — the whole path in a sentence you can now execute.\n\n## Visualize the call-site\nSee the shape before any implementation exists. Write the README first: `app.route("/users/{id}", get(show_user))`; `let (res, buf) = file.read_at(buf, 0).await`; `signal.get()`. ==The shape is the spec.==\n\n## Name the machinery\nEvery shape you can visualize now has a named kit. Any-fn-just-works → the magic-fn stack: extractor traits, `all_the_tuples!`, marker-type coherence. Chainable verbs → adapter structs plus a blanket extension trait. Wrong-order-will-not-compile → typestate. The-buffer-comes-back-to-you → ownership as protocol. Prose-like effects → compiler sugar or a macro grammar. One nameable type where generics sprawled → the erasure dial. Misuse caught at compile time *with a humane message* → diagnostic attributes and spanned errors.\n\n## Own the trade-off\nEvery aesthetic is a bill someone pays. The magic fn pays in error messages; typestate pays in unnameable types; combinators pay in type towers; macros pay in tooling opacity; erasure pays in allocations and lost auto-traits. ==Expressiveness is not taste — it is engineering with the receipts kept.== The register grid tells you what a shape costs, the dialect tags tell you what it optimizes, the checklist tells you what the ecosystem expects, and the courtroom reminds you that the same machinery can be idiom or anti-pattern depending on the claim it makes at the call-site.\n\n## The claim\nYou can now read any Rust API as a set of decisions — and write the one you see in your head. That was the promise: ==visualize the call-site, name the machinery, own the trade-off==. Go build surfaces other people describe as "it just reads the way I think."',
      },
    },
    {
      id: "register-classify",
      title: "Classify the Call-Site",
      content: {
        type: "multiple-choice",
        question:
          "Fallibility is one effect with four registers. Which register does the call-site inside `shape_c` occupy?",
        language: "rust",
        code: `fn load() -> Result<String, std::io::Error> {
    Ok("config".to_string())
}

fn validate(raw: String) -> Result<String, String> {
    if raw.is_empty() {
        Err("empty".to_string())
    } else {
        Ok(raw)
    }
}

pub fn shape_c() -> Result<String, String> {
    load().map_err(|e| e.to_string()).and_then(validate)
}`,
        options: [
          "The consuming register — the caller drives each case by hand",
          "The control-flow register — compiler sugar linearizes the happy path",
          "The combinatoric register — adapter methods thread the effect through closures",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "register-gap",
      title: "The Empty Slot",
      content: {
        type: "multiple-choice",
        question:
          'without.boats observes: "asynchrony is in the control-flow register, whereas iteration is in the core register." What does that asymmetry predict about async iteration in today\'s Rust?',
        options: [
          "It feels unfinished: with no stable sugar on the iteration side, async iteration falls out of the control-flow register into manual poll loops and combinators",
          "It is impossible: effects living in different registers cannot compose at all",
          "It is free: the compiler unifies the two registers during monomorphization",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "machinery-bet",
      title: "The Combinatoric Bill",
      content: {
        type: "multiple-choice",
        question:
          "Your team wants a chainable surface for a new effect — `fetch(url).retry(3).timeout(30)`, the combinatoric register. Judged as a design commitment, what bill does that register hand YOU, the author?",
        options: [
          "None — closures and method syntax are built into the language, so the surface is free",
          "A wrapper struct per verb (`Retry<T>`, `Timeout<T>`) each re-implementing the core trait, an extension trait with a blanket impl to graft the verbs on, and monomorphized type towers surfacing in every error message",
          "A fork of rustc, because new method syntax requires compiler support",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "poll-loop-print",
      title: "How Many Polls?",
      content: {
        type: "multiple-choice",
        question:
          "The consuming register in miniature: a hand-written loop drives a core-register task to completion — the same shape as every executor you have built. What does this program print?",
        language: "rust",
        code: `enum Progress {
    Pending,
    Done(u32),
}

struct Countdown {
    remaining: u32,
    ticks: u32,
}

impl Countdown {
    fn poll_next(&mut self) -> Progress {
        if self.remaining == 0 {
            return Progress::Done(self.ticks);
        }
        self.remaining -= 1;
        self.ticks += 1;
        Progress::Pending
    }
}

fn main() {
    let mut task = Countdown { remaining: 3, ticks: 0 };
    let mut polls = 0;
    let total = loop {
        polls += 1;
        if let Progress::Done(ticks) = task.poll_next() {
            break ticks;
        }
    };
    println!("{polls} {total}");
}`,
        options: ["3 3", "4 4", "4 3"],
        answerIndex: 2,
      },
    },
    {
      id: "deref-verdict",
      title: "Judging a Deref",
      content: {
        type: "multiple-choice",
        question:
          "With this impl, `admin.name` and every `User` method now work on `AdminUser` through deref coercion — inheritance, apparently for free. The patterns book condemns this exact impl while blessing `MutexGuard<T>`'s identical-looking one. What separates them?",
        language: "rust",
        code: `use std::ops::Deref;

pub struct User {
    pub name: String,
}

pub struct AdminUser {
    inner: User,
}

impl Deref for AdminUser {
    type Target = User;

    fn deref(&self) -> &User {
        &self.inner
    }
}`,
        options: [
          '`Deref` makes a pointer claim — "I am a smart pointer to a `User`." `MutexGuard` truthfully is one; `AdminUser` is lying to fake inheritance, so call-sites surprise and `User`\'s trait impls never come along',
          "Nothing — the guideline is purely stylistic, and deref-based inheritance is fine when documented",
          "`MutexGuard` lives in std, which is allowed to break the API Guidelines; third-party crates are not",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "write-core-register",
      title: "Write: A Core-Register Effect",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "The core register of an effect is a trait you hand-implement. Build a miniature progress effect in pure std: `pub enum Progress<T> { Pending, Done(T) }`; `pub trait Task { type Output; fn poll_next(&mut self) -> Progress<Self::Output>; }` (the output is an associated type — the implementor fixes it); and `pub struct Countdown { pub remaining: u32, pub ticks: u32 }` implementing `Task` with `Output = u32`: while `remaining > 0`, decrement it, increment `ticks`, and return `Progress::Pending`; once `remaining` hits zero, return `Progress::Done(self.ticks)`.",
        solution: `pub enum Progress<T> {
    Pending,
    Done(T),
}

pub trait Task {
    type Output;
    fn poll_next(&mut self) -> Progress<Self::Output>;
}

pub struct Countdown {
    pub remaining: u32,
    pub ticks: u32,
}

impl Task for Countdown {
    type Output = u32;

    fn poll_next(&mut self) -> Progress<u32> {
        if self.remaining == 0 {
            Progress::Done(self.ticks)
        } else {
            self.remaining -= 1;
            self.ticks += 1;
            Progress::Pending
        }
    }
}`,
      },
    },
    {
      id: "write-combinatoric",
      title: "Write: The Combinatoric Register",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Move the Task effect into the combinatoric register. Re-state the core: `pub enum Progress<T> { Pending, Done(T) }` and `pub trait Task { type Output; fn poll_next(&mut self) -> Progress<Self::Output>; }`. Then build the adapter kit: `pub struct Map<T, F> { inner: T, f: F }` (private fields) implementing `Task` with `Output = U` where `T: Task` and `F: FnMut(T::Output) -> U` — `poll_next` forwards `Pending` untouched and applies `(self.f)` inside `Done`; and `pub trait TaskExt: Task + Sized` with a provided `fn map<U, F: FnMut(Self::Output) -> U>(self, f: F) -> Map<Self, F>` constructing the adapter, plus the blanket `impl<T: Task> TaskExt for T {}`.",
        solution: `pub enum Progress<T> {
    Pending,
    Done(T),
}

pub trait Task {
    type Output;
    fn poll_next(&mut self) -> Progress<Self::Output>;
}

pub struct Map<T, F> {
    inner: T,
    f: F,
}

impl<T, U, F> Task for Map<T, F>
where
    T: Task,
    F: FnMut(T::Output) -> U,
{
    type Output = U;

    fn poll_next(&mut self) -> Progress<U> {
        match self.inner.poll_next() {
            Progress::Pending => Progress::Pending,
            Progress::Done(value) => Progress::Done((self.f)(value)),
        }
    }
}

pub trait TaskExt: Task + Sized {
    fn map<U, F: FnMut(Self::Output) -> U>(self, f: F) -> Map<Self, F> {
        Map { inner: self, f }
    }
}

impl<T: Task> TaskExt for T {}`,
      },
    },
    {
      id: "write-drive-macro",
      title: "Write: drive! Sugar",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "The control-flow register needs sugar, and libraries mint sugar with macros. Re-state the core (`Progress`, `Task` as before) and `pub struct Countdown { pub remaining: u32 }` whose `Task` impl (`Output = u32`) decrements toward zero returning `Progress::Pending`, then `Progress::Done(42)`. Then write `macro_rules! drive` taking `($task:expr)` and expanding to a block that binds `let mut task = $task;` and loops: `if let Progress::Done(value) = task.poll_next() { break value; }`. Finish with `pub fn run_to_completion() -> u32 { drive!(Countdown { remaining: 3 }) }` — the consuming loop, packaged as one word.",
        solution: `pub enum Progress<T> {
    Pending,
    Done(T),
}

pub trait Task {
    type Output;
    fn poll_next(&mut self) -> Progress<Self::Output>;
}

macro_rules! drive {
    ($task:expr) => {{
        let mut task = $task;
        loop {
            if let Progress::Done(value) = task.poll_next() {
                break value;
            }
        }
    }};
}

pub struct Countdown {
    pub remaining: u32,
}

impl Task for Countdown {
    type Output = u32;

    fn poll_next(&mut self) -> Progress<u32> {
        if self.remaining == 0 {
            Progress::Done(42)
        } else {
            self.remaining -= 1;
            Progress::Pending
        }
    }
}

pub fn run_to_completion() -> u32 {
    drive!(Countdown { remaining: 3 })
}`,
      },
    },
    {
      id: "write-custom-types",
      title: "Refactor: Kill the Bool Blizzard",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "`pub fn order_widget(small: bool, round: bool) -> u32` produces call-sites like `order_widget(true, false)` — a bool blizzard that says nothing. Refactor toward C-CUSTOM-TYPE: define `pub enum Size { Small, Large }` and `pub enum Shape { Round, Square }`, then `pub fn order_widget(size: Size, shape: Shape) -> u32` where the base price is 10 for `Small` and 20 for `Large`, plus 5 extra for `Round` (nothing extra for `Square`).",
        solution: `pub enum Size {
    Small,
    Large,
}

pub enum Shape {
    Round,
    Square,
}

pub fn order_widget(size: Size, shape: Shape) -> u32 {
    let base = match size {
        Size::Small => 10,
        Size::Large => 20,
    };
    let extra = match shape {
        Shape::Round => 5,
        Shape::Square => 0,
    };
    base + extra
}`,
      },
    },
  ],
  edges: [
    // The register track
    { from: "registers-map", to: "four-registers" },
    { from: "four-registers", to: "register-classify" },
    { from: "four-registers", to: "register-machinery" },
    { from: "register-machinery", to: "register-gap" },
    { from: "register-machinery", to: "machinery-bet" },
    { from: "four-registers", to: "write-core-register" },
    { from: "write-core-register", to: "poll-loop-print" },
    { from: "write-core-register", to: "write-combinatoric" },
    { from: "register-machinery", to: "write-combinatoric" },
    { from: "write-core-register", to: "write-drive-macro" },
    { from: "register-machinery", to: "write-drive-macro" },
    // The judgment track
    { from: "registers-map", to: "paradigm-dialects" },
    { from: "registers-map", to: "idiom-antipattern" },
    { from: "idiom-antipattern", to: "deref-verdict" },
    { from: "paradigm-dialects", to: "api-guidelines" },
    { from: "idiom-antipattern", to: "api-guidelines" },
    { from: "api-guidelines", to: "write-custom-types" },
    { from: "idiom-antipattern", to: "write-custom-types" },
    // Studios converge
    { from: "four-registers", to: "studio-four-registers" },
    { from: "register-machinery", to: "studio-four-registers" },
    { from: "write-combinatoric", to: "studio-four-registers" },
    { from: "studio-four-registers", to: "studio-own-dsl" },
    { from: "write-drive-macro", to: "studio-own-dsl" },
    { from: "api-guidelines", to: "studio-own-dsl" },
    // The claim
    { from: "studio-own-dsl", to: "mastery-claim" },
    { from: "write-custom-types", to: "mastery-claim" },
  ],
};
