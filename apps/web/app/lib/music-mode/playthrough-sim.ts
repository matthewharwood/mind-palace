import {
  type FSRSRating,
  type HandPracticeMode,
  type Measure,
  type MeasureLoopRange,
  type PlaythroughResult,
  PlaythroughResultSchema,
  type PracticeMode,
  type RecitalTake,
  type RecitalTakeEvent,
  type ScorePassage,
} from "./schemas";

export type PlaythroughTimingRating = "early" | "on-beat" | "late";

export interface ExpectedBeatSlot {
  readonly slotIndex: number;
  readonly barNumber: number;
  readonly beatStart: number;
  readonly globalBeat: number;
  readonly midis: readonly number[];
  readonly matchedMidis: readonly number[];
}

export interface AccompanimentBeatEvent {
  readonly beatStart: number;
  readonly durationBeats: number;
  readonly midis: readonly number[];
}

export interface PlaythroughOptions {
  readonly practiceMode?: PracticeMode;
  readonly handMode?: HandPracticeMode;
  readonly loopRange?: MeasureLoopRange | null;
}

export interface PlaythroughSession {
  readonly passageId: string;
  readonly bpm: number;
  readonly beatsPerBar: number;
  readonly totalMeasures: number;
  readonly fallbackHardestBar: number;
  readonly practiceMode: PracticeMode;
  readonly handMode: HandPracticeMode;
  readonly loopRange: MeasureLoopRange | null;
  readonly slots: readonly ExpectedBeatSlot[];
  readonly slotCursor: number;
  readonly hits: number;
  readonly attempts: number;
  readonly missesByBar: Readonly<Record<number, number>>;
  readonly takeEvents: readonly RecitalTakeEvent[];
  readonly finished: boolean;
}

export interface PlaythroughNoteOutcome {
  readonly session: PlaythroughSession;
  readonly hit: boolean;
  readonly slotCompleted: boolean;
  readonly allSlotsComplete: boolean;
  readonly targetMidis: readonly number[];
  readonly timing: PlaythroughTimingRating | null;
}

export interface CleanPassTracker {
  readonly measureNumber: number;
  readonly slots: readonly ExpectedBeatSlot[];
  readonly slotCursor: number;
  readonly cleanPassComplete: boolean;
  readonly resetCount: number;
  readonly totalHits: number;
}

export interface CleanPassNoteOutcome {
  readonly tracker: CleanPassTracker;
  readonly hit: boolean;
  readonly cleanPassComplete: boolean;
  readonly expectedMidis: readonly number[];
  readonly progressRatio: number;
}

function getBeatsPerBar(passage: ScorePassage): number {
  return passage.timeSignature.numerator * (4 / passage.timeSignature.denominator);
}

function quantizeBeat(beat: number): number {
  return Math.round(beat * 16) / 16;
}

function matchesHandMode(staff: "treble" | "bass", handMode: HandPracticeMode): boolean {
  if (handMode === "both") return true;
  return handMode === "rh" ? staff === "treble" : staff === "bass";
}

function classifyBeatTimingOffset(beatDelta: number): PlaythroughTimingRating {
  if (Math.abs(beatDelta) <= 0.22) return "on-beat";
  return beatDelta < 0 ? "early" : "late";
}

function normalizeLoopRange(
  loopRange: MeasureLoopRange | null | undefined,
  totalMeasures: number,
): MeasureLoopRange | null {
  if (!loopRange || totalMeasures <= 0) return null;
  const startBar = Math.max(1, Math.min(totalMeasures, loopRange.startBar));
  const endBar = Math.max(startBar, Math.min(totalMeasures, loopRange.endBar));
  return { startBar, endBar };
}

export function extractMeasureBeatSlots(
  measure: Measure,
  beatsPerBar = 4,
  barOffsetIndex = 0,
  handMode: HandPracticeMode = "both",
): ExpectedBeatSlot[] {
  const byBeat = new Map<number, Set<number>>();
  for (const ev of measure.events) {
    if (ev.isRest || ev.pitches.length === 0) continue;
    if (!matchesHandMode(ev.staff, handMode)) continue;
    const key = quantizeBeat(ev.beatStart);
    const set = byBeat.get(key) ?? new Set<number>();
    for (const p of ev.pitches) set.add(p.midi);
    byBeat.set(key, set);
  }

  const sortedBeats = [...byBeat.keys()].sort((a, b) => a - b);
  return sortedBeats.map((beatStart, idx) => ({
    slotIndex: idx,
    barNumber: measure.number,
    beatStart,
    globalBeat: barOffsetIndex * beatsPerBar + beatStart,
    midis: [...(byBeat.get(beatStart) ?? [])].sort((a, b) => a - b),
    matchedMidis: [],
  }));
}

