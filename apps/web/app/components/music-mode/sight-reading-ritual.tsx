import {
  Check,
  ChevronRight,
  Eye,
  Music2,
  Play,
  RotateCcw,
  Square,
  Timer,
  Volume2,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import * as z from "zod";

import {
  createMusicMetronome,
  type MusicMetronomeController,
  playMusicSfx,
  playPianoChord,
  playPianoNote,
  releasePianoNote,
  stopAllPianoNotes,
} from "~/audio/music-mode";
import { defineComponent } from "~/lib/define-component";
import { FIVE_STEP_RITUAL } from "~/lib/music-mode/curriculum";
import {
  type FSRSRating,
  type ScorePassage,
  ScorePassageSchema,
  type SightReadingStep,
  SightReadingStepSchema,
} from "~/lib/music-mode/schemas";
import { buildChord, parsePitch } from "~/lib/music-mode/theory";
import { GrandStaff, type PreviewFocus } from "./grand-staff";
import { RhythmPad } from "./rhythm-pad";
import { TactileKeyboard } from "./tactile-keyboard";
import type { TimingHit } from "./types";

export const RitualRatingResultSchema = z.object({
  rating: z.enum(["again", "hard", "good", "easy"]),
  accuracy: z.number().min(0).max(1),
  weakestBarNumber: z.int().min(1),
});
export type RitualRatingResult = z.infer<typeof RitualRatingResultSchema>;

export const SightReadingRitualPropsSchema = z.object({
  passage: ScorePassageSchema,
  step: SightReadingStepSchema,
  bpmOffset: z.int().min(-40).max(40).default(0),
  blindKeyboard: z.boolean().default(true),
  lookAheadMasking: z.boolean().default(true),
  showIntervalsOverlay: z.boolean().default(true),
  showRomanNumerals: z.boolean().default(false),
  onStepChange: z.custom<(step: SightReadingStep) => void>(),
  onRate: z.custom<(result: RitualRatingResult) => void>(),
  onNextPassage: z.custom<() => void>().optional(),
});

function playTonicCadence(passage: ScorePassage): void {
  const tonicPitch = parsePitch(`${passage.keySignature.tonic}4`);
  const quality = passage.keySignature.mode === "minor" ? "minor" : "major";
  const tonicChord = buildChord(tonicPitch, quality, 0);
  const domRootMidi = tonicPitch.midi + 7;
  const domNotes = [domRootMidi - 12, domRootMidi, domRootMidi + 4, domRootMidi + 7];
  const tonicNotes = [tonicPitch.midi - 12, ...tonicChord.pitches.map((p) => p.midi)];

  playPianoChord({ notes: tonicNotes, velocity: 0.72, durationSeconds: 0.75, delaySeconds: 0 });
  playPianoChord({ notes: domNotes, velocity: 0.74, durationSeconds: 0.75, delaySeconds: 0.78 });
  playPianoChord({
    notes: tonicNotes,
    velocity: 0.78,
    durationSeconds: 1.25,
    delaySeconds: 1.56,
  });
}

function playMeasureReference(passage: ScorePassage, measureNumber: number, bpm: number): void {
  const measure = passage.measures.find((m) => m.number === measureNumber) ?? passage.measures[0];
  if (!measure) return;
  const secPerBeat = 60 / bpm;
  for (const ev of measure.events) {
    if (ev.isRest || ev.pitches.length === 0) continue;
    playPianoChord({
      notes: ev.pitches.map((p) => p.midi),
      velocity: 0.72,
      delaySeconds: ev.beatStart * secPerBeat,
      durationSeconds: Math.max(0.25, ev.durationBeats * secPerBeat * 0.9),
    });
  }
}

function collectMeasureMidis(passage: ScorePassage, measureNumber: number): number[] {
  const measure = passage.measures.find((m) => m.number === measureNumber);
  if (!measure) return [];
  const set = new Set<number>();
  for (const ev of measure.events) {
    if (ev.isRest) continue;
    for (const p of ev.pitches) set.add(p.midi);
  }
  return [...set];
}

function toAudioTimeSignature(
  ts: ScorePassage["timeSignature"],
): "2/4" | "3/4" | "4/4" | "6/8" | "9/8" | "12/8" {
  const key = `${ts.numerator}/${ts.denominator}`;
  if (
    key === "2/4" ||
    key === "3/4" ||
    key === "4/4" ||
    key === "6/8" ||
    key === "9/8" ||
    key === "12/8"
  ) {
    return key;
  }
  return "4/4";
}

function PreviewStepView({
  passage,
  showIntervalsOverlay,
  showRomanNumerals,
  onContinue,
}: {
  passage: ScorePassage;
  showIntervalsOverlay: boolean;
  showRomanNumerals: boolean;
  onContinue: () => void;
}): ReactNode {
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [timerRunning, setTimerRunning] = useState(false);
  const [previewFocus, setPreviewFocus] = useState<PreviewFocus>("all");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const secondsLeftRef = useRef(30);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      const next = Math.max(0, secondsLeftRef.current - 1);
      secondsLeftRef.current = next;
      setSecondsLeft(next);
      if (next <= 3 && next > 0) {
        playMusicSfx("previewCountdown", { countdownFinal: false });
      }
      if (next === 0) {
        clearInterval(id);
        setTimerRunning(false);
        playMusicSfx("previewCountdown", { countdownFinal: true });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const checklistItems: ReadonlyArray<{ id: PreviewFocus; label: string; detail: string }> = [
    { id: "key", label: "Key Signature", detail: passage.previewNotes.keyCue },
    {
      id: "time",
      label: "Time & Tempo",
      detail: `${passage.timeSignature.numerator}/${passage.timeSignature.denominator} · ${passage.tempoBpm} BPM`,
    },
    { id: "landmarks", label: "Landmarks", detail: passage.previewNotes.landmarkSummary },
    {
      id: "hardest-bar",
      label: `Hardest Bar (m.${passage.previewNotes.hardestBarNumber})`,
      detail: passage.previewNotes.roadmap,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <Timer className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <span className="font-mono font-semibold text-base text-midnight-ink tabular-nums">
            00:{String(secondsLeft).padStart(2, "0")}
          </span>
          <span className="text-muted-ash text-xs">Hands off keys — scan before playing.</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTimerRunning((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-intelligence-blue px-3 py-1.5 font-medium text-white text-xs transition-colors hover:bg-intelligence-blue/90"
          >
            {timerRunning ? <Square className="size-3" /> : <Play className="size-3" />}
            {timerRunning ? "Pause 30s" : "Start 30s Scan"}
          </button>
          <button
            type="button"
            onClick={() => {
              setTimerRunning(false);
              secondsLeftRef.current = 30;
              setSecondsLeft(30);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-canvas-white px-2.5 py-1.5 text-muted-ash text-xs transition-colors hover:text-midnight-ink dark:border-white/10"
          >
            <RotateCcw className="size-3" />
            Reset
          </button>
          <button
            type="button"
            onClick={() => playTonicCadence(passage)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-intelligence-blue/30 bg-intelligence-blue/10 px-3 py-1.5 font-medium text-intelligence-blue text-xs transition-colors hover:bg-intelligence-blue/15"
          >
            <Volume2 className="size-3.5" />
            Play Tonic Cadence
          </button>
        </div>
      </div>

      <GrandStaff
        title={passage.title}
        composer={passage.composer}
        keySignature={passage.keySignature}
        timeSignature={passage.timeSignature}
        measures={passage.measures}
        mode="preview-30s"
        previewFocus={previewFocus}
        onPreviewFocusChange={setPreviewFocus}
        showIntervalShapes={showIntervalsOverlay}
        showRomanNumerals={showRomanNumerals}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        {checklistItems.map((item) => {
          const isChecked = Boolean(checked[item.id]);
          const isFocused = previewFocus === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setPreviewFocus(item.id);
                setChecked((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
              }}
              className={[
                "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors",
                isFocused
                  ? "border-intelligence-blue bg-intelligence-blue/8"
                  : "border-black/10 bg-whisper-gray/60 hover:bg-whisper-gray dark:border-white/10",
              ].join(" ")}
            >
              <span
                className={[
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
                  isChecked
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-black/20 bg-canvas-white dark:border-white/20",
                ].join(" ")}
              >
                {isChecked ? <Check className="size-3" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-midnight-ink text-xs">{item.label}</span>
                <span className="mt-0.5 block text-muted-ash text-xs leading-5">{item.detail}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-1.5 rounded-xl bg-intelligence-blue px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-intelligence-blue/90"
        >
          Next: Isolate Rhythm
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function resolveRhythmSfxAccuracy(hit: TimingHit): "on-beat" | "early" | "late" {
  if (hit.rating === "on-beat") return "on-beat";
  return hit.offsetMs < 0 ? "early" : "late";
}

function resolveFlowBanner(accuracy: number): { tone: string; text: string } {
  const pct = Math.round(accuracy * 100);
  if (accuracy < 0.8) {
    return {
      tone: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
      text: `Adaptive Flow (${pct}%): Dropping difficulty by 1 notch so you stay in the 80–85% sight-reading sweet spot. Zero guilt — smooth beats strain.`,
    };
  }
  if (accuracy >= 0.92) {
    return {
      tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
      text: `Adaptive Flow (${pct}%): Crisp reading! Promoting difficulty by 1 notch on your next passage.`,
    };
  }
  return {
    tone: "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-200",
    text: `Adaptive Flow (${pct}%): Right inside the 80–92% optimal sight-reading flow zone.`,
  };
}

function RhythmStepView({
  passage,
  bpm,
  onContinue,
}: {
  passage: ScorePassage;
  bpm: number;
  onContinue: () => void;
}): ReactNode {
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);
  const [measureStartMs, setMeasureStartMs] = useState<number>(Date.now());
  const [hits, setHits] = useState<TimingHit[]>([]);
  const metroRef = useRef<MusicMetronomeController | null>(null);

  useEffect(() => {
    return () => {
      metroRef.current?.stop();
      metroRef.current = null;
    };
  }, []);

  function toggleMetronome(): void {
    if (metronomeOn) {
      metroRef.current?.stop();
      setMetronomeOn(false);
      return;
    }
    const metro = createMusicMetronome(
      {
        bpm,
        timeSignature: toAudioTimeSignature(passage.timeSignature),
        polyrhythm: passage.polyrhythm,
        countInBars: 1,
      },
      (tick) => {
        if (tick.beat === 0) setMeasureStartMs(performance.now());
        setActiveSlot(tick.beat);
      },
    );
    metroRef.current = metro;
    metro.start();
    setMetronomeOn(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 bg-whisper-gray/70 px-3.5 py-2.5 dark:border-white/10">
        <span className="text-midnight-ink text-xs">
          Tap the pulse before adding pitches.{" "}
          {passage.polyrhythm !== "none"
            ? `Split hands for Chopin ${passage.polyrhythm} polyrhythm.`
            : "Lock into beat 1."}
        </span>
        <button
          type="button"
          onClick={toggleMetronome}
          className={[
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-xs transition-colors",
            metronomeOn
              ? "bg-rose-600 text-white hover:bg-rose-700"
              : "bg-intelligence-blue text-white hover:bg-intelligence-blue/90",
          ].join(" ")}
        >
          {metronomeOn ? <Square className="size-3" /> : <Play className="size-3" />}
          {metronomeOn ? `Stop Metronome (${bpm} BPM)` : `Count-In & Metronome (${bpm} BPM)`}
        </button>
      </div>

      <GrandStaff
        title={passage.title}
        keySignature={passage.keySignature}
        timeSignature={passage.timeSignature}
        measures={passage.measures}
        mode="rhythm-only"
      />

      <RhythmPad
        mode={passage.polyrhythm !== "none" ? "split-hands" : "single"}
        bpm={bpm}
        beatsPerMeasure={passage.timeSignature.numerator}
        polyrhythm={passage.polyrhythm}
        activeSlot={activeSlot}
        measureStartMs={measureStartMs}
        recentHits={hits}
        {...(hits[0] ? { lastHit: hits[0] } : {})}
        onTap={(hit) => {
          playMusicSfx("rhythmHit", { rhythmAccuracy: resolveRhythmSfxAccuracy(hit) });
          setHits((prev) => [hit, ...prev.slice(0, 15)]);
        }}
        onReset={() => setHits([])}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            metroRef.current?.stop();
            setMetronomeOn(false);
            onContinue();
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-intelligence-blue px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-intelligence-blue/90"
        >
          Next: Look-Ahead Play-Through
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function PlayThroughStepView({
  passage,
  bpm,
  blindKeyboard,
  lookAheadMasking,
  showIntervalsOverlay,
  showRomanNumerals,
  onComplete,
}: {
  passage: ScorePassage;
  bpm: number;
  blindKeyboard: boolean;
  lookAheadMasking: boolean;
  showIntervalsOverlay: boolean;
  showRomanNumerals: boolean;
  onComplete: (accuracy: number, weakestBar: number) => void;
}): ReactNode {
  const [playing, setPlaying] = useState(false);
  const [activeMeasure, setActiveMeasure] = useState(1);
  const [activeBeat, setActiveBeat] = useState(0);
  const [pressedNotes, setPressedNotes] = useState<number[]>([]);
  const [correctNotes, setCorrectNotes] = useState<number[]>([]);
  const [wrongNotes, setWrongNotes] = useState<number[]>([]);
  const [hitsCount, setHitsCount] = useState(0);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const missesByBarRef = useRef<Record<number, number>>({});
  const metroRef = useRef<MusicMetronomeController | null>(null);
  const activeMeasureRef = useRef(1);

  useEffect(() => {
    activeMeasureRef.current = activeMeasure;
  }, [activeMeasure]);

  useEffect(() => {
    return () => {
      metroRef.current?.stop();
      stopAllPianoNotes();
    };
  }, []);

  function startPlayThrough(): void {
    metroRef.current?.stop();
    setActiveMeasure(1);
    setActiveBeat(0);
    setCorrectNotes([]);
    setWrongNotes([]);
    setHitsCount(0);
    setAttemptsCount(0);
    missesByBarRef.current = {};
    let measureCursor = 1;
    const totalMeasures = passage.measures.length;
    const metro = createMusicMetronome(
      {
        bpm,
        timeSignature: toAudioTimeSignature(passage.timeSignature),
        polyrhythm: passage.polyrhythm,
        countInBars: 1,
      },
      (tick) => {
        if (tick.isCountIn) return;
        setActiveBeat(tick.beat);
        if (tick.beat === 0 && tick.bar > 0) {
          measureCursor += 1;
          if (measureCursor > totalMeasures) {
            metro.stop();
            setPlaying(false);
            return;
          }
          setActiveMeasure(measureCursor);
        }
      },
    );
    metroRef.current = metro;
    metro.start();
    setPlaying(true);
  }

  function finishPlayThrough(): void {
    metroRef.current?.stop();
    setPlaying(false);
    const accuracy = attemptsCount > 0 ? hitsCount / attemptsCount : 0.85;
    let weakest = passage.previewNotes.hardestBarNumber;
    let maxMisses = 0;
    for (const [barStr, count] of Object.entries(missesByBarRef.current)) {
      if (count > maxMisses) {
        maxMisses = count;
        weakest = Number(barStr);
      }
    }
    onComplete(accuracy, weakest);
  }

  const targetMidis = collectMeasureMidis(passage, activeMeasure);
  const liveAccuracyPct = attemptsCount > 0 ? Math.round((hitsCount / attemptsCount) * 100) : 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-intelligence-blue/25 bg-intelligence-blue/8 px-3.5 py-2.5">
        <div className="flex items-center gap-2 text-xs">
          <Eye className="size-4 text-intelligence-blue" aria-hidden="true" />
          <span className="font-medium text-midnight-ink">
            Eyes 1 bar ahead (m.{Math.min(activeMeasure + 1, passage.measures.length)}) · Never
            stop!
          </span>
          <span className="rounded-full bg-canvas-white px-2 py-0.5 font-mono text-[11px] text-midnight-ink">
            {liveAccuracyPct}% ({hitsCount}/{attemptsCount})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (playing) {
                metroRef.current?.stop();
                setPlaying(false);
              } else {
                startPlayThrough();
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-intelligence-blue px-3 py-1.5 font-medium text-white text-xs transition-colors hover:bg-intelligence-blue/90"
          >
            {playing ? <Square className="size-3" /> : <Play className="size-3" />}
            {playing ? "Stop" : `Play (${bpm} BPM)`}
          </button>
          <button
            type="button"
            onClick={finishPlayThrough}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-3 py-1.5 font-medium text-emerald-700 text-xs transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
          >
            Finish Pass
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      <GrandStaff
        title={passage.title}
        keySignature={passage.keySignature}
        timeSignature={passage.timeSignature}
        measures={passage.measures}
        mode={lookAheadMasking ? "look-ahead" : "standard"}
        activeMeasure={activeMeasure}
        activeBeat={activeBeat}
        showIntervalShapes={showIntervalsOverlay}
        showRomanNumerals={showRomanNumerals}
        onSelectMeasure={setActiveMeasure}
      />

      <TactileKeyboard
        startOctave={3}
        pressedNotes={pressedNotes}
        targetNotes={targetMidis}
        correctNotes={correctNotes}
        wrongNotes={wrongNotes}
        blindVeil={blindKeyboard}
        enableWebMidi
        onNoteOn={(midi, velocity) => {
          playPianoNote({ midi, velocity });
          setPressedNotes((prev) => (prev.includes(midi) ? prev : [...prev, midi]));
          const bar = activeMeasureRef.current;
          const expected = collectMeasureMidis(passage, bar);
          const isHit = expected.includes(midi);
          setAttemptsCount((prev) => prev + 1);
          if (isHit) {
            setHitsCount((prev) => prev + 1);
            setCorrectNotes((prev) => (prev.includes(midi) ? prev : [...prev, midi]));
          } else {
            playMusicSfx("gentleMiss");
            setWrongNotes((prev) => (prev.includes(midi) ? prev : [...prev, midi]));
            missesByBarRef.current[bar] = (missesByBarRef.current[bar] ?? 0) + 1;
          }
        }}
        onNoteOff={(midi) => {
          releasePianoNote(midi);
          setPressedNotes((prev) => prev.filter((n) => n !== midi));
        }}
      />
    </div>
  );
}

function WeakestBarStepView({
  passage,
  weakestBarNumber,
  slowBpm,
  blindKeyboard,
  onContinue,
}: {
  passage: ScorePassage;
  weakestBarNumber: number;
  slowBpm: number;
  blindKeyboard: boolean;
  onContinue: () => void;
}): ReactNode {
  const targetMeasure =
    passage.measures.find((m) => m.number === weakestBarNumber) ?? passage.measures[0];
  const [pressedNotes, setPressedNotes] = useState<number[]>([]);
  const targetMidis = collectMeasureMidis(passage, weakestBarNumber);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-500/25 bg-rose-500/8 px-3.5 py-2.5">
        <div className="text-xs">
          <span className="font-semibold text-midnight-ink">
            Remediation Focus: Measure {weakestBarNumber}
          </span>
          <span className="ml-2 text-muted-ash">
            Play ONE clean pass at {slowBpm} BPM, then move on.
          </span>
        </div>
        <button
          type="button"
          onClick={() => playMeasureReference(passage, weakestBarNumber, slowBpm)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-intelligence-blue/30 bg-canvas-white px-3 py-1.5 font-medium text-intelligence-blue text-xs transition-colors hover:bg-whisper-gray"
        >
          <Volume2 className="size-3.5" />
          Hear Bar {weakestBarNumber} ({slowBpm} BPM)
        </button>
      </div>

      {targetMeasure ? (
        <GrandStaff
          title={`${passage.title} — Measure ${targetMeasure.number}`}
          keySignature={passage.keySignature}
          timeSignature={passage.timeSignature}
          measures={[targetMeasure]}
          mode="standard"
          showIntervalShapes
          showRomanNumerals
          showFingerings
        />
      ) : null}

      <TactileKeyboard
        startOctave={3}
        pressedNotes={pressedNotes}
        targetNotes={targetMidis}
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-1.5 rounded-xl bg-intelligence-blue px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-intelligence-blue/90"
        >
          Next: FSRS Retrieval Rating
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function FsrsRateStepView({
  passage,
  accuracy,
  weakestBarNumber,
  onRate,
  onNextPassage,
}: {
  passage: ScorePassage;
  accuracy: number;
  weakestBarNumber: number;
  onRate: (result: RitualRatingResult) => void;
  onNextPassage?: () => void;
}): ReactNode {
  const pct = Math.round(accuracy * 100);
  const flowBanner = resolveFlowBanner(accuracy);

  const ratings: ReadonlyArray<{ rating: FSRSRating; label: string; hint: string; tone: string }> =
    [
      {
        rating: "again",
        label: "Again",
        hint: "Stopped or lost pulse",
        tone: "border-rose-500/35 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300",
      },
      {
        rating: "hard",
        label: "Hard",
        hint: "Kept moving, heavy strain",
        tone: "border-amber-500/35 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 dark:text-amber-200",
      },
      {
        rating: "good",
        label: "Good",
        hint: "Fluent 80–90% flow",
        tone: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300",
      },
      {
        rating: "easy",
        label: "Easy",
        hint: "Effortless look-ahead",
        tone: "border-sky-500/35 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300",
      },
    ];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-whisper-gray/60 p-5 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-mono text-[11px] text-muted-ash uppercase tracking-wider">
            Step 5 · FSRS Spaced Repetition
          </div>
          <h3 className="font-semibold text-base text-midnight-ink">
            Log fluency for {passage.title}
          </h3>
        </div>
        <span className="rounded-full bg-canvas-white px-3 py-1 font-mono text-midnight-ink text-xs">
          Accuracy {pct}% · Weakest m.{weakestBarNumber}
        </span>
      </div>

      <div className={`rounded-xl border px-3.5 py-2.5 text-xs leading-5 ${flowBanner.tone}`}>
        {flowBanner.text}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {ratings.map((item) => (
          <button
            key={item.rating}
            type="button"
            onClick={() => {
              playMusicSfx(item.rating === "again" ? "gentleMiss" : "correctInterval");
              onRate({ rating: item.rating, accuracy, weakestBarNumber });
              onNextPassage?.();
            }}
            className={`flex flex-col items-start rounded-xl border p-3 text-left transition-colors ${item.tone}`}
          >
            <span className="font-semibold text-sm">{item.label}</span>
            <span className="mt-0.5 text-[11px] opacity-85">{item.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export const SightReadingRitual = defineComponent(
  SightReadingRitualPropsSchema,
  ({
    passage,
    step,
    bpmOffset,
    blindKeyboard,
    lookAheadMasking,
    showIntervalsOverlay,
    showRomanNumerals,
    onStepChange,
    onRate,
    onNextPassage,
  }): ReactNode => {
    const [lastAccuracy, setLastAccuracy] = useState(0.86);
    const [weakestBarOverride, setWeakestBarOverride] = useState<number | null>(null);
    const weakestBar = weakestBarOverride ?? passage.previewNotes.hardestBarNumber;
    const effectiveBpm = Math.min(220, Math.max(36, passage.tempoBpm + bpmOffset));
    const slowBpm = Math.max(36, Math.round(effectiveBpm * 0.75));
    const activeSpec = FIVE_STEP_RITUAL.find((s) => s.step === step) ?? FIVE_STEP_RITUAL[0];

    const nextPassageProps = onNextPassage ? { onNextPassage } : {};

    return (
      <section className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-canvas-white p-4 shadow-card sm:p-5 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Music2 className="size-4 text-intelligence-blue" aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-base text-midnight-ink">{passage.title}</h2>
              <p className="text-muted-ash text-xs">
                {passage.composer}
                {passage.opus ? ` · ${passage.opus}` : ""} · {passage.keySignature.label} · Tier{" "}
                {passage.difficulty}/10
              </p>
            </div>
          </div>
          <span className="rounded-full bg-whisper-gray px-2.5 py-1 font-mono text-[11px] text-muted-ash">
            {effectiveBpm} BPM · {passage.timeSignature.numerator}/
            {passage.timeSignature.denominator}
          </span>
        </div>

        <nav aria-label="5-Step Sight-Reading Ritual" className="grid grid-cols-5 gap-1.5">
          {FIVE_STEP_RITUAL.map((item) => {
            const isActive = item.step === step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => onStepChange(item.step)}
                className={[
                  "flex flex-col rounded-xl border px-2 py-2 text-left transition-colors",
                  isActive
                    ? "border-intelligence-blue bg-intelligence-blue/10 text-midnight-ink"
                    : "border-black/8 bg-whisper-gray/60 text-muted-ash hover:text-midnight-ink dark:border-white/8",
                ].join(" ")}
              >
                <span className="font-mono text-[10px] uppercase">Step {item.order}</span>
                <span className="truncate font-medium text-xs">{item.title}</span>
              </button>
            );
          })}
        </nav>

        {activeSpec ? (
          <p className="text-muted-ash text-xs leading-5">{activeSpec.instruction}</p>
        ) : null}

        {step === "preview-30s" ? (
          <PreviewStepView
            passage={passage}
            showIntervalsOverlay={showIntervalsOverlay}
            showRomanNumerals={showRomanNumerals}
            onContinue={() => onStepChange("rhythm-isolate")}
          />
        ) : null}

        {step === "rhythm-isolate" ? (
          <RhythmStepView
            passage={passage}
            bpm={effectiveBpm}
            onContinue={() => onStepChange("look-ahead-play")}
          />
        ) : null}

        {step === "look-ahead-play" ? (
          <PlayThroughStepView
            passage={passage}
            bpm={effectiveBpm}
            blindKeyboard={blindKeyboard}
            lookAheadMasking={lookAheadMasking}
            showIntervalsOverlay={showIntervalsOverlay}
            showRomanNumerals={showRomanNumerals}
            onComplete={(acc, bar) => {
              setLastAccuracy(acc);
              setWeakestBarOverride(bar);
              onStepChange("review-weakest-bar");
            }}
          />
        ) : null}

        {step === "review-weakest-bar" ? (
          <WeakestBarStepView
            passage={passage}
            weakestBarNumber={weakestBar}
            slowBpm={slowBpm}
            blindKeyboard={blindKeyboard}
            onContinue={() => onStepChange("fsrs-rate")}
          />
        ) : null}

        {step === "fsrs-rate" ? (
          <FsrsRateStepView
            passage={passage}
            accuracy={lastAccuracy}
            weakestBarNumber={weakestBar}
            onRate={onRate}
            {...nextPassageProps}
          />
        ) : null}
      </section>
    );
  },
);
