import {
  type AdaptiveFlowState,
  AdaptiveFlowStateSchema,
  type FlowMetricSample,
  type FSRSCard,
  type FSRSCardCategory,
  FSRSCardSchema,
  type FSRSRating,
  type FSRSReviewLog,
  FSRSReviewLogSchema,
  type FSRSState,
} from "./schemas";

// ---------------------------------------------------------------------------
// FSRS-5 Constants & Core Math
// ---------------------------------------------------------------------------

/** Standard FSRS-5 default 19-parameter weight vector */
export const FSRS_WEIGHTS = [
  0.40255, // w0: initial stability for Again
  1.18385, // w1: initial stability for Hard
  3.173, // w2: initial stability for Good
  15.69105, // w3: initial stability for Easy
  7.1949, // w4: initial difficulty anchor
  0.5345, // w5: initial difficulty slope
  1.4604, // w6: difficulty delta
  0.0046, // w7: mean reversion weight
  1.54575, // w8: recall stability factor
  0.1192, // w9: stability decay exponent
  1.01925, // w10: retrievability gain
  1.9395, // w11: lapse stability base
  0.11, // w12: lapse difficulty exponent
  0.29605, // w13: lapse stability exponent
  2.2698, // w14: lapse retrievability exponent
  0.2315, // w15: hard penalty
  2.9898, // w16: easy bonus
  0.51655, // w17: short-term stability slope
  0.6621, // w18: short-term stability offset
] as const;

const DECAY = -0.5;
const FACTOR = 19 / 81;
const MS_PER_DAY = 86_400_000;
const MS_PER_MINUTE = 60_000;
const DEFAULT_DESIRED_RETENTION = 0.9;

const RATING_TO_GRADE: Record<FSRSRating, 1 | 2 | 3 | 4> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4,
};

