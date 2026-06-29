import { useAtom } from "jotai";
import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import { DESKTOP_QUERY, useMediaQuery } from "~/lib/use-media-query";
import { settingsAtom } from "~/state/atoms";

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

// Resolve the persisted preference against the viewport (flat — no nested ternary).
function resolveView(pref: "list" | "diagram" | "auto", isDesktop: boolean): View {
  if (pref !== "auto") return pref;
  return isDesktop ? "diagram" : "list";
}

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
      className={`rounded-md px-3.5 py-1.5 font-medium text-sm transition-colors ${
        active
          ? "bg-canvas-white text-midnight-ink shadow-sm dark:bg-white/10"
          : "text-muted-ash hover:text-midnight-ink"
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
    const [settings, setSettings] = useAtom(settingsAtom);
    // "auto" follows the viewport; an explicit pick is persisted to IDB, so the
    // choice survives reloads AND carries as you navigate deeper into the tree.
    const view = resolveView(settings.graphView, isDesktop);
    const pick = (next: View): void => setSettings((prev) => ({ ...prev, graphView: next }));

    return (
      <div className="flex flex-col gap-3">
        <div className="flex w-fit gap-1 self-start rounded-lg bg-black/[0.04] p-1 dark:bg-white/5">
          <ViewTab label={listLabel} active={view === "list"} onSelect={() => pick("list")} />
          <ViewTab
            label={diagramLabel}
            active={view === "diagram"}
            onSelect={() => pick("diagram")}
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
