import type { SoundDefinition, SoundRegistry } from "./schema";

// ---------------------------------------------------------------------------
// Web Audio sound service — a lean, portable extraction of dean-n-dean's engine
// (the alchemy-specific buses, music ducking, and procedural synth are dropped).
// Owns: lazy AudioContext, iOS unlock-on-first-gesture, buffer load + cache,
// per-sound polyphony + replay policy, master volume/mute, a peak compressor.
// SSR-safe: no AudioContext is created until a gesture/play in the browser.
// ---------------------------------------------------------------------------

export interface SoundService {
  /** Fire-and-forget play. Triggers the iOS unlock if needed. */
  play(id: string, opts?: { volume?: number; rate?: number }): void;
  /** Decode + cache buffers ahead of time (all ids, or a subset). */
  preload(ids?: string[]): Promise<void>;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  /** Resume the context from a user gesture (also done implicitly by play). */
  unlock(): void;
  dispose(): void;
  readonly registry: SoundRegistry;
}

export interface SoundServiceOptions {
  registry: SoundRegistry;
  masterVolume?: number;
  muted?: boolean;
}

const DEFAULT_MAX_VOICES = 8;

function safeStop(node: AudioBufferSourceNode): void {
  try {
    node.stop();
  } catch {
    // Already stopped/ended — nothing to do.
  }
}

export function createSoundService(options: SoundServiceOptions): SoundService {
  const { registry } = options;
  let masterVolume = options.masterVolume ?? 1;
  let muted = options.muted ?? false;

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let unlockBound = false;
  const buffers = new Map<string, Promise<AudioBuffer | null>>();
  const voices = new Map<string, Set<AudioBufferSourceNode>>();

  function ensureContext(): AudioContext | null {
    if (ctx) return ctx;
    if (typeof window === "undefined" || !window.AudioContext) return null;
    const context = new window.AudioContext({ latencyHint: "interactive" });
    const compressor = context.createDynamicsCompressor(); // tame peaks when many cards land at once
    master = context.createGain();
    master.gain.value = muted ? 0 : masterVolume;
    master.connect(compressor);
    compressor.connect(context.destination);
    ctx = context;
    bindUnlock();
    return ctx;
  }

  function bindUnlock(): void {
    if (unlockBound || typeof window === "undefined") return;
    unlockBound = true;
    const resume = (): void => {
      void ctx?.resume();
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
  }

  function loadBuffer(def: SoundDefinition, context: AudioContext): Promise<AudioBuffer | null> {
    const cached = buffers.get(def.src);
    if (cached) return cached;
    const promise = (async (): Promise<AudioBuffer | null> => {
      try {
        const res = await fetch(def.src);
        const data = await res.arrayBuffer();
        return await context.decodeAudioData(data);
      } catch {
        return null; // missing/undecodable asset — fail silent, never throw at a play site
      }
    })();
    buffers.set(def.src, promise);
    return promise;
  }

  function reserveVoiceSet(id: string, def: SoundDefinition): Set<AudioBufferSourceNode> {
    let set = voices.get(id);
    if (!set) {
      set = new Set();
      voices.set(id, set);
    }
    const cap = def.maxVoices ?? DEFAULT_MAX_VOICES;
    if (def.replay === "restart") {
      for (const node of set) safeStop(node);
      set.clear();
    } else if (set.size >= cap) {
      const oldest = set.values().next().value;
      if (oldest) {
        safeStop(oldest);
        set.delete(oldest);
      }
    }
    return set;
  }

  function play(id: string, opts?: { volume?: number; rate?: number }): void {
    const def = registry[id];
    if (!def) return;
    const context = ensureContext();
    if (!context) return;
    void (async (): Promise<void> => {
      const cap = def.maxVoices ?? DEFAULT_MAX_VOICES;
      const existing = voices.get(id);
      if (def.replay === "ignore" && existing && existing.size >= cap) return;
      const buf = await loadBuffer(def, context);
      if (!buf || !master) return;
      const set = reserveVoiceSet(id, def);
      const node = context.createBufferSource();
      node.buffer = buf;
      node.playbackRate.value = opts?.rate ?? def.rate ?? 1;
      const gain = context.createGain();
      gain.gain.value = opts?.volume ?? def.volume ?? 1;
      node.connect(gain);
      gain.connect(master);
      node.addEventListener("ended", () => set.delete(node));
      set.add(node);
      node.start();
    })();
  }

  function setMuted(value: boolean): void {
    muted = value;
    if (master) master.gain.value = muted ? 0 : masterVolume;
  }

  function setVolume(value: number): void {
    masterVolume = value;
    if (master && !muted) master.gain.value = value;
  }

  function unlock(): void {
    const context = ensureContext();
    void context?.resume();
  }

  async function preload(ids?: string[]): Promise<void> {
    const context = ensureContext();
    if (!context) return;
    const list = ids ?? Object.keys(registry);
    await Promise.all(
      list.map((id) => {
        const def = registry[id];
        return def ? loadBuffer(def, context) : Promise.resolve(null);
      }),
    );
  }

  function dispose(): void {
    for (const set of voices.values()) {
      for (const node of set) safeStop(node);
    }
    voices.clear();
    buffers.clear();
    void ctx?.close();
    ctx = null;
    master = null;
  }

  return { play, preload, setMuted, setVolume, unlock, dispose, registry };
}
