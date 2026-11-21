import {
  BookOpen,
  CalendarDays,
  Ear,
  Eye,
  EyeOff,
  HelpCircle,
  Music2,
  Shuffle,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import * as z from "zod";

import {
  installAudioUnlockListeners,
  setAudioPreferences,
  setSustainPedal,
} from "~/audio/music-mode";
import { defineComponent } from "~/lib/define-component";
import { getDayPlan } from "~/lib/music-mode/curriculum";
import {
  createAdaptiveFlowState,
  createFSRSCard,
  recordFlowAttempt,
  scheduleFSRSCard,
} from "~/lib/music-mode/fsrs";
import { pickBestRecitalTake } from "~/lib/music-mode/playthrough-sim";
import {
  type ExerciseKind,
  type KeySignatureId,
  type MusicModeState,
  MusicModeStateSchema,
  type PracticeCadence,
  type ScorePassage,
  type ScoreTier,
} from "~/lib/music-mode/schemas";
import {
  generateProceduralSightReadingPassage,
  getPassageById,
  getPassagesForDifficulty,
  SCORE_LIBRARY,
} from "~/lib/music-mode/scores";
import { CORE_24_KEY_IDS, getKeySignature } from "~/lib/music-mode/theory";
import { DayRoadmapDrawer } from "./day-roadmap-drawer";
import { type DrillResult, EarTrainingDrill } from "./ear-training-drill";
import { type RitualRatingResult, SightReadingRitual } from "./sight-reading-ritual";
import { QWERTY_SHORTCUT_LEGEND } from "./use-music-input-map";

export const MusicModeStudioPropsSchema = z.object({
  state: MusicModeStateSchema,
  onUpdateState: z.custom<(updater: (prev: MusicModeState) => MusicModeState) => void>(),
});

type StudioView = "ritual" | "drills" | "library";

const TIER_FILTERS: ReadonlyArray<{ id: ScoreTier | "all"; label: string }> = [
  { id: "all", label: "All Scores" },
  { id: "method-book", label: "Method Books" },
  { id: "hymnal-chorale", label: "Hymnals & Chorales" },
  { id: "classical-miniature", label: "Classical" },
  { id: "romantic-study", label: "Romantic" },
  { id: "chopin-excerpt", label: "Chopin" },
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function updateStreak(prev: MusicModeState): { streakDays: number; lastPracticeDate: string } {
  const today = todayIsoDate();
  if (prev.lastPracticeDate === today) {
    return { streakDays: Math.max(1, prev.streakDays), lastPracticeDate: today };
  }
  return { streakDays: prev.streakDays + 1, lastPracticeDate: today };
}

function applyFsrsAndFlowUpdate(
  prev: MusicModeState,
  params: {
    cardId: string;
    promptKey: string;
    category: "score-passage" | "interval" | "chord-quality";
    rating: "again" | "hard" | "good" | "easy";
    correct: boolean;
    accuracy: number;
    responseMs: number;
  },
): MusicModeState {
  const now = Date.now();
  const existing =
    prev.cards[params.cardId] ??
    createFSRSCard({
      id: params.cardId,
      category: params.category,
      promptKey: params.promptKey,
      difficultyLevel: prev.adaptiveDifficulty,
      nowMs: now,
    });
  const scheduled = scheduleFSRSCard(existing, params.rating, now, params.responseMs);
  const flowBase = prev.flowState ?? createAdaptiveFlowState(prev.adaptiveDifficulty);
  const nextFlow = recordFlowAttempt(flowBase, {
    timestamp: now,
    correct: params.correct,
    responseMs: params.responseMs,
  });
  const streak = updateStreak(prev);

  return {
    ...prev,
    adaptiveDifficulty: nextFlow.currentDifficulty,
    rollingAccuracy: nextFlow.rollingAccuracy,
    streakDays: streak.streakDays,
    lastPracticeDate: streak.lastPracticeDate,
    flowState: nextFlow,
    cards: { ...prev.cards, [params.cardId]: scheduled.card },
    reviewLogs: [scheduled.log, ...prev.reviewLogs].slice(0, 200),
  };
}

function ScoreLibraryBrowser({
  selectedPassageId,
  difficulty,
  onSelectPassage,
  onGenerateProcedural,
}: {
  selectedPassageId: string;
  difficulty: number;
  onSelectPassage: (passage: ScorePassage) => void;
  onGenerateProcedural: (keyId: KeySignatureId) => void;
}): ReactNode {
  const [tier, setTier] = useState<ScoreTier | "all">("all");
  const [selectedKey, setSelectedKey] = useState<KeySignatureId>("C-major");
  const filtered =
    tier === "all" ? SCORE_LIBRARY : SCORE_LIBRARY.filter((item) => item.tier === tier);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-canvas-white p-4 shadow-card sm:p-5 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-base text-midnight-ink">
            Repertoire &amp; 24-Key Sight-Reading Generator
          </h2>
          <p className="text-muted-ash text-xs">
            Method Books → 4-Part Hymnals → Classical → Romantic → Chopin Preludes, Waltzes,
            Nocturnes &amp; Mazurkas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Procedural key signature"
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value as KeySignatureId)}
            className="min-h-11 rounded-lg border border-black/10 bg-whisper-gray px-3 py-2 text-midnight-ink text-xs dark:border-white/10"
          >
            {CORE_24_KEY_IDS.map((keyId) => (
              <option key={keyId} value={keyId}>
                {getKeySignature(keyId).label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onGenerateProcedural(selectedKey)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-intelligence-blue px-3.5 py-2 font-medium text-white text-xs transition-colors hover:bg-intelligence-blue/90"
          >
            <Shuffle className="size-3.5" aria-hidden="true" />
            Generate Fresh Passage (Lv.{difficulty})
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TIER_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={tier === item.id}
            onClick={() => setTier(item.id)}
            className={[
              "min-h-11 rounded-lg border px-3 py-1.5 font-medium text-xs transition-colors",
              tier === item.id
                ? "border-intelligence-blue bg-intelligence-blue text-white"
                : "border-black/10 bg-whisper-gray text-muted-ash hover:text-midnight-ink dark:border-white/10",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {filtered.map((passage) => {
          const isSelected = passage.id === selectedPassageId;
          return (
            <button
              key={passage.id}
              type="button"
              onClick={() => onSelectPassage(passage)}
              className={[
                "flex min-h-11 flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition-colors",
                isSelected
                  ? "border-intelligence-blue bg-intelligence-blue/8"
                  : "border-black/10 bg-whisper-gray/60 hover:bg-whisper-gray dark:border-white/10",
              ].join(" ")}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-muted-ash uppercase">
                  {passage.tier.replace("-", " ")} · Lv.{passage.difficulty}
                </span>
                <span className="font-mono text-[11px] text-intelligence-blue">
                  {passage.keySignature.label}
                </span>
              </div>
              <h3 className="font-semibold text-midnight-ink text-sm">{passage.title}</h3>
              <p className="text-muted-ash text-xs">
                {passage.composer}
                {passage.opus ? ` · ${passage.opus}` : ""} · {passage.tempoBpm} BPM
                {passage.polyrhythm !== "none" ? ` · ${passage.polyrhythm}` : ""}
              </p>
              <p className="mt-1 line-clamp-2 text-muted-ash text-xs">{passage.harmonicSummary}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StudioControlsPopover({
  state,
  onUpdateState,
  onClose,
}: {
  state: MusicModeState;
  onUpdateState: (updater: (prev: MusicModeState) => MusicModeState) => void;
  onClose: () => void;
}): ReactNode {
  const { preferences } = state;

  const toggles: ReadonlyArray<{
    id: string;
    label: string;
    active: boolean;
    tone?: "emerald";
    icon?: ReactNode;
    onToggle: () => void;
  }> = [
    {
      id: "blind",
      label: preferences.blindKeyboard ? "Blind Veil On" : "Blind Veil Off",
      active: preferences.blindKeyboard,
      icon: preferences.blindKeyboard ? (
        <EyeOff className="size-3.5" aria-hidden="true" />
      ) : (
        <Eye className="size-3.5" aria-hidden="true" />
      ),
      onToggle: () =>
        onUpdateState((prev) => ({
          ...prev,
          preferences: { ...prev.preferences, blindKeyboard: !prev.preferences.blindKeyboard },
        })),
    },
    {
      id: "lookahead",
      label: `Look-Ahead ${preferences.lookAheadMasking ? "On" : "Off"}`,
      active: preferences.lookAheadMasking,
      onToggle: () =>
        onUpdateState((prev) => ({
          ...prev,
          preferences: {
            ...prev.preferences,
            lookAheadMasking: !prev.preferences.lookAheadMasking,
          },
        })),
    },
    {
      id: "roman",
      label: `Roman Numerals ${preferences.showRomanNumerals ? "On" : "Off"}`,
      active: preferences.showRomanNumerals,
      onToggle: () =>
        onUpdateState((prev) => ({
          ...prev,
          preferences: {
            ...prev.preferences,
            showRomanNumerals: !prev.preferences.showRomanNumerals,
          },
        })),
    },
    {
      id: "damper",
      label: `Damper ${preferences.sustainPedal ? "Down" : "Up"}`,
      active: preferences.sustainPedal,
      tone: "emerald",
      onToggle: () =>
        onUpdateState((prev) => ({
          ...prev,
          preferences: { ...prev.preferences, sustainPedal: !prev.preferences.sustainPedal },
        })),
    },
    {
      id: "autofocus",
      label: `Auto-Focus ${preferences.autoFocusOnPlay ? "On" : "Off"}`,
      active: preferences.autoFocusOnPlay,
      onToggle: () =>
        onUpdateState((prev) => ({
          ...prev,
          preferences: { ...prev.preferences, autoFocusOnPlay: !prev.preferences.autoFocusOnPlay },
        })),
    },
    {
      id: "qwerty",
      label: `QWERTY Hints ${preferences.showQwertyHints ? "On" : "Off"}`,
      active: preferences.showQwertyHints,
      onToggle: () =>
        onUpdateState((prev) => ({
          ...prev,
          preferences: { ...prev.preferences, showQwertyHints: !prev.preferences.showQwertyHints },
        })),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 sm:items-center">
      <button
        type="button"
        aria-label="Close Studio Controls"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <dialog
        open
        aria-label="Studio Controls"
        className="relative z-10 m-0 flex w-full max-w-md flex-col gap-3.5 rounded-2xl border border-black/10 bg-canvas-white p-4 text-midnight-ink shadow-card dark:border-white/10"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-intelligence-blue" aria-hidden="true" />
            <h2 className="font-semibold text-midnight-ink text-sm">
              Studio &amp; Instrument Controls
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close controls"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-lg border border-black/10 bg-whisper-gray text-midnight-ink transition-colors hover:bg-light-taupe dark:border-white/10"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <label className="flex flex-col gap-1.5 rounded-xl border border-black/8 bg-whisper-gray/60 p-3 text-xs dark:border-white/8">
          <span className="flex items-center justify-between">
            <span className="font-medium text-midnight-ink">Tempo Offset</span>
            <span className="font-mono text-midnight-ink">
              {preferences.metronomeBpmOffset >= 0 ? "+" : ""}
              {preferences.metronomeBpmOffset} BPM
            </span>
          </span>
          <input
            type="range"
            min={-40}
            max={40}
            step={4}
            value={preferences.metronomeBpmOffset}
            onChange={(e) => {
              const offset = Number(e.target.value);
              onUpdateState((prev) => ({
                ...prev,
                preferences: { ...prev.preferences, metronomeBpmOffset: offset },
              }));
            }}
            className="h-8 w-full accent-intelligence-blue"
          />
        </label>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {toggles.map((item) => {
            const activeClass =
              item.tone === "emerald"
                ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                : "border-intelligence-blue bg-intelligence-blue/10 text-intelligence-blue";
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.active}
                onClick={item.onToggle}
                className={[
                  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 font-medium transition-colors",
                  item.active
                    ? activeClass
                    : "border-black/10 bg-whisper-gray text-muted-ash dark:border-white/10",
                ].join(" ")}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </dialog>
    </div>
  );
}

function ShortcutLegendPopover({ onClose }: { onClose: () => void }): ReactNode {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3">
      <button
        type="button"
        aria-label="Close Keyboard Shortcuts"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <dialog
        open
        aria-label="Keyboard Shortcuts"
        className="relative z-10 m-0 flex w-full max-w-md flex-col gap-3 rounded-2xl border border-black/10 bg-canvas-white p-4 text-midnight-ink shadow-card dark:border-white/10"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-midnight-ink text-sm">Keyboard &amp; MIDI Shortcuts</h2>
          <button
            type="button"
            aria-label="Close shortcuts"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-lg border border-black/10 bg-whisper-gray text-midnight-ink transition-colors hover:bg-light-taupe dark:border-white/10"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="divide-y divide-black/8 text-xs dark:divide-white/8">
          {QWERTY_SHORTCUT_LEGEND.map((row) => (
            <div key={row.keys} className="flex items-center justify-between gap-3 py-2">
              <kbd className="rounded bg-whisper-gray px-2 py-1 font-mono text-[11px] text-midnight-ink">
                {row.keys}
              </kbd>
              <span className="text-right text-muted-ash">{row.action}</span>
            </div>
          ))}
        </div>
      </dialog>
    </div>
  );
}

export const MusicModeStudio = defineComponent(
  MusicModeStudioPropsSchema,
  ({ state, onUpdateState }): ReactNode => {
    const dayPlan = getDayPlan(state.currentDay);
    const activeSprint = dayPlan.sprints[state.activeSprintIndex] ?? dayPlan.sprints[0];
    const defaultPassage =
      (activeSprint?.targetPassages[0] ? getPassageById(activeSprint.targetPassages[0]) : null) ??
      SCORE_LIBRARY[0];

    const [view, setView] = useState<StudioView>("ritual");
    const [activePassage, setActivePassage] = useState<ScorePassage>(() => {
      if (!defaultPassage) throw new Error("SCORE_LIBRARY is empty");
      return defaultPassage;
    });
    const [drillKind, setDrillKind] = useState<ExerciseKind>("ear-interval");
    const [proceduralSeed, setProceduralSeed] = useState(1);
    const [focusMode, setFocusMode] = useState(false);
    const [controlsOpen, setControlsOpen] = useState(false);
    const [coachOpen, setCoachOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);

    useEffect(() => {
      return installAudioUnlockListeners();
    }, []);

    useEffect(() => {
      setAudioPreferences({
        muted: state.preferences.muted,
        masterVolume: state.preferences.volume,
      });
      setSustainPedal(state.preferences.sustainPedal);
    }, [state.preferences.muted, state.preferences.volume, state.preferences.sustainPedal]);

    useEffect(() => {
      if (!controlsOpen && !coachOpen && !shortcutsOpen) return;
      const handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        setControlsOpen(false);
        setCoachOpen(false);
        setShortcutsOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [controlsOpen, coachOpen, shortcutsOpen]);

    function handleRitualRate(result: RitualRatingResult): void {
      setFocusMode(false);
      onUpdateState((prev) => {
        const updated = applyFsrsAndFlowUpdate(prev, {
          cardId: `passage:${activePassage.id}`,
          promptKey: activePassage.id,
          category: "score-passage",
          rating: result.rating,
          correct: result.rating !== "again",
          accuracy: result.accuracy,
          responseMs: 2200,
        });
        const bestTakes = result.take
          ? {
              ...updated.bestTakes,
              [activePassage.id]: pickBestRecitalTake(
                updated.bestTakes[activePassage.id],
                result.take,
              ),
            }
          : updated.bestTakes;
        return { ...updated, bestTakes, ritualStep: "preview-30s" };
      });
    }

    function handleDrillResult(result: DrillResult): void {
      onUpdateState((prev) =>
        applyFsrsAndFlowUpdate(prev, {
          cardId: `drill:${result.promptKey}`,
          promptKey: result.promptKey,
          category: result.exerciseKind === "ear-chord" ? "chord-quality" : "interval",
          rating: result.rating,
          correct: result.correct,
          accuracy: result.correct ? 1 : 0,
          responseMs: result.responseMs,
        }),
      );
    }

    function handleCompleteSprint(day: number, sprintIndex: number, minutes: number): void {
      onUpdateState((prev) => {
        const key = String(day);
        const existing = prev.completedSprintsByDay[key] ?? [];
        const merged = existing.includes(sprintIndex) ? existing : [...existing, sprintIndex];
        const streak = updateStreak(prev);
        return {
          ...prev,
          streakDays: streak.streakDays,
          lastPracticeDate: streak.lastPracticeDate,
          totalMinutesPracticed: prev.totalMinutesPracticed + minutes,
          completedSprintsByDay: { ...prev.completedSprintsByDay, [key]: merged },
          activeSprintIndex: Math.min(7, sprintIndex + 1),
        };
      });
    }

    function handleUpdateCadence(nextCadence: PracticeCadence): void {
      onUpdateState((prev) => ({ ...prev, cadence: nextCadence }));
    }

    const navItems: ReadonlyArray<{ id: StudioView; label: string; icon: ReactNode }> = [
      { id: "ritual", label: "Sight-Read", icon: <Music2 className="size-4" aria-hidden="true" /> },
      { id: "drills", label: "Drills", icon: <Ear className="size-4" aria-hidden="true" /> },
      { id: "library", label: "Library", icon: <BookOpen className="size-4" aria-hidden="true" /> },
    ];

    const flowReasonProps = state.flowState?.lastAdjustmentReason
      ? { lastFlowReason: state.flowState.lastAdjustmentReason }
      : {};
    const bestTake = state.bestTakes[activePassage.id];
    const bestTakeProps = bestTake ? { bestTake } : {};

    return (
      <div
        className={[
          "mx-auto flex min-h-full w-full max-w-[1160px] flex-col gap-3 bg-whisper-gray px-3 pt-3 sm:px-5 sm:py-4",
          focusMode ? "pb-4" : "pb-28 lg:pb-8",
        ].join(" ")}
      >
        {/* Studio Header (hidden in Focus Mode so Score + Instrument claim >=75% viewport) */}
        {!focusMode ? (
          <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/10 bg-canvas-white/95 px-3 py-2 shadow-card backdrop-blur sm:px-4 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-midnight-ink text-xl sm:text-2xl">Music Mode</h1>
              <span className="hidden rounded-full bg-whisper-gray px-2.5 py-0.5 font-mono text-[11px] text-muted-ash md:inline-flex">
                Day {state.currentDay}/30 · Lv.{state.adaptiveDifficulty} ·{" "}
                {Math.round(state.rollingAccuracy * 100)}% Flow
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="hidden items-center gap-1 sm:flex">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={view === item.id}
                    onClick={() => setView(item.id)}
                    className={[
                      "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-xs transition-colors",
                      view === item.id
                        ? "bg-intelligence-blue text-white"
                        : "text-muted-ash hover:bg-whisper-gray hover:text-midnight-ink",
                    ].join(" ")}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                aria-label="Open Studio Controls"
                aria-expanded={controlsOpen}
                onClick={() => setControlsOpen(true)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-whisper-gray px-3 py-2 font-medium text-midnight-ink text-xs transition-colors hover:bg-light-taupe dark:border-white/10"
              >
                <SlidersHorizontal className="size-4 text-intelligence-blue" aria-hidden="true" />
                <span className="hidden sm:inline">Controls</span>
              </button>

              <button
                type="button"
                aria-label="Open 30-Day Coach Plan"
                aria-expanded={coachOpen}
                onClick={() => setCoachOpen(true)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-whisper-gray px-3 py-2 font-medium text-midnight-ink text-xs transition-colors hover:bg-light-taupe dark:border-white/10"
              >
                <CalendarDays className="size-4 text-intelligence-blue" aria-hidden="true" />
                <span className="hidden sm:inline">Plan</span>
              </button>

              <button
                type="button"
                aria-label="Keyboard shortcuts"
                onClick={() => setShortcutsOpen(true)}
                className="hidden size-11 items-center justify-center rounded-lg border border-black/10 bg-whisper-gray text-muted-ash transition-colors hover:bg-light-taupe hover:text-midnight-ink sm:inline-flex dark:border-white/10"
              >
                <HelpCircle className="size-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                aria-label={state.preferences.muted ? "Unmute audio" : "Mute audio"}
                aria-pressed={state.preferences.muted}
                onClick={() =>
                  onUpdateState((prev) => ({
                    ...prev,
                    preferences: { ...prev.preferences, muted: !prev.preferences.muted },
                  }))
                }
                className="grid size-11 place-items-center rounded-lg border border-black/10 bg-whisper-gray text-midnight-ink transition-colors hover:bg-light-taupe dark:border-white/10"
              >
                {state.preferences.muted ? (
                  <VolumeX className="size-4 text-rose-600" aria-hidden="true" />
                ) : (
                  <Volume2 className="size-4 text-intelligence-blue" aria-hidden="true" />
                )}
              </button>
            </div>
          </header>
        ) : null}

        {/* Full-Width Playfield (no permanent 360px Coach Rail) */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {view === "ritual" ? (
            <SightReadingRitual
              passage={activePassage}
              step={state.ritualStep}
              bpmOffset={state.preferences.metronomeBpmOffset}
              blindKeyboard={state.preferences.blindKeyboard}
              lookAheadMasking={state.preferences.lookAheadMasking}
              showIntervalsOverlay={state.preferences.showIntervalsOverlay}
              showRomanNumerals={state.preferences.showRomanNumerals}
              showQwertyHints={state.preferences.showQwertyHints}
              autoFocusOnPlay={state.preferences.autoFocusOnPlay}
              focusMode={focusMode}
              {...bestTakeProps}
              onFocusModeChange={setFocusMode}
              onOpenControls={() => setControlsOpen(true)}
              onStepChange={(nextStep) => {
                if (nextStep !== "look-ahead-play" && nextStep !== "rhythm-isolate") {
                  setFocusMode(false);
                }
                onUpdateState((prev) => ({ ...prev, ritualStep: nextStep }));
              }}
              onRate={handleRitualRate}
              onNextPassage={() => {
                const pool = getPassagesForDifficulty(state.adaptiveDifficulty);
                const candidates = pool.length > 0 ? pool : SCORE_LIBRARY;
                const idx = candidates.findIndex((p) => p.id === activePassage.id);
                const next = candidates[(idx + 1) % candidates.length];
                if (next) setActivePassage(next);
              }}
            />
          ) : null}

          {view === "drills" ? (
            <EarTrainingDrill
              exerciseKind={drillKind}
              difficulty={state.adaptiveDifficulty}
              blindKeyboard={state.preferences.blindKeyboard}
              showQwertyHints={state.preferences.showQwertyHints}
              {...flowReasonProps}
              onExerciseKindChange={setDrillKind}
              onDrillResult={handleDrillResult}
            />
          ) : null}

          {view === "library" ? (
            <ScoreLibraryBrowser
              selectedPassageId={activePassage.id}
              difficulty={state.adaptiveDifficulty}
              onSelectPassage={(passage) => {
                setActivePassage(passage);
                onUpdateState((prev) => ({ ...prev, ritualStep: "preview-30s" }));
                setView("ritual");
              }}
              onGenerateProcedural={(keyId) => {
                const fresh = generateProceduralSightReadingPassage({
                  keyId,
                  difficulty: state.adaptiveDifficulty,
                  bars: 4,
                  seed: proceduralSeed,
                });
                setProceduralSeed((prev) => prev + 1);
                setActivePassage(fresh);
                onUpdateState((prev) => ({ ...prev, ritualStep: "preview-30s" }));
                setView("ritual");
              }}
            />
          ) : null}
        </div>

        {/* Slide-Over Coach Drawer (collapsed by default on all viewports) */}
        {coachOpen ? (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/35">
            <button
              type="button"
              aria-label="Close 30-Day Plan drawer"
              onClick={() => setCoachOpen(false)}
              className="flex-1 cursor-default"
            />
            <dialog
              open
              aria-label="30-Day Practice Plan"
              className="m-0 flex h-full w-full max-w-md flex-col overflow-y-auto border-0 bg-whisper-gray p-3 text-midnight-ink shadow-card sm:p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="font-semibold text-midnight-ink text-sm">
                  Practice Coach &amp; Pacing
                </span>
                <button
                  type="button"
                  aria-label="Close coach drawer"
                  onClick={() => setCoachOpen(false)}
                  className="inline-flex size-11 items-center justify-center rounded-lg border border-black/10 bg-canvas-white text-midnight-ink transition-colors hover:bg-light-taupe dark:border-white/10"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <DayRoadmapDrawer
                currentDay={state.currentDay}
                activeSprintIndex={state.activeSprintIndex}
                completedSprintsByDay={state.completedSprintsByDay}
                streakDays={state.streakDays}
                totalMinutesPracticed={state.totalMinutesPracticed}
                habitIdentityCue={state.preferences.habitIdentityCue}
                cadence={state.cadence}
                onUpdateCadence={handleUpdateCadence}
                onSelectDay={(day) =>
                  onUpdateState((prev) => ({ ...prev, currentDay: day, activeSprintIndex: 0 }))
                }
                onSelectSprint={(sprintIndex) =>
                  onUpdateState((prev) => ({ ...prev, activeSprintIndex: sprintIndex }))
                }
                onCompleteSprint={handleCompleteSprint}
              />
            </dialog>
          </div>
        ) : null}

        {controlsOpen ? (
          <StudioControlsPopover
            state={state}
            onUpdateState={onUpdateState}
            onClose={() => setControlsOpen(false)}
          />
        ) : null}

        {shortcutsOpen ? <ShortcutLegendPopover onClose={() => setShortcutsOpen(false)} /> : null}

        {/* Mobile Bottom Dock (hidden in Focus Mode; safe bottom padding above prevents keyboard collision) */}
        {!focusMode ? (
          <nav
            aria-label="Music Mode mobile navigation"
            className="fixed right-3 bottom-3 left-3 z-30 grid grid-cols-4 gap-1 rounded-2xl border border-black/10 bg-canvas-white/95 p-1.5 shadow-card backdrop-blur sm:hidden dark:border-white/10"
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={view === item.id}
                onClick={() => setView(item.id)}
                className={[
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition-colors",
                  view === item.id
                    ? "bg-intelligence-blue text-white"
                    : "text-muted-ash hover:text-midnight-ink",
                ].join(" ")}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
            <button
              type="button"
              aria-expanded={coachOpen}
              onClick={() => setCoachOpen(true)}
              className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium text-muted-ash transition-colors hover:text-midnight-ink"
            >
              <CalendarDays className="size-4" aria-hidden="true" />
              <span>Plan</span>
            </button>
          </nav>
        ) : null}
      </div>
    );
  },
);