export function extractAccompanimentEvents(
  measure: Measure,
  handMode: HandPracticeMode,
): AccompanimentBeatEvent[] {
  if (handMode === "both") return [];
  const accompanimentStaff = handMode === "rh" ? "bass" : "treble";
  const events: AccompanimentBeatEvent[] = [];
  for (const ev of measure.events) {
    if (ev.isRest || ev.pitches.length === 0) continue;
    if (ev.staff !== accompanimentStaff) continue;
    events.push({
      beatStart: ev.beatStart,
      durationBeats: ev.durationBeats,
      midis: ev.pitches.map((p) => p.midi),
    });
  }
  return events.sort((a, b) => a.beatStart - b.beatStart);
}

export function extractPassageBeatSlots(
  passage: ScorePassage,
  handMode: HandPracticeMode = "both",
  loopRange: MeasureLoopRange | null = null,
): ExpectedBeatSlot[] {
  const beatsPerBar = getBeatsPerBar(passage);
  const normalizedLoop = normalizeLoopRange(loopRange, passage.measures.length);
  const all: ExpectedBeatSlot[] = [];
  let runningIndex = 0;
  for (let i = 0; i < passage.measures.length; i += 1) {
    const measure = passage.measures[i];
    if (!measure) continue;
    if (
      normalizedLoop &&
      (measure.number < normalizedLoop.startBar || measure.number > normalizedLoop.endBar)
    ) {
      continue;
    }
    const measureSlots = extractMeasureBeatSlots(measure, beatsPerBar, i, handMode);
    for (const slot of measureSlots) {
      all.push({ ...slot, slotIndex: runningIndex });
      runningIndex += 1;
    }
  }
  return all;
}

export function createPlaythroughSession(
  passage: ScorePassage,
  bpm: number,
  options: PlaythroughOptions = {},
): PlaythroughSession {
  const beatsPerBar = getBeatsPerBar(passage);
  const practiceMode = options.practiceMode ?? "flow";
  const handMode = options.handMode ?? "both";
  const loopRange = normalizeLoopRange(options.loopRange, passage.measures.length);
  return {
    passageId: passage.id,
    bpm: Math.min(220, Math.max(30, Math.round(bpm))),
    beatsPerBar,
    totalMeasures: passage.measures.length,
    fallbackHardestBar: loopRange ? loopRange.startBar : passage.previewNotes.hardestBarNumber,
    practiceMode,
    handMode,
    loopRange,
    slots: extractPassageBeatSlots(passage, handMode, loopRange),
    slotCursor: 0,
    hits: 0,
    attempts: 0,
    missesByBar: {},
    takeEvents: [],
    finished: false,
  };
}

export function getAwaitedBeatSlot(session: PlaythroughSession): ExpectedBeatSlot | null {
  if (session.finished) return null;
  return session.slots[session.slotCursor] ?? null;
}

export function computeNextAutoTempoScale(
  currentPct: number,
  loopAccuracy: number,
): { readonly nextPct: number; readonly delta: number } {
  const clampedCurrent = Math.max(25, Math.min(125, Math.round(currentPct)));
  if (loopAccuracy >= 0.9 && clampedCurrent < 100) {
    const nextPct = Math.min(100, clampedCurrent + 5);
    return { nextPct, delta: nextPct - clampedCurrent };
  }
  if (loopAccuracy < 0.7 && clampedCurrent > 50) {
    const nextPct = Math.max(50, clampedCurrent - 5);
    return { nextPct, delta: nextPct - clampedCurrent };
  }
  return { nextPct: clampedCurrent, delta: 0 };
}

/**
 * Returns the target MIDI notes for the current pending beat slot in the active bar.
 */
