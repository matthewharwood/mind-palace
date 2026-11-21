import { Eye, EyeOff, Music2, Sparkles } from "lucide-react";
import { type ReactNode, useState } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import {
  BASS_FLAT_STEPS,
  BASS_SHARP_STEPS,
  beamCountForDuration,
  type Clef,
  formatKeySignatureAccidentals,
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
  keySignature: KeySignatureSchema,
  timeSignature: TimeSignatureSchema,
  measures: z.array(StaffMeasureSchema).min(1),
  mode: GrandStaffModeSchema.optional(),
  /** 1-indexed active measure number for playhead & Look-Ahead Mode. */
  activeMeasure: z.int().min(1).optional(),
  /** 0-indexed beat within activeMeasure for the playhead cursor. */
  activeBeat: z.number().min(0).optional(),
  /** Opacity (0..0.95) of the look-ahead mask over the current measure. */
  lookAheadMaskOpacity: z.number().min(0).max(0.95).optional(),
  /** Active spotlight focus during 30-Second Preview Mode. */
  previewFocus: PreviewFocusSchema.optional(),
  onPreviewFocusChange: z.custom<(focus: PreviewFocus) => void>().optional(),
  showRomanNumerals: z.boolean().optional(),
  showIntervalShapes: z.boolean().optional(),
  showFingerings: z.boolean().optional(),
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

function StaffNoteNode({
  item,
  fifths,
  isRhythmOnly,
  isBeamed,
  showLandmarkCallout,
  showFingerings,
  showIntervalShapes,
  showRomanNumerals,
}: {
  item: PlacedNoteEvent;
  fifths: number;
  isRhythmOnly: boolean;
  isBeamed: boolean;
  showLandmarkCallout: boolean;
  showFingerings: boolean;
  showIntervalShapes: boolean;
  showRomanNumerals: boolean;
}): ReactNode {
  const { event } = item;
  const fillCls = statusFillClass(event.status);
  const strokeCls = statusStrokeClass(event.status);

  if (event.isRest || item.pitchPoints.length === 0) {
    return (
      <g className={fillCls}>
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

  return (
    <g>
      {ledgerSteps.map((ls) => {
        const ly = stepToY(ls, event.staff);
        return (
          <line
            key={`${event.id}-ledger-${ls}`}
            x1={item.x - 9.5}
            y1={ly}
            x2={item.x + 9.5}
            y2={ly}
            strokeWidth={1.1}
            className="stroke-current/70"
          />
        );
      })}

      {item.pitchPoints.map((pt, pIdx) => {
        const acc = isRhythmOnly ? null : resolveDisplayedAccidental(pt.pitch, fifths);
        const nx = item.x + pt.dx;
        const showLandmarkRing =
          !isRhythmOnly && showLandmarkCallout && isLandmarkMidi(pt.pitch.midi);

        return (
          <g key={`${event.id}-midi-${pt.pitch.midi}`}>
            {showLandmarkRing && (
              <circle
                cx={nx}
                cy={pt.y}
                r={9.5}
                className="fill-intelligence-blue/15 stroke-intelligence-blue"
                strokeWidth={1.4}
              />
            )}
            {acc && <AccidentalGlyph kind={acc} x={item.x - 13 - (pIdx % 2) * 5} y={pt.y} />}
            <ellipse
              cx={nx}
              cy={pt.y}
              rx={NOTE_RX}
              ry={NOTE_RY}
              transform={`rotate(-18 ${nx} ${pt.y})`}
              className={isHollow ? `fill-canvas-white ${strokeCls}` : fillCls}
              strokeWidth={isHollow ? 1.8 : 0}
            />
            {dotted && (
              <circle cx={nx + NOTE_RX + 4.5} cy={pt.y - 1.5} r={1.7} className={fillCls} />
            )}
          </g>
        );
      })}

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
      <NoteOverlays
        item={item}
        fillCls={fillCls}
        strokeCls={strokeCls}
        isRhythmOnly={isRhythmOnly}
        showFingerings={showFingerings}
        showIntervalShapes={showIntervalShapes}
        showRomanNumerals={showRomanNumerals}
      />
    </g>
  );
}

export const GrandStaff = defineComponent(
  GrandStaffPropsSchema,
  ({
    title,
    composer,
    keySignature,
    timeSignature,
    measures,
    mode = "standard",
    activeMeasure,
    activeBeat = 0,
    lookAheadMaskOpacity = 0.72,
    previewFocus: controlledPreviewFocus,
    onPreviewFocusChange,
    showRomanNumerals = false,
    showIntervalShapes = false,
    showFingerings = false,
    onSelectMeasure,
  }: GrandStaffProps): ReactNode => {
    const [internalPreviewFocus, setInternalPreviewFocus] = useState<PreviewFocus>("all");
    const [localVeilEnabled, setLocalVeilEnabled] = useState(true);

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
    const playheadX = activeBox
      ? activeBox.startX +
        MEASURE_PAD_LEFT +
        Math.min(activeBeat / Math.max(beatsPerMeasure, 1), 0.96) *
          (activeBox.width - MEASURE_PAD_LEFT - MEASURE_PAD_RIGHT)
      : null;

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
        className="w-full rounded-card border border-black/10 bg-canvas-white p-3 shadow-card sm:p-4 dark:border-white/10"
      >
        {/* Header Bar: Title + Pedagogical Mode Controls */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {title && (
                <h3 className="truncate text-sm font-semibold text-midnight-ink sm:text-base">
                  {title}
                </h3>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-light-taupe px-2 py-0.5 font-mono text-[11px] font-medium text-surface-charcoal">
                {keySignature.label}
              </span>
              <span className="inline-flex items-center rounded-full bg-light-taupe px-2 py-0.5 font-mono text-[11px] font-medium text-muted-ash">
                {timeSignature.numerator}/{timeSignature.denominator}
              </span>
            </div>
            {composer && <p className="mt-0.5 text-xs text-muted-ash">{composer}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {isLookAhead && (
              <button
                type="button"
                onClick={() => setLocalVeilEnabled((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-full border border-intelligence-blue/30 bg-intelligence-blue/10 px-2.5 py-1 text-xs font-medium text-intelligence-blue transition-colors hover:bg-intelligence-blue/15"
                aria-pressed={localVeilEnabled}
              >
                {localVeilEnabled ? (
                  <EyeOff className="size-3.5" aria-hidden="true" />
                ) : (
                  <Eye className="size-3.5" aria-hidden="true" />
                )}
                <span>{localVeilEnabled ? "Look-Ahead Veil On" : "Veil Paused"}</span>
              </button>
            )}

            {isRhythmOnly && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
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
                          ? "rounded-full bg-intelligence-blue px-2.5 py-1 text-xs font-medium text-white transition-colors"
                          : "rounded-full bg-light-taupe px-2.5 py-1 text-xs font-medium text-muted-ash transition-colors hover:text-midnight-ink"
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

        {/* 30-Second Preview Banner */}
        {isPreview && (
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs text-surface-charcoal">
            <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
              <Sparkles className="size-3.5" aria-hidden="true" />
              30-Second Page Preview
            </span>
            <span>
              <strong>Key:</strong> {keySignature.label} (
              {formatKeySignatureAccidentals(keySignature.fifths)})
            </span>
            <span>
              <strong>Meter:</strong> {timeSignature.numerator}/{timeSignature.denominator}
            </span>
            <span>
              <strong>Scan:</strong> Landmarks &amp; Hardest Bar before touching keys
            </span>
          </div>
        )}

        {/* Responsive Scrollable SVG Engraving Container */}
        <div className="w-full overflow-x-auto pb-1" style={{ touchAction: "pan-x" }}>
          <svg
            viewBox={`0 0 ${totalWidth} ${svgHeight}`}
            className="h-auto w-full min-w-[340px] select-none text-midnight-ink"
            role="img"
            aria-label={`${keySignature.label}, ${timeSignature.numerator}/${timeSignature.denominator}, ${measures.length} measures`}
          >
            {/* 1. Measure Background Spotlights */}
            {boxes.map((box) => {
              const isNextSpotlight = isLookAhead && nextMeasureNumber === box.measure.number;
              const isHardest = Boolean(box.measure.isHardestBar) && showHardestCallout;
              return (
                <g key={`bg-${box.measure.number}`}>
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
                      className="stroke-current/45"
                    />
                    <line
                      x1={LEFT_MARGIN}
                      y1={BASS_TOP_Y + lineOffset * LINE_SPACING}
                      x2={totalWidth - 18}
                      y2={BASS_TOP_Y + lineOffset * LINE_SPACING}
                      strokeWidth={0.95}
                      className="stroke-current/45"
                    />
                  </g>
                ))}
                <TrebleClefGlyph x={CLEF_X + 6} gLineY={stepToY(4, "treble")} />
                <BassClefGlyph x={CLEF_X + 2} fLineY={stepToY(-4, "bass")} />
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

                  {showRomanNumerals && box.measure.harmonyLabel && !isRhythmOnly && (
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

              return (
                <g key={`beam-${groupKey}`} className="fill-current stroke-current">
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

            {/* 9. Look-Ahead Mask Veil over CURRENT Bar */}
            {isLookAhead && localVeilEnabled && activeBox && (
              <rect
                x={activeBox.startX + 1}
                y={isRhythmOnly ? 20 : 24}
                width={activeBox.width - 2}
                height={svgHeight - 36}
                rx={8}
                className="fill-canvas-white transition-opacity duration-200"
                style={{ opacity: lookAheadMaskOpacity }}
              />
            )}

            {/* 10. Real-Time Playhead Cursor */}
            {playheadX !== null && (
              <g>
                <line
                  x1={playheadX}
                  y1={isRhythmOnly ? 20 : 28}
                  x2={playheadX}
                  y2={isRhythmOnly ? RHYTHM_LH_Y + 22 : BASS_BOTTOM_Y + 14}
                  strokeWidth={2.2}
                  className="stroke-intelligence-blue"
                />
                <circle
                  cx={playheadX}
                  cy={isRhythmOnly ? 20 : 28}
                  r={3.5}
                  className="fill-intelligence-blue"
                />
              </g>
            )}
          </svg>
        </div>

        {/* Accessible Measure Jump Strip (when onSelectMeasure is provided) */}
        {onSelectMeasure && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {measures.map((m) => (
              <button
                key={`jump-m-${m.number}`}
                type="button"
                onClick={() => onSelectMeasure(m.number)}
                className={
                  activeMeasure === m.number
                    ? "rounded-full bg-intelligence-blue px-2.5 py-0.5 font-mono text-[11px] font-semibold text-white"
                    : "rounded-full bg-light-taupe px-2.5 py-0.5 font-mono text-[11px] font-medium text-muted-ash hover:text-midnight-ink"
                }
              >
                Bar {m.number}
              </button>
            ))}
          </div>
        )}
      </section>
    );
  },
);
