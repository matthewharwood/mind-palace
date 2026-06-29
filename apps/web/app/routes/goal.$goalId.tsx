import { buildPathGraph, rootIds } from "@mind-palace/curriculum";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";

import { GraphView } from "~/components/graph-view";
import { LearningPathTree } from "~/components/learning-path-tree";
import { MasteryBar } from "~/components/mastery-bar";
import { getGoal, getPath } from "~/data/curriculum-data";
import type { CurriculumReport } from "~/lib/progress-report";
import { buildSeoLinks } from "~/lib/seo";
import { useProgressReports } from "~/lib/use-progress-reports";

export const Route = createFileRoute("/goal/$goalId")({
  head: ({ params }) => ({ links: buildSeoLinks({ path: `/goal/${params.goalId}` }) }),
  component: GoalView,
});

// Right-aligned status for a curriculum row: its mastery once started, "start
// here" for an un-started root, else its due count (flat — no nested ternary).
function curriculumStatus(report: CurriculumReport | undefined, isRoot: boolean): string {
  if (report && report.started > 0) return `${report.masteryPct}% · ${report.due} due`;
  if (isRoot) return "start here";
  if (report) return `${report.due} due`;
  return "";
}

function GoalView() {
  const { goalId } = Route.useParams();
  const navigate = useNavigate();
  // Hook before the notFound() guards so hook order stays stable across renders.
  const reports = useProgressReports();
  const goal = getGoal(goalId);
  if (!goal) throw notFound();
  const path = getPath(goal.pathId);
  if (!path) throw notFound();

  const roots = new Set(rootIds(buildPathGraph(path)));
  const byCurriculum = new Map(
    (reports?.find((report) => report.goalId === goalId)?.curricula ?? []).map((curriculum) => [
      curriculum.id,
      curriculum,
    ]),
  );

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
              {path.nodes.map((node) => {
                const report = byCurriculum.get(node.curriculumId);
                return (
                  <li key={node.curriculumId}>
                    <Link
                      to="/curriculum/$curriculumId"
                      params={{ curriculumId: node.curriculumId }}
                      className="flex flex-col gap-2 rounded-md px-3 py-2.5 transition-colors hover:bg-black/[0.04] focus-visible:bg-black/[0.04] dark:hover:bg-white/[0.06] dark:focus-visible:bg-white/[0.06]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-midnight-ink">{node.title}</span>
                        <span className="shrink-0 font-mono text-[11px] text-muted-ash tabular-nums">
                          {curriculumStatus(report, roots.has(node.curriculumId))}
                        </span>
                      </div>
                      {report ? <MasteryBar counts={report.counts} total={report.total} /> : null}
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
