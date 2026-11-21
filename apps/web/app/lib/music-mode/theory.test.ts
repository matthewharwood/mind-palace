import { describe, expect, it } from "bun:test";
import {
  analyzeChopinIdiom,
  buildChopinIdiom,
  buildChord,
  CORE_24_KEY_IDS,
  createPitch,
  formatPitch,
  formatPitchUnicode,
  getBlackKeyCluster,
  getKeySignature,
  INTERVALS,
  identifyInterval,
  isBlackKeyMidi,
  KEY_SIGNATURES,
  LANDMARK_NOTES,
  mapToTactileHandFrame,
  midiToPitchInKey,
  parsePitch,
  readRelativeToLandmark,
  spellScale,
  transposePitch,
} from "./theory";

describe("music-mode theory engine", () => {
  it("covers all 24 canonical major/minor keys plus enharmonic equivalents with accurate fifths", () => {
    expect(CORE_24_KEY_IDS).toHaveLength(24);
    expect(Object.keys(KEY_SIGNATURES).length).toBe(30);

    const dbMajor = getKeySignature("Db-major");
    expect(dbMajor.fifths).toBe(-5);
    expect(dbMajor.accidentals).toEqual(["B", "E", "A", "D", "G"]);
    expect(dbMajor.scaleSpelled).toEqual(["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"]);

    const fSharpMajor = getKeySignature("F#-major");
    expect(fSharpMajor.fifths).toBe(6);
    expect(fSharpMajor.scaleSpelled).toEqual(["F#", "G#", "A#", "B", "C#", "D#", "E#"]);
  });

  it("spells enharmonics and double-sharps accurately across keys", () => {
    // In Db major, MIDI 61 must be Db4, never C#4
    expect(formatPitch(midiToPitchInKey(61, "Db-major"))).toBe("Db4");
    // In D major, MIDI 61 must be C#4, never Db4
    expect(formatPitch(midiToPitchInKey(61, "D-major"))).toBe("C#4");
    // In F# minor harmonic, raised 7th is E# (never F natural)
    const fSharpHarmonic = spellScale("F#-minor", "harmonic", 4).map(formatPitch);
    expect(fSharpHarmonic[6]).toBe("E#5");
    // In G# minor harmonic, raised 7th is F## (double sharp!)
    const gSharpHarmonic = spellScale("G#-minor", "harmonic", 4).map(formatPitch);
    expect(gSharpHarmonic[6]).toBe("F##5");
    expect(formatPitchUnicode(parsePitch("F##5"))).toBe("F𝄪5");
  });

  it("identifies and transposes intervals 1st through 10th distinguishing enharmonics", () => {
    expect(INTERVALS.some((i) => i.id === "M10")).toBe(true);
    const c4 = createPitch("C", "", 4);
    const dSharp4 = createPitch("D", "#", 4);
    const eFlat4 = createPitch("E", "b", 4);

    // Same MIDI (63), different spelled interval: A2 vs m3
    expect(identifyInterval(c4, dSharp4).id).toBe("A2");
    expect(identifyInterval(c4, eFlat4).id).toBe("m3");
    expect(identifyInterval(c4, eFlat4).visualShape).toBe("line-to-line-or-space-to-space");
    expect(identifyInterval(c4, createPitch("F", "", 4)).visualShape).toBe("line-to-space");

    // Chopin Nocturne Op. 9 No. 2 opening M6 leap (Bb4 -> G5)
    const nocturneLeap = identifyInterval(parsePitch("Bb4"), parsePitch("G5"));
    expect(nocturneLeap.id).toBe("M6");
    expect(nocturneLeap.semitones).toBe(9);

    // Transposition preserves exact theoretical spelling
    expect(formatPitch(transposePitch(parsePitch("G#4"), 7, "M", "ascending"))).toBe("F##5");
    expect(formatPitch(transposePitch(parsePitch("C4"), 10, "M", "ascending"))).toBe("E5");
  });

  it("builds triads, 7th/9th inversions, and recognizes Chopin harmonic idioms", () => {
    const gDom7FirstInv = buildChord(parsePitch("G3"), "dom7", 1);
    expect(gDom7FirstInv.pitches.map(formatPitch)).toEqual(["B3", "D4", "F4", "G4"]);
    expect(gDom7FirstInv.symbol).toBe("G7/B");

    const neapolitan = buildChopinIdiom("C-minor", "neapolitan6", 3);
    expect(neapolitan.pitches.map(formatPitch)).toEqual(["F3", "Ab3", "Db4"]);
    expect(analyzeChopinIdiom(neapolitan.pitches, "C-minor").idiom).toBe("neapolitan-bII6");

    const ger6 = buildChopinIdiom("C-minor", "gerAug6", 3);
    expect(ger6.pitches.map(formatPitch)).toEqual(["Ab3", "C4", "Eb4", "F#4"]);
    expect(analyzeChopinIdiom(ger6.pitches, "C-minor").idiom).toBe("german-aug6");

    const it6 = buildChopinIdiom("C-minor", "itAug6", 3);
    expect(analyzeChopinIdiom(it6.pitches, "C-minor").idiom).toBe("italian-aug6");

    const secDom = buildChopinIdiom("C-major", "V7/V", 3);
    expect(analyzeChopinIdiom(secDom.pitches, "C-major").idiom).toBe("secondary-dominant");

    const chromaticMediant = buildChopinIdiom("C-major", "chromatic-mediant-bVI", 3);
    expect(analyzeChopinIdiom(chromaticMediant.pitches, "C-major").idiom).toBe("chromatic-mediant");
  });

  it("reads pitches relative to the 7 grand-staff landmarks (never rote letters)", () => {
    expect(LANDMARK_NOTES).toHaveLength(7);

    const a4 = readRelativeToLandmark(parsePitch("A4"), "treble");
    expect(a4.landmark.id).toBe("treble-g4");
    expect(a4.direction).toBe("up");
    expect(a4.intervalNumber).toBe(2);
    expect(a4.relativeLabel).toContain("2nd above Treble G4");

    const b4 = readRelativeToLandmark(parsePitch("B4"), "treble");
    expect(b4.landmark.id).toBe("treble-c5");
    expect(b4.direction).toBe("down");
    expect(b4.intervalNumber).toBe(2);
    expect(b4.relativeLabel).toContain("2nd below Treble C5");

    const e3 = readRelativeToLandmark(parsePitch("E3"), "bass");
    expect(e3.landmark.id).toBe("bass-f3");
    expect(e3.direction).toBe("down");
    expect(e3.intervalNumber).toBe(2);
  });

  it("maps notes/chords onto 5-finger tactile hand frames with black-key topography", () => {
    expect(isBlackKeyMidi(61)).toBe(true); // C#/Db
    expect(isBlackKeyMidi(60)).toBe(false); // C
    expect(getBlackKeyCluster(61)).toBe("two-black");
    expect(getBlackKeyCluster(66)).toBe("three-black");

    const cMajorTriad = mapToTactileHandFrame(
      [parsePitch("C4"), parsePitch("E4"), parsePitch("G4")],
      "RH",
    );
    expect(cMajorTriad.fitsFiveFingerFrame).toBe(true);
    expect(cMajorTriad.keys.map((k) => k.finger)).toEqual([1, 3, 5]);
    expect(cMajorTriad.blindNavigationCue).toContain("2-black");

    const wideTenth = mapToTactileHandFrame([parsePitch("C3"), parsePitch("E4")], "LH");
    expect(wideTenth.fitsFiveFingerFrame).toBe(false);
    expect(wideTenth.spanSemitones).toBe(16);
  });
});
