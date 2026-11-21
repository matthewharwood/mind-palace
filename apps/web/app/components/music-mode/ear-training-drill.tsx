import { CheckCircle2, Ear, Hand, RefreshCw, Sparkles, Volume2, XCircle } from "lucide-react";
import { type ReactNode, useState } from "react";
import * as z from "zod";

import {
  playMusicSfx,
  playPianoChord,
  playPianoInterval,
  playPianoNote,
  releasePianoNote,
} from "~/audio/music-mode";
import { defineComponent } from "~/lib/define-component";
import {
  type ChordQuality,
  type ExerciseKind,
  ExerciseKindSchema,
  type FSRSRating,
  type KeySignature,
  type Measure,
  type Pitch,
} from "~/lib/music-mode/schemas";
import {
  buildChord,
  getKeySignature,
  INTERVALS,
  mapToTactileHandFrame,
  midiToPitchInKey,
  parsePitch,
  transposePitch,
} from "~/lib/music-mode/theory";
import { GrandStaff } from "./grand-staff";
import { TactileKeyboard } from "./tactile-keyboard";

export const DrillResultSchema = z.object({
  exerciseKind: ExerciseKindSchema,
  correct: z.boolean(),
  responseMs: z.int().min(0),
  rating: z.enum(["again", "hard", "good", "easy"]),
  promptKey: z.string().min(1),
});
export type DrillResult = z.infer<typeof DrillResultSchema>;

export const EarTrainingDrillPropsSchema = z.object({
  exerciseKind: ExerciseKindSchema,
  difficulty: z.int().min(1).max(10).default(1),
  blindKeyboard: z.boolean().default(true),
  lastFlowReason: z.string().optional(),
  onExerciseKindChange: z.custom<(kind: ExerciseKind) => void>(),
  onDrillResult: z.custom<(result: DrillResult) => void>(),
});

const DRILL_TABS: ReadonlyArray<{ kind: ExerciseKind; label: string }> = [
  { kind: "ear-interval", label: "Ear Intervals" },
  { kind: "ear-chord", label: "Ear Chords" },
  { kind: "ear-cadence", label: "Cadences" },
  { kind: "interval-flash", label: "Interval Flash" },
  { kind: "shape-chunk", label: "Shape Chunks" },
  { kind: "ear-dictation", label: "Dictation" },
  { kind: "tactile-blind-frame", label: "Blind Frame" },
];

interface DrillPrompt {
  readonly promptKey: string;
  readonly title: string;
  readonly subtitle: string;
  readonly answerLabel: string;
  readonly explanation: string;
  readonly options: readonly string[];
  readonly notes: readonly number[];
  readonly cadenceChords?: readonly (readonly number[])[];
  readonly staffMeasure?: Measure;
  readonly staffKey?: KeySignature;
  readonly showStaff: boolean;
  readonly showKeyboard: boolean;
}

const CHORD_BANK: ReadonlyArray<{
  quality: ChordQuality;
  label: string;
  hint: string;
  minDifficulty: number;
}> = [
  {
    quality: "major",
    label: "Major triad",
    hint: "Bright, stable 4 + 3 semitones",
    minDifficulty: 1,
  },
  {
    quality: "minor",
    label: "Minor triad",
    hint: "Warm, reflective 3 + 4 semitones",
    minDifficulty: 1,
  },
  {
    quality: "diminished",
    label: "Diminished triad",
    hint: "Tense symmetric 3 + 3 semitones",
    minDifficulty: 2,
  },
  {
    quality: "dom7",
    label: "Dominant 7th",
    hint: "Tritone pull resolving to tonic",
    minDifficulty: 3,
  },
  {
    quality: "maj7",
    label: "Major 7th",
    hint: "Lush romantic leading-tone halo",
    minDifficulty: 4,
  },
  {
    quality: "dim7",
    label: "Diminished 7th",
    hint: "Chopin dramatic tension stack",
    minDifficulty: 5,
  },
  {
    quality: "neapolitan6",
    label: "Neapolitan ♭II⁶",
    hint: "Chopin dark-to-bright cadence pivot",
    minDifficulty: 7,
  },
];

