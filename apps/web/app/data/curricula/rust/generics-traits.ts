import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// Generics, Traits & Lifetimes. Language semantics; every snippet rustc-verified
// (edition 2024).
export const genericsTraits: Curriculum = {
  id: "c-rust-generics-traits",
  title: "Generics, Traits & Lifetimes",
  source,
  nodes: [
    {
      id: "generics-basics",
      title: "Generics",
      content: {
        type: "read",
        markdown:
          "Generics (`<T>`) let one definition work over many types: `fn largest<T: PartialOrd>(...)`, `struct Wrapper<T>`. The compiler **monomorphizes** generics into concrete code per type used, so there's no runtime cost. Constraints (`T: Trait`) restrict what `T` can be.",
      },
    },
    {
      id: "traits-basics",
      title: "Traits",
      content: {
        type: "read",
        markdown:
          "A **trait** is shared behavior types can implement (like an interface): `trait Area { fn area(&self) -> f64; }`. Traits can supply **default methods**. Use them as bounds (`T: Area`, `impl Area`), as `impl Trait` return types, or as `dyn Trait` objects. `#[derive(...)]` auto-implements common traits like `Debug`.",
      },
    },
    {
      id: "lifetimes-basics",
      title: "Lifetimes",
      content: {
        type: "read",
        markdown:
          "Lifetimes are generic parameters (`'a`) describing how long references are valid, so the borrow checker can prove none dangle. They appear on functions returning references (`fn longest<'a>(...) -> &'a str`) and on structs holding references. Most are inferred by **elision**.",
      },
    },
    {
      id: "monomorphization",
      title: "Cost of generics",
      content: {
        type: "multiple-choice",
        question: "What runtime cost do Rust generics add?",
        options: [
          "Dynamic dispatch on every call",
          "None — they're monomorphized to concrete code",
          "Each value is boxed on the heap",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "trait-purpose",
      title: "What a trait is",
      content: {
        type: "multiple-choice",
        question: "What does a trait define?",
        options: [
          "A concrete type",
          "Shared behavior a type can implement",
          "A fixed memory layout",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "trait-bound-syntax",
      title: "Trait bounds",
      content: {
        type: "multiple-choice",
        question: "In `fn f<T: std::fmt::Display>(x: T)`, the bound means `T` must:",
        options: ["Be a type named Display", "Implement the Display trait", "Be a reference"],
        answerIndex: 1,
      },
    },
    {
      id: "lifetime-purpose",
      title: "What lifetimes express",
      content: {
        type: "multiple-choice",
        question: "What do lifetime annotations such as `'a` tell the compiler?",
        options: [
          "How long the whole program runs",
          "How references' validity relates, so none dangle",
          "To allocate the value on the heap",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "impl-trait-return",
      title: "impl Trait return",
      content: {
        type: "multiple-choice",
        question: "What does `fn make() -> impl Iterator<Item = i32>` return?",
        options: [
          "A trait object on the heap",
          "Some single concrete type that implements Iterator",
          "A Box<dyn Iterator>",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "generic-fn-output",
      title: "Generic largest",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn largest<T: PartialOrd + Copy>(list: &[T]) -> T {
    let mut max = list[0];
    for &item in list {
        if item > max {
            max = item;
        }
    }
    max
}

fn main() {
    println!("{}", largest(&[3, 7, 2, 9, 4]));
}`,
        options: ["3", "9", "4"],
        answerIndex: 1,
      },
    },
    {
      id: "trait-default-output",
      title: "Default trait method",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `trait Greet {
    fn name(&self) -> String;
    fn hello(&self) -> String {
        format!("Hello, {}", self.name())
    }
}

struct Dog;

impl Greet for Dog {
    fn name(&self) -> String {
        String::from("Rex")
    }
}

fn main() {
    println!("{}", Dog.hello());
}`,
        options: ["Hello, Rex", "Rex", "Hello"],
        answerIndex: 0,
      },
    },
    {
      id: "derive-debug-output",
      title: "derive(Debug)",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `#[derive(Debug)]
struct P {
    x: i32,
    y: i32,
}

fn main() {
    let p = P { x: 1, y: 2 };
    println!("{:?}", p);
}`,
        options: ["P { x: 1, y: 2 }", "(1, 2)", "P(1, 2)"],
        answerIndex: 0,
      },
    },
    {
      id: "generic-pair",
      title: "Write: a generic function",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a generic function `fn pair<T: Clone>(x: T) -> (T, T)` returning two copies of `x` (clone the first).",
        solution: `fn pair<T: Clone>(x: T) -> (T, T) {
    (x.clone(), x)
}`,
      },
    },
    {
      id: "largest-generic",
      title: "Write: generic largest",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn largest<T: PartialOrd + Copy>(list: &[T]) -> T` returning the largest element.",
        solution: `fn largest<T: PartialOrd + Copy>(list: &[T]) -> T {
    let mut max = list[0];
    for &item in list {
        if item > max {
            max = item;
        }
    }
    max
}`,
      },
    },
    {
      id: "trait-def",
      title: "Write: define a trait",
      content: {
        type: "code",
        language: "rust",
        prompt: "Define a trait `Area` with a single method `fn area(&self) -> f64`.",
        solution: `trait Area {
    fn area(&self) -> f64;
}`,
      },
    },
    {
      id: "trait-impl",
      title: "Write: implement a trait",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Define a trait `Area { fn area(&self) -> f64; }`, a `struct Square { side: f64 }`, and implement `Area` for `Square`.",
        solution: `trait Area {
    fn area(&self) -> f64;
}

struct Square {
    side: f64,
}

impl Area for Square {
    fn area(&self) -> f64 {
        self.side * self.side
    }
}`,
      },
    },
    {
      id: "trait-default",
      title: "Write: default method",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Define a trait `Named` with `fn name(&self) -> String` and a default method `fn greeting(&self) -> String` returning `"Hi, <name>"` (use `format!`).',
        solution: `trait Named {
    fn name(&self) -> String;
    fn greeting(&self) -> String {
        format!("Hi, {}", self.name())
    }
}`,
      },
    },
    {
      id: "struct-lifetime",
      title: "Write: struct holding a reference",
      content: {
        type: "code",
        language: "rust",
        prompt: "Define a struct `Excerpt<'a>` with a single field `part: &'a str`.",
        solution: `struct Excerpt<'a> {
    part: &'a str,
}`,
      },
    },
    {
      id: "longest",
      title: "Write: longest with a lifetime",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn longest<'a>(a: &'a str, b: &'a str) -> &'a str` returning the longer slice (use `.len()`).",
        solution: `fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() > b.len() {
        a
    } else {
        b
    }
}`,
      },
    },
    {
      id: "print-all",
      title: "Write: generic print",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a generic function `fn print_all<T: std::fmt::Display>(items: &[T])` that prints each item on its own line.",
        solution: `fn print_all<T: std::fmt::Display>(items: &[T]) {
    for item in items {
        println!("{item}");
    }
}`,
      },
    },
  ],
  edges: [
    { from: "generics-basics", to: "traits-basics" },
    { from: "traits-basics", to: "lifetimes-basics" },
    { from: "generics-basics", to: "monomorphization" },
    { from: "generics-basics", to: "generic-fn-output" },
    { from: "generics-basics", to: "generic-pair" },
    { from: "generics-basics", to: "largest-generic" },
    { from: "generics-basics", to: "print-all" },
    { from: "traits-basics", to: "trait-purpose" },
    { from: "traits-basics", to: "trait-bound-syntax" },
    { from: "traits-basics", to: "trait-default-output" },
    { from: "traits-basics", to: "derive-debug-output" },
    { from: "traits-basics", to: "impl-trait-return" },
    { from: "traits-basics", to: "trait-def" },
    { from: "traits-basics", to: "trait-impl" },
    { from: "traits-basics", to: "trait-default" },
    { from: "lifetimes-basics", to: "lifetime-purpose" },
    { from: "lifetimes-basics", to: "struct-lifetime" },
    { from: "lifetimes-basics", to: "longest" },
  ],
};
