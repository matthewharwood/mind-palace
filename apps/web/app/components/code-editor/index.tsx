import type { EditorView } from "codemirror";
import { type ReactNode, useEffect, useRef } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";

// All code surfaces render in JetBrains Mono (the `--font-mono` token). Rust
// syntax highlighting comes from `basicSetup`'s default highlight style + the
// `rust()` language; the theme below only fixes the typeface and spacing.
const MONO = 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)';

// CodeMirror 6 editor. A side channel like PixiJS/anime.js — the EditorView
// mutates the DOM imperatively, so it's created in useEffect and render stays
// pure. Initial value + onChange flow via refs so the editor inits once; the
// editor is the input (uncontrolled), React mirrors changes through onChange.
export const CodeEditorPropsSchema = z.object({
  initialValue: z.string().optional(),
  language: z.string().optional(),
  readOnly: z.boolean().optional(),
  ariaLabel: z.string().optional(),
  className: z.string().optional(),
  onChange: z.custom<(value: string) => void>().optional(),
});
export type CodeEditorProps = z.infer<typeof CodeEditorPropsSchema>;

export const CodeEditor = defineComponent(
  CodeEditorPropsSchema,
  ({
    initialValue = "",
    language = "rust",
    readOnly = false,
    ariaLabel,
    className,
    onChange,
  }: CodeEditorProps): ReactNode => {
    const hostRef = useRef<HTMLDivElement>(null);
    const initialRef = useRef(initialValue);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;
      let view: EditorView | undefined;
      let cancelled = false;
      // CodeMirror is heavy and only needed on lesson nodes — load it lazily so
      // it stays out of the main bundle (react-doctor/prefer-dynamic-import).
      void (async () => {
        const [{ rust }, { EditorState }, { basicSetup, EditorView: View }] = await Promise.all([
          import("@codemirror/lang-rust"),
          import("@codemirror/state"),
          import("codemirror"),
        ]);
        if (cancelled) return;
        const theme = View.theme({
          "&": { backgroundColor: "transparent", fontSize: "13px" },
          ".cm-content": { fontFamily: MONO },
          ".cm-gutters": { fontFamily: MONO, backgroundColor: "transparent", border: "none" },
          ".cm-scroller": { lineHeight: "1.65" },
        });
        const extensions = [basicSetup, theme, View.lineWrapping];
        if (language === "rust") extensions.push(rust());
        if (readOnly) extensions.push(EditorState.readOnly.of(true));
        if (ariaLabel) extensions.push(View.contentAttributes.of({ "aria-label": ariaLabel }));
        extensions.push(
          View.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current?.(update.state.doc.toString());
          }),
        );
        view = new View({ doc: initialRef.current, parent: host, extensions });
      })();
      return () => {
        cancelled = true;
        view?.destroy();
      };
    }, [language, readOnly, ariaLabel]);

    return <div ref={hostRef} className={className ?? "mp-code-editor"} />;
  },
);