const CADENCE_BANK: ReadonlyArray<{
  id: string;
  label: string;
  chords: readonly (readonly number[])[];
  hint: string;
}> = [
  {
    id: "authentic",
    label: "Authentic (V → I)",
    chords: [
      [48, 60, 64, 67],
      [43, 59, 62, 67],
      [48, 60, 64, 67],
    ],
    hint: "Leading tone pulls decisively home to tonic.",
  },
  {
    id: "plagal",
    label: "Plagal (IV → I)",
    chords: [
      [48, 60, 64, 67],
      [41, 60, 65, 69],
      [48, 60, 64, 67],
    ],
    hint: "Warm 'Amen' resolution keeping the tonic common tone.",
  },
  {
    id: "deceptive",
    label: "Deceptive (V → vi)",
    chords: [
      [48, 60, 64, 67],
      [43, 59, 62, 67],
      [45, 60, 64, 69],
    ],
    hint: "Dominant resolves unexpectedly to relative minor (Chopin favorite).",
  },
  {
    id: "half",
    label: "Half Cadence (I → V)",
    chords: [
      [48, 60, 64, 67],
      [41, 60, 65, 69],
      [43, 59, 62, 67],
    ],
    hint: "Suspends openly on the dominant — leaves a musical question mark.",
  },
];

function buildStaffMeasureFromPitches(pitches: readonly Pitch[], harmonic: boolean): Measure {
  return {
    number: 1,
    isHardestBar: false,
    events: harmonic
      ? [
          {
            id: "drill-chord",
            pitches: [...pitches],
            beatStart: 0,
            duration: "whole",
            durationBeats: 4,
            staff: "treble",
            voice: 1,
            isRest: false,
            tiedToNext: false,
            articulation: "none",
          },
        ]
      : pitches.map((pitch, idx) => ({
          id: `drill-note-${idx}`,
          pitches: [pitch],
          beatStart: idx,
          duration: "quarter" as const,
          durationBeats: 1,
          staff: "treble" as const,
          voice: 1,
          isRest: false,
          tiedToNext: false,
          articulation: "none" as const,
        })),
  };
}

