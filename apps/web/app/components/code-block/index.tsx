import { type ReactNode, useEffect, useState } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import { highlightToHtml } from "~/lib/highlighter";

// Read-only, syntax-highlighted code via Shiki (see lib/highlighter). Renders
// the raw code first, then swaps in highlighted HTML once the (lazy) highlighter
// resolves — no layout shift, works during SSR/prerender (emits plain code).
// `inline` renders an inline <code> chip; otherwise a bordered block. The
// highlighted text is real DOM text, so no aria-label is needed for a screen
// reader to read it.

export const CodeBlockPropsSchema = z.object({
  code: z.string(),
  language: z.string().optional(),
  inline: z.boolean().optional(),
});
export type CodeBlockProps = z.infer<typeof CodeBlockPropsSchema>;

const INLINE_CLASS =
  "mp-inline-code rounded bg-midnight-ink/[0.06] px-1.5 py-0.5 font-mono text-[0.85em] text-midnight-ink";
const BLOCK_CLASS = "mp-code-block overflow-x-auto rounded-lg border border-black/10 text-[13px]";

export const CodeBlock = defineComponent(
  CodeBlockPropsSchema,
  ({ code, language = "rust", inline = false }: CodeBlockProps): ReactNode => {
    const [html, setHtml] = useState<string | null>(null);

    useEffect(() => {
      let active = true;
      highlightToHtml(code, language, inline).then(
        (result) => {
          if (active) setHtml(result);
        },
        () => undefined,
      );
      return () => {
        active = false;
      };
    }, [code, language, inline]);

    if (inline) {
      return html ? (
        <code
          className={INLINE_CLASS}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki output of build-time-authored curriculum code — trusted, never user input.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <code className={INLINE_CLASS}>{code}</code>
      );
    }

    return html ? (
      <div
        className={BLOCK_CLASS}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki output of build-time-authored curriculum code — trusted, never user input.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    ) : (
      <pre className={`${BLOCK_CLASS} p-3 font-mono`}>{code}</pre>
    );
  },
);
