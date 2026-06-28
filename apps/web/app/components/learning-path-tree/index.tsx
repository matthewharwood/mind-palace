import type { LearningPath } from "@mind-palace/curriculum";
import { type ReactNode, useRef } from "react";
import * as z from "zod";

import { drawGraph } from "~/canvas/draw-graph";
import { usePixiApp } from "~/canvas/use-pixi-app";
import { defineComponent } from "~/lib/define-component";

// Learning-path tree — curricula laid out as a readable top-down prerequisite
// DAG (shared drawGraph renderer: content-sized nodes, curved edges, fit + pan +
// zoom). Side channel per the Pillar; selection navigates via onSelect.
const NODE_FILL = 0xf8fafc;
const NODE_TEXT = 0x1e1b4b;
const NODE_RING = 0x6366f1;

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

    usePixiApp(
      canvasRef,
      (app) =>
        drawGraph(app, {
          nodes: path.nodes.map((node) => ({
            id: node.curriculumId,
            title: node.title,
            fill: NODE_FILL,
            textColor: NODE_TEXT,
            ring: NODE_RING,
          })),
          edges: path.edges,
          // A learning path is an ordered prerequisite sequence → top-down flow.
          layout: "flow",
          onSelect: (id) => onSelectRef.current(id),
        }),
      [path],
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
