import { isDue } from "@mind-palace/srs";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";

import { CurriculumGraph } from "~/components/curriculum-graph";
import { GraphView } from "~/components/graph-view";
import { getCurriculum } from "~/data/curriculum-data";
import { buildSeoLinks } from "~/lib/seo";
import { getCurriculumProgressAtom } from "~/state/atoms";

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
                return (
                  <li key={node.id}>
                    <Link
                      to="/curriculum/$curriculumId/node/$nodeId"
                      params={{ curriculumId, nodeId: node.id }}
                      className="flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-2 hover:bg-white/10"
                    >
                      <span>{node.title}</span>
                      <span className="text-xs opacity-60">
                        {state?.phase ?? "new"}
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
