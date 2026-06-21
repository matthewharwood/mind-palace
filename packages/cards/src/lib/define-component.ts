import type * as z from "zod";

// Pillar 2 — Zod-first props. Dev-only parse via `import.meta.env.DEV` so Vite's
// static replacement tree-shakes the parse call out of production bundles. On a
// parse failure in dev the throw surfaces in the browser console as a failed
// contract; fix it, don't suppress.
//
// This package ships its own copy (it must not import the app's `~/lib`) so it
// stays portable — clone `packages/cards/` and it works with no app glue.
export function defineComponent<S extends z.ZodType, R>(
  schema: S,
  fn: (props: z.infer<S>) => R,
): (props: z.infer<S>) => R {
  if (import.meta.env.DEV) {
    return (props) => fn(schema.parse(props));
  }
  return fn;
}
