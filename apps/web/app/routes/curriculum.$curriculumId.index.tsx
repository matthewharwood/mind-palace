import { isDue } from "@mind-palace/srs";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";

import { CurriculumGraph } from "~/components/curriculum-graph";
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
    <main className="flex min-h-screen flex-col gap-4 p-6 font-display">
      <header>
        <Link to="/" className="text-sm opacity-70 hover:underline">
          ← Goals
        </Link>
        <h1 className="text-2xl">{curriculum.title}</h1>
        <p className="text-xs opacity-60">
          Source: {curriculum.source.kind} · {curriculum.nodes.length} lessons
        </p>
      </header>

      {/* Rich visual: the selectable PixiJS network graph, SRS-colored. */}
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

      {/* Accessible + crawlable equivalent. */}
      <nav aria-label="Lessons" className="sr-only">
        <ul>
          {curriculum.nodes.map((node) => {
            const state = progress.states[node.id];
            const due = state === undefined || isDue(state);
            return (
              <li key={node.id}>
                <Link
                  to="/curriculum/$curriculumId/node/$nodeId"
                  params={{ curriculumId, nodeId: node.id }}
                >
                  {node.title} — {state?.phase ?? "new"}
                  {due ? " (due)" : ""}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </main>
  );
}
