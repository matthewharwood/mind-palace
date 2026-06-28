import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// Rust Keywords — a dedicated mastery track for every Rust keyword and its
// nuances. Two families: VALUE BINDINGS (names for values in local code) and
// NAMED ITEMS (names for items in a module). Glossary `read` hubs anchor each
// family; MCQ/code drills test the nuances. Every code snippet is rustc-verified
// by scripts/verify-rust-cards.ts (edition 2024).
export const keywords: Curriculum = {
  id: "c-rust-keywords",
  title: "Rust Keywords",
  source,
  nodes: [
    // ----- Overview -------------------------------------------------------
    {
      id: "kw-overview",
      title: "Two families of names",
      content: {
        type: "read",
        markdown:
          "Rust keywords introduce two kinds of *name*:\n\n## Value bindings\nNames for **values** inside executable code — introduced by `let`, and also at every place a pattern appears:\n- `let` statements\n- function parameters\n- closure parameters\n- `for` loop variables\n- `match` / `if let` / `while let` patterns\n\n## Named items\nNames for **items** declared in a module: `const`, `static`, `fn`, `struct`, `enum`, `union`, `trait`, `type`, `impl`, `mod`, `use`, `pub`, `extern`.\n\n## Two keywords that are NOT what they look like\n- `mut` is *not* a binding keyword on its own — `let` creates the binding; `mut` only says the binding may be mutated/reassigned through that name.\n- `move` is *not* used on ordinary values — it appears on **closures** (`move || ...`) to capture by value.",
      },
    },
    {
      id: "kw-two-families",
      title: "The two families",
      content: {
        type: "multiple-choice",
        question: "Rust names split into two families. Which split is correct?",
        options: [
          "Value bindings (let, params, patterns) and named items (const, fn, struct…)",
          "Public names and private names",
          "Compiled names and interpreted names",
        ],
        answerIndex: 0,
      },
    },

    // ----- Binding keywords ----------------------------------------------
    {
      id: "kw-bindings",
      title: "Binding keywords & sites",
      content: {
        type: "read",
        markdown:
          "A **binding** connects a ==name== to a value. `let` is the main keyword, but Rust creates bindings wherever a pattern appears.\n\n## The keywords\n- `let` — introduce a binding\n- `mut` — modifier: allow mutation/reassignment through the binding\n- `ref` — in a pattern, bind by *reference* instead of moving the value\n\n## Every binding site\n- `let x = 1;` binds `x`\n- `fn add(x: i32)` — the parameter `x` is a binding\n- `|x| x + 1` — a closure parameter is a binding\n- `for item in items` — `item` is a binding each iteration\n- `match v { Some(n) => ... }` — `n` is a binding\n- `if let Some(x) = v { ... }` and `while let Some(x) = it.next() { ... }` bind `x`",
      },
    },
    {
      id: "kw-binding-def",
      title: "What is a binding?",
      content: {
        type: "multiple-choice",
        question: "In Rust, what is a *binding*?",
        options: [
          "The connection between a name and a value",
          "A compiled function",
          "A network handle",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-let",
      title: "let introduces a binding",
      content: {
        type: "multiple-choice",
        question: "Which keyword introduces a local value binding?",
        options: ["let", "const", "fn"],
        answerIndex: 0,
      },
    },
    {
      id: "kw-mut-role",
      title: "What mut actually does",
      content: {
        type: "multiple-choice",
        question: "Is `mut` a binding keyword on its own?",
        options: [
          "No — `let` creates the binding; `mut` only allows mutation through it",
          "Yes — `mut x = 1;` is a complete binding",
          "Yes — `mut` replaces `let` for mutable values",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-ref-pattern",
      title: "ref in a pattern",
      content: {
        type: "multiple-choice",
        question: "In a pattern, what does the `ref` keyword do?",
        options: [
          "Binds by reference instead of moving the value",
          "Marks the binding as mutable",
          "Declares a lifetime",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-binding-sites",
      title: "What does NOT create a binding",
      content: {
        type: "multiple-choice",
        question: "Which of these does NOT introduce a binding?",
        options: ["The `+` operator in `a + b`", "A `for` loop variable", "A `match` arm pattern"],
        answerIndex: 0,
      },
    },
    {
      id: "kw-pattern-binding",
      title: "Pattern binding",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let (x, y) = (10, 20);
    println!("{}", x + y);
}`,
        options: ["30", "1020", "10"],
        answerIndex: 0,
      },
    },
    {
      id: "kw-match-binding",
      title: "match-arm binding",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let maybe = Some(7);
    match maybe {
        Some(n) => println!("{n}"),
        None => println!("none"),
    }
}`,
        options: ["7", "Some(7)", "none"],
        answerIndex: 0,
      },
    },
    {
      id: "kw-if-let",
      title: "if let binding",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let value = Some(9);
    if let Some(x) = value {
        println!("{x}");
    }
}`,
        options: ["9", "Some(9)", "nothing"],
        answerIndex: 0,
      },
    },
    {
      id: "kw-binding-move",
      title: "A binding can own its value",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let s = String::from("hi");
    let t = s;
    println!("{t}");
}`,
        options: ["hi", "a compile error", "an empty line"],
        answerIndex: 0,
      },
    },
    {
      id: "kw-destructure",
      title: "Write: destructure into bindings",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn sum_pair(pair: (i32, i32)) -> i32` that uses a pattern binding `let (a, b) = pair;` then returns `a + b`.",
        solution: `fn sum_pair(pair: (i32, i32)) -> i32 {
    let (a, b) = pair;
    a + b
}`,
      },
    },
    {
      id: "kw-while-let",
      title: "Write: while let",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn drain_sum(mut v: Vec<i32>) -> i32` that uses `while let Some(x) = v.pop()` to add every popped value into a total, returning it.",
        solution: `fn drain_sum(mut v: Vec<i32>) -> i32 {
    let mut total = 0;
    while let Some(x) = v.pop() {
        total += x;
    }
    total
}`,
      },
    },

    // ----- Item-declaration keywords -------------------------------------
    {
      id: "kw-items",
      title: "Item-declaration keywords",
      content: {
        type: "read",
        markdown:
          "These keywords introduce **named items** into a module:\n- `const` — a compile-time constant, ==inlined== at each use (no fixed address); name in `SCREAMING_SNAKE_CASE`, type required\n- `static` — a single value with a fixed memory address and the ==`static` lifetime==\n- `fn` — a function\n- `struct` — a product type (all fields together)\n- `enum` — a sum type (one of several variants)\n- `union` — an unsafe C-style union (rare)\n- `trait` — a set of behaviour a type can implement\n- `impl` — implement methods, or a trait, for a type\n- `type` — a type *alias* (a new name for an existing type, not a new type)\n- `mod` — a module\n- `use` — bring a path into scope\n- `pub` — make an item visible outside its module\n- `extern` — link to another language / specify an ABI (FFI)",
      },
    },
    {
      id: "kw-const-vs-static",
      title: "const vs static",
      content: {
        type: "multiple-choice",
        question: "Which statement about `const` vs `static` is true?",
        options: [
          "`const` is inlined and has no fixed address; `static` has one fixed memory location",
          "They are identical; `static` is just the older spelling",
          "`const` lives on the heap; `static` lives on the stack",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-const-compile-time",
      title: "When const is evaluated",
      content: {
        type: "multiple-choice",
        question: "When is a `const` value computed?",
        options: [
          "At compile time — so it can size an array or appear in a pattern",
          "On first use at runtime",
          "Once per thread",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-const-naming",
      title: "const naming convention",
      content: {
        type: "multiple-choice",
        question: "What is the conventional case for a `const` (and `static`) name?",
        options: ["SCREAMING_SNAKE_CASE", "camelCase", "PascalCase"],
        answerIndex: 0,
      },
    },
    {
      id: "kw-static-lifetime",
      title: "static's lifetime",
      content: {
        type: "multiple-choice",
        question: "What lifetime does a `static` item have?",
        options: ["'static — it lives for the whole program", "Its enclosing block", "One tick"],
        answerIndex: 0,
      },
    },
    {
      id: "kw-const-fn",
      title: "const fn",
      content: {
        type: "multiple-choice",
        question: "What is special about a `const fn`?",
        options: [
          "It can be evaluated at compile time (e.g. to initialize a `const`)",
          "It can never allocate",
          "It is automatically inlined and public",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-type-alias",
      title: "type is an alias",
      content: {
        type: "multiple-choice",
        question: "What does `type Id = u64;` create?",
        options: [
          "An alias — a new name for `u64`, not a distinct type",
          "A brand-new type incompatible with `u64`",
          "A constant named Id",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-struct-vs-enum",
      title: "struct vs enum",
      content: {
        type: "multiple-choice",
        question: "How do `struct` and `enum` differ?",
        options: [
          "struct holds all its fields at once; enum is exactly one of its variants",
          "struct is on the stack; enum is on the heap",
          "struct is mutable; enum is immutable",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-trait-impl",
      title: "trait & impl",
      content: {
        type: "multiple-choice",
        question: "What does `impl Drawable for Circle` do?",
        options: [
          "Implements the `Drawable` trait for the `Circle` type",
          "Declares a new trait called Drawable",
          "Creates a Circle value",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-pub",
      title: "pub visibility",
      content: {
        type: "multiple-choice",
        question: "What does `pub` do to an item?",
        options: [
          "Makes it visible outside its module",
          "Marks it mutable",
          "Allocates it on the heap",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-type-alias-code",
      title: "Write: a type alias",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Define a type alias `type Meters = f64;` and `fn add(a: Meters, b: Meters) -> Meters` returning their sum.",
        solution: `type Meters = f64;

fn add(a: Meters, b: Meters) -> Meters {
    a + b
}`,
      },
    },
    {
      id: "kw-const-vs-let",
      title: "const vs let",
      content: {
        type: "multiple-choice",
        question: "How does a `const` differ from a `let` binding?",
        options: [
          "const is compile-time, always immutable (no `mut`), must be type-annotated, and may be declared at global scope",
          "const is just a let that lives longer",
          "const can be reassigned with `mut`; let cannot",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-const-scope",
      title: "Where const can live",
      content: {
        type: "multiple-choice",
        question: "Where may a `const` be declared?",
        options: [
          "Anywhere — module/global scope or inside a function",
          "Only at the top of a file",
          "Only inside a function body, like `let`",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-const-write",
      title: "Write: a const",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Declare a module-level `const MAX_POINTS: u32 = 100_000;` and `fn cap() -> u32` that returns it.",
        solution: `const MAX_POINTS: u32 = 100_000;

fn cap() -> u32 {
    MAX_POINTS
}`,
      },
    },

    // ----- Control-flow keywords -----------------------------------------
    {
      id: "kw-control-flow",
      title: "Control-flow keywords",
      content: {
        type: "read",
        markdown:
          "Rust control flow is mostly **expressions**:\n- `if` / `else` — a branch that yields a value\n- `match` — exhaustive pattern matching (every case must be handled)\n- `loop` — repeat until `break`; `break value` can ==return a value==\n- `while` — repeat while a condition holds\n- `for ... in ...` — iterate a range or collection (`in` only appears here)\n- `break` — leave the nearest loop (or a labelled one); `continue` — jump to the next iteration\n- `return` — exit a function early (otherwise the final expression is returned implicitly)",
      },
    },
    {
      id: "kw-match-exhaustive",
      title: "match is exhaustive",
      content: {
        type: "multiple-choice",
        question: "Why must a `match` handle every possible case?",
        options: [
          "match is exhaustive — the compiler rejects it unless all patterns are covered",
          "For runtime speed only",
          "It does not — uncovered cases are silently ignored",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-break-value",
      title: "break can return a value",
      content: {
        type: "multiple-choice",
        question: "Which loop lets `break` return a value?",
        options: ["`loop` (via `break value`)", "`while`", "`for`"],
        answerIndex: 0,
      },
    },
    {
      id: "kw-continue",
      title: "continue",
      content: {
        type: "multiple-choice",
        question: "What does `continue` do?",
        options: [
          "Skips to the next iteration of the loop",
          "Exits the loop entirely",
          "Restarts the program",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-return-implicit",
      title: "return vs implicit return",
      content: {
        type: "multiple-choice",
        question: "When do you need an explicit `return`?",
        options: [
          "To exit early; otherwise the final expression (no semicolon) is returned",
          "Always — every function needs `return`",
          "Only inside `match` arms",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-in-keyword",
      title: "the in keyword",
      content: {
        type: "multiple-choice",
        question: "In which construct does the `in` keyword appear?",
        options: ["A `for` loop: `for x in iter`", "A `match` arm", "An `impl` block"],
        answerIndex: 0,
      },
    },
    {
      id: "kw-return-early",
      title: "Write: early return",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn first_positive(v: &[i32]) -> Option<i32>` that uses a `for` loop and `return Some(x)` to return the first positive value, or `None` if there is none.",
        solution: `fn first_positive(v: &[i32]) -> Option<i32> {
    for &x in v {
        if x > 0 {
            return Some(x);
        }
    }
    None
}`,
      },
    },
    {
      id: "kw-labeled-break-output",
      title: "labelled break",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let mut count = 0;
    'outer: for a in 0..3 {
        for b in 0..3 {
            if a + b == 2 {
                break 'outer;
            }
            count += 1;
        }
    }
    println!("{count}");
}`,
        options: ["2", "3", "6"],
        answerIndex: 0,
      },
    },

    // ----- Type & generic keywords ---------------------------------------
    {
      id: "kw-types",
      title: "Type & generic keywords",
      content: {
        type: "read",
        markdown:
          "Keywords that shape types and generics:\n- `impl` — three uses: inherent methods (`impl Type`), trait impls (`impl Trait for Type`), and `impl Trait` in argument/return position (anonymous generic)\n- `dyn` — a ==trait object== (`dyn Trait`): dynamic dispatch through a vtable at runtime\n- `where` — attach trait bounds to generic parameters in a readable clause\n- `as` — a primitive cast (`x as u8`); also renames an import (`use a::b as c`)\n- `Self` — the type the current `impl`/`trait` is for; `self` — the method receiver (the instance)",
      },
    },
    {
      id: "kw-dyn",
      title: "dyn Trait",
      content: {
        type: "multiple-choice",
        question: "What does `dyn Trait` denote?",
        options: [
          "A trait object — dynamic dispatch through a vtable at runtime",
          "A dynamically-sized array",
          "A compile-time-only marker",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-where",
      title: "where clause",
      content: {
        type: "multiple-choice",
        question: "What does a `where` clause express?",
        options: [
          "Trait bounds on generic type parameters",
          "Where in memory a value lives",
          "A conditional compilation flag",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-as",
      title: "the as keyword",
      content: {
        type: "multiple-choice",
        question: "What is `as` used for?",
        options: [
          "A primitive cast (and renaming an import in `use`)",
          "Declaring an associated type",
          "Pattern matching",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-self-vs-Self",
      title: "self vs Self",
      content: {
        type: "multiple-choice",
        question: "What is the difference between `self` and `Self`?",
        options: [
          "`self` is the instance (method receiver); `Self` is the type",
          "They are interchangeable",
          "`self` is the type; `Self` is the module",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-impl-trait-output",
      title: "impl for a method",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `struct Counter {
    n: i32,
}

impl Counter {
    fn bump(&mut self) -> i32 {
        self.n += 1;
        self.n
    }
}

fn main() {
    let mut c = Counter { n: 0 };
    c.bump();
    println!("{}", c.bump());
}`,
        options: ["2", "1", "0"],
        answerIndex: 0,
      },
    },

    // ----- Paths, visibility, FFI ----------------------------------------
    {
      id: "kw-crate-super-self",
      title: "crate, super, self in paths",
      content: {
        type: "multiple-choice",
        question: "In a path, what do `crate::`, `super::`, and `self::` refer to?",
        options: [
          "The crate root, the parent module, and the current module",
          "Three reserved type names",
          "Compiler intrinsics",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-use-mod",
      title: "mod and use",
      content: {
        type: "multiple-choice",
        question: "What is the difference between `mod` and `use`?",
        options: [
          "`mod` declares a module; `use` brings a path into the current scope",
          "`mod` imports; `use` exports",
          "They are aliases for each other",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-extern",
      title: "extern (FFI)",
      content: {
        type: "multiple-choice",
        question: "What is `extern` primarily used for?",
        options: [
          "Foreign function interface — linking across languages / specifying an ABI",
          "Marking an item as external to the crate but private",
          "Declaring a generic parameter",
        ],
        answerIndex: 0,
      },
    },

    // ----- async / unsafe / move -----------------------------------------
    {
      id: "kw-async-unsafe",
      title: "async, await, move, unsafe",
      content: {
        type: "read",
        markdown:
          "The asynchronous and escape-hatch keywords:\n- `async` — turns a function or block into one that returns a ==`Future`== instead of running immediately\n- `await` — drives a `Future` to completion (only valid inside `async`)\n- `move` — on a closure (`move || ...`), captures its environment ==by value== instead of by reference\n- `unsafe` — opens a block/function where you may do things the compiler cannot verify (dereference raw pointers, call `unsafe` functions, implement `unsafe` traits)",
      },
    },
    {
      id: "kw-async-await",
      title: "async / await",
      content: {
        type: "multiple-choice",
        question: "What does an `async fn` return, and what does `.await` do?",
        options: [
          "It returns a `Future`; `.await` drives that future to completion",
          "It returns the value immediately; `.await` is a no-op",
          "It spawns a thread; `.await` joins it",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-move-closure",
      title: "move closures",
      content: {
        type: "multiple-choice",
        question: "What does the `move` keyword do on a closure?",
        options: [
          "Captures the environment by value rather than by reference",
          "Moves the closure to another thread automatically",
          "Renames the closure",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-move-output",
      title: "move captures by value",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let x = 5;
    let show = move || println!("{x}");
    show();
}`,
        options: ["5", "0", "a compile error"],
        answerIndex: 0,
      },
    },
    {
      id: "kw-unsafe",
      title: "unsafe",
      content: {
        type: "multiple-choice",
        question: "What does an `unsafe` block let you do?",
        options: [
          "Operations the compiler cannot verify — deref raw pointers, call unsafe fns",
          "Disable the borrow checker for the whole program",
          "Run code faster by skipping all checks",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "kw-bool-literals",
      title: "true and false",
      content: {
        type: "multiple-choice",
        question: "What are `true` and `false` in Rust?",
        options: [
          "The two keyword literals of the `bool` type",
          "Integer constants 1 and 0",
          "Functions in the prelude",
        ],
        answerIndex: 0,
      },
    },
  ],
  edges: [
    // Overview is the root; it leads into each family glossary + the overview drill.
    { from: "kw-overview", to: "kw-two-families" },
    { from: "kw-overview", to: "kw-bindings" },
    { from: "kw-overview", to: "kw-items" },
    { from: "kw-overview", to: "kw-control-flow" },
    { from: "kw-overview", to: "kw-types" },
    { from: "kw-overview", to: "kw-async-unsafe" },
    // Bindings cluster.
    { from: "kw-bindings", to: "kw-binding-def" },
    { from: "kw-bindings", to: "kw-let" },
    { from: "kw-bindings", to: "kw-mut-role" },
    { from: "kw-bindings", to: "kw-ref-pattern" },
    { from: "kw-bindings", to: "kw-binding-sites" },
    { from: "kw-bindings", to: "kw-pattern-binding" },
    { from: "kw-bindings", to: "kw-match-binding" },
    { from: "kw-bindings", to: "kw-if-let" },
    { from: "kw-bindings", to: "kw-binding-move" },
    { from: "kw-bindings", to: "kw-destructure" },
    { from: "kw-bindings", to: "kw-while-let" },
    // Items cluster.
    { from: "kw-items", to: "kw-const-vs-static" },
    { from: "kw-items", to: "kw-const-compile-time" },
    { from: "kw-items", to: "kw-const-naming" },
    { from: "kw-items", to: "kw-static-lifetime" },
    { from: "kw-items", to: "kw-const-fn" },
    { from: "kw-items", to: "kw-const-vs-let" },
    { from: "kw-items", to: "kw-const-scope" },
    { from: "kw-items", to: "kw-const-write" },
    { from: "kw-items", to: "kw-type-alias" },
    { from: "kw-items", to: "kw-struct-vs-enum" },
    { from: "kw-items", to: "kw-trait-impl" },
    { from: "kw-items", to: "kw-pub" },
    { from: "kw-items", to: "kw-type-alias-code" },
    { from: "kw-items", to: "kw-crate-super-self" },
    { from: "kw-items", to: "kw-use-mod" },
    { from: "kw-items", to: "kw-extern" },
    // Control-flow cluster.
    { from: "kw-control-flow", to: "kw-match-exhaustive" },
    { from: "kw-control-flow", to: "kw-break-value" },
    { from: "kw-control-flow", to: "kw-continue" },
    { from: "kw-control-flow", to: "kw-return-implicit" },
    { from: "kw-control-flow", to: "kw-in-keyword" },
    { from: "kw-control-flow", to: "kw-return-early" },
    { from: "kw-control-flow", to: "kw-labeled-break-output" },
    // Types & generics cluster.
    { from: "kw-types", to: "kw-dyn" },
    { from: "kw-types", to: "kw-where" },
    { from: "kw-types", to: "kw-as" },
    { from: "kw-types", to: "kw-self-vs-Self" },
    { from: "kw-types", to: "kw-impl-trait-output" },
    { from: "kw-trait-impl", to: "kw-impl-trait-output" }, // bridge: items ↔ types via impl
    // async / unsafe cluster.
    { from: "kw-async-unsafe", to: "kw-async-await" },
    { from: "kw-async-unsafe", to: "kw-move-closure" },
    { from: "kw-async-unsafe", to: "kw-move-output" },
    { from: "kw-async-unsafe", to: "kw-unsafe" },
    { from: "kw-async-unsafe", to: "kw-bool-literals" },
    { from: "kw-bindings", to: "kw-move-closure" }, // bridge: move relates to bindings + closures
  ],
};
