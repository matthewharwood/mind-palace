import { CheckCircle2, Clock, Flame, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import * as z from "zod";

import { playMusicSfx } from "~/audio/music-mode";
import { defineComponent } from "~/lib/define-component";
import { CURRICULUM_DAYS, getDayPlan } from "~/lib/music-mode/curriculum";
import type { CurriculumPhase, DailySprint } from "~/lib/music-mode/schemas";

export const DayRoadmapDrawerPropsSchema = z.object({
  currentDay: z.int().min(1).max(30),
  activeSprintIndex: z.int().min(0).max(7),
  completedSprintsByDay: z.record(z.string(), z.array(z.int().min(0).max(7))),
  streakDays: z.int().min(0),
  totalMinutesPracticed: z.int().min(0),
  habitIdentityCue: z.string().min(1),
  onSelectDay: z.custom<(day: number) => void>(),
  onSelectSprint: z.custom<(sprintIndex: number) => void>(),
  onCompleteSprint: z.custom<(day: number, sprintIndex: number, minutes: number) => void>(),
});

const PHASE_META: Record<CurriculumPhase, { label: string; range: string; tone: string }> = {
  foundations: {
    label: "Foundations",
    range: "Days 1–7",
    tone: "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/25",
  },
  "keys-and-chorales": {
    label: "Keys & Chorales",
    range: "Days 8–14",
    tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  },
  "romantic-fluency": {
    label: "Romantic Fluency",
    range: "Days 15–22",
    tone: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
  },
  "chopin-mastery": {
    label: "Chopin Mastery",
    range: "Days 23–30",
    tone: "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/25",
  },
};

function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function sprintBadgeClass(isDone: boolean, isSelected: boolean): string {
  if (isDone) return "bg-emerald-500 text-white";
  if (isSelected) return "bg-intelligence-blue text-white";
  return "bg-whisper-gray text-muted-ash";
}

function dayPillClass(isSelected: boolean, completedCount: number): string {
  if (isSelected) {
    return "border-intelligence-blue bg-intelligence-blue text-white font-semibold";
  }
  if (completedCount >= 8) {
    return "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
  }
  if (completedCount > 0) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200";
  }
  return "border-black/10 bg-whisper-gray text-muted-ash hover:text-midnight-ink dark:border-white/10";
}

