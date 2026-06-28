import type { Curriculum, Goal } from "@mind-palace/curriculum";
import type { CardPhase, CardState } from "@mind-palace/srs";

// Pure progress-report engine. Turns per-curriculum spaced-repetition state into
// learning-path insight: phase distribution, mastery %, due counts, and ranked
// weaknesses (cards you keep missing / find hard / are overdue on). No IDB, no
// React, no Date.now — `now` is injected so it stays deterministic + bun-testable.

const DAY_MS = 86_400_000;

export interface CardInsight {
  curriculumId: string;
  curriculumTitle: string;
  nodeId: string;
  title: string;
  phase: CardPhase;
  lapses: number;
  /** Human-readable reasons this card is a weak spot. */
  reasons: string[];
  /** Higher = weaker; used to rank what to focus on. */
  score: number;
}

export interface CurriculumReport {
  id: string;
  title: string;
  total: number;
  started: number;
  counts: Record<CardPhase, number>;
  /** Cards due to study now (unseen + overdue reviews). */
  due: number;
  mastered: number;
  masteryPct: number;
  lapses: number;
  weak: CardInsight[];
}

export interface PathReport {
  goalId: string;
  goalTitle: string;
  total: number;
  started: number;
  mastered: number;
  masteryPct: number;
  due: number;
  counts: Record<CardPhase, number>;
  curricula: CurriculumReport[];
  /** The curriculum with the lowest mastery among those started (focus area). */
  weakestCurriculumId: string | null;
  /** Top weak cards across the whole path. */
  weak: CardInsight[];
}

function pct(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

function cardInsight(
  curriculum: Curriculum,
  nodeId: string,
  title: string,
  state: CardState,
  now: number,
): CardInsight | null {
  const reasons: string[] = [];
  let score = 0;
  if (state.phase === "relearning") {
    reasons.push("relearning");
    score += 3;
  }
  if (state.lapses > 0) {
    reasons.push(`${state.lapses} lapse${state.lapses > 1 ? "s" : ""}`);
    score += state.lapses * 2;
  }
  if (state.ease < 2.3) {
    reasons.push("hard to recall");
    score += (2.5 - state.ease) * 3;
  }
  const overdueDays = state.due > 0 ? Math.floor((now - state.due) / DAY_MS) : 0;
  if (overdueDays >= 1) {
    reasons.push(`overdue ${overdueDays}d`);
    score += Math.min(overdueDays, 7) * 0.5;
  }
  if (state.phase === "learning" && state.reps >= 3) {
    reasons.push("stuck learning");
    score += 2;
  }
  if (score <= 0) return null;
  return {
    curriculumId: curriculum.id,
    curriculumTitle: curriculum.title,
    nodeId,
    title,
    phase: state.phase,
    lapses: state.lapses,
    reasons,
    score,
  };
}

export function curriculumReport(
  curriculum: Curriculum,
  states: Record<string, CardState>,
  now: number,
): CurriculumReport {
  const counts: Record<CardPhase, number> = { new: 0, learning: 0, review: 0, relearning: 0 };
  let started = 0;
  let due = 0;
  let lapses = 0;
  const weak: CardInsight[] = [];
  for (const node of curriculum.nodes) {
    const state = states[node.id];
    if (!state) {
      counts.new += 1;
      due += 1; // never seen → due to learn
      continue;
    }
    started += 1;
    counts[state.phase] += 1;
    lapses += state.lapses;
    if (state.due <= now) due += 1;
    const insight = cardInsight(curriculum, node.id, node.title, state, now);
    if (insight) weak.push(insight);
  }
  weak.sort((a, b) => b.score - a.score);
  const total = curriculum.nodes.length;
  return {
    id: curriculum.id,
    title: curriculum.title,
    total,
    started,
    counts,
    due,
    mastered: counts.review,
    masteryPct: pct(counts.review, total),
    lapses,
    weak,
  };
}

export function pathReport(
  goal: Goal,
  curricula: readonly Curriculum[],
  statesByCurriculum: Map<string, Record<string, CardState>>,
  now: number,
): PathReport {
  const reports = curricula.map((c) =>
    curriculumReport(c, statesByCurriculum.get(c.id) ?? {}, now),
  );
  const total = reports.reduce((acc, r) => acc + r.total, 0);
  const started = reports.reduce((acc, r) => acc + r.started, 0);
  const mastered = reports.reduce((acc, r) => acc + r.mastered, 0);
  const due = reports.reduce((acc, r) => acc + r.due, 0);
  const counts = reports.reduce<Record<CardPhase, number>>(
    (acc, r) => ({
      new: acc.new + r.counts.new,
      learning: acc.learning + r.counts.learning,
      review: acc.review + r.counts.review,
      relearning: acc.relearning + r.counts.relearning,
    }),
    { new: 0, learning: 0, review: 0, relearning: 0 },
  );
  const weak = reports
    .flatMap((r) => r.weak)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const startedReports = reports.filter((r) => r.started > 0);
  const weakest = startedReports.reduce<CurriculumReport | null>(
    (lowest, r) => (lowest === null || r.masteryPct < lowest.masteryPct ? r : lowest),
    null,
  );
  return {
    goalId: goal.id,
    goalTitle: goal.title,
    total,
    started,
    mastered,
    masteryPct: pct(mastered, total),
    due,
    counts,
    curricula: reports,
    weakestCurriculumId: weakest?.id ?? null,
    weak,
  };
}
