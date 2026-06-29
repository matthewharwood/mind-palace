import { describe, expect, test } from "bun:test";

import { checkCode, normalizeCode } from "./code";

describe("normalizeCode", () => {
  test("removes formatting whitespace, keeping word-boundary gaps", () => {
    expect(normalizeCode("  fn   main() {\n   }  ")).toBe("fn main(){}");
    expect(normalizeCode("let x = 5;")).toBe("let x=5;");
  });

  test("keeps a single space between word tokens (no token merging)", () => {
    expect(normalizeCode("let x")).not.toBe(normalizeCode("letx"));
    expect(normalizeCode("fn  main")).toBe("fn main");
  });

  test("preserves string literals verbatim (their spaces are semantic)", () => {
    expect(normalizeCode('"Hello, world!"')).toBe('"Hello, world!"');
    expect(normalizeCode('  "a b"  ')).toBe('"a b"');
  });

  test("preserves char literals and leaves lifetimes intact", () => {
    expect(normalizeCode("'z'")).toBe("'z'");
    expect(normalizeCode("fn f<'a>(x: &'a str)")).toBe("fn f<'a>(x:&'a str)");
  });
});

describe("checkCode", () => {
  const solution = 'fn main() {\n    println!("Hello, world!");\n}';

  test("accepts any spacing — indentation, newlines, spaces around punctuation", () => {
    expect(checkCode(solution, solution)).toBe(true);
    expect(checkCode('fn main() { println!("Hello, world!"); }', solution)).toBe(true);
    expect(checkCode('fn main(){println!("Hello, world!");}', solution)).toBe(true);
    expect(checkCode('fn main() {\n  println!("Hello, world!");\n}\n', solution)).toBe(true);
  });

  test("rejects token differences and string-content differences", () => {
    expect(checkCode('fn main() { println!("hello"); }', solution)).toBe(false);
    // a missing space INSIDE the string is still a real difference
    expect(checkCode('fn main() { println!("Hello,world!"); }', solution)).toBe(false);
    expect(checkCode("fn main() {}", solution)).toBe(false);
  });
});