export function getActiveSlotTargetMidis(
  session: PlaythroughSession,
  barNumber: number,
): readonly number[] {
  const current = session.slots[session.slotCursor];
  if (current && current.barNumber === barNumber) {
    const matched = new Set(current.matchedMidis);
    return current.midis.filter((m) => !matched.has(m));
  }
  const barPending = session.slots.find(
    (s) => s.barNumber === barNumber && s.matchedMidis.length < s.midis.length,
  );
  if (barPending) {
    const matched = new Set(barPending.matchedMidis);
    return barPending.midis.filter((m) => !matched.has(m));
  }
  return current ? current.midis : [];
}

function advanceCursorPastCompleted(
  slots: readonly ExpectedBeatSlot[],
  startCursor: number,
): number {
  let cursor = startCursor;
  while (cursor < slots.length) {
    const slot = slots[cursor];
    if (!slot || slot.matchedMidis.length < slot.midis.length) break;
    cursor += 1;
  }
  return cursor;
}

/**
 * Advance the playthrough cursor to the current transport position.
 * Signals `autoFinished: true` as soon as the transport passes the final bar.
 */
export function advancePlaythroughPosition(
  session: PlaythroughSession,
  barNumber: number,
  beatFloat: number,
): { readonly session: PlaythroughSession; readonly autoFinished: boolean } {
  if (session.finished) {
    return { session, autoFinished: true };
  }

  // Wait Mode never auto-skips slots or auto-finishes by transport clock;
  // progression is strictly driven by matching every MIDI note in slots[slotCursor].
  if (session.practiceMode === "wait") {
    return { session, autoFinished: false };
  }

  const endBoundary = session.loopRange ? session.loopRange.endBar : session.totalMeasures;
  if (barNumber > endBoundary) {
    return {
      session: { ...session, finished: true },
      autoFinished: true,
    };
  }

  const currentGlobalBeat = Math.max(0, (barNumber - 1) * session.beatsPerBar + beatFloat);
  // Gracefully skip slots that are more than 1.75 beats behind the playhead so a missed
  // note never stalls subsequent bars ("Never stop!" sight-reading rule).
  let nextCursor = session.slotCursor;
  while (nextCursor < session.slots.length) {
    const slot = session.slots[nextCursor];
    if (!slot) break;
    const isComplete = slot.matchedMidis.length >= slot.midis.length;
    const isFarBehind = slot.globalBeat < currentGlobalBeat - 1.75;
    if (isComplete || isFarBehind) {
      nextCursor += 1;
    } else {
      break;
    }
  }

  return {
    session: nextCursor === session.slotCursor ? session : { ...session, slotCursor: nextCursor },
    autoFinished: false,
  };
}

/**
 * Beat-ordered note matching for Step 3 (`Play`).
 * Matches against the current pending beat slot (or immediately adjacent slot within
 * a tight lookahead window in Flow Mode), never an unordered bag-of-notes for the whole measure.
 */
