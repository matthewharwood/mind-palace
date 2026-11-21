import {
  analyzeBuffer,
  computeBarSchedule,
  computeFFT,
  computeRMS,
  DEFAULT_SAMPLE_RATE,
  detectActiveMidis,
  detectSinglePianoNote,
  estimateNoiseFloor,
  findSpectralPeakNear,
  MIC_MAX_MIDI,
  MIC_MIN_MIDI,
  MicNoteTracker,
  midiToFrequency,
  midiToNoteName,
  mixToMono,
  PIANO_MAX_MIDI,
  PIANO_MIN_MIDI,
  synthesizeMetronomeClickPCM,
  synthesizePianoChordPCM,
  synthesizePianoNotePCM,
  synthesizeSfxPCM,
  type TimeSignature,
} from "../app/audio/music-mode";

const MAX_ALLOWED_CENTS = 3.0;
const failures: string[] = [];

function logLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function logError(message: string): void {
  process.stderr.write(`${message}\n`);
}

function assertCheck(condition: boolean, message: string): void {
  if (!condition) {
    failures.push(message);
  }
}

function verifyAll88PianoKeys(): void {
  const landmarks = new Set([21, 36, 60, 69, 78, 108]); // A0, C2, C4, A4, F#5, C8
  let maxAbsCents = 0;
  let worstMidi = 69;
  let maxPeak = 0;
  let minRms = Number.POSITIVE_INFINITY;
  let maxRms = 0;

  logLine("=== 1. Concert Grand Piano (88 Keys: A0..C8) ===");

  for (let midi = PIANO_MIN_MIDI; midi <= PIANO_MAX_MIDI; midi += 1) {
    const targetHz = midiToFrequency(midi);
    const stereo = synthesizePianoNotePCM({
      midi,
      velocity: 0.78,
      durationSeconds: 1.0,
      sampleRate: DEFAULT_SAMPLE_RATE,
    });
    const mono = mixToMono(stereo);
    const analysis = analyzeBuffer(mono, DEFAULT_SAMPLE_RATE, targetHz);
    const cents = analysis.centsError ?? Number.POSITIVE_INFINITY;
    const absCents = Math.abs(cents);

    if (absCents > maxAbsCents) {
      maxAbsCents = absCents;
      worstMidi = midi;
    }
    if (analysis.peak > maxPeak) maxPeak = analysis.peak;
    if (analysis.rms < minRms) minRms = analysis.rms;
    if (analysis.rms > maxRms) maxRms = analysis.rms;

    const label = `${midiToNoteName(midi)} (MIDI ${midi})`;
    assertCheck(!analysis.hasNonFinite, `${label}: contains NaN/Infinity`);
    assertCheck(analysis.peak <= 1.0, `${label}: clipping peak=${analysis.peak.toFixed(4)}`);
    assertCheck(analysis.rms >= 0.005, `${label}: silent rms=${analysis.rms.toFixed(5)}`);
    assertCheck(
      absCents <= MAX_ALLOWED_CENTS,
      `${label}: pitch off target=${targetHz.toFixed(2)}Hz detected=${analysis.detectedHz.toFixed(2)}Hz err=${cents.toFixed(2)}c`,
    );
    assertCheck(
      analysis.envelopeDecays,
      `${label}: envelope did not decay (earlyRms=${analysis.earlyRms.toFixed(4)} tailRms=${analysis.tailRms.toFixed(4)})`,
    );

    if (landmarks.has(midi)) {
      logLine(
        `  ${label.padEnd(15)} target=${targetHz.toFixed(2).padStart(7)}Hz  detected=${analysis.detectedHz.toFixed(2).padStart(7)}Hz  err=${cents >= 0 ? "+" : ""}${cents.toFixed(2)}c  rms=${analysis.rms.toFixed(4)}  peak=${analysis.peak.toFixed(3)}`,
      );
    }
  }

  // Verify stereo keyboard imaging (A0 left-weighted, C8 right-weighted)
  const lowStereo = synthesizePianoNotePCM({ midi: 21, durationSeconds: 0.5 });
  const highStereo = synthesizePianoNotePCM({ midi: 108, durationSeconds: 0.5 });
  assertCheck(
    computeRMS(lowStereo.left) > computeRMS(lowStereo.right),
    "Stereo pan: A0 should be louder in left channel",
  );
  assertCheck(
    computeRMS(highStereo.right) > computeRMS(highStereo.left),
    "Stereo pan: C8 should be louder in right channel",
  );

  logLine(
    `  Summary: 88/88 keys checked | max |cents|=${maxAbsCents.toFixed(2)}c (${midiToNoteName(worstMidi)}) | RMS=[${minRms.toFixed(4)}, ${maxRms.toFixed(4)}] | maxPeak=${maxPeak.toFixed(3)}`,
  );
}

