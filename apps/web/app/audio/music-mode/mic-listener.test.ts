import { describe, expect, test } from "bun:test";
import { createSeededRandom, mixToMono } from "./dsp-core";
import {
  createMicPianoListener,
  type DetectedNote,
  DetectedNoteSchema,
  detectActiveMidis,
  detectSinglePianoNote,
  estimateNoiseFloor,
  MIC_MAX_MIDI,
  MIC_MIN_MIDI,
  type MicDetectionConfig,
  type MicDetectionConfigInput,
  MicDetectionConfigSchema,
  type MicListenerStatus,
  MicListenerStatusSchema,
  type MicNoteOnEvent,
  MicNoteOnEventSchema,
  type MicNoteOnListener,
  MicNoteTracker,
  type MicPianoListener,
  type MicPitchFrame,
  type MicPitchFrameListener,
  MicPitchFrameSchema,
  type MicStatusListener,
  type NoiseFloorEstimate,
  NoiseFloorEstimateSchema,
  rmsToVuLevel,
} from "./index";
import { synthesizePianoChordPCM, synthesizePianoNotePCM } from "./piano-dsp";
import { DEFAULT_SAMPLE_RATE } from "./schemas";

function makeWhiteNoiseBuffer(length: number, amplitude: number, seed = 42): Float32Array {
  const rng = createSeededRandom(seed);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    out[i] = (rng() * 2 - 1) * amplitude;
  }
  return out;
}

describe("Acoustic Piano Mic schemas, calibration, and VU meter", () => {
  test("validates MicListenerStatus and MicDetectionConfig defaults", () => {
    const statuses: MicListenerStatus[] = [
      "idle",
      "requesting",
      "listening",
      "denied",
      "unsupported",
      "error",
    ];
    for (const s of statuses) {
      expect(MicListenerStatusSchema.parse(s)).toBe(s);
    }
    expect(() => MicListenerStatusSchema.parse("broken")).toThrow();

    const input: MicDetectionConfigInput = {};
    const cfg: MicDetectionConfig = MicDetectionConfigSchema.parse(input);
    expect(cfg.minMidi).toBe(MIC_MIN_MIDI);
    expect(cfg.maxMidi).toBe(MIC_MAX_MIDI);
    expect(cfg.polyphonic).toBe(true);
    expect(cfg.fftSize).toBe(8192);
  });

  test("estimates ambient room noise floor resilient to isolated bumps", () => {
    const quietFrames = Array.from({ length: 12 }, (_, idx) =>
      makeWhiteNoiseBuffer(4096, 0.006, 100 + idx),
    );
    // Add a single loud bump frame; 75th percentile should ignore it
    quietFrames.push(makeWhiteNoiseBuffer(4096, 0.15, 999));

    const estimate: NoiseFloorEstimate = estimateNoiseFloor(quietFrames);
    expect(NoiseFloorEstimateSchema.parse(estimate)).toEqual(estimate);
    expect(estimate.frameCount).toBe(13);
    expect(estimate.noiseFloorRms).toBeGreaterThan(0.002);
    expect(estimate.noiseFloorRms).toBeLessThan(0.01);
    expect(estimate.peakRms).toBeGreaterThan(0.05);
    expect(estimate.recommendedMinRms).toBeGreaterThanOrEqual(0.01);

    const empty = estimateNoiseFloor([]);
    expect(empty.frameCount).toBe(0);
    expect(empty.noiseFloorRms).toBeGreaterThan(0);
  });

  test("maps RMS to bounded 0..1 perceptual VU level", () => {
    expect(rmsToVuLevel(0)).toBe(0);
    expect(rmsToVuLevel(-1)).toBe(0);
    expect(rmsToVuLevel(0.01)).toBeGreaterThan(0.2);
    expect(rmsToVuLevel(0.01)).toBeLessThan(0.5);
    expect(rmsToVuLevel(0.2)).toBeGreaterThan(0.7);
    expect(rmsToVuLevel(1.0)).toBe(1);
  });
});

