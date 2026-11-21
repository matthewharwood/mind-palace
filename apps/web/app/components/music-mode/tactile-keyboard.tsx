import { ChevronLeft, ChevronRight, Eye, EyeOff, Hand, Radio } from "lucide-react";
import { type PointerEvent, type ReactNode, useEffect, useRef, useState } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import { isBlackKeyMidi, midiToNoteName } from "./types";
import { SEMITONE_TO_QWERTY_LABEL } from "./use-music-input-map";

export const HandFrameOverlaySchema = z.object({
  hand: z.enum(["LH", "RH"]),
  /** Lowest MIDI note (white key) of the 5-finger frame, e.g. 60 for C4-G4. */
  rootMidi: z.int().min(21).max(101),
  label: z.string().min(1).optional(),
});

export const IntervalBracketSchema = z.object({
  fromMidi: z.int().min(21).max(108),
  toMidi: z.int().min(21).max(108),
  label: z.string().min(1),
});

export const TactileKeyboardPropsSchema = z.object({
  /** Starting C octave (e.g. 3 for C3, 4 for C4). Defaults to 3. */
  startOctave: z.int().min(1).max(6).optional(),
  /** Number of octaves to display. Auto-adapts (2 mobile / 3 tablet / 4 iPad Pro) when omitted. */
  octaves: z.int().min(1).max(5).optional(),
  pressedNotes: z.array(z.int().min(21).max(108)).optional(),
  targetNotes: z.array(z.int().min(21).max(108)).optional(),
  correctNotes: z.array(z.int().min(21).max(108)).optional(),
  wrongNotes: z.array(z.int().min(21).max(108)).optional(),
  /** Hides note letter labels by default to build tactile landmark awareness. */
  showNoteLabels: z.boolean().optional(),
  /** Optional QWERTY key hints (off by default per quiet craft guardrails). */
  showQwertyHints: z.boolean().optional(),
  /** Base C octave mapped to KeyA for QWERTY hints (defaults to 4 / Middle C). */
  qwertyBaseOctave: z.int().min(1).max(6).optional(),
  /** Emphasizes 2-black and 3-black tactile key clusters. Defaults to true. */
  emphasizeBlackClusters: z.boolean().optional(),
  /** Initial state of the "No-Peeking / Feel the Keys" veil. */
  blindVeil: z.boolean().optional(),
  /** Show inline veil toggle only in standalone stories; hidden in Studio (Controls popover owns it). */
  showVeilToggle: z.boolean().optional(),
  onBlindVeilChange: z.custom<(veiled: boolean) => void>().optional(),
  octaveShift: z.int().min(-3).max(3).optional(),
  onOctaveShiftChange: z.custom<(shift: number) => void>().optional(),
  handFrames: z.array(HandFrameOverlaySchema).optional(),
  intervalBracket: IntervalBracketSchema.optional(),
  enableWebMidi: z.boolean().optional(),
  onNoteOn: z.custom<(midi: number, velocity: number) => void>().optional(),
  onNoteOff: z.custom<(midi: number) => void>().optional(),
});
export type TactileKeyboardProps = z.infer<typeof TactileKeyboardPropsSchema>;

interface KeyDescriptor {
  midi: number;
  isBlack: boolean;
  /** Index among white keys (0..whiteCount-1) for white keys, or preceding white key index for black keys. */
  whiteIndex: number;
  pitchClass: number;
}