function verifyDynamicsAndDamper(): void {
  logLine("\n=== 2. Velocity Sensitivity & Damper / Sustain Pedal ===");
  const soft = analyzeBuffer(
    mixToMono(synthesizePianoNotePCM({ midi: 60, velocity: 0.25, durationSeconds: 1.0 })),
    DEFAULT_SAMPLE_RATE,
  );
  const loud = analyzeBuffer(
    mixToMono(synthesizePianoNotePCM({ midi: 60, velocity: 0.95, durationSeconds: 1.0 })),
    DEFAULT_SAMPLE_RATE,
  );
  assertCheck(loud.rms > soft.rms * 2, `Velocity RMS failed: loud=${loud.rms} soft=${soft.rms}`);
  assertCheck(
    loud.spectralCentroidHz > soft.spectralCentroidHz,
    `Velocity brightness failed: loud=${loud.spectralCentroidHz.toFixed(1)}Hz soft=${soft.spectralCentroidHz.toFixed(1)}Hz`,
  );

  const damped = analyzeBuffer(
    mixToMono(
      synthesizePianoNotePCM({
        midi: 60,
        velocity: 0.8,
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
        velocity: 0.8,
        durationSeconds: 1.2,
        releaseAtSeconds: 0.25,
        sustainPedal: true,
      }),
    ),
    DEFAULT_SAMPLE_RATE,
  );
  assertCheck(
    sustained.tailRms > damped.tailRms * 5,
    `Sustain pedal failed: sustainedTail=${sustained.tailRms.toFixed(5)} dampedTail=${damped.tailRms.toFixed(5)}`,
  );

  logLine(
    `  Velocity: pp RMS=${soft.rms.toFixed(4)} (${soft.spectralCentroidHz.toFixed(0)}Hz) -> ff RMS=${loud.rms.toFixed(4)} (${loud.spectralCentroidHz.toFixed(0)}Hz)`,
  );
  logLine(
    `  Damper:   damped tailRMS=${damped.tailRms.toFixed(5)} vs sustainPedal tailRMS=${sustained.tailRms.toFixed(5)}`,
  );
}

function verifyIntervalsAndChords(): void {
  logLine("\n=== 3. Intervals (m2..P8) & Chords (Triads / 7ths) ===");
  const intervalNames = [
    "m2",
    "M2",
    "m3",
    "M3",
    "P4",
    "TT",
    "P5",
    "m6",
    "M6",
    "m7",
    "M7",
    "P8",
  ] as const;

  for (let semi = 1; semi <= 12; semi += 1) {
    const notes = [60, 60 + semi];
    const mono = mixToMono(synthesizePianoChordPCM({ notes, durationSeconds: 0.9 }));
    const analysis = analyzeBuffer(mono, DEFAULT_SAMPLE_RATE);
    const fft = computeFFT(
      mono,
      DEFAULT_SAMPLE_RATE,
      32_768,
      Math.floor(DEFAULT_SAMPLE_RATE * 0.015),
    );

    const name = intervalNames[semi - 1] ?? `${semi}st`;
    assertCheck(!analysis.hasNonFinite, `Interval ${name}: NaN/Inf`);
    assertCheck(
      analysis.peak <= 1.0,
      `Interval ${name}: clipping peak=${analysis.peak.toFixed(3)}`,
    );
    assertCheck(analysis.rms >= 0.01, `Interval ${name}: silent rms=${analysis.rms.toFixed(4)}`);

    for (const midi of notes) {
      const targetHz = midiToFrequency(midi);
      const peak = findSpectralPeakNear(fft, targetHz, 25);
      assertCheck(
        peak.relativeMagnitude >= 0.12,
        `Interval ${name}: missing spectral peak for ${midiToNoteName(midi)} (${targetHz.toFixed(1)}Hz), rel=${peak.relativeMagnitude.toFixed(3)}`,
      );
    }
  }
  logLine(
    "  Intervals: all 12 intervals (m2..P8) verified for dual-tone spectral peaks & zero clipping",
  );

  const chords: Array<{ readonly name: string; readonly notes: number[] }> = [
    { name: "C Major", notes: [60, 64, 67] },
    { name: "C Minor", notes: [60, 63, 67] },
    { name: "B Diminished", notes: [59, 62, 65] },
    { name: "C Augmented", notes: [60, 64, 68] },
    { name: "Cmaj7", notes: [60, 64, 67, 71] },
    { name: "G7", notes: [55, 59, 62, 65] },
    { name: "Dm7", notes: [62, 65, 69, 72] },
    { name: "Chopin Nocturne Op.9/2 Eb", notes: [51, 58, 63, 67, 70] },
  ];

  for (const chord of chords) {
    const mono = mixToMono(synthesizePianoChordPCM({ notes: chord.notes, durationSeconds: 1.0 }));
    const analysis = analyzeBuffer(mono, DEFAULT_SAMPLE_RATE);
    const fft = computeFFT(
      mono,
      DEFAULT_SAMPLE_RATE,
      32_768,
      Math.floor(DEFAULT_SAMPLE_RATE * 0.015),
    );

    assertCheck(!analysis.hasNonFinite, `Chord ${chord.name}: NaN/Inf`);
    assertCheck(
      analysis.peak <= 1.0,
      `Chord ${chord.name}: clipping peak=${analysis.peak.toFixed(3)}`,
    );
    assertCheck(analysis.rms >= 0.01, `Chord ${chord.name}: silent rms=${analysis.rms.toFixed(4)}`);

    for (const midi of chord.notes) {
      const targetHz = midiToFrequency(midi);
      const peak = findSpectralPeakNear(fft, targetHz, 25);
      assertCheck(
        peak.relativeMagnitude >= 0.08,
        `Chord ${chord.name}: missing spectral peak for ${midiToNoteName(midi)} (${targetHz.toFixed(1)}Hz), rel=${peak.relativeMagnitude.toFixed(3)}`,
      );
    }
    logLine(
      `  Chord ${chord.name.padEnd(26)} notes=${chord.notes.length}  rms=${analysis.rms.toFixed(4)}  peak=${analysis.peak.toFixed(3)}`,
    );
  }
}

