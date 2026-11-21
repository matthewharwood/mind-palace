import { describe, expect, test } from "bun:test";

import {
  advancePlaythroughPosition,
  computeNextAutoTempoScale,
  createCleanPassTracker,
  createPlaythroughSession,
  extractAccompanimentEvents,
  finalizePlaythrough,
  getActiveSlotTargetMidis,
  getAwaitedBeatSlot,
  pickBestRecitalTake,
  recordCleanPassNote,
  recordPlaythroughNote,
  selectChordDistractors,
} from "./playthrough-sim";
import { SCORE_LIBRARY } from "./scores";

function getFirstPassage() {
  const passage = SCORE_LIBRARY[0];
  if (!passage) throw new Error("SCORE_LIBRARY is empty");
  return passage;
}

describe("playthrough-sim beat-ordered matching & auto-finish", () => {
  test("matches notes in beat order and rejects far-ahead out-of-order notes", () => {
    const passage = getFirstPassage();
    let session = createPlaythroughSession(passage, passage.tempoBpm);
    const firstSlot = session.slots[0];
    const laterSlot = session.slots.find(
      (s) => s.barNumber === 1 && s.beatStart >= 2 && s.midis[0] !== firstSlot?.midis[0],
    );
    expect(firstSlot).toBeDefined();

    // Playing a far-ahead beat note while still on beat 0 should NOT match as bag-of-notes
    if (laterSlot && firstSlot) {
      const wrongOrderMidi = laterSlot.midis.find((m) => !firstSlot.midis.includes(m));
      if (wrongOrderMidi !== undefined) {
        const miss = recordPlaythroughNote(session, wrongOrderMidi, 1, 0);
        expect(miss.hit).toBe(false);
        expect(miss.session.missesByBar[1]).toBe(1);
        session = miss.session;
      }
    }

    // Now play all MIDI notes of slot 0 in beat order
    if (firstSlot) {
      for (const midi of firstSlot.midis) {
        const outcome = recordPlaythroughNote(session, midi, 1, firstSlot.beatStart);
        expect(outcome.hit).toBe(true);
        session = outcome.session;
      }
      expect(session.slotCursor).toBeGreaterThanOrEqual(1);
      expect(getActiveSlotTargetMidis(session, 1)).toBeDefined();
    }
  });

  test("auto-finishes when advancing past the final bar and computes weakest bar + FSRS suggestion", () => {
    const passage = getFirstPassage();
    let session = createPlaythroughSession(passage, 72);

    // Play every slot cleanly except induce 2 misses in bar 2
    for (const slot of session.slots) {
      for (const midi of slot.midis) {
        const res = recordPlaythroughNote(session, midi, slot.barNumber, slot.beatStart);
        session = res.session;
      }
    }
    session = recordPlaythroughNote(session, 21, 2, 0).session;
    session = recordPlaythroughNote(session, 21, 2, 0.5).session;

    const mid = advancePlaythroughPosition(session, passage.measures.length, 2);
    expect(mid.autoFinished).toBe(false);

    const end = advancePlaythroughPosition(mid.session, passage.measures.length + 1, 0);
    expect(end.autoFinished).toBe(true);
    expect(end.session.finished).toBe(true);

    const result = finalizePlaythrough(end.session, 1_700_000_000_000);
    expect(result.weakestBarNumber).toBe(2);
    expect(result.take.passageId).toBe(passage.id);
    expect(result.take.events.length).toBeGreaterThan(0);
    expect(["again", "hard", "good", "easy"]).toContain(result.suggestedRating);
  });

  test("pickBestRecitalTake prefers higher accuracy and unbroken takes", () => {
    const takeA = {
      passageId: "p1",
      recordedAtMs: 1000,
      bpm: 72,
      accuracy: 0.84,
      unbroken: false,
      events: [],
    };
    const takeB = {
      passageId: "p1",
      recordedAtMs: 2000,
      bpm: 72,
      accuracy: 0.95,
      unbroken: true,
      events: [{ beatOffset: 0, midi: 60, hit: true }],
    };
    expect(pickBestRecitalTake(undefined, takeA)).toEqual(takeA);
    expect(pickBestRecitalTake(takeA, takeB)).toEqual(takeB);
    expect(pickBestRecitalTake(takeB, takeA)).toEqual(takeB);
  });
});

