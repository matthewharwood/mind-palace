import { buildCurriculumGraph, type Curriculum, forceLayout } from "@mind-palace/curriculum";
import { type CardState, isDue } from "@mind-palace/srs";
import { Container, Graphics, Text } from "pixi.js";
import { type ReactNode, useRef } from "react";
import * as z from "zod";

import { usePixiApp } from "~/canvas/use-pixi-app";
import { defineComponent } from "~/lib/define-component";

// PixiJS network graph of a curriculum's flashcards (graphology forceatlas2
// layout). Nodes are colored by spaced-repetition phase and ringed green when
// due. Selecting a node navigates to it. Side channel (usePixiApp setup); SRS
// state flows in as a plain prop the route derives from the IDB-backed atom.

const RADIUS = 24;

function nodeFill(state: CardState | undefined): number {
  if (!state) return 0x9ca3af; // new / unseen
  switch (state.phase) {
    case "learning":
      return 0xf59e0b;
    case "relearning":
      return 0xf43f5e;
    case "review":
      return 0x3b82f6;
    default:
      return 0x9ca3af;
  }
}

export const CurriculumGraphPropsSchema = z.object({
  curriculum: z.custom<Curriculum>(),
  states: z.custom<Readonly<Record<string, CardState>>>(),
  onSelect: z.custom<(nodeId: string) => void>(),
});
export type CurriculumGraphProps = z.infer<typeof CurriculumGraphPropsSchema>;

export const CurriculumGraph = defineComponent(
  CurriculumGraphPropsSchema,
  ({ curriculum, states, onSelect }: CurriculumGraphProps): ReactNode => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;

    usePixiApp(
      canvasRef,
      (app) => {
        const positions = forceLayout(buildCurriculumGraph(curriculum), { iterations: 120 });
        const pts = Object.values(positions);
        if (pts.length === 0) return undefined;

        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;

        const root = new Container();
        app.stage.addChild(root);

        const edges = new Graphics();
        for (const edge of curriculum.edges) {
          const a = positions[edge.from];
          const b = positions[edge.to];
          if (a && b) edges.moveTo(a.x - midX, a.y - midY).lineTo(b.x - midX, b.y - midY);
        }
        edges.stroke({ width: 2, color: 0xc0c0d0 });
        root.addChild(edges);

        for (const node of curriculum.nodes) {
          const p = positions[node.id];
          if (!p) continue;
          const state = states[node.id];
          const due = state === undefined || isDue(state);
          const container = new Container();
          container.x = p.x - midX;
          container.y = p.y - midY;
          const circle = new Graphics().circle(0, 0, RADIUS).fill(nodeFill(state));
          if (due) circle.stroke({ width: 4, color: 0x10b981 });
          const label = new Text({
            text: node.id,
            style: { fontSize: 13, fill: 0xffffff, fontFamily: "sans-serif" },
          });
          label.anchor.set(0.5);
          container.addChild(circle, label);
          container.eventMode = "static";
          container.cursor = "pointer";
          const id = node.id;
          container.on("pointertap", () => onSelectRef.current(id));
          root.addChild(container);
        }

        const gw = Math.max(1, maxX - minX);
        const gh = Math.max(1, maxY - minY);
        const scale = Math.min((app.screen.width * 0.85) / gw, (app.screen.height * 0.85) / gh, 3);
        root.scale.set(scale);
        root.x = app.screen.width / 2;
        root.y = app.screen.height / 2;
        app.render();

        return () => {
          root.destroy({ children: true });
        };
      },
      [curriculum, states],
    );

    return (
      <div className="h-[70vh] w-full">
        <canvas ref={canvasRef} className="size-full" />
      </div>
    );
  },
);
