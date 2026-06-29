import { createFileRoute, Link } from "@tanstack/react-router";

import { MasteryBar } from "~/components/mastery-bar";
import { listGoals } from "~/data/curriculum-data";
import { buildSeoLinks } from "~/lib/seo";
import { useProgressReports } from "~/lib/use-progress-reports";

export const Route = createFileRoute("/goals")({
  head: () => ({ links: buildSeoLinks({ path: "/goals" }) }),
  component: Goals,
});

function Goals() {
  const goals = listGoals();
  const reports = useProgressReports();
  const byGoal = new Map((reports ?? []).map((report) => [report.goalId, report]));
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-3xl text-midnight-ink">Your goals</h1>
        <p className="text-muted-ash text-sm">Choose a goal to begin your learning path.</p>
      </header>
      <ul className="flex flex-col gap-3">
        {goals.map((goal) => {
          const report = byGoal.get(goal.id);
          return (
            <li key={goal.id}>
              <Link
                to="/goal/$goalId"
                params={{ goalId: goal.id }}
                className="block rounded-card border border-black/10 p-4 transition-colors hover:bg-black/5 focus-visible:bg-black/5 dark:border-white/10 dark:hover:bg-white/5 dark:focus-visible:bg-white/5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-lg text-midnight-ink">{goal.title}</span>
                  {report ? (
                    <span className="shrink-0 font-mono text-[11px] text-muted-ash tabular-nums">
                      {report.masteryPct}% · {report.mastered}/{report.total}
                    </span>
                  ) : null}
                </div>
                <span className="mt-1 block text-muted-ash text-sm">{goal.description}</span>
                {report ? (
                  <div className="mt-3">
                    <MasteryBar counts={report.counts} total={report.total} />
                  </div>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
