import { type ReactNode, useState } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import { DESKTOP_QUERY, useMediaQuery } from "~/lib/use-media-query";

// GraphView — presentational toggle between a visual diagram and a list of the
// same content. Defaults follow the viewport: list on a phone (`<md`), diagram
// on desktop (`≥md`); a segmented control lets the user override either way.
//
// The diagram is mounted ONLY while active — its PixiJS canvas must size against
// a laid-out parent, so a hidden (0×0) canvas would init broken. Conditional
// render means switching to the diagram mounts it fresh at the right size (and a
// phone never pays for WebGL by default).
//
// In diagram view the list is still rendered `sr-only`: a <canvas> exposes no
// accessible tree, so the real <Link> list is the keyboard/screen-reader/crawler
// surface in BOTH views (this is also what the app-level route tests drive).
type View = "list" | "diagram";

function ViewTab({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}): ReactNode {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={`rounded-md px-3 py-1.5 font-medium text-sm transition-colors ${
        active ? "bg-blue-600 text-white" : "text-slate-300 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

export const GraphViewPropsSchema = z.object({
  diagram: z.custom<ReactNode>(),
  list: z.custom<ReactNode>(),
  diagramLabel: z.string().optional(),
  listLabel: z.string().optional(),
});
export type GraphViewProps = z.infer<typeof GraphViewPropsSchema>;

export const GraphView = defineComponent(
  GraphViewPropsSchema,
  ({ diagram, list, diagramLabel = "Diagram", listLabel = "List" }: GraphViewProps): ReactNode => {
    const isDesktop = useMediaQuery(DESKTOP_QUERY);
    // null = follow the viewport default; a click pins an explicit choice.
    const [override, setOverride] = useState<View | null>(null);
    const view: View = override ?? (isDesktop ? "diagram" : "list");

    return (
      <div className="flex flex-col gap-3">
        <div className="flex w-fit gap-1 self-start rounded-lg bg-white/5 p-1">
          <ViewTab
            label={listLabel}
            active={view === "list"}
            onSelect={() => setOverride("list")}
          />
          <ViewTab
            label={diagramLabel}
            active={view === "diagram"}
            onSelect={() => setOverride("diagram")}
          />
        </div>
        {view === "diagram" ? (
          <>
            {diagram}
            {/* Accessible/crawlable equivalent of the canvas (which exposes no a11y tree). */}
            <div className="sr-only">{list}</div>
          </>
        ) : (
          list
        )}
      </div>
    );
  },
);
