import { Activity, Flame, RotateCcw } from "lucide-react";
import { type PointerEvent, type ReactNode, useRef, useState } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import {
  classifyTimingOffset,
  PolyrhythmRatioSchema,
  type TimingHit,
  TimingHitSchema,
  type TimingRating,
} from "./types";

export const RhythmPadModeSchema = z.enum(["single", "split-hands"]);
export type RhythmPadMode = z.infer<typeof RhythmPadModeSchema>;

export const RhythmPadPropsSchema = z.object({
  mode: RhythmPadModeSchema.optional(),
  /** Tempo in beats per minute (30-220). Defaults to 72. */
  bpm: z.int().min(30).max(220).optional(),
  /** Beats per measure in single mode (e.g. 3, 4, 6). Defaults to 4. */
  beatsPerMeasure: z.int().min(1).max(12).optional(),
  /** Chopin polyrhythm ratio for split-hands mode ("2:3" or "3:4"). */
  polyrhythm: PolyrhythmRatioSchema.optional(),
  /** 0-indexed active beat/subdivision pulse for the beat-grid visualizer. */
  activeSlot: z.int().min(0).optional(),
  /** Optional controlled latest hit for Storybook or engine-driven playback. */
  lastHit: TimingHitSchema.optional(),
  /** Optional controlled hit history for accuracy % and beat-grid stamps. */
  recentHits: z.array(TimingHitSchema).optional(),
  /** Optional reference timestamp (ms) of the current measure start for exact offset computation. */
  measureStartMs: z.number().optional(),
  onTap: z.custom<(hit: TimingHit) => void>().optional(),
  onReset: z.custom<() => void>().optional(),
});
export type RhythmPadProps = z.infer<typeof RhythmPadPropsSchema>;

const RATING_LABELS: Record<TimingRating, string> = {
  "on-beat": "On-Beat",
  "slightly-early": "Slightly Early",
  "slightly-late": "Slightly Late",
  early: "Early",
  late: "Late",
};

function ratingBadgeClass(rating: TimingRating): string {
  if (rating === "on-beat") {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  }
  if (rating === "slightly-early" || rating === "slightly-late") {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  }
  return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
}

function ratingDotClass(rating: TimingRating): string {
  if (rating === "on-beat") return "bg-emerald-500";
  if (rating === "slightly-early" || rating === "slightly-late") return "bg-amber-500";
  return "bg-rose-500";
}

function polyrhythmSlotClass(isPulse: boolean, isActive: boolean, hand: "RH" | "LH"): string {
  if (!isPulse) return "border-transparent bg-black/[0.03] dark:bg-white/[0.04]";
  if (hand === "RH") {
    return isActive
      ? "border-intelligence-blue bg-intelligence-blue text-white font-bold"
      : "border-intelligence-blue/35 bg-intelligence-blue/12 text-intelligence-blue font-semibold";
  }
  return isActive
    ? "border-emerald-600 bg-emerald-600 text-white font-bold"
    : "border-emerald-600/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 font-semibold";
}

function singleBeatSlotClass(isActive: boolean, beatIdx: number): string {
  if (isActive) return "border-intelligence-blue bg-intelligence-blue text-white";
  if (beatIdx === 0) {
    return "border-black/15 bg-canvas-white text-midnight-ink dark:border-white/15";
  }
  return "border-black/8 bg-canvas-white/70 text-muted-ash dark:border-white/8";
}

type TapHand = "LH" | "RH" | "single";

function resolvePulseCount(
  hand: TapHand,
  lhCount: number,
  rhCount: number,
  beatsPerMeasure: number,
): number {
  if (hand === "LH") return lhCount;
  if (hand === "RH") return rhCount;
  return beatsPerMeasure;
}

function getPolyrhythmCounts(
  polyrhythm: "none" | "2:3" | "3:4",
  beatsPerMeasure: number,
): {
  lhCount: number;
  rhCount: number;
  lcm: number;
  mnemonic: string;
} {
  if (polyrhythm === "2:3") {
    return { lhCount: 2, rhCount: 3, lcm: 6, mnemonic: "Nice cup of tea (Together · R · L · R)" };
  }
  if (polyrhythm === "3:4") {
    return {
      lhCount: 3,
      rhCount: 4,
      lcm: 12,
      mnemonic: "Pass the gold-en but-ter (Together · R · L · R · L · R)",
    };
  }
  return {
    lhCount: beatsPerMeasure,
    rhCount: beatsPerMeasure,
    lcm: beatsPerMeasure,
    mnemonic: `${beatsPerMeasure} even pulses per bar`,
  };
}