export function recordPlaythroughNote(
  session: PlaythroughSession,
  midi: number,
  barNumber: number,
  beatFloat: number,
): PlaythroughNoteOutcome {
  const clampedBar = Math.max(1, Math.min(session.totalMeasures, barNumber));
  const beatOffset = Math.max(0, (clampedBar - 1) * session.beatsPerBar + Math.max(0, beatFloat));

  // Candidate window: current pending slot; in Flow Mode also allow the immediately next
  // slot when the player is within 0.75 beat of it (strictly beat-ordered).
  const candidateIndices: number[] = [];
  if (session.slotCursor < session.slots.length) {
    candidateIndices.push(session.slotCursor);
  }
  const nextSlot = session.slots[session.slotCursor + 1];
  const currSlot = session.slots[session.slotCursor];
  if (
    session.practiceMode === "flow" &&
    nextSlot &&
    currSlot &&
    nextSlot.barNumber === clampedBar &&
    beatOffset >= nextSlot.globalBeat - 0.75
  ) {
    candidateIndices.push(session.slotCursor + 1);
  }

  let matchedIndex = -1;
  for (const idx of candidateIndices) {
    const slot = session.slots[idx];
    if (!slot) continue;
    if (slot.midis.includes(midi) && !slot.matchedMidis.includes(midi)) {
      matchedIndex = idx;
      break;
    }
  }

  const hit = matchedIndex !== -1;
  let nextSlots = session.slots;
  let nextCursor = session.slotCursor;
  let slotCompleted = false;
  let timing: PlaythroughTimingRating | null = null;

  if (hit) {
    const target = session.slots[matchedIndex];
    if (target) {
      const updatedMatched = [...target.matchedMidis, midi];
      slotCompleted = updatedMatched.length >= target.midis.length;
      nextSlots = session.slots.map((s, i) =>
        i === matchedIndex ? { ...s, matchedMidis: updatedMatched } : s,
      );
      nextCursor = advanceCursorPastCompleted(nextSlots, session.slotCursor);
      if (session.practiceMode === "flow") {
        timing = classifyBeatTimingOffset(beatOffset - target.globalBeat);
      }
    }
  }

  const missBar = session.practiceMode === "wait" && currSlot ? currSlot.barNumber : clampedBar;
  const nextMissesByBar = hit
    ? session.missesByBar
    : {
        ...session.missesByBar,
        [missBar]: (session.missesByBar[missBar] ?? 0) + 1,
      };

  const nextEvent: RecitalTakeEvent = {
    beatOffset: Math.round(beatOffset * 100) / 100,
    midi,
    hit,
  };

  const allSlotsComplete = nextCursor >= nextSlots.length && nextSlots.length > 0;
  const nextSession: PlaythroughSession = {
    ...session,
    slots: nextSlots,
    slotCursor: nextCursor,
    hits: session.hits + (hit ? 1 : 0),
    attempts: session.attempts + 1,
    missesByBar: nextMissesByBar,
    takeEvents: [...session.takeEvents, nextEvent],
    finished: session.practiceMode === "wait" && allSlotsComplete ? true : session.finished,
  };

  const nextTargetBar =
    session.practiceMode === "wait" ? (nextSlots[nextCursor]?.barNumber ?? clampedBar) : clampedBar;

  return {
    session: nextSession,
    hit,
    slotCompleted,
    allSlotsComplete,
    targetMidis: getActiveSlotTargetMidis(nextSession, nextTargetBar),
    timing,
  };
}

export function detectWeakestBar(
  missesByBar: Readonly<Record<number, number>>,
  fallbackBar: number,
): number {
  let weakest = fallbackBar;
  let maxMisses = 0;
  for (const [barStr, count] of Object.entries(missesByBar)) {
    const barNum = Number(barStr);
    if (count > maxMisses && Number.isFinite(barNum) && barNum >= 1) {
      maxMisses = count;
      weakest = barNum;
    }
  }
  return weakest;
}

export function suggestFsrsRating(accuracy: number, unbroken: boolean): FSRSRating {
  if (accuracy >= 0.94 && unbroken) return "easy";
  if (accuracy >= 0.8) return "good";
  if (accuracy >= 0.6) return "hard";
  return "again";
}

export function finalizePlaythrough(
  session: PlaythroughSession,
  recordedAtMs: number = Date.now(),
): PlaythroughResult {
  const accuracy =
    session.attempts > 0 ? Math.min(1, Math.max(0, session.hits / session.attempts)) : 0;
  const weakestBarNumber = detectWeakestBar(session.missesByBar, session.fallbackHardestBar);
  const maxBarMisses = Object.values(session.missesByBar).reduce((acc, n) => Math.max(acc, n), 0);
  const unbroken = session.attempts > 0 && accuracy >= 0.85 && maxBarMisses <= 1;
  const suggestedRating = suggestFsrsRating(accuracy, unbroken);

  const take: RecitalTake = {
    passageId: session.passageId,
    recordedAtMs: Math.max(0, Math.round(recordedAtMs)),
    bpm: session.bpm,
    accuracy,
    unbroken,
    events: [...session.takeEvents],
  };

  return PlaythroughResultSchema.parse({
    accuracy,
    weakestBarNumber,
    suggestedRating,
    unbroken,
    take,
  });
}

/**
 * Returns the better Recital Take for Personal Best persistence in IDB.
 */
export function pickBestRecitalTake(
  existing: RecitalTake | undefined,
  candidate: RecitalTake,
): RecitalTake {
  if (!existing) return candidate;
  if (candidate.accuracy > existing.accuracy) return candidate;
  if (candidate.accuracy === existing.accuracy && candidate.unbroken && !existing.unbroken) {
    return candidate;
  }
  if (
    candidate.accuracy === existing.accuracy &&
    candidate.unbroken === existing.unbroken &&
    candidate.bpm >= existing.bpm
  ) {
    return candidate;
  }
  return existing;
}

// ---------------------------------------------------------------------------
// Step 4 ("Fix Bar"): 1 Clean Pass Beat-Ordered Validator
// ---------------------------------------------------------------------------

