import { describe, expect, it } from "bun:test";
import {
  generateProceduralSightReadingPassage,
  getPassageById,
  getPassagesByTier,
  measureQuarterBeats,
  RHYTHM_CELLS,
  SCORE_LIBRARY,
} from "./scores";
import { CORE_24_KEY_IDS } from "./theory";

describe("music-mode curated & procedural score library", () => {
  it("populates all 5 pedagogical tiers including 6 authentic Chopin excerpts", () => {
    expect(getPassagesByTier("method-book").length).toBeGreaterThanOrEqual(3);
    expect(getPassagesByTier("hymnal-chorale").length).toBeGreaterThanOrEqual(2);
    expect(getPassagesByTier("classical-miniature").length).toBeGreaterThanOrEqual(1);
    expect(getPassagesByTier("romantic-study").length).toBeGreaterThanOrEqual(2);
    expect(getPassagesByTier("chopin-excerpt").length).toBe(6);

    expect(getPassageById("chopin-prelude-op28-no7")?.keySignature.id).toBe("A-major");
    expect(getPassageById("chopin-prelude-op28-no4")?.keySignature.id).toBe("E-minor");
    expect(getPassageById("chopin-prelude-op28-no20")?.keySignature.id).toBe("C-minor");
    expect(getPassageById("chopin-waltz-aminor-b150")?.keySignature.id).toBe("A-minor");
    expect(getPassageById("chopin-nocturne-op9-no2")?.keySignature.id).toBe("Eb-major");
    expect(getPassageById("chopin-mazurka-op7-no1")?.keySignature.id).toBe("Bb-major");
  });

  it("guarantees exact beat-sum integrity on both treble and bass staves for every curated measure", () => {
    for (const passage of SCORE_LIBRARY) {
      const expectedBeats = measureQuarterBeats(passage.timeSignature);
      expect(passage.previewNotes.hardestBarNumber).toBeGreaterThanOrEqual(1);
      expect(passage.previewNotes.hardestBarNumber).toBeLessThanOrEqual(passage.measures.length);

      for (const measure of passage.measures) {
        const trebleSum = measure.events
          .filter((e) => e.staff === "treble")
          .reduce((acc, e) => acc + e.durationBeats, 0);
        const bassSum = measure.events
          .filter((e) => e.staff === "bass")
          .reduce((acc, e) => acc + e.durationBeats, 0);

        expect(trebleSum).toBeCloseTo(expectedBeats, 3);
        expect(bassSum).toBeCloseTo(expectedBeats, 3);
      }
    }
  });

  it("includes Chopin 2:3 and 3:4 polyrhythm cells in RHYTHM_CELLS", () => {
    expect(RHYTHM_CELLS.some((r) => r.polyrhythm === "2:3")).toBe(true);
    expect(RHYTHM_CELLS.some((r) => r.polyrhythm === "3:4")).toBe(true);
  });

  it("generates beat-accurate procedural sight-reading passages in all 24 keys", () => {
    for (const keyId of CORE_24_KEY_IDS) {
      const passage = generateProceduralSightReadingPassage({
        keyId,
        difficulty: 5,
        bars: 4,
        seed: 42,
      });
      const expectedBeats = measureQuarterBeats(passage.timeSignature);
      expect(passage.keySignature.id).toBe(keyId);
      expect(passage.measures).toHaveLength(4);

      for (const measure of passage.measures) {
        const trebleSum = measure.events
          .filter((e) => e.staff === "treble")
          .reduce((acc, e) => acc + e.durationBeats, 0);
        const bassSum = measure.events
          .filter((e) => e.staff === "bass")
          .reduce((acc, e) => acc + e.durationBeats, 0);
        expect(trebleSum).toBeCloseTo(expectedBeats, 3);
        expect(bassSum).toBeCloseTo(expectedBeats, 3);
      }
    }
  });
});
