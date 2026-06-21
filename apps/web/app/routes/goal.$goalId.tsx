import { buildPathGraph, rootIds } from "@mind-palace/curriculum";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";

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
    <main className="flex min-h-screen flex-col gap-4 p-6 font-display">
      <header>
        <Link to="/" className="text-sm opacity-70 hover:underline">
          ← Goals
        </Link>
        <h1 className="text-2xl">{goal.title}</h1>
        <p className="text-sm opacity-70">{goal.description}</p>
      </header>

      {/* Rich visual: the selectable PixiJS learning-path tree. */}
      <LearningPathTree
        path={path}
        onSelect={(curriculumId) =>
          navigate({ to: "/curriculum/$curriculumId", params: { curriculumId } })
        }
      />

      {/* Accessible + crawlable equivalent (screen readers, keyboard, prerender). */}
      <nav aria-label="Curricula" className="sr-only">
        <ul>
          {path.nodes.map((node) => (
            <li key={node.curriculumId}>
              <Link to="/curriculum/$curriculumId" params={{ curriculumId: node.curriculumId }}>
                {node.title}
                {roots.has(node.curriculumId) ? " (start here)" : ""}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