function buildDrillPrompt(kind: ExerciseKind, difficulty: number, seed: number): DrillPrompt {
  const cMajor = getKeySignature("C-major");
  const rootMidi = 60 + ((seed * 3) % 7);
  const rootPitch = midiToPitchInKey(rootMidi, "C-major");

  if (kind === "ear-chord" || kind === "shape-chunk") {
    const pool = CHORD_BANK.filter((c) => c.minDifficulty <= Math.max(2, difficulty));
    const chosen = pool[seed % pool.length] ?? CHORD_BANK[0];
    const chord = buildChord(rootPitch, chosen?.quality ?? "major", 0);
    const notes = chord.pitches.map((p) => p.midi);
    return {
      promptKey: `${kind}:${chosen?.quality ?? "major"}:${rootMidi}`,
      title: kind === "shape-chunk" ? "Visual Chord Shape Chunk" : "Ear Chord Quality",
      subtitle:
        kind === "shape-chunk"
          ? "Read the whole stack as ONE shape — never spell bottom-to-top."
          : "Listen to the harmonic color and identify the chord quality.",
      answerLabel: chosen?.label ?? "Major triad",
      explanation: `${chord.symbol} — ${chosen?.hint ?? ""}`,
      options: pool.slice(0, 4).map((c) => c.label),
      notes,
      staffMeasure: buildStaffMeasureFromPitches(chord.pitches, true),
      staffKey: cMajor,
      showStaff: kind === "shape-chunk",
      showKeyboard: false,
    };
  }

  if (kind === "ear-cadence") {
    const chosen = CADENCE_BANK[seed % CADENCE_BANK.length] ?? CADENCE_BANK[0];
    return {
      promptKey: `ear-cadence:${chosen?.id ?? "authentic"}`,
      title: "Harmonic Cadence Recognition",
      subtitle: "Hear the phrase ending and name its harmonic gravity.",
      answerLabel: chosen?.label ?? "Authentic (V → I)",
      explanation: chosen?.hint ?? "",
      options: CADENCE_BANK.map((c) => c.label),
      notes: chosen?.chords[0] ?? [60, 64, 67],
      cadenceChords: chosen?.chords ?? [[60, 64, 67]],
      showStaff: false,
      showKeyboard: false,
    };
  }

  if (kind === "tactile-blind-frame") {
    const anchors = ["C4", "D4", "E4", "F4", "G4"] as const;
    const anchorName = anchors[seed % anchors.length] ?? "C4";
    const anchor = parsePitch(anchorName);
    const framePitches = [0, 2, 4, 5, 7].map((semi) =>
      midiToPitchInKey(anchor.midi + semi, "C-major"),
    );
    const frame = mapToTactileHandFrame(framePitches, "RH");
    return {
      promptKey: `tactile-blind-frame:${anchorName}`,
      title: "Tactile Blind Hand-Frame",
      subtitle: `Find the ${anchorName} 5-finger frame by feeling the black-key clusters without peeking.`,
      answerLabel: `${anchorName} frame`,
      explanation: frame.blindNavigationCue,
      options: anchors.slice(0, 4).map((a) => `${a} frame`),
      notes: framePitches.map((p) => p.midi),
      showStaff: false,
      showKeyboard: true,
    };
  }

  if (kind === "ear-dictation") {
    const contours: ReadonlyArray<{ label: string; offsets: readonly number[] }> = [
      { label: "Step up → Leap up (C–D–G)", offsets: [0, 2, 7] },
      { label: "Arpeggio Triad (C–E–G)", offsets: [0, 4, 7] },
      { label: "Neighbor Turn (C–D–C)", offsets: [0, 2, 0] },
      { label: "Minor Arch (C–E♭–D)", offsets: [0, 3, 2] },
    ];
    const chosen = contours[seed % contours.length] ?? contours[0];
    const notes = (chosen?.offsets ?? [0, 2, 4]).map((off) => 60 + off);
    return {
      promptKey: `ear-dictation:${seed % contours.length}`,
      title: "Melodic Ear Dictation",
      subtitle:
        "Listen to the 3-note contour, play it back on the keyboard, then identify its shape.",
      answerLabel: chosen?.label ?? "Arpeggio Triad (C–E–G)",
      explanation: "Hear relative intervals (steps vs. skips) rather than isolated pitch names.",
      options: contours.map((c) => c.label),
      notes,
      showStaff: false,
      showKeyboard: true,
    };
  }

  // Default: ear-interval or interval-flash
  const maxIntervalIdx = Math.min(INTERVALS.length, 4 + difficulty);
  const intervalPool = INTERVALS.slice(1, Math.max(5, maxIntervalIdx));
  const chosen = intervalPool[seed % intervalPool.length] ?? INTERVALS[4];
  const topPitch = transposePitch(rootPitch, chosen?.number ?? 3, chosen?.quality ?? "M");
  const distractorPool = intervalPool
    .filter((i) => i.id !== chosen?.id)
    .slice(0, 3)
    .map((i) => i.fullName);
  const options = [chosen?.fullName ?? "Major 3rd", ...distractorPool].sort();

  return {
    promptKey: `${kind}:${chosen?.id ?? "M3"}:${rootMidi}`,
    title: kind === "interval-flash" ? "Interval Visual Flash" : "Active Ear Interval",
    subtitle:
      kind === "interval-flash"
        ? "Identify the interval immediately from line/space geometry."
        : "Listen to the two pitches and identify the interval by its resonance.",
    answerLabel: chosen?.fullName ?? "Major 3rd",
    explanation: `${chosen?.shortName ?? "M3"} (${chosen?.visualShape ?? "line-to-line"}) — Ear cue: ${chosen?.earReference ?? ""}`,
    options,
    notes: [rootPitch.midi, topPitch.midi],
    staffMeasure: buildStaffMeasureFromPitches([rootPitch, topPitch], false),
    staffKey: cMajor,
    showStaff: kind === "interval-flash",
    showKeyboard: false,
  };
}

