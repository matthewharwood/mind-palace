import { rust } from "@codemirror/lang-rust";
import { EditorState } from "@codemirror/state";
import { basicSetup, EditorView } from "codemirror";
import { type ReactNode, useEffect, useRef } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";

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
      const extensions = [basicSetup, EditorView.lineWrapping];
      if (language === "rust") extensions.push(rust());
      if (readOnly) extensions.push(EditorState.readOnly.of(true));
      if (ariaLabel) extensions.push(EditorView.contentAttributes.of({ "aria-label": ariaLabel }));
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current?.(update.state.doc.toString());
        }),
      );
      const view = new EditorView({ doc: initialRef.current, parent: host, extensions });
      return () => view.destroy();
    }, [language, readOnly, ariaLabel]);

    return <div ref={hostRef} className={className ?? "mp-code-editor"} />;
  },
);
