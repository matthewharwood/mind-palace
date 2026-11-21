import { describe, expect, it } from "bun:test";
import {
  CURRICULUM_DAYS,
  createInitialMusicModeState,
  createStarterFSRSDeck,
  FIVE_STEP_RITUAL,
  getCurriculumSummary,
  getDayPlan,
} from "./curriculum";
import { getPassageById } from "./scores";
import { CORE_24_KEY_IDS } from "./theory";

describe("music-mode 30-day x 4-hour curriculum", () => {
  it("defines all 30 days totaling 120 hours and 240 sprints", () => {
    expect(CURRICULUM_DAYS).toHaveLength(30);
    const summary = getCurriculumSummary();
    expect(summary.totalDays).toBe(30);
    expect(summary.hoursPerDay).toBe(4);
    expect(summary.totalHours).toBe(120);
    expect(summary.sprintsPerDay).toBe(8);
    expect(summary.totalSprints).toBe(240);
    expect(summary.totalKeysCovered).toBe(24);
  });

  it("covers all 24 canonical major/minor keys by Day 15", () => {
    const keysByDay15 = new Set<string>();
    for (let d = 1; d <= 15; d += 1) {
      for (const k of getDayPlan(d).keysIntroduced) {
        keysByDay15.add(k);
      }
    }
    for (const keyId of CORE_24_KEY_IDS) {
      expect(keysByDay15.has(keyId)).toBe(true);
    }
  });

  it("structures every day into 4 Atomic Habits hours x 2 focused 25m/5m sprints", () => {
    for (let d = 1; d <= 30; d += 1) {
      const plan = getDayPlan(d);
      expect(plan.day).toBe(d);
      expect(plan.blocks).toHaveLength(4);
      expect(plan.sprints).toHaveLength(8);
      expect(plan.blocks.map((b) => b.pillar)).toEqual([
        "interval-fsrs",
        "active-ear",
        "rhythm-tactile",
        "sight-reading-ritual",
      ]);

      for (const sprint of plan.sprints) {
        expect(sprint.focusMinutes).toBe(25);
        expect(sprint.breakMinutes).toBe(5);
        // Every referenced passage exists in SCORE_LIBRARY
        for (const passageId of sprint.targetPassages) {
          expect(getPassageById(passageId)).toBeDefined();
        }
      }
    }
  });

  it("includes the complete 5-Step Sight-Reading Ritual and valid initial IDB state", () => {
    expect(FIVE_STEP_RITUAL.map((s) => s.step)).toEqual([
      "preview-30s",
      "rhythm-isolate",
      "look-ahead-play",
      "review-weakest-bar",
      "fsrs-rate",
    ]);

    const day1Deck = createStarterFSRSDeck(1, 1000);
    const day30Deck = createStarterFSRSDeck(30, 1000);
    expect(day1Deck.length).toBeGreaterThan(15);
    expect(day30Deck.length).toBeGreaterThan(day1Deck.length);
    expect(day30Deck.some((c) => c.category === "chopin-idiom")).toBe(true);

    const state = createInitialMusicModeState(1000);
    expect(state.id).toBe("music-mode");
    expect(state.currentDay).toBe(1);
    expect(state.preferences.blindKeyboard).toBe(true);
    expect(state.preferences.lookAheadMasking).toBe(true);
    expect(Object.keys(state.cards).length).toBe(day1Deck.length);
  });
});