describe("Single-note piano pitch detection across C2..C7 (MIDI 36..96)", () => {
  test("detectSinglePianoNote identifies all 61 keys (C2..C7) with exact MIDI match", () => {
    for (let midi = MIC_MIN_MIDI; midi <= MIC_MAX_MIDI; midi += 1) {
      const mono = mixToMono(
        synthesizePianoNotePCM({
          midi,
          velocity: 0.78,
          durationSeconds: 0.45,
          sampleRate: DEFAULT_SAMPLE_RATE,
        }),
      );
      const detected: DetectedNote | null = detectSinglePianoNote(mono, DEFAULT_SAMPLE_RATE);
      expect(detected).not.toBeNull();
      if (!detected) continue;
      expect(DetectedNoteSchema.parse(detected).midi).toBe(midi);
      expect(Math.abs(detected.centsOff)).toBeLessThanOrEqual(15);
      expect(detected.confidence).toBeGreaterThanOrEqual(0.55);
    }
  });

  test("detectActiveMidis detects single notes without octave or fifth ghost overtones", () => {
    const testKeys = [36, 40, 48, 55, 60, 64, 67, 69, 72, 79, 84, 91, 96] as const;
    for (const midi of testKeys) {
      const mono = mixToMono(
        synthesizePianoNotePCM({
          midi,
          velocity: 0.8,
          durationSeconds: 0.45,
          sampleRate: DEFAULT_SAMPLE_RATE,
        }),
      );
      const active = detectActiveMidis(mono, DEFAULT_SAMPLE_RATE);
      const midis = active.map((n) => n.midi);
      expect(midis).toEqual([midi]);
    }
  });
});

describe("Polyphonic acoustic piano interval & chord detection", () => {
  test("detects 2-note intervals across m2..P8 accurately", () => {
    const intervals: ReadonlyArray<readonly [number, number]> = [
      [60, 61], // m2
      [60, 62], // M2
      [60, 63], // m3
      [60, 64], // M3
      [60, 65], // P4
      [60, 66], // TT
      [60, 67], // P5
      [60, 68], // m6
      [60, 69], // M6
      [60, 70], // m7
      [60, 71], // M7
      [60, 72], // P8 (octave)
      [48, 64], // Wide LH+RH dyad (C3 + E4)
    ];

    for (const [low, high] of intervals) {
      const mono = mixToMono(
        synthesizePianoChordPCM({
          notes: [low, high],
          velocity: 0.8,
          durationSeconds: 0.5,
          sampleRate: DEFAULT_SAMPLE_RATE,
        }),
      );
      const detected = detectActiveMidis(mono, DEFAULT_SAMPLE_RATE);
      const midis = detected.map((n) => n.midi);
      expect(midis).toContain(low);
      expect(midis).toContain(high);
      expect(midis.length).toBeLessThanOrEqual(3);
    }
  });

  test("detects 3-note triads and 4-note Chopin voicings accurately", () => {
    const chords: ReadonlyArray<{ readonly name: string; readonly notes: readonly number[] }> = [
      { name: "C Major", notes: [60, 64, 67] },
      { name: "A Minor", notes: [57, 60, 64] },
      { name: "D Minor", notes: [62, 65, 69] },
      { name: "G Major", notes: [55, 59, 62] },
      { name: "F Major", notes: [53, 57, 60] },
      { name: "B Diminished", notes: [59, 62, 65] },
      { name: "Cmaj7", notes: [60, 64, 67, 71] },
      { name: "Chopin Eb", notes: [51, 58, 63, 67] },
    ];

    for (const chord of chords) {
      const mono = mixToMono(
        synthesizePianoChordPCM({
          notes: [...chord.notes],
          velocity: 0.8,
          durationSeconds: 0.5,
          sampleRate: DEFAULT_SAMPLE_RATE,
        }),
      );
      const detected = detectActiveMidis(mono, DEFAULT_SAMPLE_RATE, {
        maxPolyphony: Math.max(4, chord.notes.length),
      });
      const midis = detected.map((n) => n.midi);
      for (const expectedMidi of chord.notes) {
        expect(midis).toContain(expectedMidi);
      }
    }
  });
});

