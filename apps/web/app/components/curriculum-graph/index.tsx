import type { Curriculum } from "@mind-palace/curriculum";
import { type CardState, isDue } from "@mind-palace/srs";
import { type ReactNode, useEffect, useRef } from "react";
import * as z from "zod";

import { drawGraph, type GraphHandle, type GraphNodeSpec } from "~/canvas/draw-graph";
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

// Mastery fraction for the corner badge — only for started cards (unseen cards
// stay badge-free so a fresh network isn't littered with 0% discs).
function phaseProgress(state: CardState | undefined): number | undefined {
  if (!state) return undefined;
  switch (state.phase) {
    case "review":
      return 1;
    case "learning":
      return 0.5;
    case "relearning":
      return 0.34;
    default:
      return 0;
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
  /** Node id whose list link has keyboard focus → ring it on the canvas. */
  focusedId: z.string().nullable().optional(),
});
export type CurriculumGraphProps = z.infer<typeof CurriculumGraphPropsSchema>;

export const CurriculumGraph = defineComponent(
  CurriculumGraphPropsSchema,
  ({ curriculum, states, onSelect, focusedId = null }: CurriculumGraphProps): ReactNode => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;
    const handleRef = useRef<GraphHandle | null>(null);

    usePixiApp(
      canvasRef,
      (app) => {
        const graph = drawGraph(app, {
          nodes: curriculum.nodes.map((node): GraphNodeSpec => {
            const state = states[node.id];
            const due = state === undefined || isDue(state);
            const phase = state?.phase ?? "new";
            const progress = phaseProgress(state);
            return {
              id: node.id,
              title: node.title,
              caption: due ? `${phase} · due` : phase,
              fill: phaseFill(state),
              textColor: NODE_TEXT,
              ...(due ? { ring: DUE_RING } : {}),
              ...(progress !== undefined ? { progress } : {}),
            };
          }),
          edges: curriculum.edges,
          // A curriculum is interrelated concepts + drills → radial network.
          layout: "network",
          onSelect: (id) => onSelectRef.current(id),
        });
        handleRef.current = graph;
        return () => {
          handleRef.current = null;
          graph.destroy();
        };
      },
      // Rebuild per curriculum only — SRS colors are snapshotted at mount (you
      // always arrive on this route fresh, after reviewing on the node route).
      // This keeps the canvas key (curriculum.id) aligned with the re-init
      // trigger, so a rebuild always lands on a FRESH canvas (a Pixi app can't
      // re-init on a canvas whose WebGL context was destroyed → it freezes).
      [curriculum],
      { autoStart: false, backgroundAlpha: 0 },
    );

    useEffect(() => {
      handleRef.current?.setFocusedNode(focusedId);
    }, [focusedId]);

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
