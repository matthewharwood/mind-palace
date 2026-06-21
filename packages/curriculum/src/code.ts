// Verification for `code` flashcards. There is no client-side Rust toolchain on
// static hosting, so this is a "typed it correctly" check, not a compile/run:
// collapse all runs of whitespace (indentation, newlines, blank lines) to single
// spaces and trim, then compare. Forgiving of indentation/line-breaks/trailing
// space; strict on token spelling and inline spacing (it can't invent a missing
// space, and won't strip spaces inside string literals). Pure → unit-testable.

const WHITESPACE_RUN = /\s+/g;

/** Collapse insignificant whitespace to a canonical token stream. */
export function normalizeCode(source: string): string {
  return source.replace(WHITESPACE_RUN, " ").trim();
}

/** Does the typed code match the solution, ignoring formatting? */
export function checkCode(typed: string, solution: string): boolean {
  return normalizeCode(typed) === normalizeCode(solution);
}
