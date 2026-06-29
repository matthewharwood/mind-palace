import type { LearningPath } from "@mind-palace/curriculum";
import { useAtomValue } from "jotai";
import { type ReactNode, useRef } from "react";
import * as z from "zod";

import { drawGraph } from "~/canvas/draw-graph";
import { usePixiApp } from "~/canvas/use-pixi-app";
import { defineComponent } from "~/lib/define-component";
import { settingsAtom } from "~/state/atoms";

// Learning-path tree — curricula laid out as a readable top-down prerequisite
// DAG (shared drawGraph renderer: content-sized nodes, curved edges, fit + pan +
// zoom). Side channel per the Pillar; selection navigates via onSelect. Node
// colours are theme-aware (canvas hex can't follow CSS `.dark`): light = pale
// card; dark = a raised slate so boxes don't glare on the dark substrate.
const LIGHT = { fill: 0xf8fafc, text: 0x1e1b4b, ring: 0x6366f1 };
const DARK = { fill: 0x232838, text: 0xe5e7eb, ring: 0x818cf8 };

export const LearningPathTreePropsSchema = z.object({
  path: z.custom<LearningPath>(),
  onSelect: z.custom<(curriculumId: string) => void>(),
});
export type LearningPathTreeProps = z.infer<typeof LearningPathTreePropsSchema>;

export const LearningPathTree = defineComponent(
  LearningPathTreePropsSchema,
  ({ path, onSelect }: LearningPathTreeProps): ReactNode => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;
    const dark = useAtomValue(settingsAtom).theme === "dark";
    const c = dark ? DARK : LIGHT;

    usePixiApp(
      canvasRef,
      (app) =>
        drawGraph(app, {
          nodes: path.nodes.map((node) => ({
            id: node.curriculumId,
            title: node.title,
            fill: c.fill,
            textColor: c.text,
            ring: c.ring,
          })),
          edges: path.edges,
          // A learning path is an ordered prerequisite sequence → top-down flow.
          layout: "flow",
          onSelect: (id) => onSelectRef.current(id),
        }),
      [path, dark],
      { autoStart: false, backgroundAlpha: 0 },
    );

    return (
      <div className="h-[70vh] w-full">
        {/* key by path id: navigating between goals mounts a FRESH canvas (and
            WebGL context). Pixi can't reliably re-init on a canvas whose prior
            context was destroyed — reusing it freezes the renderer. */}
        <canvas key={path.id} ref={canvasRef} className="size-full" />
      </div>
    );
  },
);
