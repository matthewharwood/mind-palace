import { useEffect, useRef } from "react";

/**
 * Canonical 17-semitone QWERTY piano layout starting on C of `baseOctave`:
 * White keys: A S D F G H J K L ;
 * Black keys:  W E   T Y U   O P
 */
export const QWERTY_PIANO_CODES: Readonly<Record<string, number>> = {
  KeyA: 0, // C
  KeyW: 1, // C#
  KeyS: 2, // D
  KeyE: 3, // D#
  KeyD: 4, // E
  KeyF: 5, // F
  KeyT: 6, // F#
  KeyG: 7, // G
  KeyY: 8, // G#
  KeyH: 9, // A
  KeyU: 10, // A#
  KeyJ: 11, // B
  KeyK: 12, // C+1
  KeyO: 13, // C#+1
  KeyL: 14, // D+1
  KeyP: 15, // D#+1
  Semicolon: 16, // E+1
};

export const SEMITONE_TO_QWERTY_LABEL: Readonly<Record<number, string>> = {
  0: "A",
  1: "W",
  2: "S",
  3: "E",
  4: "D",
  5: "F",
  6: "T",
  7: "G",
  8: "Y",
  9: "H",
  10: "U",
  11: "J",
  12: "K",
  13: "O",
  14: "L",
  15: "P",
  16: ";",
};

export const QWERTY_SHORTCUT_LEGEND: ReadonlyArray<{
  readonly keys: string;
  readonly action: string;
}> = [
  { keys: "A W S E D F T G Y H U J K O L P ;", action: "Play piano notes" },
  { keys: "Z / X", action: "Shift keyboard down / up 1 octave" },
  { keys: "Space", action: "Hold damper pedal (or tap rhythm)" },
  { keys: "F / J", action: "Split-hand polyrhythm (LH / RH)" },
  { keys: "Enter", action: "Play / Stop transport" },
  { keys: "Esc", action: "Exit Focus Mode" },
];

export interface MusicInputMapOptions {
  readonly enabled?: boolean;
  /** C octave mapped to KeyA (default 4 -> Middle C4 = MIDI 60). */
  readonly baseOctave?: number;
  /** Mode for keyboard routing: piano notes, single rhythm tap, or split-hand polyrhythm. */
  readonly mode?: "piano" | "rhythm-single" | "rhythm-split";
  readonly onNoteOn?: (midi: number, velocity: number) => void;
  readonly onNoteOff?: (midi: number) => void;
  readonly onOctaveShift?: (delta: -1 | 1) => void;
  readonly onDamperChange?: (down: boolean) => void;
  readonly onRhythmTap?: (hand: "LH" | "RH" | "single") => void;
  readonly onTogglePlay?: () => void;
  readonly onExitFocus?: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Unified QWERTY input action map for Music Mode.
 * Pairs with Touch + Web MIDI in `TactileKeyboard` so all three input surfaces
 * route through the exact same note, rhythm, transport, and focus handlers.
 */
export function useMusicInputMap(options: MusicInputMapOptions): void {
  const optionsRef = useRef(options);
  const heldNotesRef = useRef<Map<string, number>>(new Map());
  const spaceDownRef = useRef(false);

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    if (options.enabled === false || typeof window === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      const cfg = optionsRef.current;
      if (cfg.enabled === false) return;
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      if (event.code === "Escape") {
        if (cfg.onExitFocus) {
          event.preventDefault();
          cfg.onExitFocus();
        }
        return;
      }

      if (event.code === "Enter") {
        if (cfg.onTogglePlay) {
          event.preventDefault();
          cfg.onTogglePlay();
        }
        return;
      }

      const mode = cfg.mode ?? "piano";

      if (mode === "rhythm-split") {
        if (event.code === "KeyF") {
          event.preventDefault();
          cfg.onRhythmTap?.("LH");
          return;
        }
        if (event.code === "KeyJ") {
          event.preventDefault();
          cfg.onRhythmTap?.("RH");
          return;
        }
      }

      if (event.code === "Space") {
        event.preventDefault();
        if (mode === "rhythm-single" || mode === "rhythm-split") {
          cfg.onRhythmTap?.("single");
        } else if (!spaceDownRef.current) {
          spaceDownRef.current = true;
          cfg.onDamperChange?.(true);
        }
        return;
      }

      if (mode !== "piano") return;

      if (event.code === "KeyZ") {
        event.preventDefault();
        cfg.onOctaveShift?.(-1);
        return;
      }
      if (event.code === "KeyX") {
        event.preventDefault();
        cfg.onOctaveShift?.(1);
        return;
      }

      const semitone = QWERTY_PIANO_CODES[event.code];
      if (semitone === undefined) return;
      if (heldNotesRef.current.has(event.code)) return;

      const baseOctave = cfg.baseOctave ?? 4;
      const midi = (baseOctave + 1) * 12 + semitone;
      if (midi < 21 || midi > 108) return;

      event.preventDefault();
      heldNotesRef.current.set(event.code, midi);
      cfg.onNoteOn?.(midi, 0.78);
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
      const cfg = optionsRef.current;
      if (event.code === "Space" && spaceDownRef.current) {
        spaceDownRef.current = false;
        cfg.onDamperChange?.(false);
        return;
      }
      const heldMidi = heldNotesRef.current.get(event.code);
      if (heldMidi !== undefined) {
        heldNotesRef.current.delete(event.code);
        cfg.onNoteOff?.(heldMidi);
      }
    };

    const handleBlur = (): void => {
      const cfg = optionsRef.current;
      for (const midi of heldNotesRef.current.values()) {
        cfg.onNoteOff?.(midi);
      }
      heldNotesRef.current.clear();
      if (spaceDownRef.current) {
        spaceDownRef.current = false;
        cfg.onDamperChange?.(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      handleBlur();
    };
  }, [options.enabled]);
}