describe("Silence, room noise rejection, and MicNoteTracker hysteresis", () => {
  test("produces 0 false triggers on silence and broadband noise", () => {
    const silence = new Float32Array(8192);
    const quietRoom = makeWhiteNoiseBuffer(8192, 0.01, 7);
    const loudBroadbandNoise = makeWhiteNoiseBuffer(8192, 0.25, 19);

    expect(detectSinglePianoNote(silence, DEFAULT_SAMPLE_RATE)).toBeNull();
    expect(detectActiveMidis(silence, DEFAULT_SAMPLE_RATE)).toEqual([]);
    expect(detectSinglePianoNote(quietRoom, DEFAULT_SAMPLE_RATE)).toBeNull();
    expect(detectActiveMidis(quietRoom, DEFAULT_SAMPLE_RATE)).toEqual([]);
    expect(detectSinglePianoNote(loudBroadbandNoise, DEFAULT_SAMPLE_RATE)).toBeNull();
    expect(detectActiveMidis(loudBroadbandNoise, DEFAULT_SAMPLE_RATE)).toEqual([]);
  });

  test("fires exactly 1 noteOn for a sustained piano note without double-triggering", () => {
    const tracker = new MicNoteTracker({
      minHoldFrames: 2,
      retriggerCooldownMs: 140,
    });
    const fullNote = mixToMono(
      synthesizePianoNotePCM({
        midi: 60,
        velocity: 0.82,
        durationSeconds: 1.4,
        sustainPedal: true,
        sampleRate: DEFAULT_SAMPLE_RATE,
      }),
    );

    const windowSize = 8192;
    const hopSize = 1024; // ~23ms hop
    const firedEvents: MicNoteOnEvent[] = [];
    let lastFrame: MicPitchFrame | null = null;

    for (let offset = 0; offset + windowSize <= fullNote.length; offset += hopSize) {
      const slice = fullNote.subarray(offset, offset + windowSize);
      const timestampMs = (offset / DEFAULT_SAMPLE_RATE) * 1000;
      const { frame, noteOns } = tracker.processFrame(slice, DEFAULT_SAMPLE_RATE, timestampMs);
      lastFrame = MicPitchFrameSchema.parse(frame);
      for (const ev of noteOns) {
        firedEvents.push(MicNoteOnEventSchema.parse(ev));
      }
    }

    expect(lastFrame).not.toBeNull();
    expect(firedEvents.map((e) => e.midi)).toEqual([60]);
  });

  test("re-triggers cleanly when the same key is struck a second time after release", () => {
    const tracker = new MicNoteTracker({
      minHoldFrames: 2,
      retriggerCooldownMs: 140,
    });
    const noteBuf = mixToMono(
      synthesizePianoNotePCM({
        midi: 69,
        velocity: 0.8,
        durationSeconds: 0.35,
        sampleRate: DEFAULT_SAMPLE_RATE,
      }),
    );
    const strikeSlice = noteBuf.subarray(512, 512 + 8192);
    const silenceSlice = new Float32Array(8192);

    const events: MicNoteOnEvent[] = [];
    // Strike 1
    events.push(...tracker.processFrame(strikeSlice, DEFAULT_SAMPLE_RATE, 0).noteOns);
    events.push(...tracker.processFrame(strikeSlice, DEFAULT_SAMPLE_RATE, 25).noteOns);
    events.push(...tracker.processFrame(strikeSlice, DEFAULT_SAMPLE_RATE, 50).noteOns);
    // Silence gap (release)
    events.push(...tracker.processFrame(silenceSlice, DEFAULT_SAMPLE_RATE, 120).noteOns);
    events.push(...tracker.processFrame(silenceSlice, DEFAULT_SAMPLE_RATE, 150).noteOns);
    // Strike 2
    events.push(...tracker.processFrame(strikeSlice, DEFAULT_SAMPLE_RATE, 220).noteOns);
    events.push(...tracker.processFrame(strikeSlice, DEFAULT_SAMPLE_RATE, 245).noteOns);

    expect(events.map((e) => e.midi)).toEqual([69, 69]);
  });
});

describe("MicPianoListener controller graceful fallback and API contract", () => {
  test("falls back cleanly to unsupported when navigator.mediaDevices is unavailable", async () => {
    const listener: MicPianoListener = createMicPianoListener({ minMidi: 36, maxMidi: 96 });
    const statuses: MicListenerStatus[] = [];

    const onStatus: MicStatusListener = (s) => statuses.push(s);
    const onNote: MicNoteOnListener = () => undefined;
    const onFrame: MicPitchFrameListener = () => undefined;

    const unsubStatus = listener.onStatusChange(onStatus);
    const unsubNote = listener.onNoteOn(onNote);
    const unsubFrame = listener.onPitchFrame(onFrame);

    expect(listener.getStatus()).toBe("idle");
    expect(listener.getLevel()).toBe(0);

    const result = await listener.start();
    expect(result).toBe("unsupported");
    expect(listener.getStatus()).toBe("unsupported");
    expect(listener.getLastError()).toBeTruthy();
    expect(statuses).toEqual(["unsupported"]);

    listener.pauseDetection(true);
    expect(listener.isDetectionPaused()).toBe(true);
    listener.setGateThreshold(0.025);
    expect(listener.getConfig().minRms).toBeCloseTo(0.025, 5);
    listener.updateConfig({ polyphonic: false });
    expect(listener.getConfig().polyphonic).toBe(false);

    expect(await listener.calibrateNoiseFloor(200)).toBeNull();

    listener.stop();
    expect(listener.getStatus()).toBe("idle");
    expect(listener.getLevel()).toBe(0);

    unsubStatus();
    unsubNote();
    unsubFrame();
  });
});