describe("Step 4 Fix Bar 1-Clean-Pass validation", () => {
  test("resets on a wrong note and completes after one unbroken beat-ordered pass", () => {
    const passage = getFirstPassage();
    const measure = passage.measures[0];
    if (!measure) throw new Error("Missing measure 1");

    let tracker = createCleanPassTracker(measure);
    expect(tracker.slots.length).toBeGreaterThan(0);
    expect(tracker.cleanPassComplete).toBe(false);

    // Hit first slot, then strike a wrong note -> resets clean pass
    const firstMidi = tracker.slots[0]?.midis[0];
    if (firstMidi !== undefined) {
      const firstHit = recordCleanPassNote(tracker, firstMidi);
      expect(firstHit.hit).toBe(true);
      tracker = firstHit.tracker;

      const wrong = recordCleanPassNote(tracker, 21);
      expect(wrong.hit).toBe(false);
      expect(wrong.tracker.slotCursor).toBe(0);
      expect(wrong.tracker.resetCount).toBe(1);
      tracker = wrong.tracker;
    }

    // Play every slot in order cleanly -> completes 1 Clean Pass
    for (const slot of tracker.slots) {
      for (const midi of slot.midis) {
        const res = recordCleanPassNote(tracker, midi);
        expect(res.hit).toBe(true);
        tracker = res.tracker;
      }
    }
    expect(tracker.cleanPassComplete).toBe(true);
  });
});

describe("EarTrainingDrill high-tier chord distractor selection", () => {
  const bank = [
    { label: "Major triad", minDifficulty: 1 },
    { label: "Minor triad", minDifficulty: 1 },
    { label: "Diminished triad", minDifficulty: 2 },
    { label: "Dominant 7th", minDifficulty: 3 },
    { label: "Major 7th", minDifficulty: 4 },
    { label: "Diminished 7th", minDifficulty: 5 },
    { label: "Neapolitan ♭II⁶", minDifficulty: 7 },
  ] as const;

  test("always includes high-difficulty targets (maj7, dim7, bII6) with 4 unique options", () => {
    for (const target of [bank[4], bank[5], bank[6]]) {
      const options = selectChordDistractors(bank, target, 4);
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      expect(options).toContain(target.label);
    }
  });
});