function computeTapOffset(
  nowMs: number,
  originMs: number,
  barDurationMs: number,
  pulseCount: number,
): { offsetMs: number; slotIndex: number } {
  const elapsed = Math.max(0, nowMs - originMs);
  const pulseMs = barDurationMs / Math.max(pulseCount, 1);
  const nearestPulse = Math.round(elapsed / pulseMs);
  const expectedMs = nearestPulse * pulseMs;
  const rawOffset = elapsed - expectedMs;
  const clampedOffset = Math.max(-150, Math.min(150, Math.round(rawOffset)));
  const slotIndex = ((nearestPulse % pulseCount) + pulseCount) % pulseCount;
  return { offsetMs: clampedOffset, slotIndex };
}

function computeAccuracyStats(hits: TimingHit[]): { accuracyPct: number; streak: number } {
  if (hits.length === 0) return { accuracyPct: 100, streak: 0 };
  let goodCount = 0;
  for (const h of hits) {
    if (h.rating === "on-beat" || h.rating === "slightly-early" || h.rating === "slightly-late") {
      goodCount += 1;
    }
  }
  let streak = 0;
  for (let i = hits.length - 1; i >= 0; i -= 1) {
    const h = hits[i];
    if (h && h.rating === "on-beat") {
      streak += 1;
    } else {
      break;
    }
  }
  return { accuracyPct: Math.round((goodCount / hits.length) * 100), streak };
}