function verifyMetronome(): void {
  logLine("\n=== 4. Polyrhythm Metronome (Meters + 2:3 / 3:4 Cross-Rhythms) ===");
  const accent = analyzeBuffer(
    mixToMono(synthesizeMetronomeClickPCM("accent")),
    DEFAULT_SAMPLE_RATE,
  );
  const beat = analyzeBuffer(mixToMono(synthesizeMetronomeClickPCM("beat")), DEFAULT_SAMPLE_RATE);
  const sub = analyzeBuffer(
    mixToMono(synthesizeMetronomeClickPCM("subdivision")),
    DEFAULT_SAMPLE_RATE,
  );
  const cross = analyzeBuffer(mixToMono(synthesizeMetronomeClickPCM("cross")), DEFAULT_SAMPLE_RATE);

  for (const [label, res] of [
    ["accent", accent],
    ["beat", beat],
    ["subdivision", sub],
    ["cross", cross],
  ] as const) {
    assertCheck(!res.hasNonFinite, `Metronome ${label}: NaN/Inf`);
    assertCheck(res.peak <= 1.0, `Metronome ${label}: clipping peak=${res.peak.toFixed(3)}`);
    assertCheck(res.rms >= 0.01, `Metronome ${label}: silent rms=${res.rms.toFixed(4)}`);
    assertCheck(res.envelopeDecays, `Metronome ${label}: no percussive decay`);
  }

  assertCheck(
    accent.rms > beat.rms,
    `Metronome accent should be louder than beat: accent=${accent.rms.toFixed(4)} beat=${beat.rms.toFixed(4)}`,
  );
  assertCheck(
    accent.spectralCentroidHz > beat.spectralCentroidHz,
    `Metronome accent should be brighter than beat`,
  );

  const meters: TimeSignature[] = ["2/4", "3/4", "4/4", "6/8", "9/8", "12/8"];
  for (const ts of meters) {
    const pulses = computeBarSchedule({ timeSignature: ts, bpm: 84, polyrhythm: "none" });
    assertCheck(pulses.length >= 2, `Meter ${ts}: expected >= 2 pulses`);
    assertCheck(pulses[0]?.voice === "accent", `Meter ${ts}: beat 1 must be accent`);
  }

  const poly23 = computeBarSchedule({ timeSignature: "2/4", polyrhythm: "2:3" });
  const poly34 = computeBarSchedule({ timeSignature: "3/4", polyrhythm: "3:4" });
  assertCheck(
    poly23.filter((p) => p.voice === "cross").length === 2,
    "2:3 in 2/4 should emit 2 non-coincident cross pulses (at 1/3, 2/3)",
  );
  assertCheck(
    poly34.filter((p) => p.voice === "cross").length === 3,
    "3:4 in 3/4 should emit 3 non-coincident cross pulses (at 1/4, 2/4, 3/4)",
  );

  logLine(
    `  Voices: accent=${accent.spectralCentroidHz.toFixed(0)}Hz (rms=${accent.rms.toFixed(3)}), beat=${beat.spectralCentroidHz.toFixed(0)}Hz, cross=${cross.spectralCentroidHz.toFixed(0)}Hz`,
  );
  logLine("  Schedules: 2/4, 3/4, 4/4, 6/8, 9/8, 12/8 + Chopin 2:3 & 3:4 verified");
}

