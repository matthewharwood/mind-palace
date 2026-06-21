// Minimal ambient declaration so `import.meta.env.DEV` type-checks without
// taking a dependency on `vite/client` types. Keeps the package self-contained
// and portable; bundlers (Vite) statically replace `import.meta.env.DEV` so the
// dev-only Zod parse in `define-component.ts` tree-shakes out of production.
interface ImportMetaEnv {
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// CSS side-effect imports (the bundler handles these; TS just needs the shape).
declare module "*.css";

// Asset URL imports — the bundler turns these into a fingerprinted, base-path-
// safe URL string. Lets the default sound registry ship its audio with the
// package without depending on vite/client types.
declare module "*.mp3" {
  const src: string;
  export default src;
}
