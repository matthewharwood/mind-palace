import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// Rust Syntax — quick-hit mastery of how Rust is *written*. Distinct from the
// Types (taxonomy) and Keywords (semantics) tracks: here every card drills the
// literal syntax — pick the correct form, judge a snippet true/false, spot the
// invalid one, or predict what a snippet prints. Multiple angles per concept
// give the spaced-repetition engine enough variety that getting them all right
// is real mastery. Behavioral "what prints?" cards are rustc-verified by
// scripts/verify-rust-cards.ts; recognition cards are authored to match them.
export const syntax: Curriculum = {
  id: "c-rust-syntax",
  title: "Rust Syntax",
  source,
  nodes: [
    {
      id: "sx-overview",
      title: "Reading Rust syntax",
      content: {
        type: "read",
        markdown:
          "This track drills the *shape* of Rust code — the punctuation and ordering that the compiler insists on. The anchor example: `let mut x: i32 = 5;`\n\n- `let` introduces a binding · `mut` makes it reassignable\n- `x` is the name · `: i32` is the ==type annotation== (name first, then `:`, then type)\n- `= 5` binds the value · `;` ends the statement\n\nThe quick-hit cards ahead come in four shapes: **pick the correct syntax**, **true/false** on a snippet, **spot the invalid one**, and **what does it print?** Get them all green and you can read any Rust line on sight.",
      },
    },

    // ===== Area 1: Scalar type syntax ====================================
    {
      id: "sx-int-signed",
      title: "Signed integer type",
      content: {
        type: "multiple-choice",
        question: "How do you write the type of a signed 32-bit integer?",
        options: ["i32", "int32", "Int32"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-int-unsigned",
      title: "Unsigned integer type",
      content: {
        type: "multiple-choice",
        question: "How do you write the type of an unsigned 64-bit integer?",
        options: ["u64", "uint64", "unsigned64"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-float-type",
      title: "Float type",
      content: {
        type: "multiple-choice",
        question: "Which is the 64-bit floating-point type?",
        options: ["f64", "float64", "double"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-num-underscore",
      title: "Readable number literal",
      content: {
        type: "multiple-choice",
        question: "Which is the valid way to write one million as a readable literal?",
        options: ["1_000_000", "1,000,000", "1.000.000"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-int-suffix",
      title: "Typed integer literal",
      content: {
        type: "multiple-choice",
        question: "Which literal is a `u8` written with a type suffix?",
        options: ["5u8", "5:u8", "u8(5)"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-hex-literal",
      title: "Hex literal",
      content: {
        type: "multiple-choice",
        question: "Which is a valid hexadecimal literal for 255?",
        options: ["0xff", "ff", "hex(255)"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-annot-tf",
      title: "Type annotation order",
      content: {
        type: "multiple-choice",
        question: "True or false: `let x: i32 = 5;` correctly annotates `x` as an `i32`.",
        options: ["True", "False"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-annot-wrong-tf",
      title: "C-style annotation",
      content: {
        type: "multiple-choice",
        question: "True or false: `let i32 x = 5;` is the correct Rust type annotation.",
        options: ["False — the name comes first: `let x: i32 = 5;`", "True"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-suffix-prints",
      title: "Suffixed literal",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let x = 250u8;
    println!("{x}");
}`,
        options: ["250", "250u8", "0"],
        answerIndex: 0,
      },
    },

    // ===== Area 2: Compound type syntax ==================================
    {
      id: "sx-tuple-type",
      title: "Tuple type",
      content: {
        type: "multiple-choice",
        question: "How do you write the type of a tuple holding an `i32` and a `bool`?",
        options: ["(i32, bool)", "[i32, bool]", "{i32, bool}"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-array-type",
      title: "Array type",
      content: {
        type: "multiple-choice",
        question: "How do you write the type of an array of four `i32`s?",
        options: ["[i32; 4]", "[i32, 4]", "Array<i32, 4>"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-array-repeat",
      title: "Repeated array literal",
      content: {
        type: "multiple-choice",
        question: "Which literal builds an array of three zeros using the repeat form?",
        options: ["[0; 3]", "[0 : 3]", "(0; 3)"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-tuple-access",
      title: "Tuple element access",
      content: {
        type: "multiple-choice",
        question: "How do you read the first element of a tuple `t`?",
        options: ["t.0", "t[0]", "t.first()"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-unit-type",
      title: "The unit type",
      content: {
        type: "multiple-choice",
        question: "How is the unit type (and value) written?",
        options: ["()", "null", "void"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-one-tuple-tf",
      title: "One-element tuple",
      content: {
        type: "multiple-choice",
        question: "True or false: a one-element tuple needs a trailing comma, e.g. `(5,)`.",
        options: ["True", "False"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-array-spot",
      title: "Spot the array type",
      content: {
        type: "multiple-choice",
        question: "Which is NOT a valid array type or literal?",
        options: ["[i32, 4]", "[i32; 4]", "[1, 2, 3]"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-array-index-prints",
      title: "Array indexing",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let a = [10, 20, 30];
    println!("{}", a[1]);
}`,
        options: ["20", "10", "30"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-tuple-prints",
      title: "Tuple math",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let t = (4, 5);
    println!("{}", t.0 + t.1);
}`,
        options: ["9", "45", "5"],
        answerIndex: 0,
      },
    },

    // ===== Area 3: References, slices, str ================================
    {
      id: "sx-shared-ref",
      title: "Shared reference type",
      content: {
        type: "multiple-choice",
        question: "How do you write the type of a shared reference to an `i32`?",
        options: ["&i32", "*i32", "ref i32"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-mut-ref",
      title: "Mutable reference type",
      content: {
        type: "multiple-choice",
        question: "How do you write the type of an exclusive, mutable reference to an `i32`?",
        options: ["&mut i32", "mut &i32", "&i32 mut"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-str-slice",
      title: "String slice type",
      content: {
        type: "multiple-choice",
        question: "What is the usual type of a borrowed string slice?",
        options: ["&str", "string", "str&"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-slice-type",
      title: "Slice type",
      content: {
        type: "multiple-choice",
        question: "How do you write the type of a slice of `i32`s?",
        options: ["&[i32]", "&{i32}", "slice<i32>"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-borrow-tf",
      title: "Borrow operator",
      content: {
        type: "multiple-choice",
        question: "True or false: `&x` borrows `x` immutably.",
        options: ["True", "False"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-mutref-spot",
      title: "Spot the mutable reference",
      content: {
        type: "multiple-choice",
        question: "Which correctly writes an exclusive mutable borrow of `x`?",
        options: ["&mut x", "mut& x", "&x mut"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-ref-prints",
      title: "Borrowing a String",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let s = String::from("hi");
    let r: &str = &s;
    println!("{r}");
}`,
        options: ["hi", "&hi", "String"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-mutref-prints",
      title: "Mutating through a reference",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let mut n = 1;
    let r = &mut n;
    *r += 9;
    println!("{n}");
}`,
        options: ["10", "1", "9"],
        answerIndex: 0,
      },
    },

    // ===== Area 4: Generic syntax ========================================
    {
      id: "sx-vec-type",
      title: "Vec type",
      content: {
        type: "multiple-choice",
        question: "How do you write the type of a growable list of `i32`?",
        options: ["Vec<i32>", "Vec[i32]", "Array<i32>"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-option-type",
      title: "Option type",
      content: {
        type: "multiple-choice",
        question: "How do you write the type of an optional `String`?",
        options: ["Option<String>", "Option(String)", "String?"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-hashmap-type",
      title: "HashMap type",
      content: {
        type: "multiple-choice",
        question: "How do you write a map from `String` to `i32`?",
        options: ["HashMap<String, i32>", "HashMap<String -> i32>", "Map(String, i32)"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-generic-fn",
      title: "Generic function header",
      content: {
        type: "multiple-choice",
        question: "Which is the correct header for a generic function?",
        options: ["fn f<T>(x: T)", "fn <T> f(x: T)", "fn f(x: T)<T>"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-trait-bound",
      title: "Trait bound",
      content: {
        type: "multiple-choice",
        question: "Which adds a `Clone` bound to a generic parameter?",
        options: [
          "fn f<T: Clone>(x: T)",
          "fn f<T is Clone>(x: T)",
          "fn f<T implements Clone>(x: T)",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "sx-generics-bracket-tf",
      title: "Generic brackets",
      content: {
        type: "multiple-choice",
        question: "True or false: generics are written with square brackets, like `Vec[i32]`.",
        options: ["False — generics use angle brackets: `Vec<i32>`", "True"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-vec-macro",
      title: "vec! macro",
      content: {
        type: "multiple-choice",
        question: "Which builds a vector with the standard macro?",
        options: ["vec![1, 2, 3]", "Vec![1, 2, 3]", "vector![1, 2, 3]"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-vec-prints",
      title: "Vec length",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let v: Vec<i32> = vec![1, 2, 3];
    println!("{}", v.len());
}`,
        options: ["3", "6", "0"],
        answerIndex: 0,
      },
    },

    // ===== Area 5: Bindings & declarations ===============================
    {
      id: "sx-let-immut",
      title: "Immutable binding",
      content: {
        type: "multiple-choice",
        question: "Which declares an immutable binding `x` of value 5?",
        options: ["let x = 5;", "var x = 5;", "x := 5;"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-let-mut",
      title: "Mutable binding",
      content: {
        type: "multiple-choice",
        question: "Which declares a mutable binding?",
        options: ["let mut x = 5;", "let x mut = 5;", "mut let x = 5;"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-let-typed",
      title: "Typed binding",
      content: {
        type: "multiple-choice",
        question: "Which declares `x` with an explicit `i32` type?",
        options: ["let x: i32 = 5;", "let i32 x = 5;", "let x = 5: i32;"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-const-decl",
      title: "const declaration",
      content: {
        type: "multiple-choice",
        question: "Which is a valid `const` declaration?",
        options: ["const MAX: u32 = 100;", "const MAX = 100;", "let const MAX = 100;"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-static-decl",
      title: "static declaration",
      content: {
        type: "multiple-choice",
        question: "Which is a valid `static` declaration?",
        options: ['static NAME: &str = "mp";', 'static NAME = "mp";', 'let static NAME = "mp";'],
        answerIndex: 0,
      },
    },
    {
      id: "sx-reassign-tf",
      title: "Reassign without mut",
      content: {
        type: "multiple-choice",
        question: "True or false: `let x = 5; x = 6;` compiles.",
        options: ["False — `x` is immutable without `mut`", "True"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-binding-spot",
      title: "Spot the invalid binding",
      content: {
        type: "multiple-choice",
        question: "Which is NOT a valid binding statement?",
        options: ["mut x = 5;", "let x = 5;", "let mut x = 5;"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-shadow-prints",
      title: "Shadowing",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let x = 5;
    let x = x + 1;
    println!("{x}");
}`,
        options: ["6", "5", "error"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-mut-prints",
      title: "Mutating a binding",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let mut n = 1;
    n += 2;
    println!("{n}");
}`,
        options: ["3", "1", "12"],
        answerIndex: 0,
      },
    },

    // ===== Area 6: Functions & closures ==================================
    {
      id: "sx-fn-decl",
      title: "Function returning a value",
      content: {
        type: "multiple-choice",
        question: "Which declares a function that returns an `i32`?",
        options: ["fn f() -> i32 { 5 }", "fn f(): i32 { 5 }", "function f() -> i32 { 5 }"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-fn-params",
      title: "Function parameters",
      content: {
        type: "multiple-choice",
        question: "Which header takes two `i32`s and returns an `i32`?",
        options: [
          "fn add(a: i32, b: i32) -> i32",
          "fn add(a, b: i32) -> i32",
          "fn add(i32 a, i32 b) -> i32",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "sx-closure",
      title: "Closure syntax",
      content: {
        type: "multiple-choice",
        question: "Which is a closure that adds 1 to its argument?",
        options: ["|x| x + 1", "(x) => x + 1", "lambda x: x + 1"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-closure-noargs",
      title: "Zero-argument closure",
      content: {
        type: "multiple-choice",
        question: "Which is a closure taking no arguments and returning 42?",
        options: ["|| 42", "() => 42", "||-> 42"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-implicit-return-tf",
      title: "Implicit return",
      content: {
        type: "multiple-choice",
        question:
          "True or false: a function's final expression with no trailing `;` is its return value.",
        options: ["True", "False"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-semicolon-return-tf",
      title: "Trailing semicolon",
      content: {
        type: "multiple-choice",
        question: "True or false: `fn f() -> i32 { 5; }` returns 5.",
        options: ["False — the `;` discards it, so the body yields `()`", "True"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-arrow-spot",
      title: "Spot the invalid function",
      content: {
        type: "multiple-choice",
        question: "Which is NOT valid function syntax?",
        options: ["fn f() => i32 { 5 }", "fn f() -> i32 { 5 }", "fn f() {}"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-fn-prints",
      title: "Calling a function",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn dbl(n: i32) -> i32 {
    n * 2
}

fn main() {
    println!("{}", dbl(21));
}`,
        options: ["42", "21", "2"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-closure-prints",
      title: "Calling a closure",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let add = |a, b| a + b;
    println!("{}", add(2, 3));
}`,
        options: ["5", "23", "6"],
        answerIndex: 0,
      },
    },

    // ===== Area 7: Structs & enums =======================================
    {
      id: "sx-struct-def",
      title: "Struct definition",
      content: {
        type: "multiple-choice",
        question: "Which defines a struct with fields `x` and `y`?",
        options: [
          "struct Point { x: i32, y: i32 }",
          "class Point { x: i32, y: i32 }",
          "struct Point = { x: i32, y: i32 }",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "sx-tuple-struct",
      title: "Tuple struct",
      content: {
        type: "multiple-choice",
        question: "Which defines a tuple struct?",
        options: ["struct Pair(i32, i32);", "struct Pair[i32, i32];", "struct Pair{i32, i32};"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-struct-instantiate",
      title: "Struct instantiation",
      content: {
        type: "multiple-choice",
        question: "Which creates a `Point` with `x` = 1 and `y` = 2?",
        options: ["Point { x: 1, y: 2 }", "Point(x = 1, y = 2)", "new Point { 1, 2 }"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-enum-def",
      title: "Enum definition",
      content: {
        type: "multiple-choice",
        question: "Which defines an enum with two variants?",
        options: ["enum Dir { Up, Down }", "enum Dir = Up | Down;", "enum Dir { Up | Down }"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-enum-data",
      title: "Enum variant with data",
      content: {
        type: "multiple-choice",
        question: "Which enum variant correctly holds an `f64`?",
        options: [
          "enum Shape { Circle(f64) }",
          "enum Shape { Circle: f64 }",
          "enum Shape { Circle = f64 }",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "sx-field-access",
      title: "Field access",
      content: {
        type: "multiple-choice",
        question: "How do you read field `x` of a struct value `p`?",
        options: ["p.x", "p->x", "p[x]"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-struct-comma-tf",
      title: "Struct field separators",
      content: {
        type: "multiple-choice",
        question: "True or false: struct fields are separated by commas.",
        options: ["True", "False"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-struct-prints",
      title: "Struct field value",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `struct P {
    x: i32,
}

fn main() {
    let p = P { x: 7 };
    println!("{}", p.x);
}`,
        options: ["7", "0", "x"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-enum-prints",
      title: "Matching an enum",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `enum Dir {
    Up,
    Down,
}

fn main() {
    let d = Dir::Up;
    let s = match d {
        Dir::Up => "up",
        Dir::Down => "down",
    };
    println!("{s}");
}`,
        options: ["up", "down", "Up"],
        answerIndex: 0,
      },
    },

    // ===== Area 8: Traits & impls ========================================
    {
      id: "sx-trait-def",
      title: "Trait definition",
      content: {
        type: "multiple-choice",
        question: "Which defines a trait with one method signature?",
        options: [
          "trait Area { fn area(&self) -> f64; }",
          "trait Area { area(&self) -> f64; }",
          "interface Area { fn area(&self) -> f64; }",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "sx-impl-trait-for",
      title: "Implementing a trait",
      content: {
        type: "multiple-choice",
        question: "Which implements trait `Area` for type `Circle`?",
        options: ["impl Area for Circle {}", "impl Circle for Area {}", "impl Circle: Area {}"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-inherent-impl",
      title: "Inherent impl",
      content: {
        type: "multiple-choice",
        question: "Which adds methods directly to `Circle` (no trait)?",
        options: ["impl Circle {}", "impl for Circle {}", "class Circle {}"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-trait-object",
      title: "Boxed trait object",
      content: {
        type: "multiple-choice",
        question: "Which writes a boxed trait object for `Area`?",
        options: ["Box<dyn Area>", "Box<Area>", "Box<impl Area>"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-impl-return",
      title: "Returning impl Trait",
      content: {
        type: "multiple-choice",
        question: "Which return type means 'some iterator of i32'?",
        options: ["-> impl Iterator<Item = i32>", "-> Iterator<i32>", "-> dyn Iterator"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-impl-order-tf",
      title: "impl ordering",
      content: {
        type: "multiple-choice",
        question: "True or false: you implement a trait with `impl Type for Trait`.",
        options: ["False — it is `impl Trait for Type`", "True"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-where-clause",
      title: "where clause",
      content: {
        type: "multiple-choice",
        question: "Which is a valid `where` clause bounding `T` by `Clone`?",
        options: ["where T: Clone", "where T is Clone", "where Clone(T)"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-trait-prints",
      title: "Trait method call",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `struct C;

trait Answer {
    fn go(&self) -> i32;
}

impl Answer for C {
    fn go(&self) -> i32 {
        42
    }
}

fn main() {
    let c = C;
    println!("{}", c.go());
}`,
        options: ["42", "0", "C"],
        answerIndex: 0,
      },
    },

    // ===== Area 9: Control flow ==========================================
    {
      id: "sx-if-expr",
      title: "if as an expression",
      content: {
        type: "multiple-choice",
        question: "Which assigns from an `if` expression?",
        options: [
          "let y = if c { 1 } else { 2 };",
          "let y = if c then 1 else 2;",
          "let y = c ? 1 : 2;",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "sx-match-arm",
      title: "match arm syntax",
      content: {
        type: "multiple-choice",
        question: "Which is a correctly written `match` arm?",
        options: ["Some(x) => x,", "Some(x): x,", "case Some(x): x"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-for-loop",
      title: "for loop syntax",
      content: {
        type: "multiple-choice",
        question: "Which iterates `x` over 0,1,2,3,4?",
        options: ["for x in 0..5 {}", "for x in 0 to 5 {}", "foreach x in 0..5 {}"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-range-excl-tf",
      title: "Exclusive range",
      content: {
        type: "multiple-choice",
        question: "True or false: the range `0..5` includes 5.",
        options: ["False — `..` is exclusive of the end", "True"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-range-incl-tf",
      title: "Inclusive range",
      content: {
        type: "multiple-choice",
        question: "True or false: the range `0..=5` includes 5.",
        options: ["True", "False"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-while-let",
      title: "while let syntax",
      content: {
        type: "multiple-choice",
        question: "Which loops while `it.next()` yields `Some`?",
        options: [
          "while let Some(x) = it.next() {}",
          "while Some(x) = it.next() {}",
          "while let Some(x) in it {}",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "sx-loop-kw",
      title: "Infinite loop",
      content: {
        type: "multiple-choice",
        question: "Which is Rust's keyword for an infinite loop?",
        options: ["loop {}", "forever {}", "repeat {}"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-if-prints",
      title: "if expression value",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let n = 10;
    let s = if n > 5 { "big" } else { "small" };
    println!("{s}");
}`,
        options: ["big", "small", "10"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-for-prints",
      title: "for loop sum",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let mut s = 0;
    for i in 1..=4 {
        s += i;
    }
    println!("{s}");
}`,
        options: ["10", "6", "4"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-match-prints",
      title: "match value",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let n = 2;
    let s = match n {
        1 => "one",
        2 => "two",
        _ => "many",
    };
    println!("{s}");
}`,
        options: ["two", "one", "many"],
        answerIndex: 0,
      },
    },

    // ===== Area 10: Literals & macros ====================================
    {
      id: "sx-string-lit",
      title: "String literal",
      content: {
        type: "multiple-choice",
        question: "Which is a string literal?",
        options: ['"hello"', "'hello'", "hello"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-char-lit",
      title: "char literal",
      content: {
        type: "multiple-choice",
        question: "Which is a `char` literal?",
        options: ["'z'", '"z"', "char(z)"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-bool-lit",
      title: "Boolean literals",
      content: {
        type: "multiple-choice",
        question: "How are Rust's boolean literals written?",
        options: ["true / false", "True / False", "TRUE / FALSE"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-quotes-tf",
      title: "Quote styles",
      content: {
        type: "multiple-choice",
        question: "True or false: strings use double quotes and `char`s use single quotes.",
        options: ["True", "False"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-char-string-tf",
      title: "Single-quoted text",
      content: {
        type: "multiple-choice",
        question: "True or false: `'hello'` is a valid Rust string.",
        options: ["False — single quotes are only for a single `char`", "True"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-raw-string",
      title: "Raw string literal",
      content: {
        type: "multiple-choice",
        question: "Which is a raw string literal (backslashes are literal)?",
        options: ['r"C:\\path"', 'raw"C:\\path"', '"C:\\path"r'],
        answerIndex: 0,
      },
    },
    {
      id: "sx-println-named",
      title: "Inline format argument",
      content: {
        type: "multiple-choice",
        question: "Which prints the variable `x` using an inline named argument?",
        options: ['println!("{x}")', 'println!("$x")', 'println!("%x")'],
        answerIndex: 0,
      },
    },
    {
      id: "sx-println-prints",
      title: "Positional format",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    println!("{}-{}", 1, 2);
}`,
        options: ["1-2", "{}-{}", "12"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-format-prints",
      title: "Inline format value",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let x = 5;
    println!("x={x}");
}`,
        options: ["x=5", "x={x}", "5"],
        answerIndex: 0,
      },
    },

    // ===== Area 11: Paths, use, modules, visibility ======================
    {
      id: "sx-use",
      title: "use import",
      content: {
        type: "multiple-choice",
        question: "Which brings `HashMap` into scope?",
        options: [
          "use std::collections::HashMap;",
          "import std::collections::HashMap;",
          "include std::collections::HashMap;",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "sx-path-sep",
      title: "Path separator",
      content: {
        type: "multiple-choice",
        question: "Which separator joins path segments in Rust?",
        options: ["std::io::Read", "std.io.Read", "std/io/Read"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-use-as",
      title: "Renaming an import",
      content: {
        type: "multiple-choice",
        question: "Which imports `bar` under the name `baz`?",
        options: ["use foo::bar as baz;", "use foo::bar => baz;", "use foo::bar named baz;"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-mod",
      title: "Module declaration",
      content: {
        type: "multiple-choice",
        question: "Which declares a module named `utils`?",
        options: ["mod utils {}", "module utils {}", "namespace utils {}"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-pub",
      title: "Public visibility",
      content: {
        type: "multiple-choice",
        question: "Which makes a function public?",
        options: ["pub fn f() {}", "public fn f() {}", "export fn f() {}"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-import-tf",
      title: "import vs use",
      content: {
        type: "multiple-choice",
        question: "True or false: you bring an item into scope with `import std::io;`.",
        options: ["False — Rust uses the `use` keyword", "True"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-crate-path",
      title: "Crate-root path",
      content: {
        type: "multiple-choice",
        question: "Which writes an absolute path starting at the crate root?",
        options: ["crate::config::PORT", "root::config::PORT", "global::config::PORT"],
        answerIndex: 0,
      },
    },

    // ===== Area 12: Operators, casts & common syntax =====================
    {
      id: "sx-as-cast",
      title: "Numeric cast",
      content: {
        type: "multiple-choice",
        question: "How do you cast `x` to a `u8`?",
        options: ["x as u8", "(u8) x", "u8(x)"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-compound-assign",
      title: "Compound assignment",
      content: {
        type: "multiple-choice",
        question: "Which adds 5 to `n` in place (requires `n` to be `mut`)?",
        options: ["n += 5;", "n =+ 5;", "n =< 5;"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-question-mark",
      title: "The ? operator",
      content: {
        type: "multiple-choice",
        question: "Which propagates an error early from a function returning `Result`?",
        options: ["let x = f()?;", "let x = f()!;", "let x = try f();"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-derive",
      title: "derive attribute",
      content: {
        type: "multiple-choice",
        question: "Which auto-derives `Debug` for the struct below it?",
        options: ["#[derive(Debug)]", "@derive(Debug)", "#derive[Debug]"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-self-receiver",
      title: "Immutable self receiver",
      content: {
        type: "multiple-choice",
        question: "Which method signature takes a shared borrow of the instance?",
        options: ["fn area(&self) -> f64", "fn area(self&) -> f64", "fn area(this) -> f64"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-mut-self",
      title: "Mutable self receiver",
      content: {
        type: "multiple-choice",
        question: "Which method signature takes an exclusive, mutable borrow of the instance?",
        options: ["fn bump(&mut self)", "fn bump(mut self&)", "fn bump(self mut)"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-turbofish",
      title: "Turbofish",
      content: {
        type: "multiple-choice",
        question: "Which uses the turbofish to tell `parse` to produce an `i32`?",
        options: ["s.parse::<i32>()", "s.parse<i32>()", "s.parse(i32)"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-as-prints",
      title: "Cast truncation",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let n = 3.9_f64 as i32;
    println!("{n}");
}`,
        options: ["3", "4", "3.9"],
        answerIndex: 0,
      },
    },
    {
      id: "sx-compound-prints",
      title: "Compound assignment value",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let mut n = 10;
    n -= 3;
    n *= 2;
    println!("{n}");
}`,
        options: ["14", "17", "4"],
        answerIndex: 0,
      },
    },
  ],
  edges: [
    // Overview → each area lead.
    { from: "sx-overview", to: "sx-int-signed" },
    { from: "sx-overview", to: "sx-tuple-type" },
    { from: "sx-overview", to: "sx-shared-ref" },
    { from: "sx-overview", to: "sx-vec-type" },
    { from: "sx-overview", to: "sx-let-immut" },
    // Area 1: scalars.
    { from: "sx-int-signed", to: "sx-int-unsigned" },
    { from: "sx-int-signed", to: "sx-float-type" },
    { from: "sx-int-signed", to: "sx-num-underscore" },
    { from: "sx-int-signed", to: "sx-int-suffix" },
    { from: "sx-int-signed", to: "sx-hex-literal" },
    { from: "sx-int-signed", to: "sx-annot-tf" },
    { from: "sx-int-signed", to: "sx-annot-wrong-tf" },
    { from: "sx-int-suffix", to: "sx-suffix-prints" },
    // Area 2: compound.
    { from: "sx-tuple-type", to: "sx-array-type" },
    { from: "sx-tuple-type", to: "sx-array-repeat" },
    { from: "sx-tuple-type", to: "sx-tuple-access" },
    { from: "sx-tuple-type", to: "sx-unit-type" },
    { from: "sx-tuple-type", to: "sx-one-tuple-tf" },
    { from: "sx-array-type", to: "sx-array-spot" },
    { from: "sx-array-type", to: "sx-array-index-prints" },
    { from: "sx-tuple-access", to: "sx-tuple-prints" },
    // Area 3: references.
    { from: "sx-shared-ref", to: "sx-mut-ref" },
    { from: "sx-shared-ref", to: "sx-str-slice" },
    { from: "sx-shared-ref", to: "sx-slice-type" },
    { from: "sx-shared-ref", to: "sx-borrow-tf" },
    { from: "sx-mut-ref", to: "sx-mutref-spot" },
    { from: "sx-str-slice", to: "sx-ref-prints" },
    { from: "sx-mut-ref", to: "sx-mutref-prints" },
    // Area 4: generics.
    { from: "sx-vec-type", to: "sx-option-type" },
    { from: "sx-vec-type", to: "sx-hashmap-type" },
    { from: "sx-vec-type", to: "sx-generic-fn" },
    { from: "sx-generic-fn", to: "sx-trait-bound" },
    { from: "sx-vec-type", to: "sx-generics-bracket-tf" },
    { from: "sx-vec-type", to: "sx-vec-macro" },
    { from: "sx-vec-macro", to: "sx-vec-prints" },
    // Area 5: bindings.
    { from: "sx-let-immut", to: "sx-let-mut" },
    { from: "sx-let-immut", to: "sx-let-typed" },
    { from: "sx-let-immut", to: "sx-const-decl" },
    { from: "sx-const-decl", to: "sx-static-decl" },
    { from: "sx-let-mut", to: "sx-reassign-tf" },
    { from: "sx-let-immut", to: "sx-binding-spot" },
    { from: "sx-let-immut", to: "sx-shadow-prints" },
    { from: "sx-let-mut", to: "sx-mut-prints" },
    // Overview → areas 6-11 leads.
    { from: "sx-overview", to: "sx-fn-decl" },
    { from: "sx-overview", to: "sx-struct-def" },
    { from: "sx-overview", to: "sx-trait-def" },
    { from: "sx-overview", to: "sx-if-expr" },
    { from: "sx-overview", to: "sx-string-lit" },
    { from: "sx-overview", to: "sx-use" },
    // Area 6: functions & closures.
    { from: "sx-fn-decl", to: "sx-fn-params" },
    { from: "sx-fn-decl", to: "sx-closure" },
    { from: "sx-closure", to: "sx-closure-noargs" },
    { from: "sx-fn-decl", to: "sx-implicit-return-tf" },
    { from: "sx-fn-decl", to: "sx-semicolon-return-tf" },
    { from: "sx-fn-decl", to: "sx-arrow-spot" },
    { from: "sx-fn-decl", to: "sx-fn-prints" },
    { from: "sx-closure", to: "sx-closure-prints" },
    // Area 7: structs & enums.
    { from: "sx-struct-def", to: "sx-tuple-struct" },
    { from: "sx-struct-def", to: "sx-struct-instantiate" },
    { from: "sx-struct-def", to: "sx-enum-def" },
    { from: "sx-enum-def", to: "sx-enum-data" },
    { from: "sx-struct-def", to: "sx-field-access" },
    { from: "sx-struct-def", to: "sx-struct-comma-tf" },
    { from: "sx-struct-def", to: "sx-struct-prints" },
    { from: "sx-enum-def", to: "sx-enum-prints" },
    // Area 8: traits & impls.
    { from: "sx-trait-def", to: "sx-impl-trait-for" },
    { from: "sx-trait-def", to: "sx-inherent-impl" },
    { from: "sx-trait-def", to: "sx-trait-object" },
    { from: "sx-trait-def", to: "sx-impl-return" },
    { from: "sx-impl-trait-for", to: "sx-impl-order-tf" },
    { from: "sx-trait-def", to: "sx-where-clause" },
    { from: "sx-trait-def", to: "sx-trait-prints" },
    // Area 9: control flow.
    { from: "sx-if-expr", to: "sx-match-arm" },
    { from: "sx-if-expr", to: "sx-for-loop" },
    { from: "sx-for-loop", to: "sx-range-excl-tf" },
    { from: "sx-for-loop", to: "sx-range-incl-tf" },
    { from: "sx-if-expr", to: "sx-while-let" },
    { from: "sx-for-loop", to: "sx-loop-kw" },
    { from: "sx-if-expr", to: "sx-if-prints" },
    { from: "sx-for-loop", to: "sx-for-prints" },
    { from: "sx-match-arm", to: "sx-match-prints" },
    // Area 10: literals & macros.
    { from: "sx-string-lit", to: "sx-char-lit" },
    { from: "sx-string-lit", to: "sx-bool-lit" },
    { from: "sx-string-lit", to: "sx-quotes-tf" },
    { from: "sx-char-lit", to: "sx-char-string-tf" },
    { from: "sx-string-lit", to: "sx-raw-string" },
    { from: "sx-string-lit", to: "sx-println-named" },
    { from: "sx-println-named", to: "sx-println-prints" },
    { from: "sx-println-named", to: "sx-format-prints" },
    // Area 11: paths, use, modules.
    { from: "sx-use", to: "sx-path-sep" },
    { from: "sx-use", to: "sx-use-as" },
    { from: "sx-use", to: "sx-mod" },
    { from: "sx-mod", to: "sx-pub" },
    { from: "sx-use", to: "sx-import-tf" },
    { from: "sx-use", to: "sx-crate-path" },
    // Area 12: operators, casts & common syntax.
    { from: "sx-overview", to: "sx-as-cast" },
    { from: "sx-as-cast", to: "sx-compound-assign" },
    { from: "sx-as-cast", to: "sx-question-mark" },
    { from: "sx-as-cast", to: "sx-derive" },
    { from: "sx-as-cast", to: "sx-self-receiver" },
    { from: "sx-self-receiver", to: "sx-mut-self" },
    { from: "sx-as-cast", to: "sx-turbofish" },
    { from: "sx-as-cast", to: "sx-as-prints" },
    { from: "sx-compound-assign", to: "sx-compound-prints" },
  ],
};
