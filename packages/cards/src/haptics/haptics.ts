import type { DropResult, OverInfo } from "../drag/schema";

// ---------------------------------------------------------------------------
// Haptics — a thin, pluggable tactile-feedback layer. The default adapter uses
// the web Vibration API, which iOS/iPadOS Safari does NOT implement: there it
// reports unsupported and every call is a silent no-op. The adapter is injectable
// so a future native bridge (Capacitor, a WebView host) drops in and the same
// call sites "just work". Tactile, so it is NOT gated by prefers-reduced-motion.
// ---------------------------------------------------------------------------

export type HapticPatternName = "light" | "medium" | "heavy" | "success" | "warning" | "error";
/** A named pattern, a single duration (ms), or a [vibrate, pause, …] pattern. */
export type HapticPattern = HapticPatternName | number | number[];
export type HapticPatternMap = Record<HapticPatternName, number | number[]>;

export const DEFAULT_HAPTIC_PATTERNS: HapticPatternMap = {
  light: 8,
  medium: 15,
  heavy: 30,
  success: [12, 30, 18],
  warning: [18, 28, 18],
  error: [28, 24, 28],
};

/** Resolve a named/raw pattern to a concrete Vibration spec. */
export function resolveHapticPattern(
  pattern: HapticPattern,
  patterns: HapticPatternMap = DEFAULT_HAPTIC_PATTERNS,
): number | number[] {
  if (typeof pattern === "number" || Array.isArray(pattern)) return pattern;
  return patterns[pattern];
}

/** The seam a native bridge replaces. */
export interface HapticAdapter {
  isSupported(): boolean;
  vibrate(spec: number | number[]): void;
}

/** Default adapter — the web Vibration API (absent on iOS → unsupported). */
export const webVibrationAdapter: HapticAdapter = {
  isSupported: () => typeof navigator !== "undefined" && typeof navigator.vibrate === "function",
  vibrate: (spec) => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(spec);
    }
  },
};

export interface HapticController {
  vibrate(pattern: HapticPattern): void;
  readonly supported: boolean;
  readonly enabled: boolean;
  setEnabled(enabled: boolean): void;
}

export interface HapticOptions {
  adapter?: HapticAdapter;
  patterns?: HapticPatternMap;
  enabled?: boolean;
}

export function createHaptics(options?: HapticOptions): HapticController {
  const adapter = options?.adapter ?? webVibrationAdapter;
  const patterns = options?.patterns ?? DEFAULT_HAPTIC_PATTERNS;
  let enabled = options?.enabled ?? true;
  const supported = adapter.isSupported();

  return {
    get supported() {
      return supported;
    },
    get enabled() {
      return enabled;
    },
    setEnabled(value: boolean) {
      enabled = value;
    },
    vibrate(pattern: HapticPattern) {
      if (!enabled || !supported) return;
      adapter.vibrate(resolveHapticPattern(pattern, patterns));
    },
  };
}

/** Maps drag events to haptic patterns; override any to retune the feel. */
export interface CardHapticMap {
  pickup?: HapticPattern;
  hoverValid?: HapticPattern;
  hoverInvalid?: HapticPattern;
  drop?: HapticPattern;
  swap?: HapticPattern;
}

const DEFAULT_HAPTIC_MAP: Required<CardHapticMap> = {
  pickup: "light",
  hoverValid: "light",
  hoverInvalid: "error",
  drop: "medium",
  swap: "medium",
};

/** Drag → haptics bridge: spread onto a `<Draggable>` to add tactile cues on
 *  pickup, hover transitions, and commit. No-op where unsupported (e.g. iPad). */
export function cardHapticFeedback(
  controller: HapticController,
  map?: CardHapticMap,
): {
  onPickup: () => void;
  onOver: (info: OverInfo) => void;
  onRelease: (result: DropResult) => void;
} {
  const cues = { ...DEFAULT_HAPTIC_MAP, ...map };
  return {
    onPickup: () => controller.vibrate(cues.pickup),
    onOver: (info) => {
      if (info.intent.kind === "blocked") controller.vibrate(cues.hoverInvalid);
      else if (info.target) controller.vibrate(cues.hoverValid);
    },
    onRelease: (result) => {
      if (result.intent.kind === "drop" || result.intent.kind === "replace") {
        controller.vibrate(cues.drop);
      } else if (result.intent.kind === "swap") {
        controller.vibrate(cues.swap);
      }
    },
  };
}
