import { describe, expect, test } from "bun:test";

import {
  ALL_24_KEY_SIGNATURES,
  classifyTimingOffset,
  formatKeySignatureAccidentals,
  getLedgerLineSteps,
  isBlackKeyMidi,
  isLandmarkMidi,
  makePitch,
  midiToNoteName,
  pitchToDiatonicStep,
} from "./types";

describe("music-mode notation helpers", () => {
  test("covers all 24 major and minor key signatures", () => {
    expect(ALL_24_KEY_SIGNATURES).toHaveLength(24);
    const majors = ALL_24_KEY_SIGNATURES.filter((k) => k.mode === "major");
    const minors = ALL_24_KEY_SIGNATURES.filter((k) => k.mode === "minor");
    expect(majors).toHaveLength(12);
    expect(minors).toHaveLength(12);
  });

  test("formats key signature accidentals cleanly", () => {
    expect(formatKeySignatureAccidentals(0)).toBe("No sharps or flats");
    expect(formatKeySignatureAccidentals(1)).toBe("1♯ (F♯)");
    expect(formatKeySignatureAccidentals(-3)).toBe("3♭ (B♭, E♭, A♭)");
  });

  test("maps pitches to diatonic staff steps with Middle C4 = 0", () => {
    expect(pitchToDiatonicStep(makePitch("C", 4))).toBe(0);
    expect(pitchToDiatonicStep(makePitch("E", 4))).toBe(2); // Treble bottom line
    expect(pitchToDiatonicStep(makePitch("F", 5))).toBe(10); // Treble top line
    expect(pitchToDiatonicStep(makePitch("A", 3))).toBe(-2); // Bass top line
    expect(pitchToDiatonicStep(makePitch("G", 2))).toBe(-10); // Bass bottom line
  });

  test("computes ledger line steps accurately for treble and bass clefs", () => {
    // Middle C4 needs 1 ledger line below treble and 1 above bass
    expect(getLedgerLineSteps(0, "treble")).toEqual([0]);
    expect(getLedgerLineSteps(0, "bass")).toEqual([0]);
    // Notes inside staff need zero ledger lines
    expect(getLedgerLineSteps(6, "treble")).toEqual([]);
    expect(getLedgerLineSteps(-6, "bass")).toEqual([]);
    // High C6 (step 14) on treble needs ledger lines at A5 (12) and C6 (14)
    expect(getLedgerLineSteps(14, "treble")).toEqual([12, 14]);
  });

  test("identifies black keys, note names, and landmark anchors", () => {
    expect(isBlackKeyMidi(60)).toBe(false); // C4
    expect(isBlackKeyMidi(61)).toBe(true); // C#4
    expect(midiToNoteName(60)).toBe("C4");
    expect(midiToNoteName(61, true)).toBe("D♭4");
    expect(isLandmarkMidi(60)).toBe(true); // Middle C
    expect(isLandmarkMidi(67)).toBe(true); // Treble G4
    expect(isLandmarkMidi(53)).toBe(true); // Bass F3
    expect(isLandmarkMidi(62)).toBe(false); // D4
  });

  test("classifies rhythm tap timing offsets", () => {
    expect(classifyTimingOffset(0)).toBe("on-beat");
    expect(classifyTimingOffset(-24)).toBe("on-beat");
    expect(classifyTimingOffset(25)).toBe("on-beat");
    expect(classifyTimingOffset(-40)).toBe("slightly-early");
    expect(classifyTimingOffset(45)).toBe("slightly-late");
    expect(classifyTimingOffset(-80)).toBe("early");
    expect(classifyTimingOffset(90)).toBe("late");
  });
});