export const RhythmPad = defineComponent(
  RhythmPadPropsSchema,
  ({
    mode = "single",
    bpm = 72,
    beatsPerMeasure = 4,
    polyrhythm = "none",
    activeSlot,
    lastHit: controlledLastHit,
    recentHits: controlledRecentHits,
    measureStartMs,
    onTap,
    onReset,
  }: RhythmPadProps): ReactNode => {
    const [internalHits, setInternalHits] = useState<TimingHit[]>([]);
    const [pressedHand, setPressedHand] = useState<"LH" | "RH" | "single" | null>(null);
    const localOriginRef = useRef<number | null>(null);
    const hitCounterRef = useRef(0);

    const effectiveSplit = mode === "split-hands" || polyrhythm !== "none";
    const { lhCount, rhCount, lcm, mnemonic } = getPolyrhythmCounts(polyrhythm, beatsPerMeasure);

    const hits = controlledRecentHits ?? internalHits;
    const latestHit = controlledLastHit ?? hits[hits.length - 1] ?? null;
    const { accuracyPct, streak } = computeAccuracyStats(hits);

    const barDurationMs = (60_000 / bpm) * (polyrhythm === "none" ? beatsPerMeasure : lhCount);

    const triggerTap = (hand: "LH" | "RH" | "single"): void => {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (measureStartMs === undefined && localOriginRef.current === null) {
        localOriginRef.current = now;
      }
      const origin = measureStartMs ?? localOriginRef.current ?? now;
      const pulseCount = resolvePulseCount(hand, lhCount, rhCount, beatsPerMeasure);
      const { offsetMs, slotIndex } = computeTapOffset(now, origin, barDurationMs, pulseCount);
      const rating = classifyTimingOffset(offsetMs);
      hitCounterRef.current += 1;

      const hit: TimingHit = {
        id: `tap-${hitCounterRef.current}-${slotIndex}`,
        hand,
        slotIndex,
        offsetMs,
        rating,
        timestampMs: now,
      };

      setInternalHits((prev) => [...prev.slice(-23), hit]);
      onTap?.(hit);
    };

    const handlePadPointerDown = (
      hand: "LH" | "RH" | "single",
      event: PointerEvent<HTMLButtonElement>,
    ): void => {
      event.preventDefault();
      setPressedHand(hand);
      triggerTap(hand);
    };

    const handlePadPointerUp = (): void => {
      setPressedHand(null);
    };

    const handleReset = (): void => {
      localOriginRef.current = null;
      setInternalHits([]);
      onReset?.();
    };

    // Map -120ms..+120ms to 0%..100% on the timing gauge
    const meterPercent = latestHit
      ? Math.max(4, Math.min(96, ((latestHit.offsetMs + 120) / 240) * 100))
      : 50;

    const lcmSlots = Array.from({ length: lcm }, (_, i) => i);
    const singleSlots = Array.from({ length: beatsPerMeasure }, (_, i) => i);

    return (
      <section
        aria-label="Rhythm tap pad and timing meter"
        className="w-full rounded-card border border-black/10 bg-canvas-white p-3 shadow-card sm:p-4 dark:border-white/10"
      >
        {/* Top Metrics Strip */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-midnight-ink">
              <Activity className="size-3.5 text-intelligence-blue" aria-hidden="true" />
              {bpm} BPM
            </span>
            {polyrhythm !== "none" && (
              <span className="rounded-full bg-intelligence-blue/12 px-2 py-0.5 font-mono text-[11px] font-bold text-intelligence-blue">
                {polyrhythm} Polyrhythm
              </span>
            )}
            <span className="rounded-full bg-light-taupe px-2 py-0.5 font-mono text-[11px] font-medium text-surface-charcoal">
              {accuracyPct}% steady
            </span>
            {streak > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <Flame className="size-3" aria-hidden="true" />
                {streak}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset rhythm session"
            className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-whisper-gray px-2 py-1 text-xs font-medium text-muted-ash transition-colors hover:bg-light-taupe hover:text-midnight-ink dark:border-white/10"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>

        {/* Live Timing-Accuracy Meter (Early / On-Beat / Late in ms) */}
        <div className="mb-3 rounded-xl border border-black/8 bg-whisper-gray p-2.5 dark:border-white/8">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="font-mono text-rose-600 dark:text-rose-400">EARLY</span>
            {latestHit ? (
              <span
                className={`rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold ${ratingBadgeClass(latestHit.rating)}`}
              >
                {latestHit.offsetMs > 0 ? `+${latestHit.offsetMs}` : latestHit.offsetMs} ms •{" "}
                {RATING_LABELS[latestHit.rating]}
              </span>
            ) : (
              <span className="font-mono text-muted-ash">Tap to measure timing</span>
            )}
            <span className="font-mono text-rose-600 dark:text-rose-400">LATE</span>
          </div>

          {/* Gauge Track */}
          <div
            role="img"
            aria-label={
              latestHit
                ? `Timing offset ${latestHit.offsetMs} milliseconds, ${RATING_LABELS[latestHit.rating]}`
                : "Timing offset meter, ready"
            }
            className="relative h-3 w-full overflow-hidden rounded-full bg-light-taupe"
          >
            {/* Slightly Early / Late amber band (±55ms -> 27%..73%) */}
            <div
              className="absolute inset-y-0 bg-amber-400/35"
              style={{ left: "27%", width: "46%" }}
            />
            {/* On-Beat emerald sweet spot (±25ms -> 39.5%..60.5%) */}
            <div
              className="absolute inset-y-0 bg-emerald-500/45"
              style={{ left: "39.5%", width: "21%" }}
            />
            {/* Exact 0ms center hairline */}
            <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-midnight-ink/40" />
            {/* Live needle */}
            <div
              className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas-white bg-midnight-ink shadow-sm transition-all duration-100"
              style={{ left: `${meterPercent}%` }}
            />
          </div>
        </div>

        {/* Beat-Grid Visualizer */}
        <div className="mb-3 rounded-xl border border-black/8 bg-whisper-gray p-2.5 dark:border-white/8">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-ash">
              Beat Grid
            </span>
            <span className="truncate text-[11px] text-muted-ash">{mnemonic}</span>
          </div>

          {effectiveSplit ? (
            <div className="space-y-1.5">
              {/* RH Row */}
              <div className="flex items-center gap-2">
                <span className="w-7 font-mono text-[10px] font-bold text-intelligence-blue">
                  RH {rhCount}
                </span>
                <div
                  className="grid flex-1 gap-1"
                  style={{ gridTemplateColumns: `repeat(${lcm}, minmax(0, 1fr))` }}
                >
                  {lcmSlots.map((slot) => {
                    const step = lcm / rhCount;
                    const isPulse = slot % step === 0;
                    const pulseIdx = Math.floor(slot / step);
                    const isActive = activeSlot === slot;
                    const lastSlotHit = hits
                      .slice()
                      .reverse()
                      .find((h) => h.hand === "RH" && h.slotIndex === pulseIdx);

                    return (
                      <div
                        key={`rh-sub-${slot}`}
                        className={`flex h-6 items-center justify-center rounded-md border font-mono text-[10px] transition-colors ${polyrhythmSlotClass(isPulse, isActive, "RH")}`}
                      >
                        {isPulse ? (
                          <span className="flex items-center gap-0.5">
                            {pulseIdx + 1}
                            {lastSlotHit && (
                              <span
                                className={`size-1.5 rounded-full ${ratingDotClass(lastSlotHit.rating)}`}
                              />
                            )}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LH Row */}
              <div className="flex items-center gap-2">
                <span className="w-7 font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  LH {lhCount}
                </span>
                <div
                  className="grid flex-1 gap-1"
                  style={{ gridTemplateColumns: `repeat(${lcm}, minmax(0, 1fr))` }}
                >
                  {lcmSlots.map((slot) => {
                    const step = lcm / lhCount;
                    const isPulse = slot % step === 0;
                    const pulseIdx = Math.floor(slot / step);
                    const isActive = activeSlot === slot;
                    const lastSlotHit = hits
                      .slice()
                      .reverse()
                      .find((h) => h.hand === "LH" && h.slotIndex === pulseIdx);

                    return (
                      <div
                        key={`lh-sub-${slot}`}
                        className={`flex h-6 items-center justify-center rounded-md border font-mono text-[10px] transition-colors ${polyrhythmSlotClass(isPulse, isActive, "LH")}`}
                      >
                        {isPulse ? (
                          <span className="flex items-center gap-0.5">
                            {pulseIdx + 1}
                            {lastSlotHit && (
                              <span
                                className={`size-1.5 rounded-full ${ratingDotClass(lastSlotHit.rating)}`}
                              />
                            )}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${beatsPerMeasure}, minmax(0, 1fr))` }}
            >
              {singleSlots.map((beatIdx) => {
                const isActive = activeSlot === beatIdx;
                const lastSlotHit = hits
                  .slice()
                  .reverse()
                  .find((h) => h.slotIndex === beatIdx);

                return (
                  <div
                    key={`beat-slot-${beatIdx}`}
                    className={`flex h-8 items-center justify-center gap-1.5 rounded-lg border font-mono text-xs font-semibold transition-colors ${singleBeatSlotClass(isActive, beatIdx)}`}
                  >
                    <span>{beatIdx + 1}</span>
                    {lastSlotHit && (
                      <span
                        className={`size-2 rounded-full ${ratingDotClass(lastSlotHit.rating)}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Thumb-Friendly Tap Pads */}
        {effectiveSplit ? (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              aria-label={`Left hand tap pad (${lhCount} pulses)`}
              onPointerDown={(e) => handlePadPointerDown("LH", e)}
              onPointerUp={handlePadPointerUp}
              onPointerCancel={handlePadPointerUp}
              style={{ touchAction: "manipulation" }}
              className={`flex min-h-[132px] select-none flex-col items-center justify-center rounded-2xl border-2 transition-transform duration-75 ${
                pressedHand === "LH"
                  ? "scale-[0.98] border-emerald-500 bg-emerald-500/20"
                  : "border-emerald-600/30 bg-emerald-500/8 hover:bg-emerald-500/12"
              }`}
            >
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Left Hand
              </span>
              <span className="mt-1 font-display text-3xl font-bold text-midnight-ink">
                {lhCount}
              </span>
              <span className="mt-1 text-xs text-muted-ash">Tap steady pulse</span>
            </button>

            <button
              type="button"
              aria-label={`Right hand tap pad (${rhCount} pulses)`}
              onPointerDown={(e) => handlePadPointerDown("RH", e)}
              onPointerUp={handlePadPointerUp}
              onPointerCancel={handlePadPointerUp}
              style={{ touchAction: "manipulation" }}
              className={`flex min-h-[132px] select-none flex-col items-center justify-center rounded-2xl border-2 transition-transform duration-75 ${
                pressedHand === "RH"
                  ? "scale-[0.98] border-intelligence-blue bg-intelligence-blue/20"
                  : "border-intelligence-blue/30 bg-intelligence-blue/8 hover:bg-intelligence-blue/12"
              }`}
            >
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-intelligence-blue">
                Right Hand
              </span>
              <span className="mt-1 font-display text-3xl font-bold text-midnight-ink">
                {rhCount}
              </span>
              <span className="mt-1 text-xs text-muted-ash">Tap cross-rhythm</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Tap rhythm pad"
            onPointerDown={(e) => handlePadPointerDown("single", e)}
            onPointerUp={handlePadPointerUp}
            onPointerCancel={handlePadPointerUp}
            style={{ touchAction: "manipulation" }}
            className={`flex min-h-[132px] w-full select-none flex-col items-center justify-center rounded-2xl border-2 transition-transform duration-75 ${
              pressedHand === "single"
                ? "scale-[0.99] border-intelligence-blue bg-intelligence-blue/18"
                : "border-black/12 bg-whisper-gray hover:bg-light-taupe dark:border-white/12"
            }`}
          >
            <span className="font-display text-2xl font-bold text-midnight-ink">Tap Rhythm</span>
            <span className="mt-1 text-xs text-muted-ash">
              Isolate rhythm cleanly before adding pitches
            </span>
          </button>
        )}
      </section>
    );
  },
);