function SprintPomodoroCard({
  day,
  sprint,
  completed,
  onCompleteSprint,
}: {
  day: number;
  sprint: DailySprint;
  completed: boolean;
  onCompleteSprint: (day: number, sprintIndex: number, minutes: number) => void;
}): ReactNode {
  const targetSeconds = sprint.focusMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(targetSeconds);
  const [running, setRunning] = useState(false);
  const secondsLeftRef = useRef(targetSeconds);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const next = Math.max(0, secondsLeftRef.current - 1);
      secondsLeftRef.current = next;
      setSecondsLeft(next);
      if (next === 0) {
        clearInterval(id);
        setRunning(false);
        playMusicSfx("streakMilestone");
        onCompleteSprint(day, sprint.index, sprint.focusMinutes);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [running, day, sprint.index, sprint.focusMinutes, onCompleteSprint]);

  return (
    <div className="rounded-xl border border-black/10 bg-whisper-gray/70 p-3 dark:border-white/10">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[11px] text-muted-ash uppercase tracking-wider">
            Sprint {sprint.index + 1}/8 · Hour {sprint.hour}
          </div>
          <div className="truncate font-semibold text-midnight-ink text-sm">{sprint.title}</div>
        </div>
        <div className="font-mono font-semibold text-lg text-midnight-ink tabular-nums">
          {formatClock(secondsLeft)}
        </div>
      </div>
      <p className="mt-1.5 text-muted-ash text-xs leading-5">{sprint.habitCue}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setRunning((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-intelligence-blue px-3 py-1.5 font-medium text-white text-xs transition-colors hover:bg-intelligence-blue/90"
        >
          {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          {running ? "Pause" : "Start 25m Sprint"}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            secondsLeftRef.current = targetSeconds;
            setSecondsLeft(targetSeconds);
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-canvas-white px-2.5 py-1.5 text-muted-ash text-xs transition-colors hover:text-midnight-ink dark:border-white/10"
        >
          <RotateCcw className="size-3.5" />
          Reset
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            playMusicSfx("streakMilestone");
            onCompleteSprint(day, sprint.index, sprint.focusMinutes);
          }}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/12 px-2.5 py-1.5 font-medium text-emerald-700 text-xs transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
        >
          <CheckCircle2 className="size-3.5" />
          {completed ? "Logged" : "Mark Done"}
        </button>
      </div>
    </div>
  );
}

export const DayRoadmapDrawer = defineComponent(
  DayRoadmapDrawerPropsSchema,
  ({
    currentDay,
    activeSprintIndex,
    completedSprintsByDay,
    streakDays,
    totalMinutesPracticed,
    habitIdentityCue,
    onSelectDay,
    onSelectSprint,
    onCompleteSprint,
  }): ReactNode => {
    const plan = getDayPlan(currentDay);
    const phaseMeta = PHASE_META[plan.phase];
    const completedToday = new Set(completedSprintsByDay[String(currentDay)] ?? []);
    const activeSprint = plan.sprints[activeSprintIndex] ?? plan.sprints[0];
    const totalHours = (totalMinutesPracticed / 60).toFixed(1);

    return (
      <section className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-canvas-white p-4 shadow-card dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${phaseMeta.tone}`}
            >
              {phaseMeta.label} · {phaseMeta.range}
            </span>
            <h2 className="mt-1 font-semibold text-base text-midnight-ink">
              Day {plan.day}: {plan.title}
            </h2>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2.5 py-1 text-amber-700 dark:text-amber-300">
              <Flame className="size-3.5" aria-hidden="true" />
              {streakDays}d streak
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-whisper-gray px-2.5 py-1 text-muted-ash">
              <Clock className="size-3.5" aria-hidden="true" />
              {totalHours}h / 120h
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-intelligence-blue/20 bg-intelligence-blue/6 px-3 py-2 text-xs">
          <Sparkles
            className="mt-0.5 size-3.5 shrink-0 text-intelligence-blue"
            aria-hidden="true"
          />
          <p className="text-midnight-ink leading-5">
            <span className="font-medium">Identity cue:</span> {habitIdentityCue}
          </p>
        </div>

        {activeSprint ? (
          <SprintPomodoroCard
            key={`${currentDay}-${activeSprint.index}`}
            day={currentDay}
            sprint={activeSprint}
            completed={completedToday.has(activeSprint.index)}
            onCompleteSprint={onCompleteSprint}
          />
        ) : null}

        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-midnight-ink">Today&apos;s 8 × 25m Sprints (4h)</span>
            <span className="font-mono text-muted-ash">{completedToday.size}/8 complete</span>
          </div>
          <div className="grid gap-1.5">
            {plan.sprints.map((sprint) => {
              const isSelected = sprint.index === activeSprintIndex;
              const isDone = completedToday.has(sprint.index);
              return (
                <button
                  key={sprint.index}
                  type="button"
                  onClick={() => onSelectSprint(sprint.index)}
                  className={[
                    "flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                    isSelected
                      ? "border-intelligence-blue bg-intelligence-blue/8 text-midnight-ink"
                      : "border-black/8 bg-canvas-white text-muted-ash hover:bg-whisper-gray hover:text-midnight-ink dark:border-white/8",
                  ].join(" ")}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-full font-mono text-[10px] ${sprintBadgeClass(isDone, isSelected)}`}
                    >
                      {isDone ? "✓" : sprint.index + 1}
                    </span>
                    <span className="truncate font-medium text-midnight-ink">{sprint.title}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-ash">
                    {sprint.focusMinutes}m/{sprint.breakMinutes}m
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-midnight-ink">30-Day Ultralearning Roadmap</span>
            <span className="font-mono text-[11px] text-muted-ash">
              Target {plan.targetBpmRange[0]}–{plan.targetBpmRange[1]} BPM
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1 sm:grid-cols-10">
            {CURRICULUM_DAYS.map((item) => {
              const doneCount = completedSprintsByDay[String(item.day)]?.length ?? 0;
              return (
                <button
                  key={item.day}
                  type="button"
                  onClick={() => onSelectDay(item.day)}
                  aria-label={`Day ${item.day}: ${item.title}`}
                  className={`rounded-lg border py-1.5 font-mono text-xs transition-colors ${dayPillClass(item.day === currentDay, doneCount)}`}
                >
                  {item.day}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-muted-ash text-xs">
            <span className="font-medium text-midnight-ink">Milestone:</span> {plan.milestone}
          </p>
        </div>
      </section>
    );
  },
);
