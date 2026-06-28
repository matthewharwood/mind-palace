import { buildPathGraph, rootIds } from "@mind-palace/curriculum";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";

import { GraphView } from "~/components/graph-view";
import { LearningPathTree } from "~/components/learning-path-tree";
import { getGoal, getPath } from "~/data/curriculum-data";
import { buildSeoLinks } from "~/lib/seo";

export const Route = createFileRoute("/goal/$goalId")({
  head: ({ params }) => ({ links: buildSeoLinks({ path: `/goal/${params.goalId}` }) }),
  component: GoalView,
});

function GoalView() {
  const { goalId } = Route.useParams();
  const navigate = useNavigate();
  const goal = getGoal(goalId);
  if (!goal) throw notFound();
  const path = getPath(goal.pathId);
  if (!path) throw notFound();

  const roots = new Set(rootIds(buildPathGraph(path)));

  return (
    <div className="flex flex-col gap-4 p-6">
      <header>
        <h1 className="text-2xl">{goal.title}</h1>
        <p className="text-sm opacity-70">{goal.description}</p>
      </header>

      {/* List on phones, the PixiJS prerequisite flow on desktop — toggleable.
          The list stays a real <Link> list (crawlable + accessible) either way. */}
      <GraphView
        diagramLabel="Flow"
        diagram={
          <LearningPathTree
            path={path}
            onSelect={(curriculumId) =>
              navigate({ to: "/curriculum/$curriculumId", params: { curriculumId } })
            }
          />
        }
        list={
          <nav aria-label="Curricula">
            <ul className="flex flex-col gap-1">
              {path.nodes.map((node) => (
                <li key={node.curriculumId}>
                  <Link
                    to="/curriculum/$curriculumId"
                    params={{ curriculumId: node.curriculumId }}
                    className="flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-2 hover:bg-white/10"
                  >
                    <span>{node.title}</span>
                    {roots.has(node.curriculumId) ? (
                      <span className="text-xs opacity-60">start here</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        }
      />
    </div>
  );
}
