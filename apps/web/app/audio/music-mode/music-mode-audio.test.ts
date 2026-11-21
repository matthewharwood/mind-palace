import { describe, expect, test } from "bun:test";

import {
  AudioPreferencesSchema,
  analyzeBuffer,
  computeBarSchedule,
  computeFFT,
  computeRMS,
  createMusicMetronome,
  DEFAULT_SAMPLE_RATE,
  findSpectralPeakNear,
  formatTimeSignature,
  frequencyToMidi,
  getAudioPreferences,
  getBarDurationSeconds,
  getSustainPedal,
  getTimeSignatureSpec,
  installAudioUnlockListeners,
  isReducedMotionPreferred,
  MetronomeConfigSchema,
  MidiNoteSchema,
  midiToFrequency,
  midiToNoteName,
  midiToPan,
  mixToMono,
  PIANO_MAX_MIDI,
  PIANO_MIN_MIDI,
  playMusicSfx,
  playPianoChord,
  playPianoInterval,
  playPianoNote,
  releasePianoNote,
  setAudioPreferences,
  setSustainPedal,
  stopAllPianoNotes,
  synthesizeMetronomeClickPCM,
  synthesizePianoChordPCM,
  synthesizePianoNotePCM,
  synthesizeSfxPCM,
  type TimeSignature,
  unlockMusicAudio,
} from "./index";

describe("Music Mode audio schemas and pitch math", () => {
  test("validates MIDI 88-key bounds (21..108)", () => {
    expect(MidiNoteSchema.parse(PIANO_MIN_MIDI)).toBe(21);
    expect(MidiNoteSchema.parse(PIANO_MAX_MIDI)).toBe(108);
    expect(() => MidiNoteSchema.parse(20)).toThrow();
    expect(() => MidiNoteSchema.parse(109)).toThrow();
    expect(() => MidiNoteSchema.parse(60.5)).toThrow();
  });

  test("maps MIDI notes to exact equal-temperament frequencies and note names", () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 6);
    expect(midiToFrequency(60)).toBeCloseTo(261.625_565, 5);
    expect(midiToFrequency(21)).toBeCloseTo(27.5, 6);
    expect(midiToFrequency(108)).toBeCloseTo(4186.009, 2);
    expect(frequencyToMidi(440)).toBeCloseTo(69, 6);
    expect(midiToNoteName(21)).toBe("A0");
    expect(midiToNoteName(60)).toBe("C4");
    expect(midiToNoteName(69)).toBe("A4");
    expect(midiToNoteName(78)).toBe("F#5");
    expect(midiToNoteName(108)).toBe("C8");
  });

  test("pans stereo image smoothly from left (A0) to right (C8)", () => {
    expect(midiToPan(21)).toBeCloseTo(-0.65, 4);
    expect(midiToPan(108)).toBeCloseTo(0.65, 4);
    expect(Math.abs(midiToPan(64.5))).toBeLessThan(0.02);
  });
});

