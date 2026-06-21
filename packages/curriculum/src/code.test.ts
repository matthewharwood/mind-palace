import { describe, expect, test } from "bun:test";

import { checkCode, normalizeCode } from "./code";

describe("normalizeCode", () => {
  test("collapses whitespace runs and trims", () => {
    expect(normalizeCode("  fn   main() {\n   }  ")).toBe("fn main() { }");
  });
});

describe("checkCode", () => {
  const solution = 'fn main() {\n    println!("Hello, world!");\n}';

  test("accepts the solution regardless of indentation/newlines", () => {
    expect(checkCode(solution, solution)).toBe(true);
    // collapsed onto one line
    expect(checkCode('fn main() { println!("Hello, world!"); }', solution)).toBe(true);
    // different indentation + extra blank lines + trailing whitespace
    expect(checkCode('fn main() {\n  println!("Hello, world!");\n}\n', solution)).toBe(true);
  });

  test("rejects token differences", () => {
    expect(checkCode('fn main() { println!("hello"); }', solution)).toBe(false);
    expect(checkCode("fn main() {}", solution)).toBe(false);
  });
});
