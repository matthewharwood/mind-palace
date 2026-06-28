import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// Rust Types — a categorized taxonomy of EVERY Rust type form, so any type you
// read in code can be recognized and placed. Organized by the practical mental
// model: values → borrows/views → owned-heap → control/result → abstraction →
// systems → type-system forms. This is the RECOGNITION/INDEX layer; how to USE
// specific types (Option/Result methods, Vec/String/Box APIs, dyn dispatch,
// type alias, self/Self) lives in their home curricula — the glossaries here
// point at those rather than re-testing them, so there is no duplication.
// Every code snippet is rustc-verified by scripts/verify-rust-cards.ts.
export const types: Curriculum = {
  id: "c-rust-types",
  title: "Rust Types",
  source,
  nodes: [
    // ----- Overview -------------------------------------------------------
    {
      id: "ty-overview",
      title: "How Rust types are organized",
      content: {
        type: "read",
        markdown:
          "Every type you meet in Rust fits one of a few families. A practical way to index them:\n\n1. **Values** — `bool`, integers, floats, `char`, tuples, arrays, `struct`, `enum`\n2. **Borrows / views** — `&T`, `&mut T`, `&str`, `&[T]`\n3. **Owned heap** — `String`, `Vec<T>`, `Box<T>`\n4. **Control / result** — `Option<T>`, `Result<T, E>`, `!`\n5. **Abstraction** — generics, `impl Trait`, `dyn Trait`, function pointers, closures\n6. **Systems** — raw pointers, `union`, FFI types\n\nAnd a 7th, **type-system forms** that are *ways of naming* types rather than runtime things: type aliases, associated types, `Self`, inferred `_`.\n\nThe tiny phrase that holds it together: in `let x: i32 = 5;`, `x` is the **binding**, `i32` is the **type**, and `5` is the **value**.",
      },
    },
    {
      id: "ty-mental-model",
      title: "The six families",
      content: {
        type: "multiple-choice",
        question: "Which grouping matches the practical Rust type model?",
        options: [
          "values · borrows/views · owned-heap · control/result · abstraction · systems",
          "public · private · internal",
          "fast · slow · unsafe",
        ],
        answerIndex: 0,
      },
    },

    // ----- Scalars --------------------------------------------------------
    {
      id: "ty-scalars",
      title: "Scalar types",
      content: {
        type: "read",
        markdown:
          "A **scalar** holds one value:\n- **bool** — `true` / `false`\n- **signed integers** — `i8`, `i16`, `i32`, `i64`, `i128`, `isize` (can be negative; `i32` is the ==default==)\n- **unsigned integers** — `u8`, `u16`, `u32`, `u64`, `u128`, `usize` (never negative; `usize` is used for ==indexing and sizes==)\n- **floats** — `f32`, `f64` (`f64` is the default)\n- **char** — one ==Unicode scalar value==, 4 bytes, in single quotes: `'a'`, `'中'`",
      },
    },
    {
      id: "ty-default-int",
      title: "Default integer",
      content: {
        type: "multiple-choice",
        question: "When an integer literal has no annotation or other constraint, what type is it?",
        options: ["i32", "i64", "usize"],
        answerIndex: 0,
      },
    },
    {
      id: "ty-default-float",
      title: "Default float",
      content: {
        type: "multiple-choice",
        question: "What is the default floating-point type?",
        options: ["f64", "f32", "f128"],
        answerIndex: 0,
      },
    },
    {
      id: "ty-usize",
      title: "Indexing & sizes",
      content: {
        type: "multiple-choice",
        question: "Which integer type does Rust use for collection indices and sizes?",
        options: ["usize", "i32", "u8"],
        answerIndex: 0,
      },
    },
    {
      id: "ty-unsigned",
      title: "Unsigned integers",
      content: {
        type: "multiple-choice",
        question: "Which is true of a `u32`?",
        options: [
          "It cannot hold negative numbers",
          "It is always 32 bytes wide",
          "It is the default integer type",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "ty-char",
      title: "char",
      content: {
        type: "multiple-choice",
        question: "What does a Rust `char` represent?",
        options: [
          "One Unicode scalar value (4 bytes)",
          "One ASCII byte (1 byte)",
          "A UTF-8 string of length 1",
        ],
        answerIndex: 0,
      },
    },

    // ----- Compound value types ------------------------------------------
    {
      id: "ty-compound",
      title: "Compound value types",
      content: {
        type: "read",
        markdown:
          "Compounds bundle values into one type:\n- **tuple** — a fixed group of (possibly different) types: `(i32, bool)`; access by position `t.0`\n- **unit** — `()`, the empty tuple; means ==no meaningful value== (a common return type)\n- **array** — a fixed-size list of one type: `[i32; 4]`\n- **struct** — a named ==product type== (fields bundled together)\n- **enum** — a named ==sum type== (one of several variants)\n\n(How to define and use `struct`/`enum` lives in the Structs & Enums and Keywords curricula — here we just place them in the map.)",
      },
    },
    {
      id: "ty-unit",
      title: "The unit type",
      content: {
        type: "multiple-choice",
        question: "What does the unit type `()` mean?",
        options: [
          "No meaningful value — the empty tuple (a common return type)",
          "A null pointer",
          "An uninitialized value",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "ty-array-vs-slice",
      title: "Array vs slice",
      content: {
        type: "multiple-choice",
        question: "How do `[i32; 4]` and `[i32]` differ?",
        options: [
          "`[i32; 4]` is a fixed-size array; `[i32]` is a dynamically-sized slice (used behind `&`)",
          "They are identical spellings",
          "`[i32; 4]` lives on the heap; `[i32]` on the stack",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "ty-tuple-access",
      title: "Tuple access",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let t = (1, true, 'z');
    println!("{}", t.0);
}`,
        options: ["1", "true", "z"],
        answerIndex: 0,
      },
    },
    {
      id: "ty-tuple-fn",
      title: "Write: return a tuple",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn min_max(a: i32, b: i32) -> (i32, i32)` returning a tuple of `(smaller, larger)`.",
        solution: `fn min_max(a: i32, b: i32) -> (i32, i32) {
    if a < b {
        (a, b)
    } else {
        (b, a)
    }
}`,
      },
    },

    // ----- Borrows & views (DSTs) ----------------------------------------
    {
      id: "ty-borrows",
      title: "Borrows & views",
      content: {
        type: "read",
        markdown:
          "These types *point at* data they do not own:\n- **`&T`** — a shared (read-only) borrow\n- **`&mut T`** — an exclusive, mutable borrow\n- **`&[T]`** — a slice: a view into contiguous values (the bare `[T]` is dynamically sized, used behind a pointer)\n- **`&str`** — a UTF-8 string view; string literals are `&'static str` (the bare `str` is also dynamically sized)\n\n`[T]` and `str` are ==dynamically-sized types (DSTs)==: you always handle them behind a pointer like `&` or `Box`.",
      },
    },
    {
      id: "ty-ref-vs-mutref",
      title: "&T vs &mut T",
      content: {
        type: "multiple-choice",
        question: "How do `&T` and `&mut T` differ?",
        options: [
          "`&T` is a shared read-only borrow; `&mut T` is an exclusive mutable borrow",
          "`&T` copies the value; `&mut T` moves it",
          "They are the same; `mut` is decorative",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "ty-str-category",
      title: "What &str is",
      content: {
        type: "multiple-choice",
        question: "In the type map, what is `&str`?",
        options: [
          "A borrowed view into UTF-8 text (literals are `&'static str`)",
          "An owned, growable string",
          "A single character",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "ty-dst",
      title: "Dynamically-sized types",
      content: {
        type: "multiple-choice",
        question: "Which types are dynamically sized (handled behind a pointer like `&` or `Box`)?",
        options: ["`[T]` and `str`", "`i32` and `bool`", "`Vec<T>` and `String`"],
        answerIndex: 0,
      },
    },

    // ----- Owned heap types ----------------------------------------------
    {
      id: "ty-owned",
      title: "Owned heap types",
      content: {
        type: "read",
        markdown:
          "These own their data on the heap and can grow / be moved:\n- **`String`** — an owned, growable UTF-8 string (the owned counterpart of `&str`)\n- **`Vec<T>`** — an owned, growable list (the owned counterpart of `&[T]`)\n- **`Box<T>`** — owns a single value on the heap (used for recursive types and trait objects)\n\n(Their APIs are taught in the Strings, Collections, and Smart Pointers curricula — here they are placed as the *owned* family that mirrors the borrowed views above.)",
      },
    },
    {
      id: "ty-owned-group",
      title: "The owned-heap family",
      content: {
        type: "multiple-choice",
        question: "Which group are all owned, heap-backed types?",
        options: ["`String`, `Vec<T>`, `Box<T>`", "`&str`, `&[T]`, `&T`", "`i32`, `char`, `bool`"],
        answerIndex: 0,
      },
    },
    {
      id: "ty-owned-vs-borrowed",
      title: "Owned vs borrowed pairs",
      content: {
        type: "multiple-choice",
        question: "Which pairs an owned type with its borrowed view correctly?",
        options: [
          "`String` ↔ `&str` and `Vec<T>` ↔ `&[T]`",
          "`String` ↔ `&[T]` and `Vec<T>` ↔ `&str`",
          "`Box<T>` ↔ `&str` and `String` ↔ `&T`",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "ty-box-recursive",
      title: "Write: a recursive type",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "A recursive `enum` needs indirection. Write `enum List { Cons(i32, Box<List>), Nil }` and `fn len(list: &List) -> usize` counting the elements.",
        solution: `enum List {
    Cons(i32, Box<List>),
    Nil,
}

fn len(list: &List) -> usize {
    match list {
        List::Cons(_, rest) => 1 + len(rest),
        List::Nil => 0,
    }
}`,
      },
    },

    // ----- Control / result types ----------------------------------------
    {
      id: "ty-control",
      title: "Control & result types",
      content: {
        type: "read",
        markdown:
          "Standard-library types that model presence and outcome:\n- **`Option<T>`** — `Some(x)` or `None`: ==maybe a value==\n- **`Result<T, E>`** — `Ok(x)` or `Err(e)`: ==success or failure==\n- **`!`** — the ==never type==: it has *no values*, and it is the type of expressions that never produce one (`panic!()`, `loop {}`, `return`/`break`)\n\n`Option` and `Result` are ordinary `enum`s — the methods (`?`, `map`, `unwrap_or`, …) are drilled in the Option/Result and Error curricula.",
      },
    },
    {
      id: "ty-option-result-enums",
      title: "Option & Result are enums",
      content: {
        type: "multiple-choice",
        question: "In the type taxonomy, what are `Option<T>` and `Result<T, E>`?",
        options: [
          "Standard-library enums (sum types)",
          "Primitive scalar types",
          "Traits implemented by every type",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "ty-never",
      title: "The never type",
      content: {
        type: "multiple-choice",
        question: "What is the never type `!`?",
        options: [
          "A type with no values — the type of expressions that never return (panic!, loop {})",
          "A nullable pointer",
          "Another name for the unit type `()`",
        ],
        answerIndex: 0,
      },
    },

    // ----- Abstraction types ---------------------------------------------
    {
      id: "ty-abstraction",
      title: "Abstraction types",
      content: {
        type: "read",
        markdown:
          "Types that stand in for *other* types:\n- **generic parameter** — `fn f<T>(x: T)`: a placeholder the caller/compiler fills in\n- **`impl Trait`** — `-> impl Iterator`: *some* concrete type implementing the trait, chosen by the function, hidden from the caller (static dispatch)\n- **`dyn Trait`** — `Box<dyn Draw>`: a ==trait object==, dynamic dispatch through a vtable at runtime\n- **function item type** — the unique zero-sized type of one specific `fn`\n- **function pointer** — `fn(i32) -> i32`: a pointer to a callable with a known signature\n- **closure type** — each closure has its own unique, anonymous, compiler-generated type",
      },
    },
    {
      id: "ty-generic-param",
      title: "Generic parameter",
      content: {
        type: "multiple-choice",
        question: "In `fn f<T>(x: T)`, what is `T`?",
        options: [
          "A generic type parameter — a placeholder filled in by the caller/compiler",
          "A trait that T must implement",
          "A concrete type named T",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "ty-impl-vs-dyn",
      title: "impl Trait vs dyn Trait",
      content: {
        type: "multiple-choice",
        question: "How do `impl Trait` and `dyn Trait` differ as types?",
        options: [
          "`impl Trait` is one hidden concrete type (static dispatch); `dyn Trait` is a trait object (dynamic dispatch)",
          "`impl Trait` is heap-allocated; `dyn Trait` is stack-allocated",
          "They are interchangeable spellings",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "ty-fn-pointer",
      title: "Function pointer type",
      content: {
        type: "multiple-choice",
        question: "What does the type `fn(i32) -> i32` describe?",
        options: [
          "A function pointer — a callable with that exact signature",
          "A closure that captured an i32",
          "A trait for arithmetic",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "ty-closure-type",
      title: "Closure types",
      content: {
        type: "multiple-choice",
        question: "What is the type of a closure like `|x| x + 1`?",
        options: [
          "A unique, anonymous type the compiler generates for that closure",
          "Always `fn(i32) -> i32`",
          "`Box<dyn Fn>` by default",
        ],
        answerIndex: 0,
      },
    },

    // ----- Systems / unsafe types ----------------------------------------
    {
      id: "ty-systems",
      title: "Systems & unsafe types",
      content: {
        type: "read",
        markdown:
          "Low-level type forms, mostly used behind `unsafe` or FFI:\n- **`*const T`** — a C-like read raw pointer\n- **`*mut T`** — a C-like mutable raw pointer (dereferencing either requires `unsafe`)\n- **`union`** — overlapping memory layout (C-style); reading a field is usually `unsafe`\n- **`extern type`** — an opaque foreign type used across an FFI boundary\n\nContrast with references (`&T`/`&mut T`): raw pointers carry no borrow-checker guarantees.",
      },
    },
    {
      id: "ty-raw-pointers",
      title: "Raw pointers",
      content: {
        type: "multiple-choice",
        question: "What is true of raw pointers `*const T` / `*mut T`?",
        options: [
          "They are C-like pointers; dereferencing them requires `unsafe`",
          "They are borrow-checked like `&T`",
          "They can never be null",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "ty-union",
      title: "union",
      content: {
        type: "multiple-choice",
        question: "What is a `union` in Rust?",
        options: [
          "A type whose fields share the same memory; reading a field is usually `unsafe`",
          "An enum with named variants",
          "A trait combining two other traits",
        ],
        answerIndex: 0,
      },
    },

    // ----- Type-system forms ---------------------------------------------
    {
      id: "ty-forms",
      title: "Type-system forms",
      content: {
        type: "read",
        markdown:
          "Ways of *naming* types rather than new runtime things:\n- **type alias** — `type UserId = u64;` — another name for an existing type (not a new type)\n- **associated type** — `Iterator::Item` — a type chosen by a trait implementation\n- **projection** — `<T as Iterator>::Item` — explicitly naming an associated type\n- **`Self`** — the implementing/current type\n- **inferred `_`** — `let x: _ = 5;` — ask the compiler to infer it\n\n(`type` aliases and `Self` are drilled in the Keywords curriculum; this glossary just places them in the type map.)",
      },
    },
    {
      id: "ty-associated-type",
      title: "Associated types",
      content: {
        type: "multiple-choice",
        question: "What is `Iterator::Item`?",
        options: [
          "An associated type — a type chosen by each `Iterator` implementation",
          "A method on Iterator",
          "A lifetime parameter",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "ty-inferred",
      title: "Inferred type",
      content: {
        type: "multiple-choice",
        question: "What does the `_` mean in `let x: _ = 5;`?",
        options: [
          "Ask the compiler to infer the type",
          "Declare x as the never type",
          "Make x mutable",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "ty-write-unit-fn",
      title: "Write: a unit-returning fn",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn announce(msg: &str)` that takes a string slice and prints it — its return type is the unit type `()`.",
        solution: `fn announce(msg: &str) {
    println!("{msg}");
}`,
      },
    },
  ],
  edges: [
    // Overview → each family glossary (+ the model drill).
    { from: "ty-overview", to: "ty-mental-model" },
    { from: "ty-overview", to: "ty-scalars" },
    { from: "ty-overview", to: "ty-compound" },
    { from: "ty-overview", to: "ty-borrows" },
    { from: "ty-overview", to: "ty-owned" },
    { from: "ty-overview", to: "ty-control" },
    { from: "ty-overview", to: "ty-abstraction" },
    { from: "ty-overview", to: "ty-systems" },
    { from: "ty-overview", to: "ty-forms" },
    // Scalars.
    { from: "ty-scalars", to: "ty-default-int" },
    { from: "ty-scalars", to: "ty-default-float" },
    { from: "ty-scalars", to: "ty-usize" },
    { from: "ty-scalars", to: "ty-unsigned" },
    { from: "ty-scalars", to: "ty-char" },
    // Compound.
    { from: "ty-compound", to: "ty-unit" },
    { from: "ty-compound", to: "ty-array-vs-slice" },
    { from: "ty-compound", to: "ty-tuple-access" },
    { from: "ty-compound", to: "ty-tuple-fn" },
    // Borrows.
    { from: "ty-borrows", to: "ty-ref-vs-mutref" },
    { from: "ty-borrows", to: "ty-str-category" },
    { from: "ty-borrows", to: "ty-dst" },
    { from: "ty-array-vs-slice", to: "ty-dst" }, // bridge: array/slice → DST
    // Owned heap.
    { from: "ty-owned", to: "ty-owned-group" },
    { from: "ty-owned", to: "ty-owned-vs-borrowed" },
    { from: "ty-owned", to: "ty-box-recursive" },
    { from: "ty-borrows", to: "ty-owned-vs-borrowed" }, // bridge: views ↔ owned
    // Control / result.
    { from: "ty-control", to: "ty-option-result-enums" },
    { from: "ty-control", to: "ty-never" },
    // Abstraction.
    { from: "ty-abstraction", to: "ty-generic-param" },
    { from: "ty-abstraction", to: "ty-impl-vs-dyn" },
    { from: "ty-abstraction", to: "ty-fn-pointer" },
    { from: "ty-abstraction", to: "ty-closure-type" },
    // Systems.
    { from: "ty-systems", to: "ty-raw-pointers" },
    { from: "ty-systems", to: "ty-union" },
    // Forms.
    { from: "ty-forms", to: "ty-associated-type" },
    { from: "ty-forms", to: "ty-inferred" },
    { from: "ty-forms", to: "ty-write-unit-fn" },
    { from: "ty-compound", to: "ty-write-unit-fn" }, // bridge: unit type ↔ forms
  ],
};