function playPromptAudio(prompt: DrillPrompt, slowArpeggiate: boolean): void {
  if (prompt.cadenceChords) {
    for (let i = 0; i < prompt.cadenceChords.length; i += 1) {
      const chord = prompt.cadenceChords[i];
      if (!chord) continue;
      playPianoChord({
        notes: chord,
        velocity: 0.74,
        delaySeconds: i * (slowArpeggiate ? 0.95 : 0.72),
        durationSeconds: 0.85,
        arpeggiateMs: slowArpeggiate ? 90 : 0,
      });
    }
    return;
  }

  if (prompt.notes.length === 2 && !slowArpeggiate) {
    const first = prompt.notes[0] ?? 60;
    const second = prompt.notes[1] ?? 64;
    playPianoInterval(first, second - first, "melodic", { melodicGapSeconds: 0.45 });
    return;
  }

  if (slowArpeggiate || prompt.notes.length === 3) {
    playPianoChord({
      notes: prompt.notes,
      velocity: 0.75,
      arpeggiateMs: slowArpeggiate ? 260 : 180,
      durationSeconds: 1.1,
    });
    return;
  }

  playPianoChord({ notes: prompt.notes, velocity: 0.75, durationSeconds: 1.2 });
}

function resolveDrillRating(correct: boolean, elapsedMs: number): FSRSRating {
  if (!correct) return "again";
  return elapsedMs < 2500 ? "easy" : "good";
}

function resolveOptionTone(answered: boolean, isRightAnswer: boolean, isPicked: boolean): string {
  if (!answered) {
    return "border-black/10 bg-whisper-gray/70 text-midnight-ink hover:border-intelligence-blue/50 hover:bg-whisper-gray dark:border-white/10";
  }
  if (isRightAnswer) {
    return "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
  }
  if (isPicked) {
    return "border-rose-500 bg-rose-500/15 text-rose-800 dark:text-rose-200";
  }
  return "border-black/6 bg-whisper-gray/40 text-muted-ash opacity-60 dark:border-white/6";
}

