import {
  Award,
  Check,
  ChevronRight,
  Headphones,
  Mic,
  MicOff,
  Minimize2,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Square,
  Timer,
  Volume2,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import * as z from "zod";

import {
  createMusicMetronome,
  getTransportClock,
  type MicListenerStatus,
  MicListenerStatusSchema,
  type MusicMetronomeController,
  playMusicSfx,
  playPianoChord,
  playPianoNote,
  releasePianoNote,
  setSustainPedal,
  stopAllPianoNotes,
} from "~/audio/music-mode";
import { defineComponent } from "~/lib/define-component";
import { FIVE_STEP_RITUAL } from "~/lib/music-mode/curriculum";
import {
  advancePlaythroughPosition,
  type CleanPassTracker,
  computeNextAutoTempoScale,
  createCleanPassTracker,
  createPlaythroughSession,
  extractAccompanimentEvents,
  finalizePlaythrough,
  getActiveSlotTargetMidis,
  getAwaitedBeatSlot,
  type PlaythroughSession,
  type PlaythroughTimingRating,
  recordCleanPassNote,
  recordPlaythroughNote,
} from "~/lib/music-mode/playthrough-sim";
import {
  type FSRSRating,
  type HandPracticeMode,
  HandPracticeModeSchema,
  type MeasureLoopRange,
  MeasureLoopRangeSchema,
  type NotationScaffold,
  NotationScaffoldSchema,
  type PlaythroughResult,
  type PracticeMode,
  PracticeModeSchema,
  type RecitalTake,
  RecitalTakeSchema,
  type ScorePassage,
  ScorePassageSchema,
  type SightReadingStep,
  SightReadingStepSchema,
} from "~/lib/music-mode/schemas";
import { buildChord, parsePitch } from "~/lib/music-mode/theory";
import { GrandStaff, type PreviewFocus } from "./grand-staff";
import { RhythmPad } from "./rhythm-pad";
import { TactileKeyboard } from "./tactile-keyboard";
import { classifyTimingOffset, type TimingHit } from "./types";
import { useMusicInputMap } from "./use-music-input-map";

export const RitualRatingResultSchema = z.object({
  rating: z.enum(["again", "hard", "good", "easy"]),
  accuracy: z.number().min(0).max(1),
  weakestBarNumber: z.int().min(1),
  take: RecitalTakeSchema.optional(),
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
  showQwertyHints: z.boolean().default(false),
  autoFocusOnPlay: z.boolean().default(true),
  focusMode: z.boolean().default(false),
  practiceMode: PracticeModeSchema.default("flow"),
  handMode: HandPracticeModeSchema.default("both"),
  notationScaffold: NotationScaffoldSchema.default("intervals-only"),
  tempoScalePct: z.int().min(25).max(125).default(100),
  autoTempoRamp: z.boolean().default(false),
  loopLeadIn: z.boolean().default(true),
  accompanimentVolume: z.number().min(0).max(1).default(0.7),
  loopRange: MeasureLoopRangeSchema.nullable().default(null),
  micStatus: MicListenerStatusSchema.default("idle"),
  micLevel: z.number().min(0).max(1).default(0),
  bestTake: RecitalTakeSchema.optional(),
  onFocusModeChange: z.custom<(focused: boolean) => void>().optional(),
  onOpenControls: z.custom<() => void>().optional(),
  onToggleMic: z.custom<() => void>().optional(),
  subscribeMicNoteOn: z
    .custom<(listener: (midi: number, velocity: number) => void) => () => void>()
    .optional(),
  onTempoScaleChange: z.custom<(nextPct: number) => void>().optional(),
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

function replayRecitalTake(take: RecitalTake): void {
  if (take.events.length === 0) return;
  stopAllPianoNotes();
  const secPerBeat = 60 / Math.max(30, take.bpm);
  const minOffset = take.events.reduce(
    (acc, ev) => Math.min(acc, ev.beatOffset),
    take.events[0]?.beatOffset ?? 0,
  );
  for (const ev of take.events) {
    const delaySeconds = Math.max(0, (ev.beatOffset - minOffset) * secPerBeat);
    playPianoNote({
      midi: ev.midi,
      velocity: ev.hit ? 0.76 : 0.48,
      delaySeconds,
      durationSeconds: Math.max(0.25, secPerBeat * 0.85),
    });
  }
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

function removeMidiNote(midi: number): (prev: number[]) => number[] {
  return (prev) => prev.filter((n) => n !== midi);
}

function resolveFallbackSuggestedRating(accuracy: number): FSRSRating {
  if (accuracy >= 0.92) return "easy";
  if (accuracy >= 0.8) return "good";
  return "hard";
}

function resolveRhythmSfxAccuracy(hit: TimingHit): "on-beat" | "early" | "late" {
  if (hit.rating === "on-beat") return "on-beat";
  return hit.offsetMs < 0 ? "early" : "late";
}

function scheduleMeasureAccompaniment(
  passage: ScorePassage,
  measureNumber: number,
  bpm: number,
  handMode: HandPracticeMode,
  accompanimentVolume: number,
): void {
  if (handMode === "both" || accompanimentVolume <= 0) return;
  const measure = passage.measures.find((m) => m.number === measureNumber);
  if (!measure) return;
  const events = extractAccompanimentEvents(measure, handMode);
  if (events.length === 0) return;
  const secPerBeat = 60 / Math.max(30, bpm);
  const velocity = Math.max(0.15, Math.min(0.95, accompanimentVolume * 0.85));
  for (const ev of events) {
    playPianoChord({
      notes: ev.midis,
      velocity,
      delaySeconds: ev.beatStart * secPerBeat,
      durationSeconds: Math.max(0.22, ev.durationBeats * secPerBeat * 0.9),
    });
  }
}

function resolveTimingCueBadge(timing: PlaythroughTimingRating): { label: string; tone: string } {
  if (timing === "on-beat") {
    return {
      label: "On-Beat",
      tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    };
  }
  if (timing === "early") {
    return {
      label: "Early",
      tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    };
  }
  return {
    label: "Late",
    tone: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  };
}

function resolveMicDotClass(status: MicListenerStatus): string {
  if (status === "listening") return "bg-emerald-500";
  if (status === "denied" || status === "error") return "bg-rose-500";
  if (status === "requesting") return "bg-amber-500";
  return "bg-black/25 dark:bg-white/25";
}

function resolveTransportMicButtonClass(
  micListening: boolean,
  micStatus: MicListenerStatus,
): string {
  if (micListening) {
    return "border-emerald-500/45 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
  }
  if (micStatus === "denied" || micStatus === "error") {
    return "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
  return "border-black/10 bg-canvas-white text-midnight-ink hover:bg-light-taupe dark:border-white/10";
}

function resolvePlayButtonLabel(playing: boolean, practiceMode: PracticeMode): string {
  if (playing) return "Stop";
  return practiceMode === "wait" ? "Start Wait" : "Play";
}

function resolveCountInBars(loopRange: MeasureLoopRange | null, loopLeadIn: boolean): number {
  if (!loopRange) return 1;
  return loopLeadIn ? 1 : 0;
}

function resolveNoteInputPosition(params: {
  practiceMode: PracticeMode;
  playing: boolean;
  clockRunning: boolean;
  clockIsCountIn: boolean;
  clockBar: number;
  clockBeatFloat: number;
  awaitedBar: number | undefined;
  awaitedBeat: number | undefined;
  loopRange: MeasureLoopRange | null;
  loopLeadIn: boolean;
  fallbackBar: number;
  fallbackBeat: number;
}): { bar: number; beatFloat: number } {
  if (params.practiceMode === "wait") {
    return {
      bar: params.awaitedBar ?? params.fallbackBar,
      beatFloat: params.awaitedBeat ?? params.fallbackBeat,
    };
  }
  if (params.playing && params.clockRunning && !params.clockIsCountIn) {
    const startBar = params.loopRange?.startBar ?? 1;
    const countIn = resolveCountInBars(params.loopRange, params.loopLeadIn);
    return {
      bar: Math.max(1, startBar + (params.clockBar - countIn)),
      beatFloat: params.clockBeatFloat,
    };
  }
  return { bar: params.fallbackBar, beatFloat: params.fallbackBeat };
}

function resolveFlowBanner(accuracy: number): { tone: string; text: string } {
  const pct = Math.round(accuracy * 100);
  if (accuracy < 0.8) {
    return {
      tone: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
      text: `Adaptive Flow (${pct}%): Dropping difficulty by 1 notch to keep you in the 80–85% sight-reading sweet spot.`,
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

// ---------------------------------------------------------------------------
// Step 1: Scan (30-Second Preview)
// ---------------------------------------------------------------------------

function PreviewStepView({
  passage,
  showIntervalsOverlay,
  showRomanNumerals,
  notationScaffold,
  handMode,
  onAnnounce,
  onContinue,
}: {
  passage: ScorePassage;
  showIntervalsOverlay: boolean;
  showRomanNumerals: boolean;
  notationScaffold: NotationScaffold;
  handMode: HandPracticeMode;
  onAnnounce: (text: string) => void;
  onContinue: () => void;
}): ReactNode {
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [timerRunning, setTimerRunning] = useState(false);
  const [previewFocus, setPreviewFocus] = useState<PreviewFocus>("all");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [cadencePulseKey, setCadencePulseKey] = useState(0);
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
        onAnnounce("30-second scan complete.");
      }
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning, onAnnounce]);

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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 bg-whisper-gray/70 px-3 py-2 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Timer className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <span className="font-mono font-semibold text-sm text-midnight-ink tabular-nums">
            00:{String(secondsLeft).padStart(2, "0")}
          </span>
          <span className="hidden text-muted-ash text-xs sm:inline">
            Hands off keys — scan before playing.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTimerRunning((prev) => !prev)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-black/10 bg-canvas-white px-3 py-1.5 font-medium text-midnight-ink text-xs transition-colors hover:bg-light-taupe dark:border-white/10"
          >
            {timerRunning ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
            {timerRunning ? "Pause" : "30s Scan"}
          </button>
          <button
            type="button"
            aria-label="Reset 30 second timer"
            onClick={() => {
              setTimerRunning(false);
              secondsLeftRef.current = 30;
              setSecondsLeft(30);
            }}
            className="inline-flex size-11 items-center justify-center rounded-lg border border-black/10 bg-canvas-white text-muted-ash transition-colors hover:text-midnight-ink dark:border-white/10"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              playTonicCadence(passage);
              setCadencePulseKey((prev) => prev + 1);
              onAnnounce(`Playing tonic cadence in ${passage.keySignature.label}`);
            }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 font-medium text-amber-900 text-xs transition-colors hover:bg-amber-500/20 dark:text-amber-200"
          >
            <Volume2 className="size-3.5" aria-hidden="true" />
            Tonic I–V–I
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
        cadencePulseKey={cadencePulseKey}
        previewFocus={previewFocus}
        onPreviewFocusChange={setPreviewFocus}
        showIntervalShapes={showIntervalsOverlay}
        showRomanNumerals={showRomanNumerals}
        notationScaffold={notationScaffold}
        handMode={handMode}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        {checklistItems.map((item) => {
          const isChecked = Boolean(checked[item.id]);
          const isFocused = previewFocus === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isChecked}
              onClick={() => {
                setPreviewFocus(item.id);
                setChecked((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
              }}
              className={[
                "flex min-h-11 items-start gap-2.5 rounded-xl border p-3 text-left transition-colors",
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
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-intelligence-blue px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-intelligence-blue/90"
        >
          Next: Rhythm
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Rhythm Isolation (0-indexed tick.beat + QWERTY Space / F / J)
// ---------------------------------------------------------------------------

function RhythmStepView({
  passage,
  bpm,
  autoFocusOnPlay,
  focusMode,
  onFocusModeChange,
  onOpenControls,
  onAnnounce,
  onContinue,
}: {
  passage: ScorePassage;
  bpm: number;
  autoFocusOnPlay: boolean;
  focusMode: boolean;
  onFocusModeChange?: (focused: boolean) => void;
  onOpenControls?: () => void;
  onAnnounce: (text: string) => void;
  onContinue: () => void;
}): ReactNode {
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);
  const [measureStartMs, setMeasureStartMs] = useState<number>(() => Date.now());
  const [hits, setHits] = useState<TimingHit[]>([]);
  const metroRef = useRef<MusicMetronomeController | null>(null);
  const tapCounterRef = useRef(0);

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
      onAnnounce("Metronome stopped.");
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
    if (autoFocusOnPlay) onFocusModeChange?.(true);
    onAnnounce(`Metronome started at ${bpm} BPM.`);
  }

  function recordKeyboardRhythmTap(hand: "LH" | "RH" | "single"): void {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const beatsPerBar = passage.timeSignature.numerator;
    const barDurationMs = (60_000 / bpm) * beatsPerBar;
    const pulseMs = barDurationMs / Math.max(beatsPerBar, 1);
    const elapsed = Math.max(0, now - measureStartMs);
    const nearest = Math.round(elapsed / pulseMs);
    const offsetMs = Math.max(-150, Math.min(150, Math.round(elapsed - nearest * pulseMs)));
    const rating = classifyTimingOffset(offsetMs);
    tapCounterRef.current += 1;
    const hit: TimingHit = {
      id: `kbd-tap-${tapCounterRef.current}`,
      hand,
      slotIndex: ((nearest % beatsPerBar) + beatsPerBar) % beatsPerBar,
      offsetMs,
      rating,
      timestampMs: now,
    };
    playMusicSfx("rhythmHit", { rhythmAccuracy: resolveRhythmSfxAccuracy(hit) });
    setHits((prev) => [hit, ...prev.slice(0, 15)]);
  }

  useMusicInputMap({
    enabled: true,
    mode: passage.polyrhythm !== "none" ? "rhythm-split" : "rhythm-single",
    onRhythmTap: recordKeyboardRhythmTap,
    onTogglePlay: toggleMetronome,
    onExitFocus: () => onFocusModeChange?.(false),
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Canonical 44px Transport Strip */}
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 bg-whisper-gray/80 px-3 py-1.5 dark:border-white/10">
        <div className="flex items-center gap-2 font-mono text-xs text-midnight-ink">
          <span className="font-semibold">{bpm} BPM</span>
          <span className="text-muted-ash">·</span>
          <span className="text-muted-ash">
            {passage.polyrhythm !== "none" ? `${passage.polyrhythm} Split (F/J)` : "Pulse (Space)"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMetronome}
            className={[
              "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3.5 py-2 font-medium text-xs transition-colors",
              metronomeOn
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-intelligence-blue text-white hover:bg-intelligence-blue/90",
            ].join(" ")}
          >
            {metronomeOn ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
            {metronomeOn ? "Stop" : "Start Pulse"}
          </button>
          {onOpenControls ? (
            <button
              type="button"
              aria-label="Open Studio Controls"
              onClick={onOpenControls}
              className="inline-flex size-11 items-center justify-center rounded-lg border border-black/10 bg-canvas-white text-midnight-ink transition-colors hover:bg-light-taupe dark:border-white/10"
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
            </button>
          ) : null}
          {focusMode ? (
            <button
              type="button"
              onClick={() => onFocusModeChange?.(false)}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-black/10 bg-canvas-white px-3 py-1.5 font-medium text-midnight-ink text-xs transition-colors hover:bg-light-taupe dark:border-white/10"
            >
              <Minimize2 className="size-3.5" aria-hidden="true" />
              Exit Focus
            </button>
          ) : null}
        </div>
      </div>

      <GrandStaff
        title={passage.title}
        composer={passage.composer}
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
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-intelligence-blue/35 bg-intelligence-blue/10 px-4 py-2 font-medium text-intelligence-blue text-sm transition-colors hover:bg-intelligence-blue/15"
        >
          Next: Play
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Look-Ahead Play-Through (rAF clock + beat-ordered sim + auto-finish)
// ---------------------------------------------------------------------------

function buildTransportStatusChips(
  practiceMode: PracticeMode,
  handMode: HandPracticeMode,
  loopRange: MeasureLoopRange | null,
  tempoScalePct: number,
  autoTempoRamp: boolean,
): string[] {
  const chips: string[] = [];
  if (practiceMode === "wait") chips.push("Wait");
  if (handMode !== "both") chips.push(handMode.toUpperCase());
  if (loopRange) chips.push(`m.${loopRange.startBar}–${loopRange.endBar}`);
  if (tempoScalePct !== 100 || autoTempoRamp) {
    chips.push(`${tempoScalePct}%${autoTempoRamp ? "↑" : ""}`);
  }
  return chips;
}

function TransportMicButton({
  micStatus,
  micLevel,
  onToggleMic,
}: {
  micStatus: MicListenerStatus;
  micLevel: number;
  onToggleMic: () => void;
}): ReactNode {
  const micListening = micStatus === "listening";
  const micError = micStatus === "denied" || micStatus === "error";
  return (
    <button
      type="button"
      aria-label={micListening ? "Disable acoustic mic" : "Enable acoustic mic"}
      aria-pressed={micListening}
      onClick={onToggleMic}
      className={[
        "relative inline-flex size-11 items-center justify-center rounded-lg border transition-colors",
        resolveTransportMicButtonClass(micListening, micStatus),
      ].join(" ")}
    >
      {micError ? (
        <MicOff className="size-4" aria-hidden="true" />
      ) : (
        <Mic className="size-4" aria-hidden="true" />
      )}
      <span
        aria-hidden="true"
        className={`absolute top-1.5 right-1.5 size-2 rounded-full ${resolveMicDotClass(micStatus)}`}
        style={
          micListening ? { transform: `scale(${(0.85 + micLevel * 0.65).toFixed(2)})` } : undefined
        }
      />
    </button>
  );
}

function PlayThroughTransportBar({
  bpm,
  isCountIn,
  activeMeasure,
  totalMeasures,
  accuracyLabel,
  playing,
  focusMode,
  practiceMode,
  handMode,
  loopRange,
  tempoScalePct,
  autoTempoRamp,
  lastTiming,
  micStatus,
  micLevel,
  onTogglePlay,
  onFinish,
  onToggleMic,
  onOpenControls,
  onExitFocus,
}: {
  bpm: number;
  isCountIn: boolean;
  activeMeasure: number;
  totalMeasures: number;
  accuracyLabel: string;
  playing: boolean;
  focusMode: boolean;
  practiceMode: PracticeMode;
  handMode: HandPracticeMode;
  loopRange: MeasureLoopRange | null;
  tempoScalePct: number;
  autoTempoRamp: boolean;
  lastTiming: PlaythroughTimingRating | null;
  micStatus: MicListenerStatus;
  micLevel: number;
  onTogglePlay: () => void;
  onFinish: () => void;
  onToggleMic?: () => void;
  onOpenControls?: () => void;
  onExitFocus?: () => void;
}): ReactNode {
  const statusChips = buildTransportStatusChips(
    practiceMode,
    handMode,
    loopRange,
    tempoScalePct,
    autoTempoRamp,
  );
  const timingBadge =
    practiceMode === "flow" && lastTiming ? resolveTimingCueBadge(lastTiming) : null;

  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 bg-whisper-gray/80 px-3 py-1.5 dark:border-white/10">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-mono font-semibold text-midnight-ink">{bpm} BPM</span>
        <span className="text-muted-ash">·</span>
        <span className="font-mono text-midnight-ink">
          {isCountIn ? "Count-in" : `Bar ${activeMeasure}/${totalMeasures}`}
        </span>
        <span className="rounded-full bg-canvas-white px-2.5 py-0.5 font-mono text-[11px] text-midnight-ink">
          {accuracyLabel}
        </span>
        {timingBadge ? (
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${timingBadge.tone}`}
          >
            {timingBadge.label}
          </span>
        ) : null}
        {statusChips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={onOpenControls}
            className="rounded-full border border-intelligence-blue/30 bg-intelligence-blue/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-intelligence-blue transition-colors hover:bg-intelligence-blue/20"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        {onToggleMic ? (
          <TransportMicButton micStatus={micStatus} micLevel={micLevel} onToggleMic={onToggleMic} />
        ) : null}
        <button
          type="button"
          onClick={onTogglePlay}
          className={[
            "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3.5 py-2 font-medium text-xs transition-colors",
            playing
              ? "bg-rose-600 text-white hover:bg-rose-700"
              : "bg-intelligence-blue text-white hover:bg-intelligence-blue/90",
          ].join(" ")}
        >
          {playing ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
          {resolvePlayButtonLabel(playing, practiceMode)}
        </button>
        <button
          type="button"
          onClick={onFinish}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-3 py-2 font-medium text-emerald-700 text-xs transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
        >
          Finish
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </button>
        {onOpenControls ? (
          <button
            type="button"
            aria-label="Open Studio Controls"
            onClick={onOpenControls}
            className="inline-flex size-11 items-center justify-center rounded-lg border border-black/10 bg-canvas-white text-midnight-ink transition-colors hover:bg-light-taupe dark:border-white/10"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
          </button>
        ) : null}
        {focusMode && onExitFocus ? (
          <button
            type="button"
            onClick={onExitFocus}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-black/10 bg-canvas-white px-3 py-1.5 font-medium text-midnight-ink text-xs transition-colors hover:bg-light-taupe dark:border-white/10"
          >
            <Minimize2 className="size-3.5" aria-hidden="true" />
            Exit Focus
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface PlaythroughControllerArgs {
  passage: ScorePassage;
  bpm: number;
  autoFocusOnPlay: boolean;
  practiceMode: PracticeMode;
  handMode: HandPracticeMode;
  tempoScalePct: number;
  autoTempoRamp: boolean;
  loopLeadIn: boolean;
  accompanimentVolume: number;
  loopRange: MeasureLoopRange | null;
  micStatus: MicListenerStatus;
  subscribeMicNoteOn?: (listener: (midi: number, velocity: number) => void) => () => void;
  onTempoScaleChange?: (nextPct: number) => void;
  onFocusModeChange?: (focused: boolean) => void;
  onAnnounce: (text: string) => void;
  onComplete: (result: PlaythroughResult) => void;
}

function usePlaythroughController(args: PlaythroughControllerArgs) {
  const {
    passage,
    bpm,
    autoFocusOnPlay,
    practiceMode,
    handMode,
    tempoScalePct,
    autoTempoRamp,
    loopLeadIn,
    accompanimentVolume,
    loopRange,
    micStatus,
    subscribeMicNoteOn,
    onTempoScaleChange,
    onFocusModeChange,
    onAnnounce,
    onComplete,
  } = args;

  const [playing, setPlaying] = useState(false);
  const [isCountIn, setIsCountIn] = useState(false);
  const [activeMeasure, setActiveMeasure] = useState(() => loopRange?.startBar ?? 1);
  const [activeBeat, setActiveBeat] = useState(0);
  const [octaveShift, setOctaveShift] = useState(0);
  const [pressedNotes, setPressedNotes] = useState<number[]>([]);
  const [correctNotes, setCorrectNotes] = useState<number[]>([]);
  const [wrongNotes, setWrongNotes] = useState<number[]>([]);
  const [lastTiming, setLastTiming] = useState<PlaythroughTimingRating | null>(null);
  const [finalePulseKey, setFinalePulseKey] = useState(0);
  const [session, setSession] = useState<PlaythroughSession>(() =>
    createPlaythroughSession(passage, bpm, { practiceMode, handMode, loopRange }),
  );

  const sessionRef = useRef<PlaythroughSession>(session);
  const metroRef = useRef<MusicMetronomeController | null>(null);
  const activeMeasureRef = useRef(loopRange?.startBar ?? 1);
  const activeBeatRef = useRef(0);
  const flashTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const timingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micListening = micStatus === "listening";

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    activeMeasureRef.current = activeMeasure;
    activeBeatRef.current = activeBeat;
  }, [activeMeasure, activeBeat]);

  useEffect(() => {
    if (playing) return;
    const next = createPlaythroughSession(passage, bpm, { practiceMode, handMode, loopRange });
    sessionRef.current = next;
    setSession(next);
    const firstSlot = getAwaitedBeatSlot(next);
    setActiveMeasure(firstSlot?.barNumber ?? loopRange?.startBar ?? 1);
    setActiveBeat(firstSlot?.beatStart ?? 0);
  }, [
    passage,
    bpm,
    practiceMode,
    handMode,
    loopRange?.startBar,
    loopRange?.endBar,
    loopRange,
    playing,
  ]);

  useEffect(() => {
    return () => {
      metroRef.current?.stop();
      stopAllPianoNotes();
      for (const timer of flashTimersRef.current) clearTimeout(timer);
      if (timingTimerRef.current) clearTimeout(timingTimerRef.current);
    };
  }, []);

  function flashNote(midi: number, kind: "correct" | "wrong"): void {
    const durationMs = kind === "correct" ? 180 : 220;
    if (kind === "correct") {
      setCorrectNotes((prev) => (prev.includes(midi) ? prev : [...prev, midi]));
    } else {
      setWrongNotes((prev) => (prev.includes(midi) ? prev : [...prev, midi]));
    }
    const id = setTimeout(() => {
      if (kind === "correct") {
        setCorrectNotes(removeMidiNote(midi));
      } else {
        setWrongNotes(removeMidiNote(midi));
      }
    }, durationMs);
    flashTimersRef.current.push(id);
  }

  function showTimingCue(timing: PlaythroughTimingRating): void {
    setLastTiming(timing);
    if (timingTimerRef.current) clearTimeout(timingTimerRef.current);
    timingTimerRef.current = setTimeout(() => {
      setLastTiming(null);
    }, 900);
  }

  function finishPlayThrough(currentSession: PlaythroughSession): void {
    metroRef.current?.stop();
    setPlaying(false);
    setIsCountIn(false);
    const result = finalizePlaythrough(currentSession);
    if (result.unbroken) {
      setFinalePulseKey((prev) => prev + 1);
      playMusicSfx("streakMilestone");
      onAnnounce(`Unbroken pass! ${Math.round(result.accuracy * 100)}% accuracy.`);
    } else {
      onAnnounce(
        `Pass complete. ${Math.round(result.accuracy * 100)}% accuracy. Weakest bar: measure ${result.weakestBarNumber}.`,
      );
    }
    onComplete(result);
  }

  function handleLoopPassComplete(completedSession: PlaythroughSession): void {
    const loopAccuracy =
      completedSession.attempts > 0 ? completedSession.hits / completedSession.attempts : 0;
    let nextBpm = bpm;
    if (autoTempoRamp && onTempoScaleChange) {
      const { nextPct, delta } = computeNextAutoTempoScale(tempoScalePct, loopAccuracy);
      if (delta !== 0) {
        onTempoScaleChange(nextPct);
        const baseBpm = Math.max(30, Math.round((bpm * 100) / Math.max(25, tempoScalePct)));
        nextBpm = Math.min(220, Math.max(30, Math.round((baseBpm * nextPct) / 100)));
        onAnnounce(
          delta > 0
            ? `Clean loop (${Math.round(loopAccuracy * 100)}%)! Auto-ramping speed to ${nextPct}%.`
            : `Loop accuracy ${Math.round(loopAccuracy * 100)}%. Easing speed to ${nextPct}%.`,
        );
      }
    }
    if (practiceMode === "wait") {
      const restarted = createPlaythroughSession(passage, nextBpm, {
        practiceMode,
        handMode,
        loopRange,
      });
      sessionRef.current = restarted;
      setSession(restarted);
      const firstSlot = getAwaitedBeatSlot(restarted);
      setActiveMeasure(firstSlot?.barNumber ?? loopRange?.startBar ?? 1);
      setActiveBeat(firstSlot?.beatStart ?? 0);
      return;
    }
    startFlowPlayThrough(nextBpm);
  }

  function startFlowPlayThrough(overrideBpm?: number): void {
    const targetBpm = overrideBpm ?? bpm;
    metroRef.current?.stop();
    const fresh = createPlaythroughSession(passage, targetBpm, {
      practiceMode: "flow",
      handMode,
      loopRange,
    });
    sessionRef.current = fresh;
    setSession(fresh);
    const startBar = loopRange ? loopRange.startBar : 1;
    const countInBars = resolveCountInBars(loopRange, loopLeadIn);
    setActiveMeasure(startBar);
    setActiveBeat(0);
    setIsCountIn(countInBars > 0);
    setCorrectNotes([]);
    setWrongNotes([]);

    const metro = createMusicMetronome(
      {
        bpm: targetBpm,
        timeSignature: toAudioTimeSignature(passage.timeSignature),
        polyrhythm: passage.polyrhythm,
        countInBars,
      },
      (tick) => {
        if (tick.isCountIn) {
          setIsCountIn(true);
          setActiveBeat(tick.beat);
          return;
        }
        setIsCountIn(false);
        const barNumber = startBar + (tick.bar - countInBars);
        const advanced = advancePlaythroughPosition(sessionRef.current, barNumber, tick.beat);
        sessionRef.current = advanced.session;
        setSession(advanced.session);

        if (advanced.autoFinished) {
          if (loopRange) {
            handleLoopPassComplete(advanced.session);
          } else {
            finishPlayThrough(advanced.session);
          }
          return;
        }
        if (tick.beat === 0 && !micListening) {
          scheduleMeasureAccompaniment(
            passage,
            barNumber,
            targetBpm,
            handMode,
            accompanimentVolume,
          );
        }
        setActiveMeasure(barNumber);
        setActiveBeat(tick.beat);
      },
    );
    metroRef.current = metro;
    metro.start();
    setPlaying(true);
    if (autoFocusOnPlay) onFocusModeChange?.(true);
    onAnnounce(
      countInBars > 0
        ? `Count-in started at ${targetBpm} BPM.`
        : `Loop started at ${targetBpm} BPM.`,
    );
  }

  function startPlayThrough(): void {
    if (practiceMode === "wait") {
      metroRef.current?.stop();
      const fresh = createPlaythroughSession(passage, bpm, {
        practiceMode: "wait",
        handMode,
        loopRange,
      });
      sessionRef.current = fresh;
      setSession(fresh);
      const firstSlot = getAwaitedBeatSlot(fresh);
      setActiveMeasure(firstSlot?.barNumber ?? loopRange?.startBar ?? 1);
      setActiveBeat(firstSlot?.beatStart ?? 0);
      setIsCountIn(false);
      setCorrectNotes([]);
      setWrongNotes([]);
      setPlaying(true);
      if (autoFocusOnPlay) onFocusModeChange?.(true);
      onAnnounce("Wait Mode active. Play each highlighted note to advance.");
      return;
    }
    startFlowPlayThrough();
  }

  function togglePlay(): void {
    if (playing) {
      metroRef.current?.stop();
      setPlaying(false);
      setIsCountIn(false);
      onAnnounce("Playback paused.");
    } else {
      startPlayThrough();
    }
  }

  function handleNoteOn(midi: number, velocity: number, fromMic = false): void {
    if (!fromMic && !micListening) {
      playPianoNote({ midi, velocity });
    }
    setPressedNotes((prev) => (prev.includes(midi) ? prev : [...prev, midi]));
    if (fromMic) {
      const releaseTimer = setTimeout(() => {
        setPressedNotes(removeMidiNote(midi));
      }, 220);
      flashTimersRef.current.push(releaseTimer);
    }

    const clock = getTransportClock();
    const awaited = getAwaitedBeatSlot(sessionRef.current);
    const { bar, beatFloat } = resolveNoteInputPosition({
      practiceMode,
      playing,
      clockRunning: clock.running,
      clockIsCountIn: clock.isCountIn,
      clockBar: clock.bar,
      clockBeatFloat: clock.beatFloat,
      awaitedBar: awaited?.barNumber,
      awaitedBeat: awaited?.beatStart,
      loopRange,
      loopLeadIn,
      fallbackBar: activeMeasureRef.current,
      fallbackBeat: activeBeatRef.current,
    });

    const outcome = recordPlaythroughNote(sessionRef.current, midi, bar, beatFloat);
    sessionRef.current = outcome.session;
    setSession(outcome.session);

    if (outcome.hit) {
      flashNote(midi, "correct");
      if (outcome.timing) {
        showTimingCue(outcome.timing);
      }
      if (practiceMode === "wait") {
        const nextAwaited = getAwaitedBeatSlot(outcome.session);
        if (nextAwaited) {
          setActiveMeasure(nextAwaited.barNumber);
          setActiveBeat(nextAwaited.beatStart);
        }
      }
      if (outcome.allSlotsComplete && (practiceMode === "wait" || !playing)) {
        if (loopRange) {
          handleLoopPassComplete(outcome.session);
        } else {
          finishPlayThrough(outcome.session);
        }
      }
    } else {
      playMusicSfx("gentleMiss");
      flashNote(midi, "wrong");
    }
  }

  function handleNoteOff(midi: number): void {
    releasePianoNote(midi);
    setPressedNotes((prev) => prev.filter((n) => n !== midi));
  }

  const micNoteHandlerRef = useRef<(midi: number, velocity: number) => void>(() => undefined);
  useEffect(() => {
    micNoteHandlerRef.current = (midi, velocity) => {
      handleNoteOn(midi, velocity, true);
    };
  });

  useEffect(() => {
    if (!subscribeMicNoteOn) return;
    return subscribeMicNoteOn((midi, velocity) => {
      micNoteHandlerRef.current(midi, velocity);
    });
  }, [subscribeMicNoteOn]);

  useMusicInputMap({
    enabled: true,
    baseOctave: Math.max(1, Math.min(5, 4 + octaveShift)),
    mode: "piano",
    onNoteOn: handleNoteOn,
    onNoteOff: handleNoteOff,
    onOctaveShift: (delta) => setOctaveShift((prev) => Math.max(-2, Math.min(2, prev + delta))),
    onDamperChange: (down) => setSustainPedal(down),
    onTogglePlay: togglePlay,
    onExitFocus: () => onFocusModeChange?.(false),
  });

  return {
    playing,
    isCountIn,
    activeMeasure,
    activeBeat,
    octaveShift,
    pressedNotes,
    correctNotes,
    wrongNotes,
    lastTiming,
    finalePulseKey,
    session,
    setActiveMeasure,
    setOctaveShift,
    togglePlay,
    finishCurrent: () => finishPlayThrough(sessionRef.current),
    handleNoteOn,
    handleNoteOff,
  };
}

function PlayThroughStepView({
  passage,
  bpm,
  blindKeyboard,
  lookAheadMasking,
  showIntervalsOverlay,
  showRomanNumerals,
  showQwertyHints,
  autoFocusOnPlay,
  focusMode,
  practiceMode,
  handMode,
  notationScaffold,
  tempoScalePct,
  autoTempoRamp,
  loopLeadIn,
  accompanimentVolume,
  loopRange,
  micStatus,
  micLevel,
  onToggleMic,
  subscribeMicNoteOn,
  onTempoScaleChange,
  onFocusModeChange,
  onOpenControls,
  onAnnounce,
  onComplete,
}: {
  passage: ScorePassage;
  bpm: number;
  blindKeyboard: boolean;
  lookAheadMasking: boolean;
  showIntervalsOverlay: boolean;
  showRomanNumerals: boolean;
  showQwertyHints: boolean;
  autoFocusOnPlay: boolean;
  focusMode: boolean;
  practiceMode: PracticeMode;
  handMode: HandPracticeMode;
  notationScaffold: NotationScaffold;
  tempoScalePct: number;
  autoTempoRamp: boolean;
  loopLeadIn: boolean;
  accompanimentVolume: number;
  loopRange: MeasureLoopRange | null;
  micStatus: MicListenerStatus;
  micLevel: number;
  onToggleMic?: () => void;
  subscribeMicNoteOn?: (listener: (midi: number, velocity: number) => void) => () => void;
  onTempoScaleChange?: (nextPct: number) => void;
  onFocusModeChange?: (focused: boolean) => void;
  onOpenControls?: () => void;
  onAnnounce: (text: string) => void;
  onComplete: (result: PlaythroughResult) => void;
}): ReactNode {
  const ctrl = usePlaythroughController({
    passage,
    bpm,
    autoFocusOnPlay,
    practiceMode,
    handMode,
    tempoScalePct,
    autoTempoRamp,
    loopLeadIn,
    accompanimentVolume,
    loopRange,
    micStatus,
    ...(subscribeMicNoteOn ? { subscribeMicNoteOn } : {}),
    ...(onTempoScaleChange ? { onTempoScaleChange } : {}),
    ...(onFocusModeChange ? { onFocusModeChange } : {}),
    onAnnounce,
    onComplete,
  });

  const targetMidis = getActiveSlotTargetMidis(ctrl.session, ctrl.activeMeasure);
  const awaitedSlot = practiceMode === "wait" ? getAwaitedBeatSlot(ctrl.session) : null;
  const accuracyLabel =
    ctrl.session.attempts > 0
      ? `${Math.round((ctrl.session.hits / ctrl.session.attempts) * 100)}% (${ctrl.session.hits}/${ctrl.session.attempts})`
      : "Ready";

  return (
    <div className="flex flex-col gap-3">
      <PlayThroughTransportBar
        bpm={bpm}
        isCountIn={ctrl.isCountIn}
        activeMeasure={ctrl.activeMeasure}
        totalMeasures={passage.measures.length}
        accuracyLabel={accuracyLabel}
        playing={ctrl.playing}
        focusMode={focusMode}
        practiceMode={practiceMode}
        handMode={handMode}
        loopRange={loopRange}
        tempoScalePct={tempoScalePct}
        autoTempoRamp={autoTempoRamp}
        lastTiming={ctrl.lastTiming}
        micStatus={micStatus}
        micLevel={micLevel}
        onTogglePlay={ctrl.togglePlay}
        onFinish={ctrl.finishCurrent}
        {...(onToggleMic ? { onToggleMic } : {})}
        {...(onOpenControls ? { onOpenControls } : {})}
        {...(onFocusModeChange ? { onExitFocus: () => onFocusModeChange(false) } : {})}
      />

      <GrandStaff
        title={passage.title}
        composer={passage.composer}
        keySignature={passage.keySignature}
        timeSignature={passage.timeSignature}
        measures={passage.measures}
        mode={practiceMode === "flow" && lookAheadMasking ? "look-ahead" : "standard"}
        activeMeasure={ctrl.activeMeasure}
        activeBeat={ctrl.activeBeat}
        playing={ctrl.playing && practiceMode === "flow"}
        getClock={getTransportClock}
        countInBars={resolveCountInBars(loopRange, loopLeadIn)}
        finalePulseKey={ctrl.finalePulseKey}
        showIntervalShapes={showIntervalsOverlay}
        showRomanNumerals={showRomanNumerals}
        notationScaffold={notationScaffold}
        handMode={handMode}
        {...(awaitedSlot
          ? { awaitedBeat: { barNumber: awaitedSlot.barNumber, beatStart: awaitedSlot.beatStart } }
          : {})}
        {...(loopRange ? { loopRange } : {})}
        onSelectMeasure={ctrl.setActiveMeasure}
      />

      <TactileKeyboard
        startOctave={3}
        octaveShift={ctrl.octaveShift}
        onOctaveShiftChange={ctrl.setOctaveShift}
        pressedNotes={ctrl.pressedNotes}
        targetNotes={[...targetMidis]}
        correctNotes={ctrl.correctNotes}
        wrongNotes={ctrl.wrongNotes}
        blindVeil={blindKeyboard}
        showQwertyHints={showQwertyHints}
        qwertyBaseOctave={Math.max(1, Math.min(5, 4 + ctrl.octaveShift))}
        enableWebMidi
        onNoteOn={ctrl.handleNoteOn}
        onNoteOff={ctrl.handleNoteOff}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Fix Bar — Real 1-Clean-Pass Beat-Ordered Validator
// ---------------------------------------------------------------------------

function WeakestBarStepView({
  passage,
  weakestBarNumber,
  slowBpm,
  blindKeyboard,
  showQwertyHints,
  handMode,
  notationScaffold,
  micStatus,
  subscribeMicNoteOn,
  onAnnounce,
  onContinue,
}: {
  passage: ScorePassage;
  weakestBarNumber: number;
  slowBpm: number;
  blindKeyboard: boolean;
  showQwertyHints: boolean;
  handMode: HandPracticeMode;
  notationScaffold: NotationScaffold;
  micStatus: MicListenerStatus;
  subscribeMicNoteOn?: (listener: (midi: number, velocity: number) => void) => () => void;
  onAnnounce: (text: string) => void;
  onContinue: () => void;
}): ReactNode {
  const targetMeasure =
    passage.measures.find((m) => m.number === weakestBarNumber) ?? passage.measures[0];
  const [pressedNotes, setPressedNotes] = useState<number[]>([]);
  const [correctNotes, setCorrectNotes] = useState<number[]>([]);
  const [wrongNotes, setWrongNotes] = useState<number[]>([]);
  const [octaveShift, setOctaveShift] = useState(0);
  const [tracker, setTracker] = useState<CleanPassTracker>(() =>
    targetMeasure
      ? createCleanPassTracker(targetMeasure, handMode)
      : {
          measureNumber: weakestBarNumber,
          slots: [],
          slotCursor: 0,
          cleanPassComplete: true,
          resetCount: 0,
          totalHits: 0,
        },
  );
  const trackerRef = useRef(tracker);
  const micListening = micStatus === "listening";

  useEffect(() => {
    trackerRef.current = tracker;
  }, [tracker]);

  function handleNoteOn(midi: number, velocity: number, fromMic = false): void {
    if (!fromMic && !micListening) {
      playPianoNote({ midi, velocity });
    }
    setPressedNotes((prev) => (prev.includes(midi) ? prev : [...prev, midi]));
    if (fromMic) {
      setTimeout(() => setPressedNotes(removeMidiNote(midi)), 220);
    }
    const outcome = recordCleanPassNote(trackerRef.current, midi);
    trackerRef.current = outcome.tracker;
    setTracker(outcome.tracker);

    if (outcome.hit) {
      setWrongNotes([]);
      setCorrectNotes([midi]);
      setTimeout(() => setCorrectNotes(removeMidiNote(midi)), 180);
      if (outcome.cleanPassComplete) {
        playMusicSfx("correctInterval");
        onAnnounce(`Clean pass complete on Measure ${weakestBarNumber}!`);
      }
    } else {
      playMusicSfx("gentleMiss");
      setWrongNotes([midi]);
      setTimeout(() => setWrongNotes(removeMidiNote(midi)), 220);
      onAnnounce("Missed note — starting a fresh clean pass of this bar.");
    }
  }

  function handleNoteOff(midi: number): void {
    releasePianoNote(midi);
    setPressedNotes((prev) => prev.filter((n) => n !== midi));
  }

  const micNoteHandlerRef = useRef<(midi: number, velocity: number) => void>(() => undefined);
  useEffect(() => {
    micNoteHandlerRef.current = (midi, velocity) => {
      handleNoteOn(midi, velocity, true);
    };
  });

  useEffect(() => {
    if (!subscribeMicNoteOn) return;
    return subscribeMicNoteOn((midi, velocity) => {
      micNoteHandlerRef.current(midi, velocity);
    });
  }, [subscribeMicNoteOn]);

  useMusicInputMap({
    enabled: true,
    baseOctave: Math.max(1, Math.min(5, 4 + octaveShift)),
    mode: "piano",
    onNoteOn: handleNoteOn,
    onNoteOff: handleNoteOff,
    onOctaveShift: (delta) => setOctaveShift((prev) => Math.max(-2, Math.min(2, prev + delta))),
  });

  const currentExpected = tracker.slots[tracker.slotCursor]?.midis ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-500/25 bg-rose-500/8 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-midnight-ink">
            Measure {weakestBarNumber} · 1 Clean Pass
          </span>
          <span
            className={
              tracker.cleanPassComplete
                ? "rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-mono font-semibold text-emerald-700 dark:text-emerald-300"
                : "rounded-full bg-canvas-white px-2.5 py-0.5 font-mono text-muted-ash"
            }
          >
            {tracker.cleanPassComplete
              ? "Clean Pass ✓"
              : `${tracker.slotCursor}/${tracker.slots.length} beats clean`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => playMeasureReference(passage, weakestBarNumber, slowBpm)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-intelligence-blue/30 bg-canvas-white px-3 py-1.5 font-medium text-intelligence-blue text-xs transition-colors hover:bg-whisper-gray"
        >
          <Volume2 className="size-3.5" aria-hidden="true" />
          Hear Bar ({slowBpm} BPM)
        </button>
      </div>

      {targetMeasure ? (
        <GrandStaff
          title={`${passage.title} — Bar ${targetMeasure.number}`}
          keySignature={passage.keySignature}
          timeSignature={passage.timeSignature}
          measures={[targetMeasure]}
          mode="standard"
          showIntervalShapes
          showRomanNumerals
          showFingerings
          notationScaffold={notationScaffold}
          handMode={handMode}
        />
      ) : null}

      <TactileKeyboard
        startOctave={3}
        octaveShift={octaveShift}
        onOctaveShiftChange={setOctaveShift}
        pressedNotes={pressedNotes}
        targetNotes={[...currentExpected]}
        correctNotes={correctNotes}
        wrongNotes={wrongNotes}
        blindVeil={blindKeyboard}
        showQwertyHints={showQwertyHints}
        qwertyBaseOctave={Math.max(1, Math.min(5, 4 + octaveShift))}
        enableWebMidi
        onNoteOn={handleNoteOn}
        onNoteOff={handleNoteOff}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-intelligence-blue px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-intelligence-blue/90"
        >
          {tracker.cleanPassComplete ? "Next: Recital" : "Skip to Recital"}
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5: Recital Playback, Personal Best & Auto-Suggested FSRS Rating
// ---------------------------------------------------------------------------

function RecitalStepView({
  passage,
  result,
  fallbackAccuracy,
  fallbackWeakestBar,
  bestTake,
  onAnnounce,
  onRate,
  onNextPassage,
}: {
  passage: ScorePassage;
  result: PlaythroughResult | null;
  fallbackAccuracy: number;
  fallbackWeakestBar: number;
  bestTake?: RecitalTake;
  onAnnounce: (text: string) => void;
  onRate: (result: RitualRatingResult) => void;
  onNextPassage?: () => void;
}): ReactNode {
  const accuracy = result?.accuracy ?? fallbackAccuracy;
  const weakestBarNumber = result?.weakestBarNumber ?? fallbackWeakestBar;
  const suggestedRating: FSRSRating =
    result?.suggestedRating ?? resolveFallbackSuggestedRating(accuracy);
  const take = result?.take ?? bestTake;
  const isPersonalBest = result !== null && (!bestTake || result.accuracy >= bestTake.accuracy);

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
    <div className="flex flex-col gap-4 rounded-2xl border border-[#E5DEC9] bg-[#FAF6EE] p-4 sm:p-5 dark:border-[#2C2621] dark:bg-[#161311]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-mono text-[11px] text-muted-ash uppercase tracking-wider">
            Step 5 · Recital Playback
          </div>
          <h3 className="font-display text-midnight-ink text-xl dark:text-[#F5EFE4]">
            {passage.title}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPersonalBest ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              <Award className="size-3.5" aria-hidden="true" />
              Personal Best
            </span>
          ) : null}
          <span className="rounded-full bg-black/[0.06] px-3 py-1 font-mono text-midnight-ink text-xs dark:bg-white/[0.08] dark:text-[#EFE6D8]">
            {pct}% · Weakest m.{weakestBarNumber}
          </span>
        </div>
      </div>

      {/* Recital Take Playback (replayed via Web Audio piano synth, zero blobs) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-canvas-white/80 px-3.5 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="text-xs">
          <div className="font-semibold text-midnight-ink dark:text-[#F5EFE4]">
            {take && take.events.length > 0
              ? `Recorded Take · ${take.events.length} notes @ ${take.bpm} BPM`
              : "Complete a Play-Through to record your recital take"}
          </div>
          {bestTake ? (
            <div className="mt-0.5 text-muted-ash">
              Best saved take: {Math.round(bestTake.accuracy * 100)}% @ {bestTake.bpm} BPM
            </div>
          ) : null}
        </div>
        <button
          type="button"
          disabled={!take || take.events.length === 0}
          onClick={() => {
            if (!take) return;
            replayRecitalTake(take);
            onAnnounce("Replaying your recorded recital take.");
          }}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-intelligence-blue px-4 py-2 font-medium text-white text-xs transition-colors hover:bg-intelligence-blue/90 disabled:opacity-40"
        >
          <Headphones className="size-4" aria-hidden="true" />
          Listen to Take
        </button>
      </div>

      <div className={`rounded-xl border px-3.5 py-2.5 text-xs leading-5 ${flowBanner.tone}`}>
        {flowBanner.text}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-muted-ash text-xs">
          Suggested FSRS rating:{" "}
          <span className="font-semibold text-midnight-ink uppercase dark:text-[#F5EFE4]">
            {suggestedRating}
          </span>{" "}
          (tap to confirm or override)
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ratings.map((item) => {
            const isSuggested = item.rating === suggestedRating;
            return (
              <button
                key={item.rating}
                type="button"
                onClick={() => {
                  playMusicSfx(item.rating === "again" ? "gentleMiss" : "correctInterval");
                  onRate({
                    rating: item.rating,
                    accuracy,
                    weakestBarNumber,
                    ...(result?.take ? { take: result.take } : {}),
                  });
                  onNextPassage?.();
                }}
                className={[
                  "flex min-h-11 flex-col items-start rounded-xl border p-3 text-left transition-colors",
                  item.tone,
                  isSuggested ? "ring-2 ring-intelligence-blue ring-offset-1" : "",
                ].join(" ")}
              >
                <span className="flex w-full items-center justify-between font-semibold text-sm">
                  {item.label}
                  {isSuggested ? (
                    <span className="rounded bg-intelligence-blue px-1.5 py-0.5 font-mono text-[9px] text-white uppercase">
                      Auto
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 text-[11px] opacity-85">{item.hint}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main 5-Step Sight-Reading Ritual Container
// ---------------------------------------------------------------------------

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
    showQwertyHints,
    autoFocusOnPlay,
    focusMode,
    practiceMode,
    handMode,
    notationScaffold,
    tempoScalePct,
    autoTempoRamp,
    loopLeadIn,
    accompanimentVolume,
    loopRange,
    micStatus,
    micLevel,
    bestTake,
    onFocusModeChange,
    onOpenControls,
    onToggleMic,
    subscribeMicNoteOn,
    onTempoScaleChange,
    onStepChange,
    onRate,
    onNextPassage,
  }): ReactNode => {
    const [lastResult, setLastResult] = useState<PlaythroughResult | null>(null);
    const [liveAnnouncement, setLiveAnnouncement] = useState("");
    const weakestBar = lastResult?.weakestBarNumber ?? passage.previewNotes.hardestBarNumber;
    const effectiveBpm = Math.min(
      220,
      Math.max(30, Math.round((passage.tempoBpm + bpmOffset) * (tempoScalePct / 100))),
    );
    const slowBpm = Math.max(36, Math.round(effectiveBpm * 0.75));

    const nextPassageProps = onNextPassage ? { onNextPassage } : {};
    const bestTakeProps = bestTake ? { bestTake } : {};
    const focusCallbacks = {
      ...(onFocusModeChange ? { onFocusModeChange } : {}),
      ...(onOpenControls ? { onOpenControls } : {}),
    };
    const micSubProps = subscribeMicNoteOn ? { subscribeMicNoteOn } : {};
    const micAndTempoCallbacks = {
      ...(onToggleMic ? { onToggleMic } : {}),
      ...micSubProps,
      ...(onTempoScaleChange ? { onTempoScaleChange } : {}),
    };

    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-canvas-white p-3 shadow-card sm:p-4 dark:border-white/10">
        <output aria-live="polite" className="sr-only">
          {liveAnnouncement}
        </output>

        {/* 5 Concise Non-Truncating Step Tabs (Scan · Rhythm · Play · Fix Bar · Recital) */}
        <nav aria-label="5-Step Sight-Reading Ritual" className="grid grid-cols-5 gap-1">
          {FIVE_STEP_RITUAL.map((item) => {
            const isActive = item.step === step;
            return (
              <button
                key={item.step}
                type="button"
                aria-current={isActive ? "step" : undefined}
                onClick={() => onStepChange(item.step)}
                className={[
                  "flex min-h-11 flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-center transition-colors",
                  isActive
                    ? "border-intelligence-blue bg-intelligence-blue/10 text-midnight-ink"
                    : "border-black/8 bg-whisper-gray/60 text-muted-ash hover:text-midnight-ink dark:border-white/8",
                ].join(" ")}
              >
                <span className="font-mono text-[9px] uppercase opacity-75">{item.order}</span>
                <span className="whitespace-nowrap font-medium text-xs">{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>

        {step === "preview-30s" ? (
          <PreviewStepView
            passage={passage}
            showIntervalsOverlay={showIntervalsOverlay}
            showRomanNumerals={showRomanNumerals}
            notationScaffold={notationScaffold}
            handMode={handMode}
            onAnnounce={setLiveAnnouncement}
            onContinue={() => onStepChange("rhythm-isolate")}
          />
        ) : null}

        {step === "rhythm-isolate" ? (
          <RhythmStepView
            passage={passage}
            bpm={effectiveBpm}
            autoFocusOnPlay={autoFocusOnPlay}
            focusMode={focusMode}
            onAnnounce={setLiveAnnouncement}
            onContinue={() => onStepChange("look-ahead-play")}
            {...focusCallbacks}
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
            showQwertyHints={showQwertyHints}
            autoFocusOnPlay={autoFocusOnPlay}
            focusMode={focusMode}
            practiceMode={practiceMode}
            handMode={handMode}
            notationScaffold={notationScaffold}
            tempoScalePct={tempoScalePct}
            autoTempoRamp={autoTempoRamp}
            loopLeadIn={loopLeadIn}
            accompanimentVolume={accompanimentVolume}
            loopRange={loopRange}
            micStatus={micStatus}
            micLevel={micLevel}
            onAnnounce={setLiveAnnouncement}
            onComplete={(res) => {
              setLastResult(res);
              onStepChange("review-weakest-bar");
            }}
            {...focusCallbacks}
            {...micAndTempoCallbacks}
          />
        ) : null}

        {step === "review-weakest-bar" ? (
          <WeakestBarStepView
            key={`${passage.id}-bar-${weakestBar}-${handMode}`}
            passage={passage}
            weakestBarNumber={weakestBar}
            slowBpm={slowBpm}
            blindKeyboard={blindKeyboard}
            showQwertyHints={showQwertyHints}
            handMode={handMode}
            notationScaffold={notationScaffold}
            micStatus={micStatus}
            {...micSubProps}
            onAnnounce={setLiveAnnouncement}
            onContinue={() => onStepChange("fsrs-rate")}
          />
        ) : null}

        {step === "fsrs-rate" ? (
          <RecitalStepView
            passage={passage}
            result={lastResult}
            fallbackAccuracy={0.86}
            fallbackWeakestBar={weakestBar}
            {...bestTakeProps}
            onAnnounce={setLiveAnnouncement}
            onRate={onRate}
            {...nextPassageProps}
          />
        ) : null}
      </section>
    );
  },
);
