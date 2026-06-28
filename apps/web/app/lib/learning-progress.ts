import type { CardState } from "@mind-palace/srs";

import { getCurriculum, getPath, listGoals } from "~/data/curriculum-data";

import { type PathReport, pathReport } from "./progress-report";

// Assemble a progress report for every goal from the per-curriculum SRS state.
// Shared by the /progress route and the Ask drawer so they stay in sync.
export function assembleReports(
  statesByCurriculum: Map<string, Record<string, CardState>>,
  now: number,
): PathReport[] {
  return listGoals().map((goal) => {
    const path = getPath(goal.pathId);
    const curricula = path
      ? path.nodes.flatMap((node) => {
          const curriculum = getCurriculum(node.curriculumId);
          return curriculum ? [curriculum] : [];
        })
      : [];
    return pathReport(goal, curricula, statesByCurriculum, now);
  });
}
