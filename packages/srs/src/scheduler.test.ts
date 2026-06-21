import { describe, expect, test } from "bun:test";
import { createCardState, isDue, resolveConfig, review } from "./scheduler";
import { CardStateSchema, DEFAULT_CONFIG } from "./schema";

const DAY_MS = 86_400_000;
const MIN_MS = 60_000;
const T0 = 1_700_000_000_000; // fixed epoch for determinism

describe("createCardState", () => {
  test("is new, due immediately, with starting ease", () => {
    const card = createCardState({ now: T0 });
    expect(card.phase).toBe("new");
    expect(card.due).toBe(T0);
    expect(card.ease).toBe(DEFAULT_CONFIG.startingEase);
    expect(card.reps).toBe(0);
    expect(card.lastReviewedAt).toBeNull();
    expect(() => CardStateSchema.parse(card)).not.toThrow();
  });

  test("honors a custom starting ease", () => {
    const card = createCardState({ now: T0, config: { startingEase: 3.1 } });
    expect(card.ease).toBe(3.1);
  });
});

describe("resolveConfig", () => {
  test("empty input yields full defaults", () => {
    expect(resolveConfig()).toEqual(DEFAULT_CONFIG);
  });
  test("merges a partial override over defaults", () => {
    const cfg = resolveConfig({ graduatingIntervalDays: 2 });
    expect(cfg.graduatingIntervalDays).toBe(2);
    expect(cfg.learningStepsMinutes).toEqual(DEFAULT_CONFIG.learningStepsMinutes);
  });
});

describe("learning ladder", () => {
  test("new -> good walks the steps then graduates", () => {
    const a = createCardState({ now: T0 });
    // step 0 (1 min) -> step 1 (10 min)
    const b = review(a, "good", { now: T0 }).state;
    expect(b.phase).toBe("learning");
    expect(b.step).toBe(1);
    expect(b.due).toBe(T0 + 10 * MIN_MS);
    // off the ladder -> graduate to review @ graduatingIntervalDays (1d)
    const c = review(b, "good", { now: T0 + 10 * MIN_MS }).state;
    expect(c.phase).toBe("review");
    expect(c.intervalMinutes).toBe(1440);
    expect(c.due).toBe(T0 + 10 * MIN_MS + DAY_MS);
  });

  test("again resets to the first learning step", () => {
    const a = createCardState({ now: T0 });
    const b = review(a, "good", { now: T0 }).state; // step 1
    const c = review(b, "again", { now: T0 }).state;
    expect(c.phase).toBe("learning");
    expect(c.step).toBe(0);
    expect(c.due).toBe(T0 + 1 * MIN_MS);
  });

  test("easy graduates immediately at the easy interval", () => {
    const a = createCardState({ now: T0 });
    const b = review(a, "easy", { now: T0 }).state;
    expect(b.phase).toBe("review");
    expect(b.intervalMinutes).toBe(DEFAULT_CONFIG.easyIntervalDays * 1440);
  });
});

describe("review phase", () => {
  // Graduate a card so it sits in review with a known interval.
  const graduated = (() => {
    let s = createCardState({ now: T0 });
    s = review(s, "good", { now: T0 }).state;
    s = review(s, "good", { now: T0 }).state; // review, 1d
    return s;
  })();

  test("good grows the interval by ease and never shrinks", () => {
    const r = review(graduated, "good", { now: graduated.due }).state;
    expect(r.phase).toBe("review");
    expect(r.intervalMinutes).toBeGreaterThan(graduated.intervalMinutes);
    expect(r.ease).toBe(graduated.ease); // good leaves ease unchanged
  });

  test("easy bumps ease and outpaces good", () => {
    const good = review(graduated, "good", { now: graduated.due }).state;
    const easy = review(graduated, "easy", { now: graduated.due }).state;
    expect(easy.ease).toBeGreaterThan(graduated.ease);
    expect(easy.intervalMinutes).toBeGreaterThanOrEqual(good.intervalMinutes);
  });

  test("hard lowers ease and grows slowly", () => {
    const r = review(graduated, "hard", { now: graduated.due }).state;
    expect(r.ease).toBeLessThan(graduated.ease);
  });

  test("again lapses into relearning and records the lapse", () => {
    const r = review(graduated, "again", { now: graduated.due }).state;
    expect(r.phase).toBe("relearning");
    expect(r.lapses).toBe(graduated.lapses + 1);
    expect(r.ease).toBeLessThan(graduated.ease);
    expect(r.intervalMinutes).toBe(DEFAULT_CONFIG.relearningStepsMinutes[0]!);
    // relearning -> good graduates back to review
    const back = review(r, "good", { now: r.due }).state;
    expect(back.phase).toBe("review");
  });

  test("ease is clamped to the configured minimum", () => {
    let s = graduated;
    for (let i = 0; i < 20; i += 1) s = review(s, "hard", { now: s.due }).state;
    expect(s.ease).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minEase);
  });

  test("interval is capped at maxIntervalDays", () => {
    let s = graduated;
    for (let i = 0; i < 40; i += 1) s = review(s, "easy", { now: s.due }).state;
    expect(s.intervalMinutes / 1440).toBeLessThanOrEqual(DEFAULT_CONFIG.maxIntervalDays);
  });
});

describe("determinism + bookkeeping", () => {
  test("same inputs produce identical output", () => {
    const a = createCardState({ now: T0 });
    const x = review(a, "good", { now: T0 + 5 * MIN_MS });
    const y = review(a, "good", { now: T0 + 5 * MIN_MS });
    expect(x).toEqual(y);
  });

  test("reps increment and a log entry is produced", () => {
    const a = createCardState({ now: T0 });
    const { state, log } = review(a, "good", { now: T0 + 2 * MIN_MS });
    expect(state.reps).toBe(1);
    expect(state.lastReviewedAt).toBe(T0 + 2 * MIN_MS);
    expect(log.rating).toBe("good");
    expect(log.phase).toBe("new");
    expect(log.elapsedMinutes).toBe(0); // first review
  });

  test("isDue reflects the due timestamp", () => {
    const a = createCardState({ now: T0 });
    expect(isDue(a, T0)).toBe(true);
    const b = review(a, "easy", { now: T0 }).state;
    expect(isDue(b, T0)).toBe(false);
    expect(isDue(b, b.due)).toBe(true);
  });
});
