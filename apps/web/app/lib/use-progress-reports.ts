import { useEffect, useState } from "react";

import { loadAllCurriculumProgress } from "~/state/progress-snapshot";

import { assembleReports } from "./learning-progress";
import type { PathReport } from "./progress-report";

// One-shot load of the per-curriculum SRS snapshot → a progress report per goal.
// Returns null while loading so callers can render their static content first
// (the snapshot lives in IDB; the page is useful before progress paints in).
// Shared by /goals (goal cards) and /goal/$goalId (curriculum rows) so every
// tier shows the same numbers the /progress route does.
export function useProgressReports(): PathReport[] | null {
  const [reports, setReports] = useState<PathReport[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadAllCurriculumProgress().then((states) => {
      if (!cancelled) setReports(assembleReports(states, Date.now()));
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return reports;
}
