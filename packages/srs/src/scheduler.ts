import {
  type CardState,
  CardStateSchema,
  type Rating,
  type ReviewLog,
  type SchedulerConfig,
  type SchedulerConfigInput,
  SchedulerConfigSchema,
} from "./schema";

// ---------------------------------------------------------------------------
// The scheduler: a modernized SM-2. Deliberately small and dependency-free so
// it is the *shareable* part — given the same (state, rating, now, config) it
// returns the same result on any machine. `now` is injectable for exactly that
// reason; it defaults to Date.now() only for ergonomic call sites.
// ---------------------------------------------------------------------------

const MINUTE_MS = 60_000;
const DAY_MINUTES = 1_440;

/** Resolve a partial/absent config into a complete one. */
export function resolveConfig(config?: SchedulerConfigInput): SchedulerConfig {
  return SchedulerConfigSchema.parse(config ?? {});
}

/** A fresh, never-reviewed card, due immediately. */
export function createCardState(opts?: { now?: number; config?: SchedulerConfigInput }): CardState {
  const now = opts?.now ?? Date.now();
  const cfg = resolveConfig(opts?.config);
  return CardStateSchema.parse({ phase: "new", ease: cfg.startingEase, due: now });
}

/** Is the card due for review at `now`? */
export function isDue(state: CardState, now: number = Date.now()): boolean {
  return state.due <= now;
}

export interface ReviewResult {
  state: CardState;
  log: ReviewLog;
}

/** Apply a review and return the next card state plus a history log entry. Pure. */
export function review(
  state: CardState,
  rating: Rating,
  opts?: { now?: number; config?: SchedulerConfigInput },
): ReviewResult {
  const now = opts?.now ?? Date.now();
  const cfg = resolveConfig(opts?.config);

  const scheduled =
    state.phase === "review"
      ? scheduleFromReview(state, rating, cfg, now)
      : scheduleFromLearning(state, rating, cfg, now);

  const next: CardState = {
    ...scheduled,
    reps: state.reps + 1,
    lastReviewedAt: now,
  };

  const log: ReviewLog = {
    rating,
    phase: state.phase,
    intervalMinutes: next.intervalMinutes,
    ease: next.ease,
    reviewedAt: now,
    elapsedMinutes:
      state.lastReviewedAt === null ? 0 : Math.max(0, (now - state.lastReviewedAt) / MINUTE_MS),
  };

  return { state: next, log };
}

// --- internals -------------------------------------------------------------

function clampEase(ease: number, cfg: SchedulerConfig): number {
  return Math.max(cfg.minEase, Math.round(ease * 100) / 100);
}

function stepMinutes(steps: readonly number[], index: number, fallbackDays: number): number {
  return steps[index] ?? fallbackDays * DAY_MINUTES;
}

function at(now: number, intervalMinutes: number): number {
  return now + intervalMinutes * MINUTE_MS;
}

/** Graduate a learning/relearning card into the review phase. */
function graduate(state: CardState, cfg: SchedulerConfig, now: number, easy: boolean): CardState {
  const days = easy ? cfg.easyIntervalDays : cfg.graduatingIntervalDays;
  const intervalMinutes = Math.round(days) * DAY_MINUTES;
  return { ...state, phase: "review", step: 0, intervalMinutes, due: at(now, intervalMinutes) };
}

/** Step ladder handling for new / learning / relearning cards. */
function scheduleFromLearning(
  state: CardState,
  rating: Rating,
  cfg: SchedulerConfig,
  now: number,
): CardState {
  const relearning = state.phase === "relearning";
  const phase = relearning ? "relearning" : "learning";
  const steps = relearning ? cfg.relearningStepsMinutes : cfg.learningStepsMinutes;
  const fallback = cfg.graduatingIntervalDays;

  if (rating === "easy") return graduate(state, cfg, now, true);

  if (rating === "again") {
    const m = stepMinutes(steps, 0, fallback);
    return { ...state, phase, step: 0, intervalMinutes: m, due: at(now, m) };
  }

  if (rating === "hard") {
    const m = stepMinutes(steps, state.step, fallback);
    return { ...state, phase, step: state.step, intervalMinutes: m, due: at(now, m) };
  }

  // good — advance one step, or graduate off the end of the ladder.
  const nextStep = (state.phase === "new" ? 0 : state.step) + 1;
  if (nextStep >= steps.length) return graduate(state, cfg, now, false);
  const m = stepMinutes(steps, nextStep, fallback);
  return { ...state, phase, step: nextStep, intervalMinutes: m, due: at(now, m) };
}

/** Interval math for a card already in the review phase. */
function scheduleFromReview(
  state: CardState,
  rating: Rating,
  cfg: SchedulerConfig,
  now: number,
): CardState {
  if (rating === "again") {
    // Lapse: penalize ease, drop into relearning at its first step.
    const ease = clampEase(state.ease + cfg.easeDelta.again, cfg);
    const m = stepMinutes(cfg.relearningStepsMinutes, 0, cfg.graduatingIntervalDays);
    return {
      ...state,
      phase: "relearning",
      step: 0,
      ease,
      lapses: state.lapses + 1,
      intervalMinutes: m,
      due: at(now, m),
    };
  }

  const currentDays = state.intervalMinutes / DAY_MINUTES;
  const { ease, days } = nextReviewInterval(state, rating, cfg, currentDays);
  const intervalMinutes = capDays(days, cfg) * DAY_MINUTES;
  return {
    ...state,
    phase: "review",
    step: 0,
    ease,
    intervalMinutes,
    due: at(now, intervalMinutes),
  };
}

function nextReviewInterval(
  state: CardState,
  rating: "hard" | "good" | "easy",
  cfg: SchedulerConfig,
  currentDays: number,
): { ease: number; days: number } {
  if (rating === "hard") {
    const ease = clampEase(state.ease + cfg.easeDelta.hard, cfg);
    const days = Math.max(
      currentDays,
      Math.round(currentDays * cfg.hardMultiplier * cfg.intervalModifier),
    );
    return { ease, days };
  }
  if (rating === "easy") {
    const ease = clampEase(state.ease + cfg.easeDelta.easy, cfg);
    const days = Math.max(
      currentDays + 1,
      Math.round(currentDays * state.ease * cfg.easyBonus * cfg.intervalModifier),
    );
    return { ease, days };
  }
  // good — ease unchanged; guarantee the interval grows by at least a day.
  const days = Math.max(
    currentDays + 1,
    Math.round(currentDays * state.ease * cfg.intervalModifier),
  );
  return { ease: state.ease, days };
}

function capDays(days: number, cfg: SchedulerConfig): number {
  return Math.min(days, cfg.maxIntervalDays);
}
