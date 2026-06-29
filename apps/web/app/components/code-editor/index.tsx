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
  /** Focus the editor on mount so the caret lands in the code (write-code cards). */
  autoFocus: z.boolean().optional(),
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
    autoFocus = false,
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
        const [
          { rust },
          { EditorState, Prec },
          { HighlightStyle, syntaxHighlighting },
          { tags: t },
          { basicSetup, EditorView: View },
        ] = await Promise.all([
          import("@codemirror/lang-rust"),
          import("@codemirror/state"),
          import("@codemirror/language"),
          import("@lezer/highlight"),
          import("codemirror"),
        ]);
        if (cancelled) return;
        // Theme + syntax colours are theme-aware via CSS vars (--cm-*, defined in
        // index.css for light + .dark), so the editable editor reads correctly in
        // both modes — the default CodeMirror highlight is light-only.
        const theme = View.theme({
          "&": { backgroundColor: "transparent", fontSize: "13px", color: "var(--cm-fg)" },
          ".cm-content": { fontFamily: MONO, caretColor: "var(--cm-fg)" },
          ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--cm-fg)" },
          ".cm-gutters": {
            fontFamily: MONO,
            backgroundColor: "transparent",
            border: "none",
            color: "var(--cm-comment)",
          },
          ".cm-activeLine": { backgroundColor: "rgb(127 127 127 / 0.07)" },
          ".cm-activeLineGutter": { backgroundColor: "transparent" },
          ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
            backgroundColor: "rgb(127 127 127 / 0.22)",
          },
          ".cm-scroller": { lineHeight: "1.65" },
        });
        const codeHighlight = syntaxHighlighting(
          HighlightStyle.define([
            {
              tag: [
                t.keyword,
                t.modifier,
                t.controlKeyword,
                t.operatorKeyword,
                t.definitionKeyword,
              ],
              color: "var(--cm-keyword)",
            },
            { tag: [t.string, t.special(t.string)], color: "var(--cm-string)" },
            { tag: [t.number, t.bool, t.atom], color: "var(--cm-number)" },
            {
              tag: [t.lineComment, t.blockComment, t.comment],
              color: "var(--cm-comment)",
              fontStyle: "italic",
            },
            {
              tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName],
              color: "var(--cm-function)",
            },
            { tag: [t.typeName, t.className, t.namespace], color: "var(--cm-type)" },
            {
              tag: [t.operator, t.punctuation, t.bracket, t.separator, t.derefOperator],
              color: "var(--cm-punct)",
            },
            {
              tag: [t.variableName, t.propertyName, t.attributeName],
              color: "var(--cm-variable)",
            },
            { tag: [t.meta, t.annotation], color: "var(--cm-function)" },
          ]),
        );
        const extensions = [basicSetup, theme, Prec.highest(codeHighlight), View.lineWrapping];
        if (language === "rust") extensions.push(rust());
        if (readOnly) extensions.push(EditorState.readOnly.of(true));
        if (ariaLabel) extensions.push(View.contentAttributes.of({ "aria-label": ariaLabel }));
        extensions.push(
          View.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current?.(update.state.doc.toString());
          }),
        );
        view = new View({ doc: initialRef.current, parent: host, extensions });
        // Land the caret in the editor on mount (write-code cards) so the first
        // keystroke types code — no click/tab needed.
        if (autoFocus && !readOnly) view.focus();
      })();
      return () => {
        cancelled = true;
        view?.destroy();
      };
    }, [language, readOnly, ariaLabel, autoFocus]);

    return <div ref={hostRef} className={className ?? "mp-code-editor"} />;
  },
);
