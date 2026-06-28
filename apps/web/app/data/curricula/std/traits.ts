import type { Curriculum } from "@mind-palace/curriculum";

import { source } from "./_source";

// std: the ubiquitous traits — From/Into, TryFrom, Default, Clone/Copy, Eq/Ord,
// Display/Debug, AsRef, Iterator. Every snippet rustc-verified (edition 2024).
export const traits: Curriculum = {
  id: "c-std-traits",
  title: "Common Traits",
  source,
  nodes: [
    {
      id: "conversion-traits",
      title: "From / Into / TryFrom",
      content: {
        type: "read",
        markdown:
          "Implement `From<A> for B` and you get `Into<B> for A` **for free**. Prefer accepting `impl Into<T>` for flexible APIs. `TryFrom`/`TryInto` are the fallible versions (returning `Result`). `AsRef<T>` gives a cheap reference conversion (e.g. accept `impl AsRef<str>`).",
      },
    },
    {
      id: "comparison-traits",
      title: "Eq, Ord & deriving",
      content: {
        type: "read",
        markdown:
          "`PartialEq`/`Eq` enable `==`; `PartialOrd`/`Ord` enable `<`, sorting, `min`/`max`. `#[derive(...)]` implements them field-by-field (lexicographic for `Ord`). `Hash` (often derived alongside `Eq`) lets a type be a `HashMap` key.",
      },
    },
    {
      id: "formatting-ops",
      title: "Display, Debug, Default, Clone",
      content: {
        type: "read",
        markdown:
          "`{}` uses `Display` (hand-written), `{:?}` uses `Debug` (usually derived). `Default` supplies `T::default()`. `Clone` gives explicit `.clone()`; `Copy` marks simple types that duplicate implicitly on move. `Deref` lets a wrapper act like its target; `Drop` customizes cleanup.",
      },
    },
    {
      id: "from-into-output",
      title: "From",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let s = String::from("hi");
    let n: i64 = i64::from(5_i32);
    println!("{s}-{n}");
}`,
        options: ["hi-5", "hi5", "5-hi"],
        answerIndex: 0,
      },
    },
    {
      id: "default-output",
      title: "derive(Default)",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `#[derive(Default, Debug)]
struct Config {
    verbose: bool,
    level: i32,
}

fn main() {
    let c = Config::default();
    println!("{c:?}");
}`,
        options: [
          "Config { verbose: false, level: 0 }",
          "Config { verbose: true, level: 1 }",
          "Config {}",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "version-sort-output",
      title: "derive(Ord)",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `#[derive(PartialEq, Eq, PartialOrd, Ord, Debug)]
struct Version(u32, u32);

fn main() {
    let mut vs = vec![Version(1, 2), Version(1, 0), Version(0, 9)];
    vs.sort();
    println!("{:?}", vs[0]);
}`,
        options: ["Version(0, 9)", "Version(1, 0)", "Version(1, 2)"],
        answerIndex: 0,
      },
    },
    {
      id: "display-output",
      title: "impl Display",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `use std::fmt;

struct Celsius(f64);

impl fmt::Display for Celsius {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}C", self.0)
    }
}

fn main() {
    println!("{}", Celsius(20.0));
}`,
        options: ["20C", "Celsius(20.0)", "20"],
        answerIndex: 0,
      },
    },
    {
      id: "clone-output",
      title: "Clone",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `#[derive(Clone)]
struct Point {
    x: i32,
}

fn main() {
    let a = Point { x: 1 };
    let b = a.clone();
    println!("{} {}", a.x, b.x);
}`,
        options: ["1 1", "1", "compile error"],
        answerIndex: 0,
      },
    },
    {
      id: "from-concept",
      title: "From gives Into",
      content: {
        type: "multiple-choice",
        question: "If you implement `From<A> for B`, what do you get automatically?",
        options: ["Into<B> for A", "Display for B", "Clone for B"],
        answerIndex: 0,
      },
    },
    {
      id: "copy-clone-concept",
      title: "Copy vs Clone",
      content: {
        type: "multiple-choice",
        question: "How does `Copy` differ from `Clone`?",
        options: [
          "Copy must be called explicitly",
          "Copy is an implicit, cheap bitwise duplicate for simple types",
          "They are identical",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "debug-display-concept",
      title: "{} vs {:?}",
      content: {
        type: "multiple-choice",
        question: "Which traits do `{}` and `{:?}` use, respectively?",
        options: ["Debug, then Display", "Display, then Debug", "Both use Display"],
        answerIndex: 1,
      },
    },
    {
      id: "impl-from",
      title: "Write: impl From",
      content: {
        type: "code",
        language: "rust",
        prompt: "For `struct Cents(i32)`, implement `From<i32> for Cents` that stores the value.",
        solution: `struct Cents(i32);

