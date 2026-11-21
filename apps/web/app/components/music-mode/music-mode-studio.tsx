import {
  BookOpen,
  CalendarDays,
  Ear,
  Eye,
  EyeOff,
  Music2,
  Shuffle,
  SlidersHorizontal,
  Volume2,
  VolumeX,
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
import {
  type ExerciseKind,
  type KeySignatureId,
  type MusicModeState,
  MusicModeStateSchema,
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

export const MusicModeStudioPropsSchema = z.object({
  state: MusicModeStateSchema,
  onUpdateState: z.custom<(updater: (prev: MusicModeState) => MusicModeState) => void>(),
});

type StudioView = "ritual" | "drills" | "library" | "roadmap";

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
            className="rounded-lg border border-black/10 bg-whisper-gray px-2.5 py-1.5 text-midnight-ink text-xs dark:border-white/10"
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-intelligence-blue px-3 py-1.5 font-medium text-white text-xs transition-colors hover:bg-intelligence-blue/90"
          >
            <Shuffle className="size-3.5" />
            Generate Fresh Passage (Lv.{difficulty})
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TIER_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTier(item.id)}
            className={[
              "rounded-lg border px-2.5 py-1 font-medium text-xs transition-colors",
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
                "flex flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition-colors",
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

function StudioControlsCard({
  state,
  onUpdateState,
}: {
  state: MusicModeState;
  onUpdateState: (updater: (prev: MusicModeState) => MusicModeState) => void;
}): ReactNode {
  const { preferences } = state;
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-canvas-white p-4 shadow-card dark:border-white/10">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="size-4 text-intelligence-blue" aria-hidden="true" />
        <h3 className="font-semibold text-midnight-ink text-sm">Studio &amp; Tactile Controls</h3>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <button
          type="button"
          onClick={() =>
            onUpdateState((prev) => ({
              ...prev,
              preferences: { ...prev.preferences, blindKeyboard: !prev.preferences.blindKeyboard },
            }))
          }
          className={[
            "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 font-medium transition-colors",
            preferences.blindKeyboard
              ? "border-intelligence-blue bg-intelligence-blue/10 text-intelligence-blue"
              : "border-black/10 bg-whisper-gray text-muted-ash dark:border-white/10",
          ].join(" ")}
        >
          {preferences.blindKeyboard ? (
            <EyeOff className="size-3.5" />
          ) : (
            <Eye className="size-3.5" />
          )}
          {preferences.blindKeyboard ? "Blind Veil On" : "Labels Visible"}
        </button>

        <button
          type="button"
          onClick={() =>
            onUpdateState((prev) => ({
              ...prev,
              preferences: {
                ...prev.preferences,
                lookAheadMasking: !prev.preferences.lookAheadMasking,
              },
            }))
          }
          className={[
            "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 font-medium transition-colors",
            preferences.lookAheadMasking
              ? "border-intelligence-blue bg-intelligence-blue/10 text-intelligence-blue"
              : "border-black/10 bg-whisper-gray text-muted-ash dark:border-white/10",
          ].join(" ")}
        >
          Look-Ahead {preferences.lookAheadMasking ? "On" : "Off"}
        </button>

        <button
          type="button"
          onClick={() =>
            onUpdateState((prev) => ({
              ...prev,
              preferences: {
                ...prev.preferences,
                showRomanNumerals: !prev.preferences.showRomanNumerals,
              },
            }))
          }
          className={[
            "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 font-medium transition-colors",
            preferences.showRomanNumerals
              ? "border-intelligence-blue bg-intelligence-blue/10 text-intelligence-blue"
              : "border-black/10 bg-whisper-gray text-muted-ash dark:border-white/10",
          ].join(" ")}
        >
          Roman Numerals {preferences.showRomanNumerals ? "On" : "Off"}
        </button>

        <button
          type="button"
          onClick={() =>
            onUpdateState((prev) => ({
              ...prev,
              preferences: { ...prev.preferences, sustainPedal: !prev.preferences.sustainPedal },
            }))
          }
          className={[
            "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 font-medium transition-colors",
            preferences.sustainPedal
              ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
              : "border-black/10 bg-whisper-gray text-muted-ash dark:border-white/10",
          ].join(" ")}
        >
          Damper Pedal {preferences.sustainPedal ? "Down" : "Up"}
        </button>
      </div>

      <label className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-ash">Tempo Offset</span>
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
          className="flex-1 accent-intelligence-blue"
        />
        <span className="w-14 text-right font-mono text-midnight-ink">
          {preferences.metronomeBpmOffset >= 0 ? "+" : ""}
          {preferences.metronomeBpmOffset} BPM
        </span>
      </label>
    </section>
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

    function handleRitualRate(result: RitualRatingResult): void {
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
        return { ...updated, ritualStep: "preview-30s" };
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

    const navItems: ReadonlyArray<{ id: StudioView; label: string; icon: ReactNode }> = [
      { id: "ritual", label: "Sight-Read", icon: <Music2 className="size-4" /> },
      { id: "drills", label: "Ear & Drills", icon: <Ear className="size-4" /> },
      { id: "library", label: "Library", icon: <BookOpen className="size-4" /> },
      { id: "roadmap", label: "30-Day Plan", icon: <CalendarDays className="size-4" /> },
    ];

    const flowReasonProps = state.flowState?.lastAdjustmentReason
      ? { lastFlowReason: state.flowState.lastAdjustmentReason }
      : {};

    return (
      <div className="mx-auto flex min-h-full w-full max-w-[1360px] flex-col gap-4 bg-whisper-gray/40 px-3 pt-3 pb-24 sm:px-6 sm:py-5 lg:pb-8">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/10 bg-canvas-white/95 px-4 py-2.5 shadow-card backdrop-blur dark:border-white/10">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-midnight-ink text-xl sm:text-2xl">Music Mode</h1>
            <span className="hidden rounded-full bg-whisper-gray px-2.5 py-0.5 font-mono text-[11px] text-muted-ash sm:inline-flex">
              Day {state.currentDay}/30 · Sprint {state.activeSprintIndex + 1}/8 · Lv.
              {state.adaptiveDifficulty} · {Math.round(state.rollingAccuracy * 100)}% Flow
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="hidden items-center gap-1 sm:flex">
              {navItems.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium text-xs transition-colors",
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
              aria-label={state.preferences.muted ? "Unmute audio" : "Mute audio"}
              onClick={() =>
                onUpdateState((prev) => ({
                  ...prev,
                  preferences: { ...prev.preferences, muted: !prev.preferences.muted },
                }))
              }
              className="grid size-8 place-items-center rounded-lg border border-black/10 bg-whisper-gray text-midnight-ink transition-colors hover:bg-light-taupe dark:border-white/10"
            >
              {state.preferences.muted ? (
                <VolumeX className="size-4 text-rose-600" />
              ) : (
                <Volume2 className="size-4 text-intelligence-blue" />
              )}
            </button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-4">
            {view === "ritual" ? (
              <SightReadingRitual
                passage={activePassage}
                step={state.ritualStep}
                bpmOffset={state.preferences.metronomeBpmOffset}
                blindKeyboard={state.preferences.blindKeyboard}
                lookAheadMasking={state.preferences.lookAheadMasking}
                showIntervalsOverlay={state.preferences.showIntervalsOverlay}
                showRomanNumerals={state.preferences.showRomanNumerals}
                onStepChange={(nextStep) =>
                  onUpdateState((prev) => ({ ...prev, ritualStep: nextStep }))
                }
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

            {view === "roadmap" ? (
              <div className="lg:hidden">
                <DayRoadmapDrawer
                  currentDay={state.currentDay}
                  activeSprintIndex={state.activeSprintIndex}
                  completedSprintsByDay={state.completedSprintsByDay}
                  streakDays={state.streakDays}
                  totalMinutesPracticed={state.totalMinutesPracticed}
                  habitIdentityCue={state.preferences.habitIdentityCue}
                  onSelectDay={(day) =>
                    onUpdateState((prev) => ({ ...prev, currentDay: day, activeSprintIndex: 0 }))
                  }
                  onSelectSprint={(sprintIndex) =>
                    onUpdateState((prev) => ({ ...prev, activeSprintIndex: sprintIndex }))
                  }
                  onCompleteSprint={handleCompleteSprint}
                />
              </div>
            ) : null}
          </div>

          <aside className="hidden flex-col gap-4 lg:flex">
            <StudioControlsCard state={state} onUpdateState={onUpdateState} />
            <DayRoadmapDrawer
              currentDay={state.currentDay}
              activeSprintIndex={state.activeSprintIndex}
              completedSprintsByDay={state.completedSprintsByDay}
              streakDays={state.streakDays}
              totalMinutesPracticed={state.totalMinutesPracticed}
              habitIdentityCue={state.preferences.habitIdentityCue}
              onSelectDay={(day) =>
                onUpdateState((prev) => ({ ...prev, currentDay: day, activeSprintIndex: 0 }))
              }
              onSelectSprint={(sprintIndex) =>
                onUpdateState((prev) => ({ ...prev, activeSprintIndex: sprintIndex }))
              }
              onCompleteSprint={handleCompleteSprint}
            />
          </aside>
        </div>

        <nav
          aria-label="Music Mode mobile navigation"
          className="fixed right-3 bottom-3 left-3 z-30 grid grid-cols-4 gap-1 rounded-2xl border border-black/10 bg-canvas-white/95 p-1.5 shadow-card backdrop-blur lg:hidden dark:border-white/10"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={[
                "flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[11px] font-medium transition-colors",
                view === item.id
                  ? "bg-intelligence-blue text-white"
                  : "text-muted-ash hover:text-midnight-ink",
              ].join(" ")}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  },
);