const RATING_TO_ACCURACY: Record<FSRSRating, number> = {
  again: 0,
  hard: 0.65,
  good: 0.9,
  easy: 1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function computeInitialStability(rating: FSRSRating): number {
  const grade = RATING_TO_GRADE[rating];
  return FSRS_WEIGHTS[grade - 1] ?? FSRS_WEIGHTS[2];
}

export function computeInitialDifficulty(rating: FSRSRating): number {
  const grade = RATING_TO_GRADE[rating];
  const raw = FSRS_WEIGHTS[4] - Math.exp(FSRS_WEIGHTS[5] * (grade - 1)) + 1;
  return roundTo(clamp(raw, 1, 10), 4);
}

/**
 * FSRS-5 power-law forgetting curve:
 * R(t, S) = (1 + (19/81) * t / S)^(-0.5)
 * At t === S, R === 0.90 exactly.
 */
export function computeRetrievability(stability: number, elapsedDays: number): number {
  if (stability <= 0) return 0;
  if (elapsedDays <= 0) return 1;
  return (1 + (FACTOR * elapsedDays) / stability) ** DECAY;
}

export function computeNextIntervalDays(
  stability: number,
  desiredRetention = DEFAULT_DESIRED_RETENTION,
): number {
  const safeRetention = clamp(desiredRetention, 0.7, 0.99);
  const raw = (stability / FACTOR) * (safeRetention ** (1 / DECAY) - 1);
  return Math.max(1, Math.min(36_500, Math.round(raw)));
}

function updateDifficulty(currentD: number, rating: FSRSRating): number {
  const grade = RATING_TO_GRADE[rating];
  const d0Easy = computeInitialDifficulty("easy");
  const deltaD = -FSRS_WEIGHTS[6] * (grade - 3);
  const damped = currentD + deltaD * ((10 - currentD) / 9);
  const meanReverted = FSRS_WEIGHTS[7] * d0Easy + (1 - FSRS_WEIGHTS[7]) * damped;
  return roundTo(clamp(meanReverted, 1, 10), 4);
}

function computeShortTermStability(stability: number, rating: FSRSRating): number {
  const grade = RATING_TO_GRADE[rating];
  const next = stability * Math.exp(FSRS_WEIGHTS[17] * (grade - 3 + FSRS_WEIGHTS[18]));
  return roundTo(Math.max(0.1, next), 4);
}

function computeRecallStability(
  difficulty: number,
  stability: number,
  retrievability: number,
  rating: FSRSRating,
): number {
  const hardPenalty = rating === "hard" ? FSRS_WEIGHTS[15] : 1;
  const easyBonus = rating === "easy" ? FSRS_WEIGHTS[16] : 1;
  const gain =
    Math.exp(FSRS_WEIGHTS[8]) *
    (11 - difficulty) *
    stability ** -FSRS_WEIGHTS[9] *
    (Math.exp(FSRS_WEIGHTS[10] * (1 - retrievability)) - 1) *
    hardPenalty *
    easyBonus;
  return roundTo(Math.max(0.1, stability * (1 + gain)), 4);
}

function computeLapseStability(
  difficulty: number,
  stability: number,
  retrievability: number,
): number {
  const next =
    FSRS_WEIGHTS[11] *
    difficulty ** -FSRS_WEIGHTS[12] *
    ((stability + 1) ** FSRS_WEIGHTS[13] - 1) *
    Math.exp(FSRS_WEIGHTS[14] * (1 - retrievability));
  return roundTo(clamp(next, 0.1, stability), 4);
}

// ---------------------------------------------------------------------------
// Card Creation & Scheduling
// ---------------------------------------------------------------------------

export interface CreateFSRSCardInput {
  id: string;
  category: FSRSCardCategory;
  promptKey: string;
  prompt?: string;
  answer?: string;
  difficultyLevel?: number;
  nowMs?: number;
}

export function createFSRSCard(input: CreateFSRSCardInput): FSRSCard {
  return FSRSCardSchema.parse({
    id: input.id,
    category: input.category,
    promptKey: input.promptKey,
    ...(input.prompt !== undefined ? { prompt: input.prompt } : {}),
    ...(input.answer !== undefined ? { answer: input.answer } : {}),
    difficultyLevel: input.difficultyLevel ?? 1,
    state: "new",
    stability: 0,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    dueAt: input.nowMs ?? 0,
    lastReviewedAt: null,
  });
}

export interface ScheduleResult {
  card: FSRSCard;
  log: FSRSReviewLog;
}

export function scheduleFSRSCard(
  card: FSRSCard,
  rating: FSRSRating,
  nowMs: number,
  latencyMs = 1500,
  desiredRetention = DEFAULT_DESIRED_RETENTION,
): ScheduleResult {
  const prevStability = card.stability;
  const elapsedDays =
    card.lastReviewedAt !== null ? Math.max(0, (nowMs - card.lastReviewedAt) / MS_PER_DAY) : 0;

  let nextStability: number;
  let nextDifficulty: number;
  let nextState: FSRSState;
  let scheduledDays: number;
  let dueAt: number;
  let lapses = card.lapses;

  if (card.state === "new") {
    nextStability = roundTo(computeInitialStability(rating), 4);
    nextDifficulty = computeInitialDifficulty(rating);
    if (rating === "again") {
      nextState = "learning";
      scheduledDays = 0;
      dueAt = nowMs + 5 * MS_PER_MINUTE;
    } else if (rating === "hard") {
      nextState = "learning";
      scheduledDays = 0;
      dueAt = nowMs + 10 * MS_PER_MINUTE;
    } else {
      nextState = "review";
      scheduledDays = computeNextIntervalDays(nextStability, desiredRetention);
      dueAt = nowMs + scheduledDays * MS_PER_DAY;
    }
  } else {
    const retrievability = computeRetrievability(card.stability, elapsedDays);
    nextDifficulty = updateDifficulty(card.difficulty, rating);

    if (rating === "again") {
      lapses += 1;
      nextStability = computeLapseStability(card.difficulty, card.stability, retrievability);
      nextState = "relearning";
      scheduledDays = 0;
      dueAt = nowMs + 5 * MS_PER_MINUTE;
    } else if (elapsedDays < 1) {
      nextStability = computeShortTermStability(card.stability, rating);
      nextState = "review";
      scheduledDays = computeNextIntervalDays(nextStability, desiredRetention);
      dueAt = nowMs + scheduledDays * MS_PER_DAY;
    } else {
      nextStability = computeRecallStability(
        nextDifficulty,
        card.stability,
        retrievability,
        rating,
      );
      nextState = "review";
      scheduledDays = computeNextIntervalDays(nextStability, desiredRetention);
      dueAt = nowMs + scheduledDays * MS_PER_DAY;
    }
  }

  const nextCard = FSRSCardSchema.parse({
    ...card,
    state: nextState,
    stability: nextStability,
    difficulty: nextDifficulty,
    elapsedDays: roundTo(elapsedDays, 4),
    scheduledDays,
    reps: card.reps + 1,
    lapses,
    dueAt: Math.round(dueAt),
    lastReviewedAt: Math.round(nowMs),
  });

  const log = FSRSReviewLogSchema.parse({
    cardId: card.id,
    rating,
    reviewedAt: Math.round(nowMs),
    latencyMs: Math.max(0, Math.round(latencyMs)),
    accuracy: RATING_TO_ACCURACY[rating],
    prevStability,
    nextStability,
  });

  return { card: nextCard, log };
}

// ---------------------------------------------------------------------------
// Interleaved Due Queue (Ultralearning Cross-Category Retrieval)
// ---------------------------------------------------------------------------

/**
 * Returns due cards ordered by urgency (relearning/overdue first, then new),
 * greedily interleaved across categories so consecutive cards alternate
 * between intervals, chords, keys, rhythms, and landmarks.
 */
function statePriority(state: FSRSState): number {
  if (state === "relearning") return 0;
  if (state === "review") return 1;
  return 2;
}

export function getInterleavedDueQueue(
  cards: readonly FSRSCard[],
  nowMs: number,
  limit = 20,
): FSRSCard[] {
  const due = cards
    .filter((card) => card.dueAt <= nowMs || card.state === "new")
    .toSorted((a, b) => {
      const aRelearn = statePriority(a.state);
      const bRelearn = statePriority(b.state);
      if (aRelearn !== bRelearn) return aRelearn - bRelearn;
      if (a.dueAt !== b.dueAt) return a.dueAt - b.dueAt;
      return a.difficultyLevel - b.difficultyLevel;
    });

  const remaining = [...due];
  const result: FSRSCard[] = [];
  let lastCategory: FSRSCardCategory | null = null;

  while (remaining.length > 0 && result.length < limit) {
    let pickIndex = remaining.findIndex((c) => c.category !== lastCategory);
    if (pickIndex === -1) {
      pickIndex = 0;
    }
    const [picked] = remaining.splice(pickIndex, 1);
    if (!picked) break;
    result.push(picked);
    lastCategory = picked.category;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Adaptive Flow Engine ("Drop the Difficulty Level" Rule)
// ---------------------------------------------------------------------------

const FLOW_WINDOW_SIZE = 10;
const FLOW_MIN_SAMPLES = 5;
const FLOW_DROP_ACCURACY = 0.8;
const FLOW_HESITATION_MS = 4500;
const FLOW_HESITATION_ACCURACY_CEILING = 0.88;
const FLOW_PROMOTE_ACCURACY = 0.92;
const FLOW_PROMOTE_FLUENCY_MS = 2400;

export function createAdaptiveFlowState(startDifficulty = 1): AdaptiveFlowState {
  return AdaptiveFlowStateSchema.parse({
    currentDifficulty: clamp(Math.round(startDifficulty), 1, 10),
    rollingWindow: [],
    rollingAccuracy: 0.85,
    avgResponseMs: 1800,
    consecutiveDrops: 0,
    consecutivePromotions: 0,
    lastAdjustment: "none",
    lastAdjustmentReason: "Initial flow baseline (target 80-85% effortless accuracy).",
  });
}

export interface FlowAttemptInput {
  correct: boolean;
  responseMs: number;
  timestamp: number;
}

/**
 * Updates the Adaptive Flow Engine with a completed drill attempt.
 * Automatically drops difficulty when accuracy falls below 80% or hesitation spikes,
 * and promotes when accuracy >= 92% with fluent speed (<= 2400ms).
 */
export function recordFlowAttempt(
  state: AdaptiveFlowState,
  attempt: FlowAttemptInput,
): AdaptiveFlowState {
  const sample: FlowMetricSample = {
    timestamp: Math.max(0, Math.round(attempt.timestamp)),
    correct: attempt.correct,
    responseMs: Math.max(0, Math.round(attempt.responseMs)),
    difficultyLevel: state.currentDifficulty,
  };

  const window = [...state.rollingWindow, sample].slice(-FLOW_WINDOW_SIZE);
  const correctCount = window.filter((s) => s.correct).length;
  const rollingAccuracy = roundTo(correctCount / window.length, 4);
  const avgResponseMs = Math.round(
    window.reduce((sum, s) => sum + s.responseMs, 0) / window.length,
  );

  if (window.length < FLOW_MIN_SAMPLES) {
    return AdaptiveFlowStateSchema.parse({
      ...state,
      rollingWindow: window,
      rollingAccuracy,
      avgResponseMs,
      lastAdjustment: "none",
      lastAdjustmentReason: `Calibrating flow (${window.length}/${FLOW_MIN_SAMPLES} samples).`,
    });
  }

  const accuracyTooLow = rollingAccuracy < FLOW_DROP_ACCURACY;
  const hesitationSpike =
    avgResponseMs > FLOW_HESITATION_MS && rollingAccuracy < FLOW_HESITATION_ACCURACY_CEILING;

  if (accuracyTooLow || hesitationSpike) {
    const nextDiff = Math.max(1, state.currentDifficulty - 1);
    const reason = accuracyTooLow
      ? `Accuracy dropped to ${Math.round(rollingAccuracy * 100)}% (<80%) — dropping difficulty to ${nextDiff} to restore flow.`
      : `Hesitation spike (${avgResponseMs}ms avg at ${Math.round(rollingAccuracy * 100)}%) — dropping difficulty to ${nextDiff} to rebuild fluency.`;
    return AdaptiveFlowStateSchema.parse({
      currentDifficulty: nextDiff,
      rollingWindow: window.slice(-2),
      rollingAccuracy,
      avgResponseMs,
      consecutiveDrops: state.consecutiveDrops + 1,
      consecutivePromotions: 0,
      lastAdjustment: nextDiff < state.currentDifficulty ? "dropped" : "none",
      lastAdjustmentReason: reason,
    });
  }

  if (rollingAccuracy >= FLOW_PROMOTE_ACCURACY && avgResponseMs <= FLOW_PROMOTE_FLUENCY_MS) {
    const nextDiff = Math.min(10, state.currentDifficulty + 1);
    const reason = `Fluent mastery (${Math.round(rollingAccuracy * 100)}% at ${avgResponseMs}ms avg) — advancing difficulty to ${nextDiff}.`;
    return AdaptiveFlowStateSchema.parse({
      currentDifficulty: nextDiff,
      rollingWindow: window.slice(-2),
      rollingAccuracy,
      avgResponseMs,
      consecutiveDrops: 0,
      consecutivePromotions: state.consecutivePromotions + 1,
      lastAdjustment: nextDiff > state.currentDifficulty ? "promoted" : "none",
      lastAdjustmentReason: reason,
    });
  }

  return AdaptiveFlowStateSchema.parse({
    ...state,
    rollingWindow: window,
    rollingAccuracy,
    avgResponseMs,
    lastAdjustment: "none",
    lastAdjustmentReason: `In the sweet spot (${Math.round(rollingAccuracy * 100)}% accuracy, ${avgResponseMs}ms avg).`,
  });
}