impl From<i32> for Cents {
    fn from(value: i32) -> Cents {
        Cents(value)
    }
}`,
      },
    },
    {
      id: "impl-display",
      title: "Write: impl Display",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "For `struct Point { x: i32, y: i32 }`, implement `Display` to format as `(x, y)` (use `std::fmt`).",
        solution: `use std::fmt;

struct Point {
    x: i32,
    y: i32,
}

impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}`,
      },
    },
    {
      id: "derive-traits",
      title: "Write: derive a bundle",
      content: {
        type: "code",
        language: "rust",
        prompt: "Define `struct Id(u32)` deriving `Debug`, `Clone`, `Copy`, and `PartialEq`.",
        solution: `#[derive(Debug, Clone, Copy, PartialEq)]
struct Id(u32);`,
      },
    },
    {
      id: "impl-default",
      title: "Write: impl Default",
      content: {
        type: "code",
        language: "rust",
        prompt: "For `struct Settings { volume: i32 }`, implement `Default` with `volume` 50.",
        solution: `struct Settings {
    volume: i32,
}

impl Default for Settings {
    fn default() -> Settings {
        Settings { volume: 50 }
    }
}`,
      },
    },
    {
      id: "into-generic",
      title: "Write: accept impl Into",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn to_string_len<S: Into<String>>(s: S) -> usize` that converts to `String` and returns its length.",
        solution: `fn to_string_len<S: Into<String>>(s: S) -> usize {
    s.into().len()
}`,
      },
    },
    {
      id: "impl-tryfrom",
      title: "Write: impl TryFrom",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'For `struct Even(i32)`, implement `TryFrom<i32>` with `Error = String`, returning `Err("odd".to_string())` for odd values.',
        solution: `struct Even(i32);

impl TryFrom<i32> for Even {
    type Error = String;

    fn try_from(value: i32) -> Result<Even, String> {
        if value % 2 == 0 {
            Ok(Even(value))
        } else {
            Err("odd".to_string())
        }
    }
}`,
      },
    },
    {
      id: "impl-iterator",
      title: "Write: impl Iterator",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "For `struct Countdown { n: u32 }`, implement `Iterator` (`Item = u32`) yielding `n, n-1, …, 1` then `None`.",
        solution: `struct Countdown {
    n: u32,
}

impl Iterator for Countdown {
    type Item = u32;

    fn next(&mut self) -> Option<u32> {
        if self.n == 0 {
            None
        } else {
            let current = self.n;
            self.n -= 1;
            Some(current)
        }
    }
}`,
      },
    },
    {
      id: "as-ref-fn",
      title: "Write: accept AsRef<str>",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `fn str_len<S: AsRef<str>>(s: S) -> usize` returning the length of the `&str` view via `as_ref()`.",
        solution: `fn str_len<S: AsRef<str>>(s: S) -> usize {
    s.as_ref().len()
}`,
      },
    },
  ],
  // Network core: the trait foundation underpins the formatting-trait family
  // (chord), and `derive` spans comparison (PartialEq/Ord) AND formatting
  // (Debug/Clone) traits (bridge). Honest, acyclic.
  edges: [
    { from: "conversion-traits", to: "comparison-traits" },
    { from: "comparison-traits", to: "formatting-ops" },
    { from: "conversion-traits", to: "formatting-ops" }, // trait basics underpin Display/Debug/etc.
    { from: "formatting-ops", to: "derive-traits" }, // #[derive] covers Debug/Clone too
    { from: "conversion-traits", to: "from-into-output" },
    { from: "conversion-traits", to: "from-concept" },
    { from: "conversion-traits", to: "impl-from" },
    { from: "conversion-traits", to: "into-generic" },
    { from: "conversion-traits", to: "impl-tryfrom" },
    { from: "conversion-traits", to: "as-ref-fn" },
    { from: "comparison-traits", to: "version-sort-output" },
    { from: "comparison-traits", to: "derive-traits" },
    { from: "comparison-traits", to: "impl-iterator" },
    { from: "formatting-ops", to: "default-output" },
    { from: "formatting-ops", to: "display-output" },
    { from: "formatting-ops", to: "clone-output" },
    { from: "formatting-ops", to: "copy-clone-concept" },
    { from: "formatting-ops", to: "debug-display-concept" },
    { from: "formatting-ops", to: "impl-display" },
    { from: "formatting-ops", to: "impl-default" },
  ],
};