function verifySfx(): void {
  logLine("\n=== 5. UI & Learning SFX ===");
  const correct = analyzeBuffer(
    mixToMono(synthesizeSfxPCM({ kind: "correctInterval" })),
    DEFAULT_SAMPLE_RATE,
  );
  const miss = analyzeBuffer(
    mixToMono(synthesizeSfxPCM({ kind: "gentleMiss" })),
    DEFAULT_SAMPLE_RATE,
  );
  const hit = analyzeBuffer(
    mixToMono(synthesizeSfxPCM({ kind: "rhythmHit" })),
    DEFAULT_SAMPLE_RATE,
  );
  const countdown = analyzeBuffer(
    mixToMono(synthesizeSfxPCM({ kind: "previewCountdown" })),
    DEFAULT_SAMPLE_RATE,
  );
  const milestone = analyzeBuffer(
    mixToMono(synthesizeSfxPCM({ kind: "streakMilestone" })),
    DEFAULT_SAMPLE_RATE,
  );
  const milestoneReduced = analyzeBuffer(
    mixToMono(synthesizeSfxPCM({ kind: "streakMilestone", reducedMotion: true })),
    DEFAULT_SAMPLE_RATE,
  );

  for (const [label, res] of [
    ["correctInterval", correct],
    ["gentleMiss", miss],
    ["rhythmHit", hit],
    ["previewCountdown", countdown],
    ["streakMilestone", milestone],
    ["streakMilestone(reduced)", milestoneReduced],
  ] as const) {
    assertCheck(!res.hasNonFinite, `SFX ${label}: NaN/Inf`);
    assertCheck(res.peak <= 1.0, `SFX ${label}: clipping peak=${res.peak.toFixed(3)}`);
    assertCheck(res.rms >= 0.01, `SFX ${label}: silent rms=${res.rms.toFixed(4)}`);
    logLine(
      `  ${label.padEnd(25)} dur=${(res.durationSeconds * 1000).toFixed(0).padStart(4)}ms  rms=${res.rms.toFixed(4)}  peak=${res.peak.toFixed(3)}  centroid=${res.spectralCentroidHz.toFixed(0)}Hz`,
    );
  }

  assertCheck(
    miss.spectralCentroidHz < correct.spectralCentroidHz,
    "gentleMiss should be darker/lower than correctInterval",
  );
  assertCheck(hit.durationSeconds <= 0.06, "rhythmHit should be a crisp transient <= 60ms");
  assertCheck(
    milestoneReduced.durationSeconds < milestone.durationSeconds,
    "streakMilestone should shorten cleanly under prefers-reduced-motion",
  );
}

