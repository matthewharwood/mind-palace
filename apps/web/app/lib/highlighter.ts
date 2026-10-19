import type { HighlighterCore } from "shiki/core";

// Shiki syntax highlighter for all READ-ONLY code surfaces (inline `code` and
// fenced blocks in cards), any language. Loaded lazily as a singleton so the
// grammars/WASM land in their own chunk — only on lesson nodes, never on the
// home/study paths. The editable answer field keeps CodeMirror (code-editor).
//
// Dual light/dark themes: the emitted HTML carries both colours via CSS vars
// (`--shiki-dark`); `app/styles/index.css` swaps them under `.dark`.

const THEMES = { dark: "github-dark", light: "github-light" } as const;
const ALIASES: Record<string, string> = {
  js: "typescript",
  sh: "bash",
  shell: "bash",
  ts: "typescript",
};

let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    // Import only the six supported grammars. The full bundle emits hundreds
    // of unused grammar chunks, including individual files over 600 kB.
    highlighterPromise = Promise.all([import("shiki/core"), import("shiki/engine/oniguruma")]).then(
      ([shiki, { createOnigurumaEngine }]) =>
        shiki.createHighlighterCore({
          engine: createOnigurumaEngine(import("shiki/wasm")),
          langs: [
            import("shiki/langs/rust.mjs"),
            import("shiki/langs/bash.mjs"),
            import("shiki/langs/json.mjs"),
            import("shiki/langs/toml.mjs"),
            import("shiki/langs/typescript.mjs"),
            import("shiki/langs/tsx.mjs"),
          ],
          themes: [import("shiki/themes/github-light.mjs"), import("shiki/themes/github-dark.mjs")],
        }),
    );
  }
  return highlighterPromise;
}

/** Highlight `code` to a themed HTML string. `inline` omits the <pre>/<code> wrapper. */
export async function highlightToHtml(code: string, lang: string, inline = false): Promise<string> {
  const highlighter = await getHighlighter();
  const requested = ALIASES[lang] ?? lang;
  const resolved = highlighter.getLoadedLanguages().includes(requested) ? requested : "rust";
  // defaultColor:false emits only `--shiki-light` / `--shiki-dark` CSS vars (no
  // hard-coded inline colour), so index.css can swap themes under `.dark` without
  // any !important fight against inline styles.
  return highlighter.codeToHtml(code, {
    defaultColor: false,
    lang: resolved,
    themes: THEMES,
    ...(inline ? { structure: "inline" } : {}),
  });
}