describe("Concert Grand Piano DSP synthesis", () => {
  const landmarkNotes = [21, 36, 48, 60, 69, 78, 96, 108] as const;

  test("hits target fundamental within +/-3 cents with zero clipping and valid ADSR decay across registers", () => {
    for (const midi of landmarkNotes) {
      const targetHz = midiToFrequency(midi);
      const stereo = synthesizePianoNotePCM({
        midi,
        velocity: 0.78,
        durationSeconds: 1.0,
        sampleRate: DEFAULT_SAMPLE_RATE,
      });
      const mono = mixToMono(stereo);
      const analysis = analyzeBuffer(mono, DEFAULT_SAMPLE_RATE, targetHz);

      expect(analysis.hasNonFinite).toBe(false);
      expect(analysis.peak).toBeLessThanOrEqual(1.0);
      expect(analysis.rms).toBeGreaterThan(0.01);
      expect(analysis.envelopeDecays).toBe(true);
      expect(Math.abs(analysis.centsError ?? 999)).toBeLessThanOrEqual(3.0);
    }
  });

  test("shapes stereo panning, velocity brightness, and damper vs sustain pedal", () => {
    const bass = synthesizePianoNotePCM({ midi: 24, durationSeconds: 0.5 });
    const treble = synthesizePianoNotePCM({ midi: 104, durationSeconds: 0.5 });
    expect(computeRMS(bass.left)).toBeGreaterThan(computeRMS(bass.right));
    expect(computeRMS(treble.right)).toBeGreaterThan(computeRMS(treble.left));

    const pp = analyzeBuffer(
      mixToMono(synthesizePianoNotePCM({ midi: 60, velocity: 0.2, durationSeconds: 0.8 })),
      DEFAULT_SAMPLE_RATE,
    );
    const ff = analyzeBuffer(
      mixToMono(synthesizePianoNotePCM({ midi: 60, velocity: 0.95, durationSeconds: 0.8 })),
      DEFAULT_SAMPLE_RATE,
    );
    expect(ff.rms).toBeGreaterThan(pp.rms * 2);
    expect(ff.spectralCentroidHz).toBeGreaterThan(pp.spectralCentroidHz);

    const damped = analyzeBuffer(
      mixToMono(
        synthesizePianoNotePCM({
          midi: 60,
          durationSeconds: 1.2,
          releaseAtSeconds: 0.25,
          sustainPedal: false,
        }),
      ),
      DEFAULT_SAMPLE_RATE,
    );
    const sustained = analyzeBuffer(
      mixToMono(
        synthesizePianoNotePCM({
          midi: 60,
          durationSeconds: 1.2,
          releaseAtSeconds: 0.25,
          sustainPedal: true,
        }),
      ),
      DEFAULT_SAMPLE_RATE,
    );
    expect(sustained.tailRms).toBeGreaterThan(damped.tailRms * 5);
  });

  test("renders intervals (m2..P8) and chords with all tones spectrally present and zero clipping", () => {
    for (let semitones = 1; semitones <= 12; semitones += 1) {
      const notes = [60, 60 + semitones];
      const mono = mixToMono(synthesizePianoChordPCM({ notes, durationSeconds: 0.8 }));
      const analysis = analyzeBuffer(mono, DEFAULT_SAMPLE_RATE);
      const fft = computeFFT(
        mono,
        DEFAULT_SAMPLE_RATE,
        32_768,
        Math.floor(DEFAULT_SAMPLE_RATE * 0.015),
      );

      expect(analysis.hasNonFinite).toBe(false);
      expect(analysis.peak).toBeLessThanOrEqual(1.0);
      for (const midi of notes) {
        const peak = findSpectralPeakNear(fft, midiToFrequency(midi), 25);
        expect(peak.relativeMagnitude).toBeGreaterThan(0.12);
      }
    }

    const chordCases = [
      [60, 64, 67], // C Major
      [60, 63, 67], // C Minor
      [60, 64, 67, 71], // Cmaj7
      [55, 59, 62, 65], // G7
    ];
    for (const notes of chordCases) {
      const mono = mixToMono(synthesizePianoChordPCM({ notes, durationSeconds: 0.9 }));
      const analysis = analyzeBuffer(mono, DEFAULT_SAMPLE_RATE);
      const fft = computeFFT(
        mono,
        DEFAULT_SAMPLE_RATE,
        32_768,
        Math.floor(DEFAULT_SAMPLE_RATE * 0.015),
      );

      expect(analysis.hasNonFinite).toBe(false);
      expect(analysis.peak).toBeLessThanOrEqual(1.0);
      for (const midi of notes) {
        const peak = findSpectralPeakNear(fft, midiToFrequency(midi), 25);
        expect(peak.relativeMagnitude).toBeGreaterThan(0.08);
      }
    }
  });
});

describe("Polyrhythm Metronome DSP & scheduling", () => {
  test("computes exact bar durations and pulse grids for all supported time signatures", () => {
    const meters: TimeSignature[] = ["2/4", "3/4", "4/4", "6/8", "9/8", "12/8"];
    for (const ts of meters) {
      const spec = getTimeSignatureSpec(ts);
      expect(getBarDurationSeconds(120, ts)).toBeCloseTo(spec.mainBeats * 0.5, 6);
      const pulses = computeBarSchedule({ timeSignature: ts, bpm: 120 });
      expect(pulses[0]?.voice).toBe("accent");
      expect(pulses[0]?.fractionOfBar).toBe(0);
    }

    expect(formatTimeSignature({ numerator: 6, denominator: 8 })).toBe("6/8");
    expect(formatTimeSignature({ numerator: 7, denominator: 8 })).toBe("4/4");
  });

  test("schedules Chopin 2:3 and 3:4 cross-rhythms accurately", () => {
    const poly23 = computeBarSchedule({ timeSignature: "2/4", polyrhythm: "2:3" });
    const cross23 = poly23.filter((p) => p.voice === "cross").map((p) => p.fractionOfBar);
    expect(cross23.length).toBe(2);
    expect(cross23[0]).toBeCloseTo(1 / 3, 5);
    expect(cross23[1]).toBeCloseTo(2 / 3, 5);

    const poly34 = computeBarSchedule({ timeSignature: "3/4", polyrhythm: "3:4" });
    const cross34 = poly34.filter((p) => p.voice === "cross").map((p) => p.fractionOfBar);
    expect(cross34.length).toBe(3);
    expect(cross34[0]).toBeCloseTo(0.25, 5);
    expect(cross34[1]).toBeCloseTo(0.5, 5);
    expect(cross34[2]).toBeCloseTo(0.75, 5);
  });

  test("synthesizes distinct woodblock accent, beat, subdivision, and cross voices without clipping", () => {
    const accent = analyzeBuffer(
      mixToMono(synthesizeMetronomeClickPCM("accent")),
      DEFAULT_SAMPLE_RATE,
    );
    const beat = analyzeBuffer(mixToMono(synthesizeMetronomeClickPCM("beat")), DEFAULT_SAMPLE_RATE);
    const sub = analyzeBuffer(
      mixToMono(synthesizeMetronomeClickPCM("subdivision")),
      DEFAULT_SAMPLE_RATE,
    );
    const cross = analyzeBuffer(
      mixToMono(synthesizeMetronomeClickPCM("cross")),
      DEFAULT_SAMPLE_RATE,
    );

    for (const res of [accent, beat, sub, cross]) {
      expect(res.hasNonFinite).toBe(false);
      expect(res.peak).toBeLessThanOrEqual(1.0);
      expect(res.rms).toBeGreaterThan(0.01);
      expect(res.envelopeDecays).toBe(true);
    }
    expect(accent.rms).toBeGreaterThan(beat.rms);
    expect(accent.spectralCentroidHz).toBeGreaterThan(beat.spectralCentroidHz);
  });
});