function buildKeyboardKeys(
  startOctave: number,
  octaves: number,
): {
  whiteKeys: KeyDescriptor[];
  blackKeys: KeyDescriptor[];
  allKeys: KeyDescriptor[];
} {
  const startMidi = (startOctave + 1) * 12; // C of startOctave
  const totalSemitones = octaves * 12;
  const whiteKeys: KeyDescriptor[] = [];
  const blackKeys: KeyDescriptor[] = [];
  const allKeys: KeyDescriptor[] = [];

  let whiteIdx = 0;
  for (let offset = 0; offset < totalSemitones; offset += 1) {
    const midi = startMidi + offset;
    if (midi > 108) break;
    const isBlack = isBlackKeyMidi(midi);
    const pitchClass = ((midi % 12) + 12) % 12;
    if (isBlack) {
      const desc: KeyDescriptor = { midi, isBlack: true, whiteIndex: whiteIdx - 1, pitchClass };
      blackKeys.push(desc);
      allKeys.push(desc);
    } else {
      const desc: KeyDescriptor = { midi, isBlack: false, whiteIndex: whiteIdx, pitchClass };
      whiteKeys.push(desc);
      allKeys.push(desc);
      whiteIdx += 1;
    }
  }
  return { whiteKeys, blackKeys, allKeys };
}

/**
 * Returns the 5 consecutive diatonic white-key MIDI numbers starting from rootMidi.
 */
function getFiveFingerWhiteMidis(rootMidi: number): number[] {
  const result: number[] = [];
  let cursor = rootMidi;
  while (result.length < 5 && cursor <= 108) {
    if (!isBlackKeyMidi(cursor)) {
      result.push(cursor);
    }
    cursor += 1;
  }
  return result;
}

function keyCenterPercent(
  midi: number,
  whiteKeys: KeyDescriptor[],
  blackKeys: KeyDescriptor[],
): number | null {
  const whiteCount = whiteKeys.length;
  if (whiteCount === 0) return null;
  const wk = whiteKeys.find((k) => k.midi === midi);
  if (wk) return ((wk.whiteIndex + 0.5) / whiteCount) * 100;
  const bk = blackKeys.find((k) => k.midi === midi);
  if (bk) return ((bk.whiteIndex + 1) / whiteCount) * 100;
  return null;
}

function whiteKeyStateClass(
  isPressed: boolean,
  isCorrect: boolean,
  isWrong: boolean,
  isTarget: boolean,
): string {
  if (isWrong) {
    return "bg-gradient-to-b from-rose-100 to-rose-200 border-rose-400 dark:from-rose-950/80 dark:to-rose-900/70 dark:border-rose-500";
  }
  if (isCorrect) {
    return "bg-gradient-to-b from-emerald-100 to-emerald-200 border-emerald-400 dark:from-emerald-950/80 dark:to-emerald-900/70 dark:border-emerald-500";
  }
  if (isPressed) {
    return "bg-gradient-to-b from-[#E8F1FE] to-[#D5E6FC] border-intelligence-blue translate-y-[2px] shadow-[inset_0_3px_6px_rgba(17,17,17,0.22)]";
  }
  if (isTarget) {
    return "bg-gradient-to-b from-[#F5F9FF] to-[#E6F0FD] border-intelligence-blue/50 dark:from-sky-950/45 dark:to-sky-900/40 dark:border-intelligence-blue/50";
  }
  return "bg-gradient-to-b from-[#FCFBF7] via-[#F8F5ED] to-[#EEE8DC] hover:from-[#F7F4EC] hover:to-[#E8E1D3] border-black/15 shadow-[inset_0_-3px_0_rgba(0,0,0,0.06)] dark:from-[#F3EFE6] dark:via-[#EAE4D7] dark:to-[#DED6C6] dark:border-black/35";
}

function blackKeyStateClass(
  isPressed: boolean,
  isCorrect: boolean,
  isWrong: boolean,
  isTarget: boolean,
): string {
  if (isWrong) return "bg-gradient-to-b from-rose-500 to-rose-700 border-rose-400";
  if (isCorrect) return "bg-gradient-to-b from-emerald-500 to-emerald-700 border-emerald-400";
  if (isPressed) {
    return "bg-gradient-to-b from-intelligence-blue to-[#1D6AD6] border-sky-300 translate-y-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]";
  }
  if (isTarget) return "bg-gradient-to-b from-[#294F7E] to-[#173050] border-intelligence-blue";
  return "bg-gradient-to-b from-[#313036] via-[#1B1A1F] to-[#0F0E12] hover:from-[#3D3C44] hover:to-[#18171C] border-black shadow-[0_4px_6px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18)]";
}

