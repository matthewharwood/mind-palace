// Verification for `code` flashcards. There is no client-side Rust toolchain on
// static hosting, so this is a "typed it correctly" check, not a compile/run.
//
// We normalize away ALL formatting whitespace so the learner never has to match
// the solution's spacing — EXCEPT:
//   • inside string ("…") and char ('…') literals, which are copied verbatim, so
//     `"Hello, world!"` still has to be exact (its spaces are semantic); and
//   • a single space is kept between two word characters, so token boundaries
//     survive (`let x` ≠ `letx`, `fn main` ≠ `fnmain`).
// Everything else — indentation, line breaks, spaces around `(){};,=+` etc. — is
// removed. So `fn main(){println!("hi")}` matches `fn main() {\n  println!("hi")\n}`.
// Pure → unit-testable.

const WORD = /\w/;
const WHITESPACE = /\s/;
// A char literal: a quote, then one char (or an escape), then a quote. A bare
// `'a` (a lifetime like `&'a str`) does NOT match and is treated as punctuation.
const CHAR_LITERAL = /^'(?:\\.|[^'\\])'/;

/** Collapse insignificant whitespace, preserving string/char literals + token gaps. */
export function normalizeCode(source: string): string {
  let out = "";
  let pendingSpace = false;
  let i = 0;
  while (i < source.length) {
    const ch = source.charAt(i);

    // String literal — copy verbatim (handling \" escapes).
    if (ch === '"') {
      out += '"';
      i += 1;
      while (i < source.length) {
        const c = source.charAt(i);
        out += c;
        i += 1;
        if (c === "\\" && i < source.length) {
          out += source.charAt(i);
          i += 1;
          continue;
        }
        if (c === '"') break;
      }
      pendingSpace = false;
      continue;
    }

    // Char literal (but not a lifetime) — copy verbatim.
    if (ch === "'") {
      const match = CHAR_LITERAL.exec(source.slice(i));
      if (match) {
        out += match[0];
        i += match[0].length;
        pendingSpace = false;
        continue;
      }
      // else: a lifetime tick — fall through and treat `'` as a normal char.
    }

    if (WHITESPACE.test(ch)) {
      pendingSpace = true;
      i += 1;
      continue;
    }

    // A real token char: keep a single separating space only between word chars.
    if (pendingSpace) {
      const prev = out.charAt(out.length - 1);
      if (WORD.test(prev) && WORD.test(ch)) out += " ";
      pendingSpace = false;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** Does the typed code match the solution, ignoring formatting? */
export function checkCode(typed: string, solution: string): boolean {
  return normalizeCode(typed) === normalizeCode(solution);
}
