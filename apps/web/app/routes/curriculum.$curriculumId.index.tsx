import { type CardPhase, isDue } from "@mind-palace/srs";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { useState } from "react";

import { CurriculumGraph } from "~/components/curriculum-graph";
import { GraphView } from "~/components/graph-view";
import { getCurriculum } from "~/data/curriculum-data";
import { buildSeoLinks } from "~/lib/seo";
import { getCurriculumProgressAtom } from "~/state/atoms";

// At-a-glance SRS phase, matching the MasteryBar segment colours.
const PHASE_DOT: Record<CardPhase, string> = {
  review: "bg-[#47d096]",
  learning: "bg-[#fbc768]",
  relearning: "bg-[#e16540]",
  new: "bg-light-taupe",
};

export const Route = createFileRoute("/curriculum/$curriculumId/")({
  head: ({ params }) => ({
    links: buildSeoLinks({ path: `/curriculum/${params.curriculumId}` }),
  }),
  component: CurriculumView,
});

function CurriculumView() {
  const { curriculumId } = Route.useParams();
  const navigate = useNavigate();
  const curriculum = getCurriculum(curriculumId);
  if (!curriculum) throw notFound();

  // Persistent SRS progress (IDB) — read synchronously after root hydration.
  const progress = useAtomValue(getCurriculumProgressAtom(curriculumId));
  // Which lesson's (sr-only) list link has keyboard focus → ring it on the canvas.
  const [focusedId, setFocusedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl">{curriculum.title}</h1>
          <p className="text-xs opacity-60">
            Source: {curriculum.source.kind} · {curriculum.nodes.length} lessons
          </p>
        </div>
        <Link
          to="/curriculum/$curriculumId/study"
          params={{ curriculumId }}
          data-test="start-study"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-midnight-ink px-5 py-2.5 font-medium text-canvas-white text-sm transition-opacity hover:opacity-90"
        >
          Study ✦
        </Link>
      </header>

      {/* List on phones, the SRS-colored PixiJS network on desktop — toggleable.
          The list is a real <Link> list, so it stays crawlable + accessible in
          either view. */}
      <GraphView
        diagramLabel="Network"
        diagram={
          <CurriculumGraph
            curriculum={curriculum}
            states={progress.states}
            focusedId={focusedId}
            onSelect={(nodeId) =>
              navigate({
                to: "/curriculum/$curriculumId/node/$nodeId",
                params: { curriculumId, nodeId },
              })
            }
          />
        }
        list={
          <nav aria-label="Lessons">
            <ul className="flex flex-col gap-1">
              {curriculum.nodes.map((node) => {
                const state = progress.states[node.id];
                const due = state === undefined || isDue(state);
                const phase = state?.phase ?? "new";
                return (
                  <li key={node.id}>
                    <Link
                      to="/curriculum/$curriculumId/node/$nodeId"
                      params={{ curriculumId, nodeId: node.id }}
                      onFocus={() => setFocusedId(node.id)}
                      onBlur={() => setFocusedId(null)}
                      className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-black/[0.04] focus-visible:bg-black/[0.04] dark:hover:bg-white/[0.06] dark:focus-visible:bg-white/[0.06]"
                    >
                      <span className="text-midnight-ink">{node.title}</span>
                      <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted-ash tracking-[0.04em]">
                        <span className={`size-2 rounded-full ${PHASE_DOT[phase]}`} aria-hidden />
                        {phase}
                        {due ? " · due" : ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        }
      />
    </div>
  );
}
