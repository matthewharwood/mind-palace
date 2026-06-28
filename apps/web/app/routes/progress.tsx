import type { CardState } from "@mind-palace/srs";
import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";

import { MasteryBar } from "~/components/mastery-bar";
import { assembleReports } from "~/lib/learning-progress";
import type { PathReport } from "~/lib/progress-report";
import { buildSeoLinks } from "~/lib/seo";
import { loadAllCurriculumProgress } from "~/state/progress-snapshot";

export const Route = createFileRoute("/progress")({
  head: () => ({ links: buildSeoLinks({ path: "/progress" }) }),
  component: ProgressView,
});

function PathSection({ report }: { report: PathReport }): ReactNode {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-black/10 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl">
          <Link to="/goal/$goalId" params={{ goalId: report.goalId }} className="hover:underline">
            {report.goalTitle}
          </Link>
        </h2>
        <span className="text-muted-ash text-sm">
          {report.masteryPct}% mastered · {report.mastered}/{report.total} cards · {report.due} due
        </span>
      </div>
      <MasteryBar counts={report.counts} total={report.total} />

      <ul className="flex flex-col gap-1">
        {report.curricula.map((curriculum) => (
          <li key={curriculum.id}>
            <Link
              to="/curriculum/$curriculumId"
              params={{ curriculumId: curriculum.id }}
              className="flex flex-col gap-1.5 rounded-[8px] px-3 py-2 transition-colors hover:bg-whisper-gray"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span
                  className={
                    curriculum.id === report.weakestCurriculumId
                      ? "font-medium text-red-700"
                      : "font-medium"
                  }
                >
                  {curriculum.title}
                </span>
                <span className="text-muted-ash text-xs">
                  {curriculum.masteryPct}% · {curriculum.due} due
                  {curriculum.lapses > 0 ? ` · ${curriculum.lapses} lapses` : ""}
                </span>
              </div>
              <MasteryBar counts={curriculum.counts} total={curriculum.total} />
            </Link>
          </li>
        ))}
      </ul>

      {report.weak.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-muted-ash text-xs uppercase tracking-[0.3px]">Focus here</h3>
          <ul className="flex flex-col gap-1">
            {report.weak.map((card) => (
              <li key={`${card.curriculumId}-${card.nodeId}`}>
                <Link
                  to="/curriculum/$curriculumId/node/$nodeId"
                  params={{ curriculumId: card.curriculumId, nodeId: card.nodeId }}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[6px] px-3 py-1.5 text-sm transition-colors hover:bg-whisper-gray"
                >
                  <span className="font-medium">{card.title}</span>
                  <span className="text-muted-ash text-xs">{card.curriculumTitle}</span>
                  <span className="flex flex-wrap gap-1">
                    {card.reasons.map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] text-red-700"
                      >
                        {reason}
                      </span>
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-muted-ash text-sm">
          No weak spots yet — review some cards to see insights.
        </p>
      )}
    </section>
  );
}

function ProgressView(): ReactNode {
  const [snapshot, setSnapshot] = useState<{
    states: Map<string, Record<string, CardState>>;
    now: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadAllCurriculumProgress().then((states) => {
      if (!cancelled) setSnapshot({ states, now: Date.now() });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!snapshot) {
    return <div className="p-8 text-muted-ash text-sm">Loading your progress…</div>;
  }

  const reports = assembleReports(snapshot.states, snapshot.now);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-6 sm:p-8">
      <header>
        <h1 className="text-3xl">Progress report</h1>
        <p className="text-muted-ash text-sm">
          How you're doing across every learning path — and where to focus next.
        </p>
      </header>
      {reports.map((report) => (
        <PathSection key={report.goalId} report={report} />
      ))}
    </div>
  );
}