interface WebMidiInputLike {
  name?: string | null;
  onmidimessage: ((event: { data: Uint8Array | null }) => void) | null;
}

interface WebMidiAccessLike {
  inputs: { values: () => IterableIterator<WebMidiInputLike> };
  onstatechange: (() => void) | null;
}

function dispatchMidiBytes(
  data: Uint8Array | null,
  onNoteOn: (midi: number, velocity: number) => void,
  onNoteOff: (midi: number) => void,
): void {
  if (!data || data.length < 3) return;
  const status = (data[0] ?? 0) & 0xf0;
  const note = data[1] ?? 0;
  const velocity = data[2] ?? 0;
  if (status === 0x90 && velocity > 0) {
    onNoteOn(note, Math.min(1, velocity / 127));
  } else if (status === 0x80 || (status === 0x90 && velocity === 0)) {
    onNoteOff(note);
  }
}

function attachMidiInputs(
  access: WebMidiAccessLike,
  onNoteOn: (midi: number, velocity: number) => void,
  onNoteOff: (midi: number) => void,
  onDeviceName: (name: string | null) => void,
): void {
  const names: string[] = [];
  for (const input of access.inputs.values()) {
    if (input.name) names.push(input.name);
    input.onmidimessage = (event) => {
      dispatchMidiBytes(event.data, onNoteOn, onNoteOff);
    };
  }
  onDeviceName(names[0] ?? null);
}

function connectWebMidi(
  onNoteOn: (midi: number, velocity: number) => void,
  onNoteOff: (midi: number) => void,
  onDeviceName: (name: string | null) => void,
): () => void {
  if (typeof navigator === "undefined") return () => undefined;
  const nav = navigator as unknown as {
    requestMIDIAccess?: () => Promise<WebMidiAccessLike>;
  };
  if (typeof nav.requestMIDIAccess !== "function") return () => undefined;

  let active = true;
  let accessRef: WebMidiAccessLike | null = null;

  void nav
    .requestMIDIAccess()
    .then((access) => {
      if (!active) return;
      accessRef = access;
      attachMidiInputs(access, onNoteOn, onNoteOff, onDeviceName);
      access.onstatechange = () => {
        if (active) attachMidiInputs(access, onNoteOn, onNoteOff, onDeviceName);
      };
    })
    .catch(() => {
      if (active) onDeviceName(null);
    });

  return () => {
    active = false;
    if (accessRef) {
      accessRef.onstatechange = null;
      for (const input of accessRef.inputs.values()) {
        input.onmidimessage = null;
      }
    }
  };
}

function addUniqueNote(prev: number[], note: number): number[] {
  return prev.includes(note) ? prev : [...prev, note];
}

function removeNote(prev: number[], note: number): number[] {
  return prev.filter((n) => n !== note);
}

