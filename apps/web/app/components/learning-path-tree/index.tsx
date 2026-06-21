import { type LearningPath, layeredTree } from "@mind-palace/curriculum";
import { Container, Graphics, Text } from "pixi.js";
import { type ReactNode, useRef } from "react";
import * as z from "zod";

import { usePixiApp } from "~/canvas/use-pixi-app";
import { defineComponent } from "~/lib/define-component";

// PixiJS visualization of a learning path (a tree of curricula). Side channel
// per the Pillar — the scene graph is built in usePixiApp's setup, never during
// render. Selecting a node calls `onSelect` (the route navigates). The route
// also renders an sr-only link list, so the canvas tree stays accessible +
// crawlable while this provides the rich visual.

const NODE_W = 150;
const NODE_H = 56;
const TOP_PAD = 48;

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
      (app) => {
        const positions = layeredTree(
          path.nodes.map((n) => n.curriculumId),
          path.edges,
        );
        const points = Object.values(positions);
        if (points.length === 0) return undefined;

        const root = new Container();
        app.stage.addChild(root);

        const edges = new Graphics();
        for (const edge of path.edges) {
          const a = positions[edge.from];
          const b = positions[edge.to];
          if (a && b) edges.moveTo(a.x, a.y).lineTo(b.x, b.y);
        }
        edges.stroke({ width: 2, color: 0xb0b0c0 });
        root.addChild(edges);

        for (const node of path.nodes) {
          const p = positions[node.curriculumId];
          if (!p) continue;
          const container = new Container();
          container.x = p.x;
          container.y = p.y;
          const box = new Graphics()
            .roundRect(-NODE_W / 2, -NODE_H / 2, NODE_W, NODE_H, 12)
            .fill(0xffffff)
            .stroke({ width: 2, color: 0x4f46e5 });
          const label = new Text({
            text: node.title,
            style: { fontSize: 15, fill: 0x1a1a2e, fontFamily: "sans-serif", align: "center" },
          });
          label.anchor.set(0.5);
          container.addChild(box, label);
          container.eventMode = "static";
          container.cursor = "pointer";
          const id = node.curriculumId;
          container.on("pointertap", () => onSelectRef.current(id));
          root.addChild(container);
        }

        // Center horizontally, pad from the top (manual bounds — deterministic).
        const xs = points.map((pt) => pt.x);
        const ys = points.map((pt) => pt.y);
        const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
        root.x = app.screen.width / 2 - midX;
        root.y = TOP_PAD + NODE_H / 2 - Math.min(...ys);
        app.render();

        return () => {
          root.destroy({ children: true });
        };
      },
      [path],
    );

    return (
      <div className="h-[70vh] w-full">
        <canvas ref={canvasRef} className="size-full" />
      </div>
    );
  },
);
