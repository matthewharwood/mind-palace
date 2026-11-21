import { describe, expect, it } from "bun:test";
import {
  computeNextIntervalDays,
  computeRetrievability,
  createAdaptiveFlowState,
  createFSRSCard,
  getInterleavedDueQueue,
  recordFlowAttempt,
  scheduleFSRSCard,
} from "./fsrs";

const DAY_MS = 86_400_000;

describe("music-mode FSRS-5 & Adaptive Flow Engine", () => {
  it("satisfies the FSRS-5 power-law forgetting curve R(S, S) === 0.90", () => {
    expect(computeRetrievability(10, 0)).toBe(1);
    expect(computeRetrievability(10, 10)).toBeCloseTo(0.9, 6);
    expect(computeRetrievability(3.173, 3.173)).toBeCloseTo(0.9, 6);
    expect(computeRetrievability(10, 30)).toBeLessThan(0.9);
    expect(computeNextIntervalDays(10, 0.9)).toBe(10);
  });

  it("grows stability on Good/Easy reviews and records lapses on Again", () => {
    const start = 1_700_000_000_000;
    const card = createFSRSCard({
      id: "iv-M6",
      category: "interval",
      promptKey: "M6",
      nowMs: start,
    });

    const first = scheduleFSRSCard(card, "good", start, 1200);
    expect(first.card.state).toBe("review");
    expect(first.card.reps).toBe(1);
    expect(first.card.stability).toBeGreaterThan(3);
    expect(first.card.scheduledDays).toBeGreaterThanOrEqual(3);
    expect(first.log.accuracy).toBe(0.9);

    // Review again after scheduled interval with Easy
    const secondTime = start + first.card.scheduledDays * DAY_MS;
    const second = scheduleFSRSCard(first.card, "easy", secondTime, 900);
    expect(second.card.stability).toBeGreaterThan(first.card.stability);
    expect(second.card.difficulty).toBeLessThan(first.card.difficulty);

    // Lapse with Again resets to relearning and shrinks stability
    const thirdTime = secondTime + 5 * DAY_MS;
    const lapsed = scheduleFSRSCard(second.card, "again", thirdTime, 4800);
    expect(lapsed.card.state).toBe("relearning");
    expect(lapsed.card.lapses).toBe(1);
    expect(lapsed.card.stability).toBeLessThan(second.card.stability);
  });

  it("interleaves due cards across categories (Ultralearning retrieval)", () => {
    const now = 1_000_000;
    const cards = [
      createFSRSCard({ id: "i1", category: "interval", promptKey: "m3", nowMs: now - 500 }),
      createFSRSCard({ id: "i2", category: "interval", promptKey: "M3", nowMs: now - 400 }),
      createFSRSCard({ id: "c1", category: "chord-quality", promptKey: "dom7", nowMs: now - 300 }),
      createFSRSCard({
        id: "k1",
        category: "key-signature",
        promptKey: "Db-major",
        nowMs: now - 200,
      }),
      createFSRSCard({ id: "r1", category: "rhythm-cell", promptKey: "2:3", nowMs: now - 100 }),
    ];

    const queue = getInterleavedDueQueue(cards, now, 5);
    expect(queue).toHaveLength(5);
    // No adjacent cards share the same category when alternatives exist
    for (let i = 1; i < queue.length; i += 1) {
      expect(queue[i]?.category).not.toBe(queue[i - 1]?.category);
    }
  });

  it("automatically drops difficulty when accuracy < 80% or hesitation spikes", () => {
    let flow = createAdaptiveFlowState(5);
    const t0 = 10_000;

    // 3 misses out of 5 -> 40% accuracy -> triggers drop from 5 to 4
    const attempts = [true, false, false, true, false];
    for (let i = 0; i < attempts.length; i += 1) {
      flow = recordFlowAttempt(flow, {
        correct: attempts[i] ?? false,
        responseMs: 2200,
        timestamp: t0 + i * 2500,
      });
    }

    expect(flow.currentDifficulty).toBe(4);
    expect(flow.lastAdjustment).toBe("dropped");
    expect(flow.consecutiveDrops).toBe(1);
  });

  it("promotes difficulty when accuracy >= 92% with fluent speed (<= 2400ms)", () => {
    let flow = createAdaptiveFlowState(3);
    const t0 = 20_000;

    for (let i = 0; i < 5; i += 1) {
      flow = recordFlowAttempt(flow, {
        correct: true,
        responseMs: 1400,
        timestamp: t0 + i * 2000,
      });
    }

    expect(flow.currentDifficulty).toBe(4);
    expect(flow.lastAdjustment).toBe("promoted");
    expect(flow.consecutivePromotions).toBe(1);
  });
});