export const EarTrainingDrill = defineComponent(
  EarTrainingDrillPropsSchema,
  ({
    exerciseKind,
    difficulty,
    blindKeyboard,
    lastFlowReason,
    onExerciseKindChange,
    onDrillResult,
  }): ReactNode => {
    const [seed, setSeed] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [startedAtMs, setStartedAtMs] = useState<number>(() => Date.now());
    const [pressedNotes, setPressedNotes] = useState<number[]>([]);

    const prompt = buildDrillPrompt(exerciseKind, difficulty, seed);
    const answered = selectedOption !== null;
    const isCorrect = selectedOption === prompt.answerLabel;

    function handleAnswer(option: string): void {
      if (answered) return;
      const elapsed = Math.max(0, Date.now() - startedAtMs);
      const correct = option === prompt.answerLabel;
      setSelectedOption(option);
      playMusicSfx(correct ? "correctInterval" : "gentleMiss");
      const rating = resolveDrillRating(correct, elapsed);
      onDrillResult({
        exerciseKind,
        correct,
        responseMs: elapsed,
        rating,
        promptKey: prompt.promptKey,
      });
    }

    function nextCard(): void {
      setSeed((prev) => prev + 1);
      setSelectedOption(null);
      setStartedAtMs(Date.now());
    }

    return (
      <section className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-canvas-white p-4 shadow-card sm:p-5 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {exerciseKind === "tactile-blind-frame" ? (
              <Hand className="size-4 text-intelligence-blue" aria-hidden="true" />
            ) : (
              <Ear className="size-4 text-intelligence-blue" aria-hidden="true" />
            )}
            <div>
              <h2 className="font-semibold text-base text-midnight-ink">{prompt.title}</h2>
              <p className="text-muted-ash text-xs">{prompt.subtitle}</p>
            </div>
          </div>
          <span className="rounded-full bg-whisper-gray px-2.5 py-1 font-mono text-[11px] text-muted-ash">
            Level {difficulty}/10
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {DRILL_TABS.map((tab) => {
            const active = tab.kind === exerciseKind;
            return (
              <button
                key={tab.kind}
                type="button"
                onClick={() => {
                  onExerciseKindChange(tab.kind);
                  setSelectedOption(null);
                  setStartedAtMs(Date.now());
                }}
                className={[
                  "rounded-lg border px-2.5 py-1 font-medium text-xs transition-colors",
                  active
                    ? "border-intelligence-blue bg-intelligence-blue text-white"
                    : "border-black/10 bg-whisper-gray text-muted-ash hover:text-midnight-ink dark:border-white/10",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {lastFlowReason ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-amber-900 text-xs dark:text-amber-200">
            <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{lastFlowReason}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => playPromptAudio(prompt, false)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-intelligence-blue px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-intelligence-blue/90"
          >
            <Volume2 className="size-4" />
            Play Prompt
          </button>
          <button
            type="button"
            onClick={() => playPromptAudio(prompt, true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-whisper-gray px-3.5 py-2 font-medium text-midnight-ink text-xs transition-colors hover:bg-light-taupe dark:border-white/10"
          >
            Slow Arpeggiate
          </button>
          <button
            type="button"
            onClick={nextCard}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-canvas-white px-3 py-2 text-muted-ash text-xs transition-colors hover:text-midnight-ink dark:border-white/10"
          >
            <RefreshCw className="size-3.5" />
            Next Prompt
          </button>
        </div>

        {prompt.showStaff && prompt.staffMeasure && prompt.staffKey ? (
          <GrandStaff
            keySignature={prompt.staffKey}
            timeSignature={{ numerator: 4, denominator: 4 }}
            measures={[prompt.staffMeasure]}
            mode="standard"
            showIntervalShapes
          />
        ) : null}

        {prompt.showKeyboard ? (
          <TactileKeyboard
            startOctave={3}
            octaves={2}
            pressedNotes={pressedNotes}
            targetNotes={answered ? [...prompt.notes] : []}
            blindVeil={blindKeyboard}
            enableWebMidi
            onNoteOn={(midi, velocity) => {
              playPianoNote({ midi, velocity });
              setPressedNotes((prev) => (prev.includes(midi) ? prev : [...prev, midi]));
            }}
            onNoteOff={(midi) => {
              releasePianoNote(midi);
              setPressedNotes((prev) => prev.filter((n) => n !== midi));
            }}
          />
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          {prompt.options.map((option) => {
            const isPicked = selectedOption === option;
            const isRightAnswer = option === prompt.answerLabel;
            const optionTone = resolveOptionTone(answered, isRightAnswer, isPicked);

            return (
              <button
                key={option}
                type="button"
                onClick={() => handleAnswer(option)}
                className={`rounded-xl border px-3.5 py-3 text-left font-medium text-sm transition-colors ${optionTone}`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {answered ? (
          <div
            className={[
              "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-xs",
              isCorrect
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                : "border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-200",
            ].join(" ")}
          >
            <div className="flex items-start gap-2">
              {isCorrect ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0" />
              )}
              <div>
                <div className="font-semibold">
                  {isCorrect ? "Spot on!" : `Answer: ${prompt.answerLabel}`}
                </div>
                <p className="mt-0.5 opacity-90">{prompt.explanation}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={nextCard}
              className="rounded-lg bg-midnight-ink px-3 py-1.5 font-medium text-canvas-white text-xs transition-opacity hover:opacity-90"
            >
              Continue →
            </button>
          </div>
        ) : null}
      </section>
    );
  },
);
