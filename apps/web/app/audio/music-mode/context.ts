import type { StereoBuffer } from "./dsp-core";
import {
  type AudioPreferences,
  type AudioPreferencesInput,
  AudioPreferencesSchema,
} from "./schemas";

interface MusicAudioGraph {
  readonly context: AudioContext;
  readonly masterGain: GainNode;
  readonly pianoGain: GainNode;
  readonly metronomeGain: GainNode;
  readonly sfxGain: GainNode;
  readonly limiter: DynamicsCompressorNode;
}

type WebkitAudioWindow = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

let graph: MusicAudioGraph | null = null;
let preferences: AudioPreferences = AudioPreferencesSchema.parse({});
let unlocked = false;
let unlockListenersInstalled = false;

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const win = window as WebkitAudioWindow;
  if (typeof win.AudioContext === "function") return win.AudioContext;
  if (typeof win.webkitAudioContext === "function") return win.webkitAudioContext;
  return null;
}

function applyGainPreferences(g: MusicAudioGraph, prefs: AudioPreferences): void {
  const now = g.context.currentTime;
  const master = prefs.muted ? 0 : prefs.masterVolume;
  g.masterGain.gain.setTargetAtTime(master, now, 0.01);
  g.pianoGain.gain.setTargetAtTime(prefs.pianoVolume, now, 0.01);
  g.metronomeGain.gain.setTargetAtTime(prefs.metronomeVolume, now, 0.01);
  g.sfxGain.gain.setTargetAtTime(prefs.sfxVolume, now, 0.01);
}

/** Lazily initialize the Web Audio graph with safety limiter and per-bus gains. */
export function getMusicAudioGraph(): MusicAudioGraph | null {
  if (graph) return graph;
  const Ctor = getAudioContextConstructor();
  if (!Ctor) return null;

  const context = new Ctor();
  const masterGain = context.createGain();
  const pianoGain = context.createGain();
  const metronomeGain = context.createGain();
  const sfxGain = context.createGain();

  // Gentle master safety limiter prevents digital clipping during dense polyphonic passages
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.08;

  pianoGain.connect(masterGain);
  metronomeGain.connect(masterGain);
  sfxGain.connect(masterGain);
  masterGain.connect(limiter);
  limiter.connect(context.destination);

  graph = {
    context,
    masterGain,
    pianoGain,
    metronomeGain,
    sfxGain,
    limiter,
  };
  applyGainPreferences(graph, preferences);
  return graph;
}

/**
 * Unlock Web Audio on iOS Safari & Android Chrome.
 * Must be called inside a user gesture handler (pointerdown / touchstart / click / keydown).
 * Safe no-op in SSR or non-browser environments.
 */
export async function unlockMusicAudio(): Promise<boolean> {
  const g = getMusicAudioGraph();
  if (!g) return false;

  try {
    if (g.context.state === "suspended") {
      await g.context.resume();
    }
    if (!unlocked) {
      // Play a 1-sample silent buffer to unlock iOS Safari WebKit audio hardware
      const silent = g.context.createBuffer(1, 1, g.context.sampleRate);
      const source = g.context.createBufferSource();
      source.buffer = silent;
      source.connect(g.context.destination);
      source.start(0);
      unlocked = true;
    }
    return g.context.state === "running";
  } catch {
    return false;
  }
}

/**
 * Register idempotent one-time user-gesture listeners to unlock AudioContext
 * automatically on the user's first tap or keypress (iPad Pro Safari / Pixel Chrome).
 */
export function installAudioUnlockListeners(): () => void {
  if (typeof window === "undefined" || unlockListenersInstalled) {
    return () => undefined;
  }
  unlockListenersInstalled = true;

  const handleGesture = () => {
    void unlockMusicAudio().then((isRunning) => {
      if (isRunning) cleanup();
    });
  };

  const cleanup = () => {
    window.removeEventListener("pointerdown", handleGesture);
    window.removeEventListener("touchstart", handleGesture);
    window.removeEventListener("keydown", handleGesture);
    unlockListenersInstalled = false;
  };

  window.addEventListener("pointerdown", handleGesture, { passive: true });
  window.addEventListener("touchstart", handleGesture, { passive: true });
  window.addEventListener("keydown", handleGesture, { passive: true });
  return cleanup;
}

/** Read current Zod-validated audio preferences. */
export function getAudioPreferences(): AudioPreferences {
  return preferences;
}

/** Update audio preferences (mute, master/piano/metronome/sfx volume, reduced-motion policy). */
export function setAudioPreferences(partial: Partial<AudioPreferencesInput>): AudioPreferences {
  preferences = AudioPreferencesSchema.parse({
    ...preferences,
    ...partial,
  });
  if (graph) {
    applyGainPreferences(graph, preferences);
  }
  return preferences;
}

/** SSR-safe check for prefers-reduced-motion: reduce. */
export function isReducedMotionPreferred(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Convert a pure-DSP StereoBuffer into a Web Audio AudioBuffer. */
export function createAudioBufferFromStereo(
  context: AudioContext,
  stereo: StereoBuffer,
): AudioBuffer {
  const frameCount = stereo.left.length;
  const audioBuffer = context.createBuffer(2, frameCount, stereo.sampleRate);
  audioBuffer.getChannelData(0).set(stereo.left);
  audioBuffer.getChannelData(1).set(stereo.right);
  return audioBuffer;
}