export const TactileKeyboard = defineComponent(
  TactileKeyboardPropsSchema,
  ({
    startOctave: initialStartOctave = 3,
    octaves: controlledOctaves,
    pressedNotes = [],
    targetNotes = [],
    correctNotes = [],
    wrongNotes = [],
    showNoteLabels = false,
    showQwertyHints = false,
    qwertyBaseOctave = 4,
    emphasizeBlackClusters = true,
    blindVeil: controlledBlindVeil,
    showVeilToggle = false,
    onBlindVeilChange,
    octaveShift: controlledOctaveShift,
    onOctaveShiftChange,
    handFrames = [],
    intervalBracket,
    enableWebMidi = true,
    onNoteOn,
    onNoteOff,
  }: TactileKeyboardProps): ReactNode => {
    const [internalOctaveShift, setInternalOctaveShift] = useState(0);
    const [responsiveOctaves, setResponsiveOctaves] = useState(2);
    const [internalBlindVeil, setInternalBlindVeil] = useState(false);
    const [localPressed, setLocalPressed] = useState<number[]>([]);
    const [midiPressed, setMidiPressed] = useState<number[]>([]);
    const [midiDeviceName, setMidiDeviceName] = useState<string | null>(null);

    const octaveShift = controlledOctaveShift ?? internalOctaveShift;
    const shiftOctave = (delta: -1 | 1): void => {
      const next = Math.max(-3, Math.min(3, octaveShift + delta));
      setInternalOctaveShift(next);
      onOctaveShiftChange?.(next);
    };

    const pointerNotesRef = useRef<Map<number, number>>(new Map());
    const onNoteOnRef = useRef(onNoteOn);
    const onNoteOffRef = useRef(onNoteOff);

    useEffect(() => {
      onNoteOnRef.current = onNoteOn;
      onNoteOffRef.current = onNoteOff;
    }, [onNoteOn, onNoteOff]);

    // Responsive octave span: 2 on mobile Pixel 11 Pro, 3 on md tablet, 4 on iPad Pro 13" landscape
    useEffect(() => {
      if (controlledOctaves !== undefined || typeof window === "undefined") return;
      const updateSpan = (): void => {
        const w = window.innerWidth;
        if (w >= 1180) setResponsiveOctaves(4);
        else if (w >= 768) setResponsiveOctaves(3);
        else setResponsiveOctaves(2);
      };
      updateSpan();
      window.addEventListener("resize", updateSpan);
      return () => window.removeEventListener("resize", updateSpan);
    }, [controlledOctaves]);

    // Web MIDI input hook (SSR-safe, graceful no-op when unsupported)
    useEffect(() => {
      if (!enableWebMidi) return;
      const handleMidiOn = (note: number, vel: number): void => {
        setMidiPressed((prev) => addUniqueNote(prev, note));
        onNoteOnRef.current?.(note, vel);
      };
      const handleMidiOff = (note: number): void => {
        setMidiPressed((prev) => removeNote(prev, note));
        onNoteOffRef.current?.(note);
      };
      return connectWebMidi(handleMidiOn, handleMidiOff, setMidiDeviceName);
    }, [enableWebMidi]);

    const effectiveOctaves = controlledOctaves ?? responsiveOctaves;
    const clampedStartOctave = Math.max(
      1,
      Math.min(7 - effectiveOctaves, initialStartOctave + octaveShift),
    );
    const { whiteKeys, blackKeys } = buildKeyboardKeys(clampedStartOctave, effectiveOctaves);
    const whiteCount = whiteKeys.length;
    const octaveNumbers = Array.from(
      { length: effectiveOctaves },
      (_, offset) => clampedStartOctave + offset,
    );

    const isVeiled = controlledBlindVeil ?? internalBlindVeil;
    const toggleVeil = (): void => {
      const next = !isVeiled;
      setInternalBlindVeil(next);
      onBlindVeilChange?.(next);
    };

    const pressedSet = new Set([...pressedNotes, ...localPressed, ...midiPressed]);
    const targetSet = new Set(targetNotes);
    const correctSet = new Set(correctNotes);
    const wrongSet = new Set(wrongNotes);

    const handleKeyPointerDown = (midi: number, event: PointerEvent<HTMLButtonElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic test pointer events may not support capture
      }
      pointerNotesRef.current.set(event.pointerId, midi);
      setLocalPressed((prev) => (prev.includes(midi) ? prev : [...prev, midi]));
      const velocity = event.pressure > 0 && event.pressure <= 1 ? event.pressure : 0.78;
      onNoteOn?.(midi, velocity);
    };

    const releasePointer = (pointerId: number): void => {
      const midi = pointerNotesRef.current.get(pointerId);
      if (midi === undefined) return;
      pointerNotesRef.current.delete(pointerId);
      setLocalPressed((prev) => prev.filter((n) => n !== midi));
      onNoteOff?.(midi);
    };

    const rangeStartLabel = `C${clampedStartOctave}`;
    const rangeEndLabel = `B${clampedStartOctave + effectiveOctaves - 1}`;

    const bracketFromPct = intervalBracket
      ? keyCenterPercent(intervalBracket.fromMidi, whiteKeys, blackKeys)
      : null;
    const bracketToPct = intervalBracket
      ? keyCenterPercent(intervalBracket.toMidi, whiteKeys, blackKeys)
      : null;

    const qwertyBaseMidi = (qwertyBaseOctave + 1) * 12;

    return (
      <section
        aria-label="Tactile piano keyboard"
        className="w-full overflow-hidden rounded-card border border-[#3B2618]/40 bg-[#2C1B11] shadow-card dark:border-[#4A3222]"
      >
        {/* Concert-Grand Walnut Fallboard */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-b from-[#4A2E1E] via-[#3A2316] to-[#2B190F] px-3 py-2 text-[#EFE6D8]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Shift down one octave"
              disabled={clampedStartOctave <= 1}
              onClick={() => shiftOctave(-1)}
              className="inline-flex size-11 items-center justify-center rounded-lg border border-white/15 bg-black/25 text-[#F4ECE0] transition-colors hover:bg-black/40 disabled:opacity-35"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <span className="min-w-[74px] text-center font-mono text-xs font-medium text-[#E5D7C3]">
              {rangeStartLabel} – {rangeEndLabel}
            </span>
            <button
              type="button"
              aria-label="Shift up one octave"
              disabled={clampedStartOctave + effectiveOctaves >= 7}
              onClick={() => shiftOctave(1)}
              className="inline-flex size-11 items-center justify-center rounded-lg border border-white/15 bg-black/25 text-[#F4ECE0] transition-colors hover:bg-black/40 disabled:opacity-35"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {midiDeviceName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 font-mono text-[11px] font-medium text-emerald-200">
                <Radio className="size-3" aria-hidden="true" />
                MIDI: {midiDeviceName}
              </span>
            )}

            {showVeilToggle && (
              <button
                type="button"
                aria-pressed={isVeiled}
                onClick={toggleVeil}
                className={
                  isVeiled
                    ? "inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#F5EFE4] px-3 py-1 text-xs font-medium text-[#1F150E] transition-colors"
                    : "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-xs font-medium text-[#EFE6D8] transition-colors hover:bg-black/40"
                }
              >
                {isVeiled ? (
                  <EyeOff className="size-3.5" aria-hidden="true" />
                ) : (
                  <Eye className="size-3.5" aria-hidden="true" />
                )}
                <span>{isVeiled ? "Blind Veil On" : "Blind Veil"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Crimson Felt Dust Strip */}
        <div
          aria-hidden="true"
          className="h-1.5 w-full bg-gradient-to-b from-[#9E2229] to-[#6E1419] shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)]"
        />

        <div className="bg-[#1C1816] px-2 pt-1.5 pb-2.5 sm:px-3 sm:pb-3">
          {/* 2-Black / 3-Black Tactile Cluster Strip */}
          {emphasizeBlackClusters && whiteCount > 0 && (
            <div className="relative mb-1 h-4 w-full select-none" aria-hidden="true">
              {octaveNumbers.map((octaveNum) => {
                const octOffset = octaveNum - clampedStartOctave;
                const baseWhite = octOffset * 7;
                const twoLeft = ((baseWhite + 0.65) / whiteCount) * 100;
                const twoWidth = (1.7 / whiteCount) * 100;
                const threeLeft = ((baseWhite + 3.65) / whiteCount) * 100;
                const threeWidth = (2.7 / whiteCount) * 100;
                return (
                  <div key={`cluster-oct-${octaveNum}`}>
                    <div
                      className="absolute top-0.5 flex items-center justify-center rounded-full border border-amber-400/45 bg-amber-500/15 font-mono text-[9px] font-bold text-amber-300"
                      style={{ left: `${twoLeft}%`, width: `${twoWidth}%` }}
                    >
                      2
                    </div>
                    <div
                      className="absolute top-0.5 flex items-center justify-center rounded-full border border-sky-400/45 bg-sky-500/15 font-mono text-[9px] font-bold text-sky-300"
                      style={{ left: `${threeLeft}%`, width: `${threeWidth}%` }}
                    >
                      3
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Interval Span Bracket Overlay */}
          {intervalBracket && bracketFromPct !== null && bracketToPct !== null && (
            <div
              role="img"
              aria-label={`Interval ${intervalBracket.label}`}
              className="relative mb-1.5 h-6 w-full select-none"
            >
              <div
                className="absolute top-2.5 h-3 rounded-t-md border-x-2 border-t-2 border-intelligence-blue"
                style={{
                  left: `${Math.min(bracketFromPct, bracketToPct)}%`,
                  width: `${Math.max(Math.abs(bracketToPct - bracketFromPct), 2)}%`,
                }}
              />
              <span
                className="absolute top-0 -translate-x-1/2 rounded-full bg-intelligence-blue px-2 py-0.5 font-mono text-[10px] font-bold text-white"
                style={{ left: `${(bracketFromPct + bracketToPct) / 2}%` }}
              >
                {intervalBracket.label}
              </span>
            </div>
          )}

          {/* Main Piano Keybed (Multi-touch, touch-action: none) */}
          <div
            className="relative h-40 w-full select-none overflow-hidden rounded-b-xl border border-black/40 bg-[#141316] sm:h-48 lg:h-52"
            style={{ touchAction: "none" }}
          >
            {/* White Keys */}
            <div className="flex size-full">
              {whiteKeys.map((key) => {
                const isPressed = pressedSet.has(key.midi);
                const isTarget = targetSet.has(key.midi);
                const isCorrect = correctSet.has(key.midi);
                const isWrong = wrongSet.has(key.midi);
                const isMiddleC = key.midi === 60;
                const name = midiToNoteName(key.midi);
                const qwertyHint = showQwertyHints
                  ? SEMITONE_TO_QWERTY_LABEL[key.midi - qwertyBaseMidi]
                  : undefined;

                return (
                  <button
                    key={key.midi}
                    type="button"
                    aria-label={`Piano key ${name}`}
                    aria-pressed={isPressed}
                    data-midi={key.midi}
                    onPointerDown={(e) => handleKeyPointerDown(key.midi, e)}
                    onPointerUp={(e) => releasePointer(e.pointerId)}
                    onPointerCancel={(e) => releasePointer(e.pointerId)}
                    onLostPointerCapture={(e) => releasePointer(e.pointerId)}
                    className={`relative flex h-full flex-1 flex-col items-center justify-end rounded-b-[4px] border-r pb-2 transition-transform duration-75 last:border-r-0 ${whiteKeyStateClass(isPressed, isCorrect, isWrong, isTarget)}`}
                  >
                    {isMiddleC && (
                      <span
                        aria-hidden="true"
                        className="mb-1 size-1.5 rounded-full bg-intelligence-blue/75"
                      />
                    )}
                    {isTarget && !isCorrect && !isWrong && (
                      <span
                        aria-hidden="true"
                        className="mb-1.5 size-2.5 rounded-full bg-intelligence-blue shadow-sm"
                      />
                    )}
                    {qwertyHint && (
                      <span className="mb-0.5 rounded bg-black/8 px-1 font-mono text-[9px] font-semibold text-neutral-600">
                        {qwertyHint}
                      </span>
                    )}
                    {showNoteLabels && (
                      <span className="font-mono text-[10px] font-semibold text-neutral-700">
                        {name}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Black Keys */}
            {blackKeys.map((key) => {
              const isPressed = pressedSet.has(key.midi);
              const isTarget = targetSet.has(key.midi);
              const isCorrect = correctSet.has(key.midi);
              const isWrong = wrongSet.has(key.midi);
              const name = midiToNoteName(key.midi);
              const widthPct = (0.64 / whiteCount) * 100;
              const leftPct = ((key.whiteIndex + 1) / whiteCount) * 100 - widthPct / 2;
              const isTwoCluster = key.pitchClass === 1 || key.pitchClass === 3;
              const qwertyHint = showQwertyHints
                ? SEMITONE_TO_QWERTY_LABEL[key.midi - qwertyBaseMidi]
                : undefined;

              return (
                <button
                  key={key.midi}
                  type="button"
                  aria-label={`Piano key ${name}`}
                  aria-pressed={isPressed}
                  data-midi={key.midi}
                  onPointerDown={(e) => handleKeyPointerDown(key.midi, e)}
                  onPointerUp={(e) => releasePointer(e.pointerId)}
                  onPointerCancel={(e) => releasePointer(e.pointerId)}
                  onLostPointerCapture={(e) => releasePointer(e.pointerId)}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  className={`absolute top-0 z-10 flex h-[60%] flex-col items-center justify-end rounded-b-lg border-x border-b pb-2 transition-transform duration-75 ${blackKeyStateClass(isPressed, isCorrect, isWrong, isTarget)}`}
                >
                  {emphasizeBlackClusters && (
                    <span
                      aria-hidden="true"
                      className={`mb-auto mt-2 h-1 w-3 rounded-full ${isTwoCluster ? "bg-amber-400/85" : "bg-sky-400/85"}`}
                    />
                  )}
                  {isTarget && !isCorrect && !isWrong && (
                    <span aria-hidden="true" className="mb-1 size-2 rounded-full bg-sky-300" />
                  )}
                  {qwertyHint && (
                    <span className="mb-0.5 font-mono text-[8px] font-semibold text-white/70">
                      {qwertyHint}
                    </span>
                  )}
                  {showNoteLabels && (
                    <span className="font-mono text-[8px] font-semibold text-white/85">
                      {name.slice(0, -1)}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Textured Charcoal-Velvet Blind Veil (keeps 2/3-black landmark clusters readable) */}
            {isVeiled && (
              <output
                aria-label="No-peeking blind tactile veil active"
                className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-end bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[#1A191C]/72 bg-[size:6px_6px] pb-3 backdrop-blur-[1.5px]"
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-xs font-medium text-white/90">
                  <Hand className="size-3.5 text-amber-300" aria-hidden="true" />
                  Eyes on Score • Feel the 2 &amp; 3 Black Clusters
                </span>
              </output>
            )}
          </div>

          {/* 5-Finger Hand-Frame Brackets */}
          {handFrames.length > 0 && whiteCount > 0 && (
            <div className="relative mt-2 h-9 w-full select-none">
              {handFrames.map((frame) => {
                const fiveMidis = getFiveFingerWhiteMidis(frame.rootMidi);
                const visibleKeys = fiveMidis
                  .map((m) => whiteKeys.find((wk) => wk.midi === m))
                  .filter((wk): wk is KeyDescriptor => wk !== undefined);
                if (visibleKeys.length === 0) return null;

                const firstIdx = visibleKeys[0]?.whiteIndex ?? 0;
                const lastIdx = visibleKeys[visibleKeys.length - 1]?.whiteIndex ?? firstIdx;
                const leftPct = (firstIdx / whiteCount) * 100;
                const widthPct = ((lastIdx - firstIdx + 1) / whiteCount) * 100;
                const isRH = frame.hand === "RH";
                const fingerOrder = isRH ? [1, 2, 3, 4, 5] : [5, 4, 3, 2, 1];

                return (
                  <div
                    key={`${frame.hand}-${frame.rootMidi}`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    className={`absolute top-0 flex flex-col items-center rounded-b-lg border-x-2 border-b-2 px-1 pb-0.5 ${
                      isRH
                        ? "border-intelligence-blue/70 bg-intelligence-blue/15 text-sky-200"
                        : "border-emerald-400/70 bg-emerald-500/15 text-emerald-200"
                    }`}
                  >
                    <div className="flex w-full justify-around font-mono text-[10px] font-bold">
                      {fingerOrder.slice(0, visibleKeys.length).map((f) => (
                        <span key={`${frame.hand}-f-${f}`}>{f}</span>
                      ))}
                    </div>
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-wide">
                      {frame.label ?? `${frame.hand} 5-Finger Frame`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    );
  },
);