function verifyMicPitchDetection(): void {
  logLine("\n=== 6. Acoustic Piano Mic Pitch & Chord Detection (C2..C7) ===");

  let singleMatched = 0;
  let polySingleClean = 0;
  const totalKeys = MIC_MAX_MIDI - MIC_MIN_MIDI + 1;

  for (let midi = MIC_MIN_MIDI; midi <= MIC_MAX_MIDI; midi += 1) {
    const mono = mixToMono(
      synthesizePianoNotePCM({
        midi,
        velocity: 0.78,
        durationSeconds: 0.45,
        sampleRate: DEFAULT_SAMPLE_RATE,
      }),
    );

    const single = detectSinglePianoNote(mono, DEFAULT_SAMPLE_RATE);
    const label = `${midiToNoteName(midi)} (MIDI ${midi})`;
    const detectedDesc = single ? `${single.noteName}(${single.midi})` : "null";
    assertCheck(
      single !== null && single.midi === midi,
      `Mic single-note failed for ${label}: detected=${detectedDesc}`,
    );
    if (single !== null && single.midi === midi) {
      singleMatched += 1;
    }

    const active = detectActiveMidis(mono, DEFAULT_SAMPLE_RATE);
    const midis = active.map((n) => n.midi);
    assertCheck(
      midis.length === 1 && midis[0] === midi,
      `Mic poly single-note ghost for ${label}: detected=[${midis.join(",")}]`,
    );
    if (midis.length === 1 && midis[0] === midi) {
      polySingleClean += 1;
    }
  }

  const intervals: ReadonlyArray<readonly [string, readonly [number, number]]> = [
    ["m2", [60, 61]],
    ["M3", [60, 64]],
    ["P5", [60, 67]],
    ["P8", [60, 72]],
    ["LH+RH", [48, 64]],
  ];
  for (const [name, pair] of intervals) {
    const mono = mixToMono(
      synthesizePianoChordPCM({
        notes: [...pair],
        velocity: 0.8,
        durationSeconds: 0.5,
        sampleRate: DEFAULT_SAMPLE_RATE,
      }),
    );
    const detected = detectActiveMidis(mono, DEFAULT_SAMPLE_RATE).map((n) => n.midi);
    const detectedSet = new Set(detected);
    for (const midi of pair) {
      assertCheck(
        detectedSet.has(midi),
        `Mic interval ${name}: missing ${midiToNoteName(midi)} in [${detected.join(",")}]`,
      );
    }
  }

  const chords: ReadonlyArray<{ readonly name: string; readonly notes: readonly number[] }> = [
    { name: "C Major", notes: [60, 64, 67] },
    { name: "A Minor", notes: [57, 60, 64] },
    { name: "G Major", notes: [55, 59, 62] },
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
    }).map((n) => n.midi);
    const detectedSet = new Set(detected);
    for (const midi of chord.notes) {
      assertCheck(
        detectedSet.has(midi),
        `Mic chord ${chord.name}: missing ${midiToNoteName(midi)} in [${detected.join(",")}]`,
      );
    }
  }

  // Sustained piano note hysteresis: must fire exactly 1 noteOn over 1.4s ring-out
  const tracker = new MicNoteTracker({ minHoldFrames: 2, retriggerCooldownMs: 140 });
  const sustainedNote = mixToMono(
    synthesizePianoNotePCM({
      midi: 60,
      velocity: 0.82,
      durationSeconds: 1.4,
      sustainPedal: true,
      sampleRate: DEFAULT_SAMPLE_RATE,
    }),
  );
  const triggeredMidis: number[] = [];
  for (let offset = 0; offset + 8192 <= sustainedNote.length; offset += 1024) {
    const slice = sustainedNote.subarray(offset, offset + 8192);
    const { noteOns } = tracker.processFrame(
      slice,
      DEFAULT_SAMPLE_RATE,
      (offset / DEFAULT_SAMPLE_RATE) * 1000,
    );
    for (const ev of noteOns) {
      triggeredMidis.push(ev.midi);
    }
  }
  assertCheck(
    triggeredMidis.length === 1 && triggeredMidis[0] === 60,
    `Mic sustain hysteresis failed: expected [60], got [${triggeredMidis.join(",")}]`,
  );

  // Silence & broadband noise negative tests (0 false triggers)
  const silence = new Float32Array(8192);
  const noise = new Float32Array(8192);
  let seed = 1337;
  for (let i = 0; i < noise.length; i += 1) {
    seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
    noise[i] = ((seed / 4_294_967_296) * 2 - 1) * 0.12;
  }
  const noiseEstimate = estimateNoiseFloor([silence, noise]);
  assertCheck(noiseEstimate.frameCount === 2, "Mic noise floor calibration failed");
  assertCheck(
    detectActiveMidis(silence, DEFAULT_SAMPLE_RATE).length === 0,
    "Mic silence produced false trigger",
  );
  assertCheck(
    detectActiveMidis(noise, DEFAULT_SAMPLE_RATE).length === 0,
    "Mic broadband noise produced false trigger",
  );

  logLine(
    `  Single keys (C2..C7): YIN=${singleMatched}/${totalKeys} exact | Poly-clean=${polySingleClean}/${totalKeys} (0 ghost overtones)`,
  );
  logLine(
    "  Polyphonic: 5 intervals (m2..P8 + LH/RH) + 4 chords (C Maj, A Min, G Maj, Chopin Eb) verified",
  );
  logLine(
    "  Hysteresis & Negative Tests: 1.4s sustain = 1 noteOn, silence/noise = 0 false triggers",
  );
}

verifyAll88PianoKeys();
verifyDynamicsAndDamper();
verifyIntervalsAndChords();
verifyMetronome();
verifySfx();
verifyMicPitchDetection();

if (failures.length > 0) {
  logError(`\nFAILED with ${failures.length} audio verification error(s):`);
  for (const f of failures) {
    logError(`  - ${f}`);
  }
  process.exit(1);
}

logLine(
  "\nALL MUSIC MODE AUDIO VERIFICATION CHECKS PASSED (0 errors, 0 clipping, all 88 keys <= +/-3 cents).",
);