describe("Music Mode v3: Wait Mode, Hands-Separate, A-B Loop, Auto-Tempo Ramp & Timing", () => {
  test("Wait Mode holds slotCursor without auto-skip and finishes cleanly after last slot", () => {
    const passage = getFirstPassage();
    let session = createPlaythroughSession(passage, passage.tempoBpm, { practiceMode: "wait" });
    expect(session.practiceMode).toBe("wait");
    expect(getAwaitedBeatSlot(session)?.slotIndex).toBe(0);

    // Advancing clock far ahead must NOT auto-skip or auto-finish in Wait Mode
    const held = advancePlaythroughPosition(session, passage.measures.length + 2, 3);
    expect(held.autoFinished).toBe(false);
    expect(held.session.slotCursor).toBe(0);

    // Complete every slot strictly in order
    for (const slot of session.slots) {
      for (const midi of slot.midis) {
        const outcome = recordPlaythroughNote(session, midi, slot.barNumber, slot.beatStart);
        expect(outcome.hit).toBe(true);
        expect(outcome.timing).toBeNull();
        session = outcome.session;
      }
    }

    expect(session.finished).toBe(true);
    expect(getAwaitedBeatSlot(session)).toBeNull();
  });

  test("Hands-Separate filters scored slots and exposes inactive-hand accompaniment events", () => {
    const passage =
      SCORE_LIBRARY.find((p) =>
        p.measures.some(
          (m) =>
            m.events.some((e) => e.staff === "treble" && !e.isRest) &&
            m.events.some((e) => e.staff === "bass" && !e.isRest),
        ),
      ) ?? getFirstPassage();

    const rhSession = createPlaythroughSession(passage, passage.tempoBpm, { handMode: "rh" });
    const lhSession = createPlaythroughSession(passage, passage.tempoBpm, { handMode: "lh" });
    const bothSession = createPlaythroughSession(passage, passage.tempoBpm, { handMode: "both" });

    expect(rhSession.slots.length).toBeGreaterThan(0);
    expect(lhSession.slots.length).toBeGreaterThan(0);
    expect(bothSession.slots.length).toBeGreaterThanOrEqual(rhSession.slots.length);

    const measureWithBoth = passage.measures.find(
      (m) =>
        m.events.some((e) => e.staff === "treble" && !e.isRest) &&
        m.events.some((e) => e.staff === "bass" && !e.isRest),
    );
    expect(measureWithBoth).toBeDefined();
    if (measureWithBoth) {
      expect(extractAccompanimentEvents(measureWithBoth, "both")).toHaveLength(0);
      expect(extractAccompanimentEvents(measureWithBoth, "rh").length).toBeGreaterThan(0);
      expect(extractAccompanimentEvents(measureWithBoth, "lh").length).toBeGreaterThan(0);
    }
  });

  test("A-B loopRange scopes slots to [startBar..endBar] and triggers autoFinished after endBar", () => {
    const passage = SCORE_LIBRARY.find((p) => p.measures.length >= 4) ?? getFirstPassage();
    const session = createPlaythroughSession(passage, passage.tempoBpm, {
      loopRange: { startBar: 2, endBar: 3 },
    });

    expect(session.loopRange).toEqual({ startBar: 2, endBar: 3 });
    expect(session.slots.length).toBeGreaterThan(0);
    expect(session.slots.every((s) => s.barNumber >= 2 && s.barNumber <= 3)).toBe(true);

    const inside = advancePlaythroughPosition(session, 3, 2);
    expect(inside.autoFinished).toBe(false);

    const pastEnd = advancePlaythroughPosition(session, 4, 0);
    expect(pastEnd.autoFinished).toBe(true);
    expect(pastEnd.session.finished).toBe(true);
  });

  test("computeNextAutoTempoScale ramps +5% up to 100% on >=90% and eases -5% down to 50% on <70%", () => {
    expect(computeNextAutoTempoScale(75, 0.92)).toEqual({ nextPct: 80, delta: 5 });
    expect(computeNextAutoTempoScale(98, 0.95)).toEqual({ nextPct: 100, delta: 2 });
    expect(computeNextAutoTempoScale(100, 0.99)).toEqual({ nextPct: 100, delta: 0 });
    expect(computeNextAutoTempoScale(75, 0.65)).toEqual({ nextPct: 70, delta: -5 });
    expect(computeNextAutoTempoScale(52, 0.4)).toEqual({ nextPct: 50, delta: -2 });
    expect(computeNextAutoTempoScale(50, 0.3)).toEqual({ nextPct: 50, delta: 0 });
    expect(computeNextAutoTempoScale(80, 0.82)).toEqual({ nextPct: 80, delta: 0 });
  });

  test("Flow Mode hits classify timing as early, on-beat, or late", () => {
    const passage = getFirstPassage();
    const session = createPlaythroughSession(passage, passage.tempoBpm, { practiceMode: "flow" });
    const targetSlot = session.slots.find((s) => s.barNumber === 1 && s.beatStart >= 1);
    const firstSlot = session.slots[0];
    expect(firstSlot).toBeDefined();

    if (firstSlot) {
      const firstMidi = firstSlot.midis[0];
      if (firstMidi !== undefined) {
        const onBeat = recordPlaythroughNote(
          session,
          firstMidi,
          firstSlot.barNumber,
          firstSlot.beatStart + 0.05,
        );
        expect(onBeat.hit).toBe(true);
        expect(onBeat.timing).toBe("on-beat");

        const late = recordPlaythroughNote(
          session,
          firstMidi,
          firstSlot.barNumber,
          firstSlot.beatStart + 0.45,
        );
        expect(late.hit).toBe(true);
        expect(late.timing).toBe("late");
      }
    }

    if (targetSlot) {
      // Advance session to targetSlot and test early hit
      let cur = session;
      for (const slot of session.slots) {
        if (slot.slotIndex === targetSlot.slotIndex) break;
        for (const m of slot.midis) {
          cur = recordPlaythroughNote(cur, m, slot.barNumber, slot.beatStart).session;
        }
      }
      const targetMidi = targetSlot.midis[0];
      if (targetMidi !== undefined) {
        const early = recordPlaythroughNote(
          cur,
          targetMidi,
          targetSlot.barNumber,
          Math.max(0, targetSlot.beatStart - 0.4),
        );
        expect(early.hit).toBe(true);
        expect(early.timing).toBe("early");
      }
    }
  });
});
