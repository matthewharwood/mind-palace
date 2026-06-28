import type { Curriculum } from "@mind-palace/curriculum";
import { type CardState, isDue } from "@mind-palace/srs";
import { type ReactNode, useRef } from "react";
import * as z from "zod";

import { drawGraph, type GraphNodeSpec } from "~/canvas/draw-graph";
import { usePixiApp } from "~/canvas/use-pixi-app";
import { defineComponent } from "~/lib/define-component";

// Curriculum graph — flashcards as a radial prerequisite network (shared
// drawGraph renderer, "network" layout). Nodes are colored by spaced-repetition
// phase and ringed when due; an HTML legend explains the colors. Side channel
// per the Pillar.
const NODE_TEXT = 0xffffff;
const DUE_RING = 0x34d399;

function phaseFill(state: CardState | undefined): number {
  if (!state) return 0x475569; // new / unseen — slate
  switch (state.phase) {
    case "learning":
      return 0xb45309; // amber
    case "relearning":
      return 0xb91c1c; // red
    case "review":
      return 0x1d4ed8; // blue
    default:
      return 0x475569;
  }
}

const LEGEND: { label: string; className: string }[] = [
  { label: "new", className: "bg-[#475569]" },
  { label: "learning", className: "bg-[#b45309]" },
  { label: "review", className: "bg-[#1d4ed8]" },
  { label: "due", className: "bg-transparent ring-2 ring-emerald-400" },
];

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
      (app) =>
        drawGraph(app, {
          nodes: curriculum.nodes.map((node): GraphNodeSpec => {
            const state = states[node.id];
            const due = state === undefined || isDue(state);
            const phase = state?.phase ?? "new";
            return {
              id: node.id,
              title: node.title,
              caption: due ? `${phase} · due` : phase,
              fill: phaseFill(state),
              textColor: NODE_TEXT,
              ...(due ? { ring: DUE_RING } : {}),
            };
          }),
          edges: curriculum.edges,
          // A curriculum is interrelated concepts + drills → radial network.
          layout: "network",
          onSelect: (id) => onSelectRef.current(id),
        }),
      // Rebuild per curriculum only — SRS colors are snapshotted at mount (you
      // always arrive on this route fresh, after reviewing on the node route).
      // This keeps the canvas key (curriculum.id) aligned with the re-init
      // trigger, so a rebuild always lands on a FRESH canvas (a Pixi app can't
      // re-init on a canvas whose WebGL context was destroyed → it freezes).
      [curriculum],
      { autoStart: false, backgroundAlpha: 0 },
    );

    return (
      <div className="relative h-[70vh] w-full">
        <canvas key={curriculum.id} ref={canvasRef} className="size-full" />
        <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap items-center gap-3 rounded-md bg-black/50 px-3 py-2 text-white text-xs">
          {LEGEND.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span className={`inline-block size-3 rounded-full ${item.className}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    );
  },
);
