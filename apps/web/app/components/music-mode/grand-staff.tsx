import { Music2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import * as z from "zod";

import type { TransportClockSnapshot } from "~/audio/music-mode";
import { defineComponent } from "~/lib/define-component";
import {
  type HandPracticeMode,
  HandPracticeModeSchema,
  MeasureLoopRangeSchema,
  type NotationScaffold,
  NotationScaffoldSchema,
} from "~/lib/music-mode/schemas";
import { useAnime } from "~/motion/use-anime";
import {
  BASS_FLAT_STEPS,
  BASS_SHARP_STEPS,
  beamCountForDuration,
  type Clef,
  getLedgerLineSteps,
  hasStemDuration,
  isDottedDuration,
  isHollowDuration,
  isLandmarkMidi,
  KeySignatureSchema,
  type NoteEventStatus,
  type Pitch,
  type PitchAccidental,
  type PitchLetter,
  pitchToStaffStep,
  type StaffMeasure,
  StaffMeasureSchema,
  type StaffNoteEvent,
  TimeSignatureSchema,
  TREBLE_FLAT_STEPS,
  TREBLE_SHARP_STEPS,
} from "./types";

export const GrandStaffModeSchema = z.enum([
  "standard",
  "look-ahead",
  "preview-30s",
  "rhythm-only",
]);

export const PreviewFocusSchema = z.enum(["all", "key", "time", "landmarks", "hardest-bar"]);
export type PreviewFocus = z.infer<typeof PreviewFocusSchema>;

export const GrandStaffPropsSchema = z.object({
  title: z.string().min(1).optional(),
  composer: z.string().min(1).optional(),
  hideHeader: z.boolean().optional(),
  keySignature: KeySignatureSchema,
  timeSignature: TimeSignatureSchema,
  measures: z.array(StaffMeasureSchema).min(1),
  mode: GrandStaffModeSchema.optional(),
  /** 1-indexed active measure number for playhead & Look-Ahead Mode. */
  activeMeasure: z.int().min(1).optional(),
  /** 0-indexed beat within activeMeasure for the playhead cursor. */
  activeBeat: z.number().min(0).optional(),
  /** When true + getClock provided, drives SVG playhead via rAF with zero per-frame React renders. */
  playing: z.boolean().optional(),
  getClock: z.custom<() => TransportClockSnapshot>().optional(),
  countInBars: z.int().min(0).max(4).optional(),
  /** Increment to trigger the Tonic Cadence Breath amber sweep. */
  cadencePulseKey: z.int().min(0).optional(),
  /** Increment to trigger the Unbroken Pass Finale gold shimmer. */
  finalePulseKey: z.int().min(0).optional(),
  /** Opacity (0..0.95) of the look-ahead mask over the current measure. */
  lookAheadMaskOpacity: z.number().min(0).max(0.95).optional(),
  /** Active spotlight focus during 30-Second Preview Mode. */
  previewFocus: PreviewFocusSchema.optional(),
  onPreviewFocusChange: z.custom<(focus: PreviewFocus) => void>().optional(),
  showRomanNumerals: z.boolean().optional(),
  showIntervalShapes: z.boolean().optional(),
  showFingerings: z.boolean().optional(),
  notationScaffold: NotationScaffoldSchema.optional(),
  handMode: HandPracticeModeSchema.optional(),
  awaitedBeat: z
    .object({
      barNumber: z.int().min(1),
      beatStart: z.number().min(0),
    })
    .optional(),
  loopRange: MeasureLoopRangeSchema.optional(),
  onSelectMeasure: z.custom<(measureNumber: number) => void>().optional(),
  onSelectEvent: z.custom<(event: StaffNoteEvent) => void>().optional(),
});
export type GrandStaffProps = z.infer<typeof GrandStaffPropsSchema>;

// ── Engraving geometry constants ──────────────────────────────────────────────
const LINE_SPACING = 10;
const STEP_Y = LINE_SPACING / 2;
const TREBLE_TOP_Y = 52;
const TREBLE_BOTTOM_Y = TREBLE_TOP_Y + LINE_SPACING * 4; // 92
const BASS_TOP_Y = 140;
const BASS_BOTTOM_Y = BASS_TOP_Y + LINE_SPACING * 4; // 180
const FULL_SVG_HEIGHT = 232;
const RHYTHM_SVG_HEIGHT = 152;
const RHYTHM_RH_Y = 56;
const RHYTHM_LH_Y = 104;

const LEFT_MARGIN = 22;
const CLEF_X = LEFT_MARGIN + 8;
const KEY_SIG_START_X = CLEF_X + 34;
const KEY_SIG_STEP_X = 11;
const TIME_SIG_WIDTH = 28;
const MEASURE_PAD_LEFT = 18;
const MEASURE_PAD_RIGHT = 14;
const MIN_MEASURE_WIDTH = 176;
const NOTE_RX = 5.6;
const NOTE_RY = 4.1;
const STEM_LENGTH = 31;

const STAFF_LINE_OFFSETS = [0, 1, 2, 3, 4] as const;
const SHARP_LETTERS: readonly PitchLetter[] = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_LETTERS: readonly PitchLetter[] = ["B", "E", "A", "D", "G", "C", "F"];

function stepToY(step: number, clef: Clef): number {
  if (clef === "treble") {
    return TREBLE_TOP_Y + (10 - step) * STEP_Y;
  }
  return BASS_TOP_Y + (-2 - step) * STEP_Y;
}

function keyImpliedAccidental(letter: PitchLetter, fifths: number): PitchAccidental {
  if (fifths > 0 && SHARP_LETTERS.slice(0, fifths).includes(letter)) return "#";
  if (fifths < 0 && FLAT_LETTERS.slice(0, Math.abs(fifths)).includes(letter)) return "b";
  return "";
}

type RenderedAccidental = "sharp" | "flat" | "natural" | "double-sharp" | "double-flat" | null;

function resolveDisplayedAccidental(pitch: Pitch, fifths: number): RenderedAccidental {
  const implied = keyImpliedAccidental(pitch.letter, fifths);
  if (pitch.accidental === implied) return null;
  if (pitch.accidental === "#") return "sharp";
  if (pitch.accidental === "b") return "flat";
  if (pitch.accidental === "##") return "double-sharp";
  if (pitch.accidental === "bb") return "double-flat";
  return "natural";
}

function statusFillClass(status?: NoteEventStatus): string {
  if (status === "active") return "fill-intelligence-blue text-intelligence-blue";
  if (status === "correct") {
    return "fill-emerald-600 dark:fill-emerald-400 text-emerald-600 dark:text-emerald-400";
  }
  if (status === "wrong") {
    return "fill-rose-600 dark:fill-rose-400 text-rose-600 dark:text-rose-400";
  }
  return "fill-current text-midnight-ink";
}

function statusStrokeClass(status?: NoteEventStatus): string {
  if (status === "active") return "stroke-intelligence-blue";
  if (status === "correct") return "stroke-emerald-600 dark:stroke-emerald-400";
  if (status === "wrong") return "stroke-rose-600 dark:stroke-rose-400";
  return "stroke-current";
}

const FINGER_RING_CLASSES: Readonly<Record<number, string>> = {
  1: "fill-emerald-500/18 stroke-emerald-600 dark:stroke-emerald-400",
  2: "fill-amber-500/18 stroke-amber-600 dark:stroke-amber-400",
  3: "fill-violet-500/18 stroke-violet-600 dark:stroke-violet-400",
  4: "fill-sky-500/18 stroke-sky-600 dark:stroke-sky-400",
  5: "fill-rose-500/18 stroke-rose-600 dark:stroke-rose-400",
};

function resolveFingerRingClass(finger: number | undefined, midi: number): string {
  const index = finger ?? (midi % 5) + 1;
  return (
    FINGER_RING_CLASSES[index] ?? "fill-emerald-500/18 stroke-emerald-600 dark:stroke-emerald-400"
  );
}

function isStaffDimmed(staff: Clef, handMode: HandPracticeMode): boolean {
  if (handMode === "both") return false;
  return (handMode === "rh" && staff === "bass") || (handMode === "lh" && staff === "treble");
}

function formatGuidedCueLabel(finger: number | undefined, pitch: Pitch): string {
  let accSymbol = "";
  if (pitch.accidental === "#") accSymbol = "♯";
  else if (pitch.accidental === "b") accSymbol = "♭";
  const prefix = finger === undefined ? "" : `${finger}·`;
  return `${prefix}${pitch.letter}${accSymbol}`;
}

function isAwaitedNote(
  item: PlacedNoteEvent,
  awaitedBeat: { barNumber: number; beatStart: number } | undefined,
  handMode: HandPracticeMode,
): boolean {
  if (!awaitedBeat) return false;
  if (isStaffDimmed(item.event.staff, handMode)) return false;
  return (
    item.measureNumber === awaitedBeat.barNumber &&
    Math.abs(item.event.beatStart - awaitedBeat.beatStart) < 0.08
  );
}

function resolveRestCenterY(isRhythmOnly: boolean, staff: Clef): number {
  if (isRhythmOnly) {
    return staff === "treble" ? RHYTHM_RH_Y : RHYTHM_LH_Y;
  }
  return staff === "treble" ? TREBLE_TOP_Y + LINE_SPACING * 2 : BASS_TOP_Y + LINE_SPACING * 2;
}

function resolveStemDirection(
  event: StaffNoteEvent,
  measure: StaffMeasure,
  avgStep: number,
  middleStep: number,
): boolean {
  if (event.voice === 1 && measure.events.some((e) => e.staff === event.staff && e.voice === 2)) {
    return true;
  }
  if (event.voice === 2) return false;
  return avgStep < middleStep;
}

function resolveSecondDisplacement(isCollision: boolean, stemUp: boolean): number {
  if (!isCollision) return 0;
  return stemUp ? NOTE_RX * 1.85 : -NOTE_RX * 1.85;
}

// ── Vector Engraving Glyphs ───────────────────────────────────────────────────
function PianoBrace({ x, topY, bottomY }: { x: number; topY: number; bottomY: number }): ReactNode {
  const midY = (topY + bottomY) / 2;
  const h = bottomY - topY;
  const d = [
    `M ${x} ${topY}`,
    `C ${x - 11} ${topY + h * 0.12}, ${x - 4} ${midY - h * 0.14}, ${x - 13} ${midY}`,
    `C ${x - 4} ${midY + h * 0.14}, ${x - 11} ${bottomY - h * 0.12}, ${x} ${bottomY}`,
    `C ${x - 7} ${bottomY - h * 0.13}, ${x - 1} ${midY + h * 0.13}, ${x - 9.5} ${midY}`,
    `C ${x - 1} ${midY - h * 0.13}, ${x - 7} ${topY + h * 0.13}, ${x} ${topY}`,
    "Z",
  ].join(" ");
  return <path d={d} className="fill-current" />;
}

function TrebleClefGlyph({ x, gLineY }: { x: number; gLineY: number }): ReactNode {
  return (
    <g transform={`translate(${x}, ${gLineY})`} className="fill-none stroke-current">
      <path
        d="M 4 19 C 1 25, -4 23, -3 18 C -2 15, 2 15, 2 18 M 3 19 L 7 -36 C 8 -41, 13 -40, 12 -32 C 11 -22, 0 -13, -4 -3 C -7 5, -1 13, 7 12 C 14 11, 16 3, 12 -2 C 8 -6, 1 -4, 1 2 C 1 6, 4 8, 7 7"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="-1" cy="18.5" r="2.2" className="fill-current stroke-none" />
    </g>
  );
}

function BassClefGlyph({ x, fLineY }: { x: number; fLineY: number }): ReactNode {
  return (
    <g transform={`translate(${x}, ${fLineY})`}>
      <circle cx="0" cy="0" r="3.1" className="fill-current" />
      <path
        d="M -1.5 0 C -2 -9, 10 -12, 13 -3 C 15 5, 8 15, -2 21"
        className="fill-none stroke-current"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="18.5" cy="-4.5" r="1.9" className="fill-current" />
      <circle cx="18.5" cy="4.5" r="1.9" className="fill-current" />
    </g>
  );
}

function AccidentalGlyph({
  kind,
  x,
  y,
  scale = 1,
}: {
  kind: Exclude<RenderedAccidental, null>;
  x: number;
  y: number;
  scale?: number;
}): ReactNode {
  if (kind === "sharp") {
    return (
      <g transform={`translate(${x}, ${y}) scale(${scale})`} className="stroke-current">
        <line x1="-2.2" y1="-7.5" x2="-2.2" y2="7.5" strokeWidth="1.2" />
        <line x1="2.2" y1="-8.5" x2="2.2" y2="6.5" strokeWidth="1.2" />
        <line x1="-4.8" y1="-2.2" x2="4.8" y2="-4.2" strokeWidth="2" />
        <line x1="-4.8" y1="3.8" x2="4.8" y2="1.8" strokeWidth="2" />
      </g>
    );
  }
  if (kind === "flat") {
    return (
      <g transform={`translate(${x}, ${y}) scale(${scale})`}>
        <path
          d="M -2.5 -10.5 L -2.5 5.5 C 2.5 3, 4.8 -0.5, 3 -3 C 1.5 -5, -1 -3.5, -2.5 -1.5"
          className="fill-none stroke-current"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  }
  if (kind === "natural") {
    return (
      <g transform={`translate(${x}, ${y}) scale(${scale})`} className="stroke-current">
        <line x1="-2.3" y1="-8.5" x2="-2.3" y2="3.5" strokeWidth="1.2" />
        <line x1="2.3" y1="-3.5" x2="2.3" y2="8.5" strokeWidth="1.2" />
        <line x1="-2.5" y1="-2.2" x2="2.5" y2="-3.6" strokeWidth="1.9" />
        <line x1="-2.5" y1="3.4" x2="2.5" y2="2" strokeWidth="1.9" />
      </g>
    );
  }
  if (kind === "double-sharp") {
    return (
      <g transform={`translate(${x}, ${y}) scale(${scale})`} className="stroke-current">
        <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" strokeWidth="1.5" />
        <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" strokeWidth="1.5" />
        <rect x="-4.5" y="-4.5" width="2" height="2" className="fill-current stroke-none" />
        <rect x="2.5" y="-4.5" width="2" height="2" className="fill-current stroke-none" />
        <rect x="-4.5" y="2.5" width="2" height="2" className="fill-current stroke-none" />
        <rect x="2.5" y="2.5" width="2" height="2" className="fill-current stroke-none" />
      </g>
    );
  }
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <AccidentalGlyph kind="flat" x={-3} y={0} scale={0.9} />
      <AccidentalGlyph kind="flat" x={2.6} y={0} scale={0.9} />
    </g>
  );
}

function RestGlyph({
  duration,
  x,
  centerY,
}: {
  duration: StaffNoteEvent["duration"];
  x: number;
  centerY: number;
}): ReactNode {
  if (duration === "whole") {
    return <rect x={x - 5} y={centerY - 10} width={10} height={4.5} className="fill-current" />;
  }
  if (duration === "half" || duration === "dotted-half") {
    return <rect x={x - 5} y={centerY - 4.5} width={10} height={4.5} className="fill-current" />;
  }
  if (duration === "eighth" || duration === "dotted-eighth" || duration === "triplet-eighth") {
    return (
      <g transform={`translate(${x}, ${centerY})`}>
        <circle cx="-2" cy="-3" r="2.2" className="fill-current" />
        <path
          d="M -1 -2.5 C 2 -1.5, 4 -4, 4.5 -5.5 L 0 9"
          className="fill-none stroke-current"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </g>
    );
  }
  if (duration === "sixteenth") {
    return (
      <g transform={`translate(${x}, ${centerY})`}>
        <circle cx="-2.5" cy="-5" r="2" className="fill-current" />
        <circle cx="-4" cy="1" r="2" className="fill-current" />
        <path
          d="M -1.5 -4.5 C 1.5 -3.5, 3.5 -6, 4 -7.5 L -1 11"
          className="fill-none stroke-current"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
    );
  }
  return (
    <path
      d={`M ${x - 2} ${centerY - 11} L ${x + 3} ${centerY - 5} L ${x - 2.5} ${centerY + 1} L ${x + 3} ${centerY + 7} C ${x - 1.5} ${centerY + 6}, ${x - 3.5} ${centerY + 10}, ${x + 0.5} ${centerY + 13}`}
      className="fill-none stroke-current"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

// ── Layout Computation ────────────────────────────────────────────────────────
interface PlacedNoteEvent {
  event: StaffNoteEvent;
  measureNumber: number;
  x: number;
  stemUp: boolean;
  stemX: number;
  stemStartY: number;
  stemEndY: number;
  minY: number;
  maxY: number;
  pitchPoints: { pitch: Pitch; step: number; y: number; dx: number }[];
}

interface MeasureBox {
  measure: StaffMeasure;
  startX: number;
  endX: number;
  width: number;
}

function placeRhythmEvent(
  event: StaffNoteEvent,
  measureNumber: number,
  x: number,
): PlacedNoteEvent {
  const y = event.staff === "treble" ? RHYTHM_RH_Y : RHYTHM_LH_Y;
  const stemUp = event.staff === "treble";
  const stemX = stemUp ? x + NOTE_RX - 0.8 : x - NOTE_RX + 0.8;
  const stemEndY = stemUp ? y - 28 : y + 28;
  return {
    event,
    measureNumber,
    x,
    stemUp,
    stemX,
    stemStartY: y,
    stemEndY,
    minY: y,
    maxY: y,
    pitchPoints: event.pitches.slice(0, 1).map((pitch) => ({
      pitch,
      step: 0,
      y,
      dx: 0,
    })),
  };
}

function placeGrandStaffEvent(
  event: StaffNoteEvent,
  measure: StaffMeasure,
  x: number,
): PlacedNoteEvent {
  const sortedPitches = [...event.pitches].sort(
    (a, b) => pitchToStaffStep(a) - pitchToStaffStep(b),
  );
  const middleStep = event.staff === "treble" ? 6 : -6;
  const avgStep =
    sortedPitches.length > 0
      ? sortedPitches.reduce((acc, p) => acc + pitchToStaffStep(p), 0) / sortedPitches.length
      : middleStep;
  const stemUp = resolveStemDirection(event, measure, avgStep, middleStep);

  const pitchPoints: { pitch: Pitch; step: number; y: number; dx: number }[] = [];
  let prevStep: number | null = null;
  let prevShifted = false;
  for (const pitch of sortedPitches) {
    const step = pitchToStaffStep(pitch);
    const y = stepToY(step, event.staff);
    const isSecondCollision: boolean = prevStep !== null && step - prevStep === 1 && !prevShifted;
    const dx = resolveSecondDisplacement(isSecondCollision, stemUp);
    pitchPoints.push({ pitch, step, y, dx });
    prevStep = step;
    prevShifted = isSecondCollision;
  }

  const ys = pitchPoints.map((pt) => pt.y);
  const minY = ys.length > 0 ? Math.min(...ys) : stepToY(middleStep, event.staff);
  const maxY = ys.length > 0 ? Math.max(...ys) : stepToY(middleStep, event.staff);
  const stemX = stemUp ? x + NOTE_RX - 0.8 : x - NOTE_RX + 0.8;
  const stemStartY = stemUp ? maxY : minY;
  const stemEndY = stemUp ? minY - STEM_LENGTH : maxY + STEM_LENGTH;

  return {
    event,
    measureNumber: measure.number,
    x,
    stemUp,
    stemX,
    stemStartY,
    stemEndY,
    minY,
    maxY,
    pitchPoints,
  };
}

function computeMeasureLayout(
  measures: StaffMeasure[],
  beatsPerMeasure: number,
  keySignatureWidth: number,
  isRhythmOnly: boolean,
): { boxes: MeasureBox[]; placed: PlacedNoteEvent[]; totalWidth: number } {
  const firstMeasureStart = isRhythmOnly
    ? LEFT_MARGIN + 46 + TIME_SIG_WIDTH
    : KEY_SIG_START_X + keySignatureWidth + TIME_SIG_WIDTH + 6;

  let cursorX = firstMeasureStart;
  const boxes: MeasureBox[] = [];
  const placed: PlacedNoteEvent[] = [];

  for (const measure of measures) {
    const uniqueBeats = new Set(measure.events.map((e) => e.beatStart)).size;
    const width = Math.max(MIN_MEASURE_WIDTH, 76 + uniqueBeats * 36);
    const startX = cursorX;
    const endX = startX + width;
    boxes.push({ measure, startX, endX, width });

    const usableWidth = width - MEASURE_PAD_LEFT - MEASURE_PAD_RIGHT;
    for (const event of measure.events) {
      const ratio = beatsPerMeasure > 0 ? Math.min(event.beatStart / beatsPerMeasure, 0.96) : 0;
      const x = startX + MEASURE_PAD_LEFT + ratio * usableWidth;
      placed.push(
        isRhythmOnly
          ? placeRhythmEvent(event, measure.number, x)
          : placeGrandStaffEvent(event, measure, x),
      );
    }

    cursorX = endX;
  }

  return { boxes, placed, totalWidth: cursorX + 18 };
}

function buildBeamGroups(placed: PlacedNoteEvent[]): Map<string, PlacedNoteEvent[]> {
  const groups = new Map<string, PlacedNoteEvent[]>();
  for (const item of placed) {
    if (item.event.isRest || beamCountForDuration(item.event.duration) === 0) continue;
    const key = item.event.beamGroup
      ? `${item.measureNumber}:${item.event.staff}:${item.event.beamGroup}`
      : `${item.measureNumber}:${item.event.staff}:beat-${Math.floor(item.event.beatStart)}`;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return groups;
}

const PREVIEW_TABS: { id: PreviewFocus; label: string }[] = [
  { id: "all", label: "All Cues" },
  { id: "key", label: "Key Sig" },
  { id: "time", label: "Time Sig" },
  { id: "landmarks", label: "Landmarks" },
  { id: "hardest-bar", label: "Hardest Bar" },
];

function collectLedgerSteps(item: PlacedNoteEvent, isRhythmOnly: boolean): number[] {
  if (isRhythmOnly) return [];
  const ledgerSteps = new Set<number>();
  for (const pt of item.pitchPoints) {
    for (const ls of getLedgerLineSteps(pt.step, item.event.staff)) {
      ledgerSteps.add(ls);
    }
  }
  return [...ledgerSteps];
}

function NoteFlags({
  item,
  beams,
  strokeCls,
}: {
  item: PlacedNoteEvent;
  beams: number;
  strokeCls: string;
}): ReactNode {
  if (beams <= 0) return null;
  const dir = item.stemUp ? 1 : -1;
  return (
    <g className={strokeCls}>
      <path
        d={`M ${item.stemX} ${item.stemEndY} C ${item.stemX + 8} ${item.stemEndY + 4 * dir}, ${item.stemX + 9} ${item.stemEndY + 12 * dir}, ${item.stemX + 4} ${item.stemEndY + 18 * dir}`}
        className="fill-none"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {beams === 2 && (
        <path
          d={`M ${item.stemX} ${item.stemEndY + 6 * dir} C ${item.stemX + 8} ${item.stemEndY + 10 * dir}, ${item.stemX + 9} ${item.stemEndY + 18 * dir}, ${item.stemX + 4} ${item.stemEndY + 24 * dir}`}
          className="fill-none"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

function NoteArticulation({
  item,
  fillCls,
  strokeCls,
}: {
  item: PlacedNoteEvent;
  fillCls: string;
  strokeCls: string;
}): ReactNode {
  const artY = item.stemUp ? item.maxY + 9 : item.minY - 9;
  if (item.event.articulation === "staccato") {
    return <circle cx={item.x} cy={artY} r={1.7} className={fillCls} />;
  }
  if (item.event.articulation === "tenuto") {
    return (
      <line
        x1={item.x - 4.5}
        y1={artY}
        x2={item.x + 4.5}
        y2={artY}
        strokeWidth={1.6}
        className={strokeCls}
      />
    );
  }
  return null;
}

function NoteIntervalBadge({
  x,
  isTreble,
  label,
}: {
  x: number;
  isTreble: boolean;
  label: string;
}): ReactNode {
  const rectY = isTreble ? TREBLE_TOP_Y - 20 : BASS_BOTTOM_Y + 8;
  const textY = isTreble ? TREBLE_TOP_Y - 10 : BASS_BOTTOM_Y + 18;
  return (
    <g>
      <rect
        x={x - 16}
        y={rectY}
        width={32}
        height={14}
        rx={7}
        className="fill-emerald-500/15 stroke-emerald-600/50 dark:stroke-emerald-400/50"
        strokeWidth={1}
      />
      <text
        x={x}
        y={textY}
        textAnchor="middle"
        className="fill-emerald-700 font-mono text-[9px] font-bold dark:fill-emerald-300"
      >
        {label}
      </text>
    </g>
  );
}

function NoteOverlays({
  item,
  fillCls,
  strokeCls,
  isRhythmOnly,
  showFingerings,
  showIntervalShapes,
  showRomanNumerals,
}: {
  item: PlacedNoteEvent;
  fillCls: string;
  strokeCls: string;
  isRhythmOnly: boolean;
  showFingerings: boolean;
  showIntervalShapes: boolean;
  showRomanNumerals: boolean;
}): ReactNode {
  const { event } = item;
  const isTreble = event.staff === "treble";

  if (isRhythmOnly) {
    return <NoteArticulation item={item} fillCls={fillCls} strokeCls={strokeCls} />;
  }

  return (
    <>
      <NoteArticulation item={item} fillCls={fillCls} strokeCls={strokeCls} />
      {event.dynamic && (
        <text
          x={item.x}
          y={(TREBLE_BOTTOM_Y + BASS_TOP_Y) / 2 + 4}
          textAnchor="middle"
          className="fill-current font-display text-[13px] font-bold italic"
        >
          {event.dynamic}
        </text>
      )}
      {showFingerings && event.finger !== undefined && (
        <text
          x={item.x}
          y={isTreble ? item.minY - 12 : item.maxY + 16}
          textAnchor="middle"
          className="fill-muted-ash font-mono text-[10px] font-semibold"
        >
          {event.finger}
        </text>
      )}
      {showIntervalShapes && event.intervalLabel && (
        <NoteIntervalBadge x={item.x} isTreble={isTreble} label={event.intervalLabel} />
      )}
      {showRomanNumerals && event.romanNumeral && (
        <text
          x={item.x}
          y={BASS_BOTTOM_Y + 36}
          textAnchor="middle"
          className="fill-intelligence-blue font-mono text-[11px] font-semibold"
        >
          {event.romanNumeral}
        </text>
      )}
    </>
  );
}

function NotePitchHead({
  eventId,
  itemX,
  pt,
  pIdx,
  fifths,
  finger,
  isRhythmOnly,
  isUrtext,
  isGuided,
  dimmed,
  isAwaited,
  isHollow,
  dotted,
  showLandmarkCallout,
  fillCls,
  strokeCls,
}: {
  eventId: string;
  itemX: number;
  pt: { pitch: Pitch; step: number; y: number; dx: number };
  pIdx: number;
  fifths: number;
  finger: number | undefined;
  isRhythmOnly: boolean;
  isUrtext: boolean;
  isGuided: boolean;
  dimmed: boolean;
  isAwaited: boolean;
  isHollow: boolean;
  dotted: boolean;
  showLandmarkCallout: boolean;
  fillCls: string;
  strokeCls: string;
}): ReactNode {
  const acc = isRhythmOnly ? null : resolveDisplayedAccidental(pt.pitch, fifths);
  const nx = itemX + pt.dx;
  const showLandmarkRing =
    !isRhythmOnly && !isUrtext && showLandmarkCallout && isLandmarkMidi(pt.pitch.midi);

  return (
    <g key={`${eventId}-midi-${pt.pitch.midi}`}>
      {isAwaited && (
        <circle
          cx={nx}
          cy={pt.y}
          r={11.5}
          className="fill-amber-400/20 stroke-amber-500 dark:stroke-amber-400"
          strokeWidth={1.8}
        />
      )}
      {isGuided && !dimmed && (
        <circle
          cx={nx}
          cy={pt.y}
          r={8.4}
          className={resolveFingerRingClass(finger, pt.pitch.midi)}
          strokeWidth={1.5}
        />
      )}
      {showLandmarkRing && (
        <circle
          cx={nx}
          cy={pt.y}
          r={9.5}
          className="fill-intelligence-blue/15 stroke-intelligence-blue"
          strokeWidth={1.4}
        />
      )}
      {acc && <AccidentalGlyph kind={acc} x={itemX - 13 - (pIdx % 2) * 5} y={pt.y} />}
      <ellipse
        cx={nx}
        cy={pt.y}
        rx={NOTE_RX}
        ry={NOTE_RY}
        transform={`rotate(-18 ${nx} ${pt.y})`}
        className={isHollow ? `fill-[#FAF6EE] dark:fill-[#161311] ${strokeCls}` : fillCls}
        strokeWidth={isHollow ? 1.8 : 0}
      />
      {dotted && <circle cx={nx + NOTE_RX + 4.5} cy={pt.y - 1.5} r={1.7} className={fillCls} />}
    </g>
  );
}

function StaffLedgerLines({
  eventId,
  itemX,
  staff,
  ledgerSteps,
}: {
  eventId: string;
  itemX: number;
  staff: Clef;
  ledgerSteps: readonly number[];
}): ReactNode {
  return (
    <>
      {ledgerSteps.map((ls) => {
        const ly = stepToY(ls, staff);
        return (
          <line
            key={`${eventId}-ledger-${ls}`}
            x1={itemX - 9.5}
            y1={ly}
            x2={itemX + 9.5}
            y2={ly}
            strokeWidth={1.1}
            className="stroke-current/70"
          />
        );
      })}
    </>
  );
}

function StaffNoteStemAndCue({
  item,
  hasStem,
  isBeamed,
  beams,
  strokeCls,
  guidedCueLabel,
  dimmed,
}: {
  item: PlacedNoteEvent;
  hasStem: boolean;
  isBeamed: boolean;
  beams: number;
  strokeCls: string;
  guidedCueLabel: string | null;
  dimmed: boolean;
}): ReactNode {
  return (
    <>
      {hasStem && (
        <line
          x1={item.stemX}
          y1={item.stemStartY}
          x2={item.stemX}
          y2={item.stemEndY}
          strokeWidth={1.35}
          className={strokeCls}
        />
      )}
      {hasStem && !isBeamed && <NoteFlags item={item} beams={beams} strokeCls={strokeCls} />}
      {guidedCueLabel && !dimmed && (
        <text
          x={item.x}
          y={item.event.staff === "treble" ? item.minY - 12 : item.maxY + 16}
          textAnchor="middle"
          className="fill-midnight-ink font-mono text-[9.5px] font-bold dark:fill-[#F5EFE4]"
        >
          {guidedCueLabel}
        </text>
      )}
    </>
  );
}

function StaffNoteNode({
  item,
  fifths,
  isRhythmOnly,
  isBeamed,
  showLandmarkCallout,
  showFingerings,
  showIntervalShapes,
  showRomanNumerals,
  notationScaffold,
  dimmed,
  isAwaited,
}: {
  item: PlacedNoteEvent;
  fifths: number;
  isRhythmOnly: boolean;
  isBeamed: boolean;
  showLandmarkCallout: boolean;
  showFingerings: boolean;
  showIntervalShapes: boolean;
  showRomanNumerals: boolean;
  notationScaffold: NotationScaffold;
  dimmed: boolean;
  isAwaited: boolean;
}): ReactNode {
  const { event } = item;
  const fillCls = statusFillClass(event.status);
  const strokeCls = statusStrokeClass(event.status);
  const isGuided = notationScaffold === "guided-colors" && !isRhythmOnly;
  const isUrtext = notationScaffold === "pure-urtext";

  if (event.isRest || item.pitchPoints.length === 0) {
    return (
      <g className={`${fillCls}${dimmed ? " opacity-35" : ""}`}>
        <RestGlyph
          duration={event.duration}
          x={item.x}
          centerY={resolveRestCenterY(isRhythmOnly, event.staff)}
        />
      </g>
    );
  }

  const isHollow = isHollowDuration(event.duration);
  const hasStem = hasStemDuration(event.duration);
  const dotted = isDottedDuration(event.duration);
  const beams = beamCountForDuration(event.duration);
  const ledgerSteps = collectLedgerSteps(item, isRhythmOnly);
  const primaryPitch = item.pitchPoints[0]?.pitch;
  const guidedCueLabel =
    isGuided && primaryPitch ? formatGuidedCueLabel(event.finger, primaryPitch) : null;

  return (
    <g className={dimmed ? "opacity-35" : undefined}>
      <StaffLedgerLines
        eventId={event.id}
        itemX={item.x}
        staff={event.staff}
        ledgerSteps={ledgerSteps}
      />

      {item.pitchPoints.map((pt, pIdx) => (
        <NotePitchHead
          key={`${event.id}-midi-${pt.pitch.midi}`}
          eventId={event.id}
          itemX={item.x}
          pt={pt}
          pIdx={pIdx}
          fifths={fifths}
          finger={event.finger}
          isRhythmOnly={isRhythmOnly}
          isUrtext={isUrtext}
          isGuided={isGuided}
          dimmed={dimmed}
          isAwaited={isAwaited}
          isHollow={isHollow}
          dotted={dotted}
          showLandmarkCallout={showLandmarkCallout}
          fillCls={fillCls}
          strokeCls={strokeCls}
        />
      ))}

      <StaffNoteStemAndCue
        item={item}
        hasStem={hasStem}
        isBeamed={isBeamed}
        beams={beams}
        strokeCls={strokeCls}
        guidedCueLabel={guidedCueLabel}
        dimmed={dimmed}
      />
      <NoteOverlays
        item={item}
        fillCls={fillCls}
        strokeCls={strokeCls}
        isRhythmOnly={isRhythmOnly}
        showFingerings={!isUrtext && !isGuided && showFingerings}
        showIntervalShapes={!isUrtext && showIntervalShapes}
        showRomanNumerals={!isUrtext && showRomanNumerals}
      />
    </g>
  );
}

export const GrandStaff = defineComponent(
  GrandStaffPropsSchema,
  ({
    title,
    composer,
    hideHeader = false,
    keySignature,
    timeSignature,
    measures,
    mode = "standard",
    activeMeasure,
    activeBeat = 0,
    playing = false,
    getClock,
    countInBars = 1,
    cadencePulseKey = 0,
    finalePulseKey = 0,
    lookAheadMaskOpacity = 0.72,
    previewFocus: controlledPreviewFocus,
    onPreviewFocusChange,
    showRomanNumerals = false,
    showIntervalShapes = false,
    showFingerings = false,
    notationScaffold = "intervals-only",
    handMode = "both",
    awaitedBeat,
    loopRange,
    onSelectMeasure,
  }: GrandStaffProps): ReactNode => {
    const [internalPreviewFocus, setInternalPreviewFocus] = useState<PreviewFocus>("all");
    const playheadRef = useRef<SVGGElement | null>(null);
    const curtainRef = useRef<SVGRectElement | null>(null);
    const cadenceSweepRef = useRef<SVGRectElement | null>(null);
    const finaleShimmerRef = useRef<SVGRectElement | null>(null);

    const previewFocus = controlledPreviewFocus ?? internalPreviewFocus;
    const setPreviewFocus = (next: PreviewFocus): void => {
      setInternalPreviewFocus(next);
      onPreviewFocusChange?.(next);
    };

    const isRhythmOnly = mode === "rhythm-only";
    const isLookAhead = mode === "look-ahead";
    const isPreview = mode === "preview-30s";

    const accidentalCount = Math.abs(keySignature.fifths);
    const keySignatureWidth = accidentalCount > 0 ? accidentalCount * KEY_SIG_STEP_X + 8 : 4;
    const beatsPerMeasure = timeSignature.numerator * (4 / timeSignature.denominator);
    const beatTickNumbers = Array.from({ length: timeSignature.numerator }, (_, i) => i + 1);

    const { boxes, placed, totalWidth } = computeMeasureLayout(
      measures,
      beatsPerMeasure,
      keySignatureWidth,
      isRhythmOnly,
    );

    const beamGroups = buildBeamGroups(placed);
    const beamedIds = new Set<string>();
    for (const members of beamGroups.values()) {
      if (members.length >= 2) {
        for (const m of members) beamedIds.add(m.event.id);
      }
    }

    const svgHeight = isRhythmOnly ? RHYTHM_SVG_HEIGHT : FULL_SVG_HEIGHT;
    const timeSigX = isRhythmOnly ? LEFT_MARGIN + 38 : KEY_SIG_START_X + keySignatureWidth + 8;

    const activeBox =
      activeMeasure !== undefined
        ? boxes.find((b) => b.measure.number === activeMeasure)
        : undefined;
    const staticPlayheadX = activeBox
      ? activeBox.startX +
        MEASURE_PAD_LEFT +
        Math.min(activeBeat / Math.max(beatsPerMeasure, 1), 0.96) *
          (activeBox.width - MEASURE_PAD_LEFT - MEASURE_PAD_RIGHT)
      : null;

    // Smooth 60fps SVG playhead driven by AudioContext transport clock (zero React re-renders).
    // Snaps cleanly per beat under `prefers-reduced-motion: reduce`.
    const boxesRef = useRef(boxes);
    const getClockRef = useRef(getClock);
    useEffect(() => {
      boxesRef.current = boxes;
      getClockRef.current = getClock;
    }, [boxes, getClock]);

    useEffect(() => {
      const node = playheadRef.current;
      if (!node) return;
      if (!playing || !getClockRef.current) {
        node.setAttribute("transform", "translate(0, 0)");
        return;
      }

      const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let rafId = 0;

      const tickFrame = (): void => {
        const clockFn = getClockRef.current;
        const el = playheadRef.current;
        if (!clockFn || !el) return;
        const snap = clockFn();
        if (snap.running && !snap.isCountIn) {
          const measureNum = snap.bar - countInBars + 1;
          const targetBox = boxesRef.current.find((b) => b.measure.number === measureNum);
          if (targetBox && staticPlayheadX !== null) {
            const beatPos = reducedMotion ? Math.floor(snap.beatFloat) : snap.beatFloat;
            const ratio = Math.min(beatPos / Math.max(snap.beatsPerBar, 1), 0.96);
            const liveX =
              targetBox.startX +
              MEASURE_PAD_LEFT +
              ratio * (targetBox.width - MEASURE_PAD_LEFT - MEASURE_PAD_RIGHT);
            el.setAttribute("transform", `translate(${(liveX - staticPlayheadX).toFixed(2)}, 0)`);
          }
        }
        rafId = requestAnimationFrame(tickFrame);
      };

      rafId = requestAnimationFrame(tickFrame);
      return () => {
        cancelAnimationFrame(rafId);
        node.setAttribute("transform", "translate(0, 0)");
      };
    }, [playing, countInBars, staticPlayheadX]);

    // Signature Moment 1: Tonic Cadence Breath (warm amber parchment sweep on I-V-I)
    useAnime(
      cadenceSweepRef,
      cadencePulseKey > 0
        ? {
            opacity: [0, 0.28, 0],
            translateX: [-totalWidth * 0.25, totalWidth * 0.15],
            duration: 1850,
            ease: "inOutSine",
          }
        : { opacity: 0, duration: 1 },
      [cadencePulseKey],
    );

    // Signature Moment 2: Look-Ahead Curtain (soft parchment glide when measure advances)
    useAnime(
      curtainRef,
      isLookAhead && activeBox
        ? {
            opacity: [0.18, lookAheadMaskOpacity],
            duration: 280,
            ease: "outQuad",
          }
        : { opacity: 0, duration: 1 },
      [isLookAhead, activeMeasure, lookAheadMaskOpacity],
    );

    // Signature Moment 3: Unbroken Pass Finale (warm gold shimmer across the engraved folio)
    useAnime(
      finaleShimmerRef,
      finalePulseKey > 0
        ? {
            opacity: [0, 0.34, 0.14, 0],
            duration: 1500,
            ease: "outCubic",
          }
        : { opacity: 0, duration: 1 },
      [finalePulseKey],
    );

    const nextMeasureNumber = activeMeasure !== undefined ? activeMeasure + 1 : undefined;

    const showKeyCallout = isPreview && (previewFocus === "all" || previewFocus === "key");
    const showTimeCallout = isPreview && (previewFocus === "all" || previewFocus === "time");
    const showLandmarkCallout =
      isPreview && (previewFocus === "all" || previewFocus === "landmarks");
    const showHardestCallout =
      isPreview && (previewFocus === "all" || previewFocus === "hardest-bar");

    return (
      <section
        aria-label={title ? `Grand staff score: ${title}` : "Grand staff notation"}
        className="w-full rounded-card border border-[#E5DEC9] bg-[#FAF6EE] p-3 shadow-card sm:p-4 dark:border-[#2C2621] dark:bg-[#161311]"
      >
        {/* Single Engraved Folio Header (hidden when parent owns header to avoid duplication) */}
        {!hideHeader && (title || isPreview || isRhythmOnly) && (
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                {title && (
                  <h3 className="truncate font-display text-lg font-normal text-midnight-ink sm:text-xl dark:text-[#F5EFE4]">
                    {title}
                  </h3>
                )}
                {composer && (
                  <span className="truncate text-xs text-muted-ash dark:text-[#A99F91]">
                    {composer}
                  </span>
                )}
                <span className="inline-flex items-center rounded-full bg-black/[0.06] px-2 py-0.5 font-mono text-[11px] font-medium text-surface-charcoal dark:bg-white/[0.08] dark:text-[#D9D0C3]">
                  {keySignature.label} · {timeSignature.numerator}/{timeSignature.denominator}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {isRhythmOnly && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                  <Music2 className="size-3.5" aria-hidden="true" />
                  Rhythm Isolation
                </span>
              )}

              {isPreview && (
                <div
                  role="tablist"
                  aria-label="30-Second Preview highlights"
                  className="flex flex-wrap items-center gap-1"
                >
                  {PREVIEW_TABS.map((tab) => {
                    const selected = previewFocus === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setPreviewFocus(tab.id)}
                        className={
                          selected
                            ? "min-h-11 rounded-full bg-intelligence-blue px-3 py-1.5 text-xs font-medium text-white transition-colors"
                            : "min-h-11 rounded-full bg-black/[0.06] px-3 py-1.5 text-xs font-medium text-muted-ash transition-colors hover:text-midnight-ink dark:bg-white/[0.08] dark:text-[#B8AEA0] dark:hover:text-[#F5EFE4]"
                        }
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Responsive Scrollable SVG Engraving Container */}
        <div className="w-full overflow-x-auto pb-1" style={{ touchAction: "pan-x" }}>
          <svg
            viewBox={`0 0 ${totalWidth} ${svgHeight}`}
            className="h-auto w-full min-w-[340px] select-none text-[#1A1714] dark:text-[#F2ECE1]"
            aria-label={`${keySignature.label}, ${timeSignature.numerator}/${timeSignature.denominator}, ${measures.length} measures`}
          >
            {/* Signature Moment Overlays: Tonic Cadence Breath & Unbroken Pass Finale */}
            <defs>
              <linearGradient id="tonicCadenceAmber" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D97706" stopOpacity="0" />
                <stop offset="50%" stopColor="#D97706" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="unbrokenGoldFinale" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.1" />
                <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <rect
              ref={cadenceSweepRef}
              x={0}
              y={0}
              width={totalWidth}
              height={svgHeight}
              rx={8}
              fill="url(#tonicCadenceAmber)"
              style={{ opacity: 0, pointerEvents: "none" }}
            />
            <rect
              ref={finaleShimmerRef}
              x={0}
              y={0}
              width={totalWidth}
              height={svgHeight}
              rx={8}
              fill="url(#unbrokenGoldFinale)"
              style={{ opacity: 0, pointerEvents: "none" }}
            />
            {/* 1. Measure Background Spotlights */}
            {boxes.map((box) => {
              const isNextSpotlight = isLookAhead && nextMeasureNumber === box.measure.number;
              const isHardest = Boolean(box.measure.isHardestBar) && showHardestCallout;
              const isInLoop =
                loopRange !== undefined &&
                box.measure.number >= loopRange.startBar &&
                box.measure.number <= loopRange.endBar;
              const isLoopStart =
                loopRange !== undefined && box.measure.number === loopRange.startBar;
              return (
                <g key={`bg-${box.measure.number}`}>
                  {isInLoop && (
                    <g>
                      <rect
                        x={box.startX + 1}
                        y={isRhythmOnly ? 20 : 22}
                        width={box.width - 2}
                        height={svgHeight - 36}
                        rx={8}
                        className="fill-amber-500/8 stroke-amber-500/45"
                        strokeWidth={1.2}
                      />
                      {isLoopStart && (
                        <text
                          x={box.startX + 8}
                          y={16}
                          className="fill-amber-700 font-mono text-[9.5px] font-bold tracking-wide dark:fill-amber-300"
                        >
                          LOOP m.{loopRange.startBar}–{loopRange.endBar}
                        </text>
                      )}
                    </g>
                  )}

                  {isNextSpotlight && (
                    <g>
                      <rect
                        x={box.startX + 2}
                        y={isRhythmOnly ? 20 : 22}
                        width={box.width - 4}
                        height={svgHeight - 36}
                        rx={10}
                        className="fill-intelligence-blue/10 stroke-intelligence-blue/60"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                      />
                      <text
                        x={box.startX + box.width / 2}
                        y={16}
                        textAnchor="middle"
                        className="fill-intelligence-blue font-mono text-[10px] font-bold tracking-wide"
                      >
                        EYES AHEAD →
                      </text>
                    </g>
                  )}

                  {isHardest && (
                    <g>
                      <rect
                        x={box.startX + 2}
                        y={isRhythmOnly ? 20 : 22}
                        width={box.width - 4}
                        height={svgHeight - 36}
                        rx={10}
                        className="fill-rose-500/10 stroke-rose-500/70"
                        strokeWidth={1.6}
                      />
                      <rect
                        x={box.startX + box.width / 2 - 44}
                        y={6}
                        width={88}
                        height={15}
                        rx={7.5}
                        className="fill-rose-600 dark:fill-rose-500"
                      />
                      <text
                        x={box.startX + box.width / 2}
                        y={16.5}
                        textAnchor="middle"
                        className="fill-white font-sans text-[9px] font-semibold"
                      >
                        HARDEST BAR
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* 2. Staff Lines & Left System Brace */}
            {isRhythmOnly ? (
              <g className="stroke-current/45">
                <line
                  x1={LEFT_MARGIN}
                  y1={RHYTHM_RH_Y}
                  x2={totalWidth - 18}
                  y2={RHYTHM_RH_Y}
                  strokeWidth={1.2}
                />
                <line
                  x1={LEFT_MARGIN}
                  y1={RHYTHM_LH_Y}
                  x2={totalWidth - 18}
                  y2={RHYTHM_LH_Y}
                  strokeWidth={1.2}
                />
                <line
                  x1={LEFT_MARGIN}
                  y1={RHYTHM_RH_Y}
                  x2={LEFT_MARGIN}
                  y2={RHYTHM_LH_Y}
                  strokeWidth={1.6}
                  className="stroke-current"
                />
                <text
                  x={LEFT_MARGIN + 8}
                  y={RHYTHM_RH_Y + 4}
                  className="fill-muted-ash font-mono text-[10px] font-bold"
                >
                  RH
                </text>
                <text
                  x={LEFT_MARGIN + 8}
                  y={RHYTHM_LH_Y + 4}
                  className="fill-muted-ash font-mono text-[10px] font-bold"
                >
                  LH
                </text>
              </g>
            ) : (
              <g>
                <PianoBrace x={LEFT_MARGIN - 2} topY={TREBLE_TOP_Y} bottomY={BASS_BOTTOM_Y} />
                <line
                  x1={LEFT_MARGIN}
                  y1={TREBLE_TOP_Y}
                  x2={LEFT_MARGIN}
                  y2={BASS_BOTTOM_Y}
                  strokeWidth={1.5}
                  className="stroke-current"
                />
                {STAFF_LINE_OFFSETS.map((lineOffset) => (
                  <g key={`staff-line-${lineOffset}`}>
                    <line
                      x1={LEFT_MARGIN}
                      y1={TREBLE_TOP_Y + lineOffset * LINE_SPACING}
                      x2={totalWidth - 18}
                      y2={TREBLE_TOP_Y + lineOffset * LINE_SPACING}
                      strokeWidth={0.95}
                      className={
                        isStaffDimmed("treble", handMode)
                          ? "stroke-current/20"
                          : "stroke-current/45"
                      }
                    />
                    <line
                      x1={LEFT_MARGIN}
                      y1={BASS_TOP_Y + lineOffset * LINE_SPACING}
                      x2={totalWidth - 18}
                      y2={BASS_TOP_Y + lineOffset * LINE_SPACING}
                      strokeWidth={0.95}
                      className={
                        isStaffDimmed("bass", handMode) ? "stroke-current/20" : "stroke-current/45"
                      }
                    />
                  </g>
                ))}
                <g className={isStaffDimmed("treble", handMode) ? "opacity-35" : undefined}>
                  <TrebleClefGlyph x={CLEF_X + 6} gLineY={stepToY(4, "treble")} />
                </g>
                <g className={isStaffDimmed("bass", handMode) ? "opacity-35" : undefined}>
                  <BassClefGlyph x={CLEF_X + 2} fLineY={stepToY(-4, "bass")} />
                </g>
              </g>
            )}

            {/* 3. Key Signature */}
            {!isRhythmOnly && (
              <g>
                {showKeyCallout && (
                  <g>
                    <rect
                      x={KEY_SIG_START_X - 7}
                      y={TREBLE_TOP_Y - 12}
                      width={Math.max(keySignatureWidth + 8, 28)}
                      height={BASS_BOTTOM_Y - TREBLE_TOP_Y + 24}
                      rx={8}
                      className="fill-amber-500/12 stroke-amber-500"
                      strokeWidth={1.4}
                    />
                    <text
                      x={KEY_SIG_START_X - 5}
                      y={TREBLE_TOP_Y - 18}
                      className="fill-amber-700 font-mono text-[9px] font-bold dark:fill-amber-300"
                    >
                      KEY
                    </text>
                  </g>
                )}
                {keySignature.fifths > 0 &&
                  TREBLE_SHARP_STEPS.slice(0, keySignature.fifths).map((step, i) => (
                    <AccidentalGlyph
                      key={`t-sharp-${step}`}
                      kind="sharp"
                      x={KEY_SIG_START_X + i * KEY_SIG_STEP_X}
                      y={stepToY(step, "treble")}
                    />
                  ))}
                {keySignature.fifths > 0 &&
                  BASS_SHARP_STEPS.slice(0, keySignature.fifths).map((step, i) => (
                    <AccidentalGlyph
                      key={`b-sharp-${step}`}
                      kind="sharp"
                      x={KEY_SIG_START_X + i * KEY_SIG_STEP_X}
                      y={stepToY(step, "bass")}
                    />
                  ))}
                {keySignature.fifths < 0 &&
                  TREBLE_FLAT_STEPS.slice(0, Math.abs(keySignature.fifths)).map((step, i) => (
                    <AccidentalGlyph
                      key={`t-flat-${step}`}
                      kind="flat"
                      x={KEY_SIG_START_X + i * KEY_SIG_STEP_X}
                      y={stepToY(step, "treble")}
                    />
                  ))}
                {keySignature.fifths < 0 &&
                  BASS_FLAT_STEPS.slice(0, Math.abs(keySignature.fifths)).map((step, i) => (
                    <AccidentalGlyph
                      key={`b-flat-${step}`}
                      kind="flat"
                      x={KEY_SIG_START_X + i * KEY_SIG_STEP_X}
                      y={stepToY(step, "bass")}
                    />
                  ))}
              </g>
            )}

            {/* 4. Time Signature */}
            <g>
              {showTimeCallout && (
                <g>
                  <rect
                    x={timeSigX - 4}
                    y={isRhythmOnly ? RHYTHM_RH_Y - 20 : TREBLE_TOP_Y - 12}
                    width={24}
                    height={isRhythmOnly ? 86 : BASS_BOTTOM_Y - TREBLE_TOP_Y + 24}
                    rx={8}
                    className="fill-sky-500/12 stroke-sky-500"
                    strokeWidth={1.4}
                  />
                  <text
                    x={timeSigX + 8}
                    y={isRhythmOnly ? 26 : TREBLE_TOP_Y - 18}
                    textAnchor="middle"
                    className="fill-sky-700 font-mono text-[9px] font-bold dark:fill-sky-300"
                  >
                    TIME
                  </text>
                </g>
              )}
              {isRhythmOnly ? (
                <g className="fill-current font-display font-bold">
                  <text x={timeSigX + 8} y={RHYTHM_RH_Y + 3} textAnchor="middle" fontSize={19}>
                    {timeSignature.numerator}
                  </text>
                  <text x={timeSigX + 8} y={RHYTHM_LH_Y + 3} textAnchor="middle" fontSize={19}>
                    {timeSignature.denominator}
                  </text>
                </g>
              ) : (
                <g className="fill-current font-display font-bold">
                  <text x={timeSigX + 8} y={TREBLE_TOP_Y + 18} textAnchor="middle" fontSize={20}>
                    {timeSignature.numerator}
                  </text>
                  <text x={timeSigX + 8} y={TREBLE_TOP_Y + 38} textAnchor="middle" fontSize={20}>
                    {timeSignature.denominator}
                  </text>
                  <text x={timeSigX + 8} y={BASS_TOP_Y + 18} textAnchor="middle" fontSize={20}>
                    {timeSignature.numerator}
                  </text>
                  <text x={timeSigX + 8} y={BASS_TOP_Y + 38} textAnchor="middle" fontSize={20}>
                    {timeSignature.denominator}
                  </text>
                </g>
              )}
            </g>

            {/* 5. Barlines, Measure Numbers, Beat Grid Ticks, & Harmony Labels */}
            {boxes.map((box, idx) => {
              const isFinal = idx === boxes.length - 1;
              const topY = isRhythmOnly ? RHYTHM_RH_Y - 12 : TREBLE_TOP_Y;
              const bottomY = isRhythmOnly ? RHYTHM_LH_Y + 12 : BASS_BOTTOM_Y;
              return (
                <g key={`bar-${box.measure.number}`}>
                  <text
                    x={box.startX + 4}
                    y={isRhythmOnly ? 24 : 36}
                    className="fill-muted-ash font-mono text-[10px]"
                  >
                    {box.measure.number}
                  </text>

                  {box.measure.rehearsalMark && (
                    <g>
                      <rect
                        x={box.startX + 20}
                        y={isRhythmOnly ? 11 : 23}
                        width={16}
                        height={15}
                        rx={3}
                        className="fill-light-taupe stroke-current/40"
                        strokeWidth={1}
                      />
                      <text
                        x={box.startX + 28}
                        y={isRhythmOnly ? 22 : 34}
                        textAnchor="middle"
                        className="fill-current font-mono text-[10px] font-bold"
                      >
                        {box.measure.rehearsalMark}
                      </text>
                    </g>
                  )}

                  {isRhythmOnly &&
                    beatTickNumbers.map((beatNum) => {
                      const usable = box.width - MEASURE_PAD_LEFT - MEASURE_PAD_RIGHT;
                      const tickX =
                        box.startX +
                        MEASURE_PAD_LEFT +
                        ((beatNum - 1) / Math.max(timeSignature.numerator, 1)) * usable;
                      return (
                        <g key={`tick-${box.measure.number}-${beatNum}`}>
                          <line
                            x1={tickX}
                            y1={RHYTHM_RH_Y - 18}
                            x2={tickX}
                            y2={RHYTHM_LH_Y + 18}
                            className="stroke-current/12"
                            strokeDasharray="2 3"
                          />
                          <text
                            x={tickX}
                            y={RHYTHM_LH_Y + 32}
                            textAnchor="middle"
                            className="fill-muted-ash font-mono text-[9px]"
                          >
                            {beatNum}
                          </text>
                        </g>
                      );
                    })}

                  {notationScaffold !== "pure-urtext" &&
                    showRomanNumerals &&
                    box.measure.harmonyLabel &&
                    !isRhythmOnly && (
                      <text
                        x={box.startX + MEASURE_PAD_LEFT}
                        y={BASS_BOTTOM_Y + 36}
                        className="fill-intelligence-blue font-mono text-[11px] font-semibold"
                      >
                        {box.measure.harmonyLabel}
                      </text>
                    )}

                  {isFinal ? (
                    <g className="stroke-current">
                      <line
                        x1={box.endX - 5}
                        y1={topY}
                        x2={box.endX - 5}
                        y2={bottomY}
                        strokeWidth={1.1}
                      />
                      <line x1={box.endX} y1={topY} x2={box.endX} y2={bottomY} strokeWidth={3.2} />
                    </g>
                  ) : (
                    <line
                      x1={box.endX}
                      y1={topY}
                      x2={box.endX}
                      y2={bottomY}
                      strokeWidth={1.1}
                      className="stroke-current/60"
                    />
                  )}
                </g>
              );
            })}

            {/* 6. Notes, Rests, Ledger Lines, Accidentals, Stems, Flags, Overlays */}
            {placed.map((item) => (
              <StaffNoteNode
                key={item.event.id}
                item={item}
                fifths={keySignature.fifths}
                isRhythmOnly={isRhythmOnly}
                isBeamed={beamedIds.has(item.event.id)}
                showLandmarkCallout={showLandmarkCallout}
                showFingerings={showFingerings}
                showIntervalShapes={showIntervalShapes}
                showRomanNumerals={showRomanNumerals}
                notationScaffold={notationScaffold}
                dimmed={isStaffDimmed(item.event.staff, handMode)}
                isAwaited={isAwaitedNote(item, awaitedBeat, handMode)}
              />
            ))}

            {/* 7. Beams connecting grouped 8th / 16th notes */}
            {[...beamGroups.entries()].map(([groupKey, members]) => {
              if (members.length < 2) return null;
              const first = members[0];
              const last = members[members.length - 1];
              if (!first || !last) return null;
              const beamY1 = first.stemEndY;
              const beamY2 = last.stemEndY;
              const dir = first.stemUp ? 1 : -1;
              const hasSixteenth = members.some((m) => m.event.duration === "sixteenth");
              const beamDimmed = isStaffDimmed(first.event.staff, handMode);

              return (
                <g
                  key={`beam-${groupKey}`}
                  className={`fill-current stroke-current${beamDimmed ? " opacity-35" : ""}`}
                >
                  {members.map((m) => {
                    const t =
                      last.stemX === first.stemX
                        ? 0
                        : (m.stemX - first.stemX) / (last.stemX - first.stemX);
                    const targetY = beamY1 + t * (beamY2 - beamY1);
                    return (
                      <line
                        key={`bstem-${m.event.id}`}
                        x1={m.stemX}
                        y1={m.stemStartY}
                        x2={m.stemX}
                        y2={targetY}
                        strokeWidth={1.35}
                      />
                    );
                  })}
                  <polygon
                    points={`${first.stemX},${beamY1} ${last.stemX},${beamY2} ${last.stemX},${beamY2 + 4 * dir} ${first.stemX},${beamY1 + 4 * dir}`}
                  />
                  {hasSixteenth && (
                    <polygon
                      points={`${first.stemX},${beamY1 + 6 * dir} ${last.stemX},${beamY2 + 6 * dir} ${last.stemX},${beamY2 + 9.5 * dir} ${first.stemX},${beamY1 + 9.5 * dir}`}
                    />
                  )}
                </g>
              );
            })}

            {/* 8. Curved Ties */}
            {!isRhythmOnly &&
              placed.map((item, idx) => {
                if (!item.event.tiedToNext) return null;
                const next = placed
                  .slice(idx + 1)
                  .find(
                    (candidate) =>
                      candidate.event.staff === item.event.staff && !candidate.event.isRest,
                  );
                if (!next) return null;

                return item.pitchPoints.map((pt) => {
                  const targetPt = next.pitchPoints.find((np) => np.pitch.midi === pt.pitch.midi);
                  if (!targetPt) return null;
                  const curveDir = item.stemUp ? 1 : -1;
                  const midX = (item.x + next.x) / 2;
                  const startY = pt.y + 5 * curveDir;
                  const ctrlY = pt.y + 14 * curveDir;
                  return (
                    <path
                      key={`tie-${item.event.id}-${pt.pitch.midi}`}
                      d={`M ${item.x + 5} ${startY} Q ${midX} ${ctrlY}, ${next.x - 5} ${startY}`}
                      className="fill-none stroke-current"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                  );
                });
              })}

            {/* 9. Look-Ahead Curtain over CURRENT Bar (warm Urtext parchment) */}
            {isLookAhead && activeBox && (
              <rect
                ref={curtainRef}
                x={activeBox.startX + 1}
                y={isRhythmOnly ? 20 : 24}
                width={activeBox.width - 2}
                height={svgHeight - 36}
                rx={8}
                className="fill-[#FAF6EE] dark:fill-[#161311]"
                style={{ opacity: lookAheadMaskOpacity, pointerEvents: "none" }}
              />
            )}

            {/* 10. Real-Time Playhead Cursor (rAF-driven when playing) */}
            {staticPlayheadX !== null && (
              <g ref={playheadRef}>
                <line
                  x1={staticPlayheadX}
                  y1={isRhythmOnly ? 20 : 28}
                  x2={staticPlayheadX}
                  y2={isRhythmOnly ? RHYTHM_LH_Y + 22 : BASS_BOTTOM_Y + 14}
                  strokeWidth={2.2}
                  className="stroke-intelligence-blue"
                />
                <circle
                  cx={staticPlayheadX}
                  cy={isRhythmOnly ? 20 : 28}
                  r={3.5}
                  className="fill-intelligence-blue"
                />
              </g>
            )}

            {/* 11. Directly Clickable Measure Hit Areas (replaces cut Bar 1-4 pill row) */}
            {onSelectMeasure &&
              boxes.map((box) => (
                <a
                  key={`hit-m-${box.measure.number}`}
                  href={`#measure-${box.measure.number}`}
                  aria-label={`Jump to Bar ${box.measure.number}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectMeasure(box.measure.number);
                  }}
                >
                  <rect
                    x={box.startX}
                    y={isRhythmOnly ? 16 : 22}
                    width={box.width}
                    height={svgHeight - 30}
                    fill="transparent"
                    className="cursor-pointer"
                  >
                    <title>Jump to Bar {box.measure.number}</title>
                  </rect>
                </a>
              ))}
          </svg>
        </div>
      </section>
    );
  },
);
