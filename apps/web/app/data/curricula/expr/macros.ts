import type { Curriculum } from "@mind-palace/curriculum";

import { synSource } from "./_sources";

// Macro & DSL Machinery — Rust writing its own language, the brief's apex.
// macro_rules! as a grammar engine (fragment specifiers, tt-munching, unary
// counting inside tokio::select!), quote! quasi-quoting + quote_spanned blame
// (rustc as your diagnostic renderer), syn's typed AST + Parse for your own
// syntax, the three proc-macro shapes (#[tokio::main], view!, #[server] case
// studies), compile_error! UX, and the macro-callback ladder behind
// all_the_tuples. Lens: author-side only — macro USAGE (vec!, println!,
// derive(...)) is assumed, never re-taught. macro_rules drills compile bare
// (rustc); syn/quote drills compile in the cargo sandbox via
// scripts/verify-rust-cards.ts. leptos code appears in prose/MCQ text only —
// its patterns are rebuilt with syn/quote in the drills.
export const exprMacros: Curriculum = {
  id: "c-expr-macros",
  title: "Macro & DSL Machinery",
  source: synSource,
  nodes: [
    {
      id: "macros-map",
      title: "Macros: The Expressiveness Ladder",
      content: {
        type: "read",
        markdown:
          "You already USE Rust's macros — `vec![]`, `println!`, `#[derive(Clone)]` are assumed fluency, not the lesson. This curriculum sits you in the author's chair: you can picture a call-site plain Rust cannot parse, and you want the machinery that makes the compiler accept it.\n\n## The one unusual freedom\nA macro call-site is almost unconstrained: anything that ==lexes as Rust tokens with balanced delimiters== may appear inside it. `select! { msg = rx.recv() => handle(msg), else => break }` is not Rust — it is a sentence in a mini-language tokio invented. All the discipline that syntax normally provides moves into the macro's machinery.\n\n## The expressiveness ladder\nFour rungs, each buying stranger grammar at higher cost:\n\n- **Matcher grammar** — `macro_rules!` fragment specifiers as BNF; handles 80% of DSL needs\n- **Token munching** — recursive rules for grammar that repetitions can't express; paid in compile time\n- **Typed parsing** — syn's `Parse` trait: your own syntax, a typed AST, aimable errors\n- **Foreign grammar** — `#[proc_macro]` on raw token trees: leptos `view!`'s HTML, `serde_json`'s `json!`\n\nThe rule that keeps DSLs maintainable: ==take the lowest rung that produces your target call-site==.\n\n## Two theses to carry\nFirst: every beloved call-site is ==subsidized by invisible generated boilerplate== — axum handlers, leptos props, and `select!` branches all exist because a macro emitted code you never read. Second: ==diagnostics are a first-class output==, co-equal with the generated code — the mature crates (syn, quote, thiserror) spend as much design effort on the failure call-site as on the success one.",
      },
    },
    {
      id: "fragment-grammar",
      title: "Fragment Specifiers: Grammar for Free",
      content: {
        type: "read",
        markdown:
          "## The shape\n`select! { msg = rx.recv() => handle(msg), _ = shutdown.notified(), if !draining => break, else => continue }` — each branch is a *sentence*: pattern, future, guard, handler, with `else` acting as a real keyword. Nobody wrote a parser for this language.\n\n## The machinery\nA `macro_rules!` matcher is a ==declarative BNF over Rust fragments==. tokio's public rules in `tokio/src/macros/select.rs` read as grammar productions: `$p:pat = $f:expr => $h:block` for a branch, `$c:expr` for the guard, `$($t:tt)*` for the unparsed tail. The fragment specifiers — `expr`, `pat`, `ty`, `ident`, `block`, `path`, `literal`, `tt` — are the ==terminal classes of your grammar==, and the compiler's own parser is conscripted to recognize each one. Literal tokens do the rest: matching `else` and `, if` verbatim grows ==contextual keywords for free== — `else` means something inside `select!` and nothing special outside it.\n\n## The trade-off\nBuys: a full grammar with **zero parser code**, enforced by the compiler at every call site — the matchers ARE the public contract. Costs three taxes:\n\n- ==Fragment opacity== — once a chunk matches as `:expr` it becomes an indivisible black box; later rules cannot look inside it. Only `tt` stays transparent\n- **Follow-set restrictions** — after an `:expr` only `=>`, `,`, or `;` may follow; the grammar you want is not always the grammar you may write\n- **Default errors** — misuse degenerates to \"no rules expected the token\" unless you author guardrails (a later card)",
      },
    },
    {
      id: "select-pipeline",
      title: "Inside select!: Munch, Count, Emit",
      content: {
        type: "read",
        markdown:
          "`select!` needs things `$(...)*` repetition cannot express: canonicalized guards, per-branch indices, and the branch count N. Its pipeline is the industrial reference for three patterns The Little Book of Rust Macros names — all shipping in `tokio/src/macros/select.rs`.\n\n## Incremental tt-munching\nRecursive rules ==peel one branch off the head== and recurse on `$($rest:tt)*`. Each normalization step canonicalizes as it goes — a branch with no guard gets `if true` injected, an expression handler is wrapped into block form — so the final rule sees exactly one shape. Rules must be ordered most-specific-first, or a catch-all eats everything.\n\n## Internal rules + push-down accumulation\nThe user sees ONE macro name. Internally, rules prefixed with `@` act as ==private functions== (safe because `@` cannot start Rust prefix syntax), and the accumulated state travels as one `@{ ... }` token bundle threaded through the recursion. Finished output tokens are ==accumulated in a rule parameter and emitted only at the end== — push-down accumulation — because a macro must expand to a *complete* syntax element; you cannot emit half an array.\n\n## Unary counting\nThere is no arithmetic in macro_rules, so tokio counts in unary: each munch step appends one `_` to a count tuple and records the current prefix as that branch's skip-list. Helper macros with ==64 hand-written arms== convert unary to real code — `count!(_ _ _)` expands to `3`, `count_field!($var. _ _ _)` to `$var.3`. Then the dogfood moment: the decl macro invokes a ==proc macro==, `select_priv_declare_output_enum!`, to mint a one-off enum with exactly N variants — the type behind select!'s random-fair polling.\n\n## The trade-off\nBuys: a full DSL with compile-time arithmetic at zero runtime cost. Costs: TLBORM's warning that muncher + accumulator is ==doubly quadratic== in compile time; a hard 64-branch cap; and write-only macro source — the call-site's elegance is paid for entirely here. (Newer Rust's `count` metavariable expression obsoletes parts of this; tokio keeps the old machinery for MSRV.)",
      },
    },
    {
      id: "macro-hardening",
      title: "Hardening: Guardrails, $crate, Hygiene",
      content: {
        type: "read",
        markdown:
          "A macro that works in your crate is a toy; a macro that survives other people's crates is a product. Three hardening moves, all visible in tokio and syn.\n\n## compile_error! guardrails\nThe default failure mode of macro_rules is a shrug: \"no rules expected the token\". The fix is a catch-all arm whose expansion IS the diagnostic — tokio's `select!` ends with a `()` rule expanding to `compile_error!(\"select! requires at least one branch.\")`. This is the shared UX floor of both macro worlds: `syn::Error::to_compile_error()` lowers to the same primitive. Cost: you must ==enumerate the misuse shapes ahead of time==, one guardrail arm each.\n\n## $crate anchoring\n`use tokio as t; t::select! { ... }` still works — because every path inside the expansion is written `$crate::...`, which hygienically resolves to the *defining* crate. And since ==expansion happens in the user's crate==, every helper the macro touches must be `pub` — hence tokio's `#[doc(hidden)]` public `macros::support` module and syn's `__private`. The cost is a permanent shadow public surface: users *can* name it, and are held back only by convention.\n\n## Hygiene as a choice\nmacro_rules locals never collide with user variables — mixed-site hygiene is automatic. Proc macros must choose: `Span::call_site()` (the quote! default) makes generated identifiers ==resolve as if the user wrote them== — a `let guard` you emit can capture or collide with theirs; `Span::mixed_site()` restores macro_rules-like separation (`proc-macro2/src/lib.rs` documents both). The default is the unsafe direction for helper locals, and the bugs are heisen-collisions that fire only when a user happens to reuse your identifier.",
      },
    },
    {
      id: "quote-templates",
      title: "quote!: Code as Its Own Template",
      content: {
        type: "read",
        markdown:
          "Cross to the proc-macro side and the author's call-site is the star: `quote! { impl #impl_generics Component for #name #ty_generics { ... } }` — ==output code written as a template of the code it produces==. bevy's Component derive, serde's impls, thiserror's Display: all end in a quote! block that looks like the Rust it generates.\n\n## The machinery\nEvery `#var` interpolation bottoms out in one trait: ==`ToTokens`== (`quote/src/to_tokens.rs`) — `fn to_tokens(&self, tokens: &mut TokenStream)`. Primitives implement it, and crucially **every syn AST type implements it**, so nodes parsed from the user's type splice straight back into templates. Your own intermediate builder types can implement it too and become quotable units — thiserror does exactly this for its generated Display bodies.\n\nRepetition mirrors decl-macro muscle memory: `#( pub #names: #tys, )*` discovers the `#var`s inside the group, binds anything `IntoIterator`, and advances them ==in lockstep== like a zip. And in a delightful dogfood twist, quote! is itself a `macro_rules!` program — engineered as a ==non-munching sliding window== precisely to dodge the quadratic munching cost TLBORM documents.\n\n## The trade-off\nBuys: WYSIWYG codegen — the single largest readability win in proc-macro authorship — at linear expansion cost. Costs: the template is ==just tokens, not validated Rust==; a typo becomes an error *in generated code at the downstream compile*, pointing somewhere unhelpful (span discipline, next card, is the mitigation). And the classic first-day bug: a repetition ==consumes its iterators== — splicing `#names` into two repetitions needs two iterators (clone or re-map), because the first repetition drained it.",
      },
    },
    {
      id: "quote-spanned-blame",
      title: "quote_spanned!: Aiming the Blame",
      content: {
        type: "read",
        markdown:
          "## The shape\nThe end user — three layers from your code — writes `#[derive(MyTrait)] struct Broken { field: Rc<u32> }` and the error says `Rc<u32>` cannot be shared between threads safely, ==pointing at their field's type==, not at your macro. That aim was authored.\n\n## The machinery\nStable Rust gives proc macros no diagnostics API. The workaround is the sharpest trick in the stack: generate a ==deliberately failing assertion whose span is the user's tokens==. quote's own docs canonize the idiom: `quote_spanned! {ty.span()=> struct _AssertSync where #ty: Sync;}`. If the user's type is not Sync, the *compiler's* ordinary trait error fires — but the span makes it land on their field. ==rustc becomes your diagnostic renderer==; you only aim it.\n\nThe span rules that make this deterministic (`quote/src/lib.rs`): tokens born inside `quote!` get `Span::call_site()`; tokens born inside `quote_spanned!` get the span you passed; ==interpolated tokens always keep the spans they already carry== from parsing. Aim is therefore compositional — a syn node remembers where the user wrote it.\n\n## The trade-off\nBuys: world-class error UX on stable Rust, with messages written by the compiler team and aimed by you. Costs: span bookkeeping is ==invisible and fragile== — one `.to_string()` round-trip and blame collapses back to the macro call; and the idiom *looks* like dead code (a struct named `_AssertSync` nobody constructs), so it dies in careless refactors unless commented.",
      },
    },
    {
      id: "syn-grammar",
      title: "syn: A Struct That IS the Grammar",
      content: {
        type: "read",
        markdown:
          "When your DSL outgrows matchers and munching, take rung three: parse your own syntax into ==typed values==. The shape is the striking part — you declare a struct whose ==fields are the grammar, in order==: `struct Rule { name: Ident, arrow: Token![=>], weight: LitInt }`.\n\n## Parse: type inference selects the production\nsyn's `Parse` trait (`syn/src/parse.rs`) is recursive descent where ==the field's TYPE picks the sub-parser==: each `input.parse()?` dispatches on what is being assigned — the same inference trick as serde's Deserialize. `ParseBuffer` adds the combinators: `peek` looks ahead, `fork` parses speculatively, `parse_terminated` handles separated lists, and `braced!` splits off a delimited sub-buffer so nesting in the source maps to nesting of streams.\n\n## Tokens as types\n`Token![=>]` maps roughly 100 literal tokens to generated unit structs (`syn/src/token.rs`) — the token *itself* names its type, in type position and in `peek` position. That set is sealed; your OWN keywords come from `custom_keyword!`: thiserror declares `mod kw { syn::custom_keyword!(transparent); }` and then peeks `kw::transparent` — ==unlimited contextual vocabulary== with zero reserved-word pressure.\n\n## Diagnostics derived from control flow\n`input.lookahead1()` records every `peek` you attempt; on failure, `lookahead.error()` composes them into \"expected one of: ...\" ==at the exact cursor span==. Because branch selection and error construction are the same code path, the message cannot drift out of sync with the parser.\n\n## The trade-off\nBuys: typed, composable, diagnosable grammars — every syn node and token already implements Parse, so your syntax interleaves with real Rust. Costs: you are ==bound to Rust's lexer== (tokens must lex, delimiters must balance — no `<%`), the parse re-runs on every compile, and `Punctuated<T, P>` is heavier than the Vec you probably wanted (it keeps separators and spans for lossless round-trips).",
      },
    },
    {
      id: "derive-front-door",
      title: "The Derive Front Door",
      content: {
        type: "read",
        markdown:
          "## The shape\nThe first line of nearly every proc macro in the ecosystem: `let ast = parse_macro_input!(input as DeriveInput);`. Uniform enough that reading one derive teaches you to read them all — bevy's Component derive opens exactly this way (`bevy_ecs/macros/src/lib.rs`).\n\n## The machinery\n`parse_macro_input!` (`syn/src/parse_macro_input.rs`) expands to a match with a ==hidden early `return`==: on parse failure it converts the error via `to_compile_error()` and returns those tokens from your whole proc-macro function. One idiom, all the error plumbing.\n\n`DeriveInput` then makes the user's type a ==pattern-matchable value==: `Data::Struct`, `Data::Enum`, `Data::Union`, with `Fields::Named`, `Fields::Unnamed`, and `Fields::Unit` below. A good derive is a ==type-shape linter==: bevy walks this tree to enforce that a `Relationship` is a struct with exactly one `Entity` field, and rejects violations with a sentence — \"Relationship can only be derived for structs.\"\n\nErrors stay ==ordinary values== until the boundary: `syn::Error::new_spanned(tokens, msg)` spans a whole node first-token-to-last, `Error::combine` accumulates several, and the mature exit is `expand(input).unwrap_or_else(syn::Error::into_compile_error).into()` — so a user sees ALL their mistakes in one compile, each aimed at the offending tokens.\n\n## The trade-off\nBuys: batch, precise, testable diagnostics; API-design rules become compile errors with documentation-quality messages. Costs: the front-door macro ==conceals control flow== (a `return` hiding inside an expression surprises reviewers), and every supported type shape multiplies the derive's body — unsupported shapes must be rejected *by hand* or users get panics.",
      },
    },
    {
      id: "proc-shapes",
      title: "Derive, Attribute, Function-Like",
      content: {
        type: "read",
        markdown:
          "Three proc-macro shapes exist, declared by three attributes you'll meet in prose (`#[proc_macro_derive]`, `#[proc_macro_attribute]`, `#[proc_macro]`). Choosing one is an API decision — each buys a different *relationship* between what the user writes and what compiles.\n\n## Derive: additive\n`#[derive(Component, Serialize, Clone)]` — the type stays ==exactly as written==; the macro receives it read-only and may only *append* impls alongside. The derive's `attributes(...)` list registers ==inert helper attributes== (`#[component(storage = \"SparseSet\")]`) that the compiler ignores so the derive can treat them as its private config namespace — the doorway to serde-style attribute mini-languages. Buys predictability (rustfmt, IDEs, and readers see ground truth) and composition (derives stack). Cost: additive-only — a derive can never rewrite a field or change a signature.\n\n## Attribute: item rewrite\n`#[tokio::main] async fn main()` — the attribute ==replaces the item==. tokio-macros parses your async fn, strips `async`, and re-emits a sync `fn main` that builds a runtime and calls `block_on` around your body (`tokio-macros/src/lib.rs`). Its args form a mini-language (`flavor`, `worker_threads`) with prescriptive errors, and when runtime features are off, a swapped-in `main_fail` expands to a curated `compile_error!`. Buys transformation power derives can't have. Costs: ==the item you read is not the item that compiles== — debugging, coverage, and IDE features all degrade a step, and ordering against other attributes (`#[test]`) is a documented minefield.\n\n## Function-like: raw tokens\n`#[proc_macro]` receives a bare token stream — grammar limited only by the lexer. This is the doorway to foreign grammars (next card).\n\n## The selection rule\nBolting capability onto an untouched type? ==Derive==. Transforming the item itself? ==Attribute==. A language Rust can't approximate? ==Function-like== — and accept the tooling tax.",
      },
    },
    {
      id: "apex-dsls",
      title: "view! & #[server]: Macro as Architecture",
      content: {
        type: "read",
        markdown:
          'The top rung, in two leptos case studies. (leptos isn\'t in our drill sandbox — its patterns appear here as prose, and the drills rebuild the machinery with syn and quote.)\n\n## view!: a foreign grammar, honestly priced\n`view! { <div class:hidden=hide on:click=handler>{count}</div> }` embeds an HTML dialect in a Rust file. Machinery: a `#[proc_macro]` in `leptos_macro/src/lib.rs` hands raw tokens to ==rstml==, a *recoverable* parser built on syn\'s Parse — it returns a partial AST plus an error list, so half-typed markup still yields completions and ALL its errors at once, each with structured `help =` text.\n\nThe design value to steal: ==the macro emits calls to a documented public builder API== — `div().class("x").on(click, handler).child(...)` in tachys. Everything view! produces, you can hand-write. The macro buys *syntax*, not capability, which keeps it non-load-bearing: debuggable, escapable, cheap to reason about. The tax is still real — rustfmt won\'t format inside it (==leptosfmt exists because of this==), and rust-analyzer support is approximate.\n\n## #[server]: the macro as module system\n`#[server] async fn add_todo(title: String) -> Result<(), ServerFnError>` — called identically from browser and server; ==the network vanishes into a function signature==. Machinery (`server_fn_macro`): the macro expands one item three ways — the args become a serde struct (==the wire format IS the argument list==), the body moves behind `cfg(feature = "ssr")` so server-only deps never reach the WASM build, and the client build gets an HTTP stub with an identical signature.\n\n## The trade-off\nview! buys designer-legible templates and charges tooling friction. #[server] buys the largest architectural compression in the ecosystem and charges for it: everything must serialize (no borrows, no generics), and the apparent locality is ==a lie you must remember== — one of those `.await`s is secretly a network hop.',
      },
    },
    {
      id: "tuples-recall",
      title: "Macro Callbacks & all_the_tuples",
      content: {
        type: "read",
        markdown:
          "You met the magic-fn pattern in the shapes curriculum: axum's `Handler` and bevy's system functions accept plain functions at any arity because ==a macro implements the trait for every tuple size==. This card is the macro-side machinery that ladder rides on.\n\n## Macros can't be values — pass the name\nA macro cannot take another macro's *output* as input (expansion order forbids it), and macros aren't values you can pass around. The escape hatch is the ==callback pattern==: pass the callee's *identifier* and invoke it — `all_the_tuples!(impl_handler)` expands to `impl_handler!([T1], T2); impl_handler!([T1, T2], T3);` and so on, one invocation per arity (`axum-core/src/macros.rs`). One arity-ladder generator serves every trait in the crate; axum's bracketed `[prefix], last` shape exists because the final parameter carries different bounds (`FromRequest` vs `FromRequestParts`).\n\nbevy externalized the same idea into a dedicated crate: ==`variadics_please::all_tuples!`== — notably a *proc macro* that loops `0..=15` and quote!s an invocation of your decl macro per arity, with `all_tuples_enumerated!` and `all_tuples_with_size!` variants, plus `#[doc(fake_variadic)]` to collapse 16 near-identical impls into one rendered doc entry.\n\n## The trade-off\nBuys: the variadic generics Rust doesn't have — the single biggest call-site unlock in the ecosystem. Costs: indirection tooling can't follow (==go-to-definition dies at a macro invoking a macro name==); compile-time and rustdoc bloat across every arity; and when a function *doesn't* satisfy the trait, the error lists every arity as a failed candidate — the wall that `#[diagnostic::do_not_recommend]` and `#[axum::debug_handler]` exist to soften.",
      },
    },
    {
      id: "fragment-opacity-mcq",
      title: "The price of a matched fragment",
      content: {
        type: "multiple-choice",
        question:
          "A macro_rules rule captures a chunk of input as `$f:expr`, then hands `$f` to a later rule in the same macro. What can that later rule do with it?",
        options: [
          "Re-match inside it — for example, pull out the method name if it happens to be a method call",
          "Treat it only as an opaque unit — once matched as `:expr` the fragment is a black box; only `tt` captures stay decomposable",
          "Convert it back to raw tokens with `stringify!` and pattern-match the pieces",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "count-tts-output",
      title: "Count the token trees",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `macro_rules! count_tts {
    () => { 0 };
    ($head:tt $($tail:tt)*) => { 1 + count_tts!($($tail)*) };
}

fn main() {
    println!("{}", count_tts!(a b (c d) [e]));
}`,
        options: ["4", "6", "5"],
        answerIndex: 0,
      },
    },
    {
      id: "derive-limit-mcq",
      title: "Why a derive can't do that",
      content: {
        type: "multiple-choice",
        question:
          "Your team wants `#[derive(Timed)]` to wrap every field of the annotated struct in an `Instrumented<T>` wrapper type. Why is a derive macro the wrong shape for this?",
        options: [
          "Derives cannot read field types, only field names",
          "Wrapper types cannot be generated by any macro shape; they must be handwritten",
          "A derive receives the item read-only and may only append new items alongside it — rewriting the struct itself needs an attribute macro",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "tokio-main-mcq",
      title: "What #[tokio::main] really does",
      content: {
        type: "multiple-choice",
        question:
          "`#[tokio::main] async fn main() { ... }` compiles into code shaped like this snippet. What did the attribute macro do to the item you wrote?",
        language: "rust",
        code: `fn main() {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime")
        .block_on(async {
            let _ = tokio::spawn(async {}).await;
        });
}`,
        options: [
          "Appended a runtime-launching impl next to your untouched async fn, derive-style",
          "Replaced the item: it parsed your async fn, stripped `async`, and re-emitted a sync fn that wraps your body in a runtime's block_on",
          "Registered your fn in a global inventory that the runtime discovers at startup",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "view-builder-mcq",
      title: "Why view! targets a public builder",
      content: {
        type: "multiple-choice",
        question:
          'leptos\'s `view!` macro compiles its HTML-ish markup into calls on a documented public builder API (`div().class("x").on(click, h)`) instead of into private internals. What is the design payoff?',
        options: [
          "The macro stays non-load-bearing: everything it emits you can hand-write, so there is always an escape hatch and a cheap mental model",
          "It makes the generated WASM binary smaller, since builder calls are erased at link time",
          "It lets rustfmt format the markup inside the macro invocation",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "hygiene-mcq",
      title: "The call_site capture risk",
      content: {
        type: "multiple-choice",
        question:
          "quote! stamps every token it creates with `Span::call_site()`. Your derive emits `let guard = self.lock();` ahead of interpolated user code. What is the risk, and the fix?",
        options: [
          "The generated code cannot see the user's variables at all; fix by switching to `Span::def_site()`",
          "No risk — proc macros get macro_rules-style hygiene automatically",
          "call_site identifiers resolve as if the user wrote them, so your `guard` can collide with or capture theirs; span the local with `Span::mixed_site()` for macro_rules-like hygiene",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "write-unit-grammar",
      title: "Write: a unit grammar",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Contextual keywords come free: literal tokens in a matcher are matched verbatim. Write a declarative macro `duration!` with two rules — `($n:literal secs)` expanding to `std::time::Duration::from_secs($n)` and `($n:literal millis)` expanding to `std::time::Duration::from_millis($n)`. Then write `pub fn timeout() -> std::time::Duration` returning `duration!(5 secs)` and `pub fn tick() -> std::time::Duration` returning `duration!(250 millis)`.",
        solution: `macro_rules! duration {
    ($n:literal secs) => {
        std::time::Duration::from_secs($n)
    };
    ($n:literal millis) => {
        std::time::Duration::from_millis($n)
    };
}

pub fn timeout() -> std::time::Duration {
    duration!(5 secs)
}

pub fn tick() -> std::time::Duration {
    duration!(250 millis)
}`,
      },
    },
    {
      id: "write-muncher",
      title: "Write: a tt-muncher",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Build an incremental tt-muncher `apply_ops!` over a mini statement language. Terminal rule: `($acc:ident;)` expands to nothing. Two munch rules: `($acc:ident; add $n:literal; $($tail:tt)*)` emits `$acc += $n;` then recurses on the tail, and the same shape for `mul` with `*=`. Then write `pub fn run_program() -> i64` that declares `let mut total = 1_i64;`, runs `apply_ops!(total; add 4; mul 10; add 2;);`, and returns `total`.",
        solution: `macro_rules! apply_ops {
    ($acc:ident;) => {};
    ($acc:ident; add $n:literal; $($tail:tt)*) => {
        $acc += $n;
        apply_ops!($acc; $($tail)*);
    };
    ($acc:ident; mul $n:literal; $($tail:tt)*) => {
        $acc *= $n;
        apply_ops!($acc; $($tail)*);
    };
}

pub fn run_program() -> i64 {
    let mut total = 1_i64;
    apply_ops!(total; add 4; mul 10; add 2;);
    total
}`,
      },
    },
    {
      id: "write-guardrail",
      title: "Write: a compile_error! guardrail",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Author the failure mode, tokio-style. Write `non_empty_vec!`: a `()` rule expanding to `compile_error!("non_empty_vec! requires at least one element.")`, and a `($($x:expr),+ $(,)?)` rule expanding to `vec![$($x),+]` — the `$(,)?` is the trailing-comma idiom std\'s `vec!` uses. Then write `pub fn lucky_numbers() -> Vec<i32>` returning `non_empty_vec![3, 7, 21,]` — trailing comma included.',
        solution: `macro_rules! non_empty_vec {
    () => {
        compile_error!("non_empty_vec! requires at least one element.")
    };
    ($($x:expr),+ $(,)?) => {
        vec![$($x),+]
    };
}

pub fn lucky_numbers() -> Vec<i32> {
    non_empty_vec![3, 7, 21,]
}`,
      },
    },
    {
      id: "write-quote-props",
      title: "Write: quote! a props struct",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Generate code with quote!\'s lockstep repetition — the leptos Props move, rebuilt. Write `pub fn props_struct(component: &str, fields: &[(&str, syn::Type)]) -> proc_macro2::TokenStream`: build the struct name with `format_ident!("{component}Props")`, map the slice into a `names` iterator of idents and a `tys` iterator of types, and return `quote! { pub struct #name { #( pub #names: #tys, )* } }`. Import `TokenStream` from `proc_macro2` and `format_ident`, `quote` from `quote`.',
        solution: `use proc_macro2::TokenStream;
use quote::{format_ident, quote};

pub fn props_struct(component: &str, fields: &[(&str, syn::Type)]) -> TokenStream {
    let name = format_ident!("{component}Props");
    let names = fields.iter().map(|(field, _)| format_ident!("{field}"));
    let tys = fields.iter().map(|(_, ty)| ty);
    quote! {
        pub struct #name {
            #( pub #names: #tys, )*
        }
    }
}`,
      },
    },
    {
      id: "write-parse-rule",
      title: "Write: impl Parse for a rule",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Declare a grammar as a struct: `pub struct Rule { pub name: Ident, pub arrow: Token![=>], pub weight: LitInt }` — then `impl Parse for Rule` whose `fn parse(input: ParseStream) -> Result<Self>` builds the struct with three `input.parse()?` calls in field order (type inference selects each sub-parser). Import `Parse` and `ParseStream` from `syn::parse`, and `Ident`, `LitInt`, `Result`, `Token` from `syn`.",
        solution: `use syn::parse::{Parse, ParseStream};
use syn::{Ident, LitInt, Result, Token};

pub struct Rule {
    pub name: Ident,
    pub arrow: Token![=>],
    pub weight: LitInt,
}

impl Parse for Rule {
    fn parse(input: ParseStream) -> Result<Self> {
        Ok(Rule {
            name: input.parse()?,
            arrow: input.parse()?,
            weight: input.parse()?,
        })
    }
}`,
      },
    },
    {
      id: "write-assert-sync",
      title: "Write: the spanned assert idiom",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Aim the compiler's blame. Write `pub fn assert_sync(ty: &syn::Type) -> proc_macro2::TokenStream` returning `quote_spanned! {ty.span()=> struct _AssertSync where #ty: Sync;}` — the deliberately failing assertion whose span lands on the user's type, so rustc's own trait error becomes your diagnostic. Import `TokenStream` from `proc_macro2`, `quote_spanned` from `quote`, and `syn::spanned::Spanned` for `.span()`.",
        solution: `use proc_macro2::TokenStream;
use quote::quote_spanned;
use syn::spanned::Spanned;

pub fn assert_sync(ty: &syn::Type) -> TokenStream {
    quote_spanned! {ty.span()=>
        struct _AssertSync where #ty: Sync;
    }
}`,
      },
    },
  ],
  edges: [
    // Concept spine — the ladder: decl-macro grammar → hardening → quote/syn → proc shapes → apex
    { from: "macros-map", to: "fragment-grammar" },
    { from: "fragment-grammar", to: "select-pipeline" },
    { from: "select-pipeline", to: "macro-hardening" },
    { from: "fragment-grammar", to: "macro-hardening" },
    { from: "macros-map", to: "quote-templates" },
    { from: "fragment-grammar", to: "quote-templates" },
    { from: "quote-templates", to: "quote-spanned-blame" },
    { from: "quote-templates", to: "syn-grammar" },
    { from: "syn-grammar", to: "derive-front-door" },
    { from: "quote-spanned-blame", to: "derive-front-door" },
    { from: "derive-front-door", to: "proc-shapes" },
    { from: "macro-hardening", to: "proc-shapes" },
    { from: "proc-shapes", to: "apex-dsls" },
    { from: "syn-grammar", to: "apex-dsls" },
    { from: "select-pipeline", to: "tuples-recall" },
    { from: "quote-templates", to: "tuples-recall" },
    // Drills
    { from: "fragment-grammar", to: "fragment-opacity-mcq" },
    { from: "fragment-grammar", to: "write-unit-grammar" },
    { from: "select-pipeline", to: "count-tts-output" },
    { from: "select-pipeline", to: "write-muncher" },
    { from: "write-unit-grammar", to: "write-muncher" },
    { from: "macro-hardening", to: "write-guardrail" },
    { from: "write-muncher", to: "write-guardrail" },
    { from: "macro-hardening", to: "hygiene-mcq" },
    { from: "quote-spanned-blame", to: "hygiene-mcq" },
    { from: "quote-templates", to: "write-quote-props" },
    { from: "quote-spanned-blame", to: "write-assert-sync" },
    { from: "write-quote-props", to: "write-assert-sync" },
    { from: "syn-grammar", to: "write-parse-rule" },
    { from: "proc-shapes", to: "derive-limit-mcq" },
    { from: "derive-front-door", to: "derive-limit-mcq" },
    { from: "proc-shapes", to: "tokio-main-mcq" },
    { from: "apex-dsls", to: "view-builder-mcq" },
  ],
};