export function createCleanPassTracker(
  measure: Measure,
  handMode: HandPracticeMode = "both",
): CleanPassTracker {
  return {
    measureNumber: measure.number,
    slots: extractMeasureBeatSlots(measure, 4, 0, handMode),
    slotCursor: 0,
    cleanPassComplete: false,
    resetCount: 0,
    totalHits: 0,
  };
}

export function recordCleanPassNote(tracker: CleanPassTracker, midi: number): CleanPassNoteOutcome {
  if (tracker.slots.length === 0) {
    return {
      tracker: { ...tracker, cleanPassComplete: true },
      hit: true,
      cleanPassComplete: true,
      expectedMidis: [],
      progressRatio: 1,
    };
  }

  if (tracker.cleanPassComplete) {
    return {
      tracker,
      hit: true,
      cleanPassComplete: true,
      expectedMidis: [],
      progressRatio: 1,
    };
  }

  const current = tracker.slots[tracker.slotCursor];
  if (!current) {
    return {
      tracker: { ...tracker, cleanPassComplete: true },
      hit: true,
      cleanPassComplete: true,
      expectedMidis: [],
      progressRatio: 1,
    };
  }

  const isExpected = current.midis.includes(midi) && !current.matchedMidis.includes(midi);
  if (!isExpected) {
    const resetSlots = tracker.slots.map((s) => ({ ...s, matchedMidis: [] }));
    const firstExpected = resetSlots[0]?.midis ?? [];
    return {
      tracker: {
        ...tracker,
        slots: resetSlots,
        slotCursor: 0,
        cleanPassComplete: false,
        resetCount: tracker.resetCount + 1,
      },
      hit: false,
      cleanPassComplete: false,
      expectedMidis: firstExpected,
      progressRatio: 0,
    };
  }

  const updatedMatched = [...current.matchedMidis, midi];
  const nextSlots = tracker.slots.map((s, i) =>
    i === tracker.slotCursor ? { ...s, matchedMidis: updatedMatched } : s,
  );
  const slotDone = updatedMatched.length >= current.midis.length;
  const nextCursor = slotDone ? tracker.slotCursor + 1 : tracker.slotCursor;
  const complete = nextCursor >= nextSlots.length;
  const nextSlot = nextSlots[nextCursor];
  const nextMatched = nextSlot ? new Set(nextSlot.matchedMidis) : null;
  const expectedMidis =
    nextSlot && nextMatched ? nextSlot.midis.filter((m) => !nextMatched.has(m)) : [];

  return {
    tracker: {
      ...tracker,
      slots: nextSlots,
      slotCursor: nextCursor,
      cleanPassComplete: complete,
      totalHits: tracker.totalHits + 1,
    },
    hit: true,
    cleanPassComplete: complete,
    expectedMidis,
    progressRatio: nextCursor / nextSlots.length,
  };
}

// ---------------------------------------------------------------------------
// EarTrainingDrill: Dynamic High-Tier Chord Distractor Selection
// ---------------------------------------------------------------------------

export interface ChordDistractorCandidate {
  readonly label: string;
  readonly minDifficulty: number;
}

/**
 * Selects `count` unique answer options that ALWAYS include `chosen.label`,
 * plus plausible neighbors closest in difficulty/order from `pool`.
 * Fixes the `pool.slice(0, 4)` bug that omitted high-tier chords (`maj7`/`dim7`/`bII6`).
 */
export function selectChordDistractors<T extends ChordDistractorCandidate>(
  pool: readonly T[],
  chosen: T,
  count = 4,
): string[] {
  const chosenIndex = pool.findIndex((item) => item.label === chosen.label);
  const neighbors = pool
    .map((item, index) => ({
      item,
      distance:
        Math.abs(item.minDifficulty - chosen.minDifficulty) * 10 +
        (chosenIndex >= 0 ? Math.abs(index - chosenIndex) : index),
    }))
    .filter(({ item }) => item.label !== chosen.label)
    .sort((a, b) => a.distance - b.distance);

  const selected = new Set<string>([chosen.label]);
  for (const neighbor of neighbors) {
    if (selected.size >= count) break;
    selected.add(neighbor.item.label);
  }

  // Return in canonical pool order so options don't leak the answer by position
  return pool.filter((item) => selected.has(item.label)).map((item) => item.label);
}
