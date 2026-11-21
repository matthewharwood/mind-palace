import { describe, expect, test } from "bun:test";

import {
  advancePlaythroughPosition,
  createCleanPassTracker,
  createPlaythroughSession,
  finalizePlaythrough,
  getActiveSlotTargetMidis,
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