describe("UI & Learning SFX DSP synthesis", () => {
  test("produces valid, non-clipping, spectrally distinct signatures for all 5 SFX", () => {
    const correct = analyzeBuffer(
      mixToMono(synthesizeSfxPCM({ kind: "correctInterval" })),
      DEFAULT_SAMPLE_RATE,
    );
    const miss = analyzeBuffer(
      mixToMono(synthesizeSfxPCM({ kind: "gentleMiss" })),
      DEFAULT_SAMPLE_RATE,
    );
    const hit = analyzeBuffer(
      mixToMono(synthesizeSfxPCM({ kind: "rhythmHit", rhythmAccuracy: "on-beat" })),
      DEFAULT_SAMPLE_RATE,
    );
    const countdown = analyzeBuffer(
      mixToMono(synthesizeSfxPCM({ kind: "previewCountdown", countdownFinal: false })),
      DEFAULT_SAMPLE_RATE,
    );
    const countdownFinal = analyzeBuffer(
      mixToMono(synthesizeSfxPCM({ kind: "previewCountdown", countdownFinal: true })),
      DEFAULT_SAMPLE_RATE,
    );
    const milestone = analyzeBuffer(
      mixToMono(synthesizeSfxPCM({ kind: "streakMilestone", reducedMotion: false })),
      DEFAULT_SAMPLE_RATE,
    );
    const milestoneReduced = analyzeBuffer(
      mixToMono(synthesizeSfxPCM({ kind: "streakMilestone", reducedMotion: true })),
      DEFAULT_SAMPLE_RATE,
    );

    for (const res of [
      correct,
      miss,
      hit,
      countdown,
      countdownFinal,
      milestone,
      milestoneReduced,
    ]) {
      expect(res.hasNonFinite).toBe(false);
      expect(res.peak).toBeLessThanOrEqual(1.0);
      expect(res.rms).toBeGreaterThan(0.01);
    }

    expect(miss.spectralCentroidHz).toBeLessThan(correct.spectralCentroidHz);
    expect(hit.durationSeconds).toBeLessThanOrEqual(0.06);
    expect(countdownFinal.durationSeconds).toBeGreaterThan(countdown.durationSeconds);
    expect(milestoneReduced.durationSeconds).toBeLessThan(milestone.durationSeconds);
  });
});

describe("Web Audio engine SSR / non-browser safety & preferences", () => {
  test("handles preferences, sustain pedal, unlock, and playback safely without AudioContext", async () => {
    const defaultPrefs = AudioPreferencesSchema.parse({});
    expect(defaultPrefs.muted).toBe(false);

    const updated = setAudioPreferences({ muted: true, masterVolume: 0.5 });
    expect(updated.muted).toBe(true);
    expect(getAudioPreferences().masterVolume).toBe(0.5);
    setAudioPreferences({ muted: false, masterVolume: 0.85 });

    expect(isReducedMotionPreferred()).toBe(false);
    expect(await unlockMusicAudio()).toBe(false);
    const uninstall = installAudioUnlockListeners();
    uninstall();

    setSustainPedal(true);
    expect(getSustainPedal()).toBe(true);
    setSustainPedal(false);
    expect(getSustainPedal()).toBe(false);

    // Playback calls must be safe no-ops in Bun/SSR without window.AudioContext
    expect(() => playPianoNote({ midi: 60 })).not.toThrow();
    expect(() => releasePianoNote(60)).not.toThrow();
    expect(() => playPianoChord({ notes: [60, 64, 67] })).not.toThrow();
    expect(() => playPianoInterval(60, 7, "melodic")).not.toThrow();
    expect(() => playPianoInterval(60, 7, "harmonic")).not.toThrow();
    expect(() => stopAllPianoNotes()).not.toThrow();
    expect(() => playMusicSfx("correctInterval")).not.toThrow();

    const metro = createMusicMetronome(
      MetronomeConfigSchema.parse({ bpm: 92, timeSignature: "3/4" }),
    );
    expect(metro.isRunning()).toBe(false);
    metro.start();
    metro.updateConfig({ polyrhythm: "3:4" });
    expect(metro.getConfig().polyrhythm).toBe("3:4");
    metro.stop();
  });
});
