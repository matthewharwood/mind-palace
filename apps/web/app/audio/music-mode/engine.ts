import {
  createAudioBufferFromStereo,
  getAudioPreferences,
  getMusicAudioGraph,
  isReducedMotionPreferred,
  unlockMusicAudio,
} from "./context";
import {
  computeBarSchedule,
  getBarDurationSeconds,
  synthesizeMetronomeClickPCM,
} from "./metronome-dsp";
import { synthesizePianoNotePCM } from "./piano-dsp";
import {
  type IntervalPlaybackMode,
  IntervalPlaybackModeSchema,
  type MetronomeConfig,
  type MetronomeConfigInput,
  MetronomeConfigSchema,
  type MetronomeTickEvent,
  type MetronomeVoiceKind,
  MidiNoteSchema,
  type MusicSfxKind,
  type RhythmHitAccuracy,
  SfxRenderOptionsSchema,
} from "./schemas";
import { synthesizeSfxPCM } from "./sfx-dsp";

interface ActivePianoVoice {
  readonly midi: number;
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
  sustained: boolean;
  released: boolean;
}

const MAX_CACHED_PIANO_BUFFERS = 176;
const pianoBufferCache = new Map<string, AudioBuffer>();
const metronomeBufferCache = new Map<MetronomeVoiceKind, AudioBuffer>();
const sfxBufferCache = new Map<string, AudioBuffer>();
const activeVoices = new Map<number, ActivePianoVoice[]>();

let sustainPedalDown = false;

function quantizeVelocity(velocity: number): number {
  const clamped = Math.min(1, Math.max(0.05, velocity));
  return Math.round(clamped * 8) / 8;
}

function getOrCreatePianoBuffer(
  context: AudioContext,
  midi: number,
  velocity: number,
): AudioBuffer {
  const qVel = quantizeVelocity(velocity);
  const key = `${midi}:${qVel}:${context.sampleRate}`;
  const cached = pianoBufferCache.get(key);
  if (cached) return cached;

  // Render full natural sustain ring (2.8s in bass -> 1.3s in treble); damper is shaped by GainNode
  const reg = (midi - 21) / 87;
  const durationSeconds = 2.8 - reg * 1.4;
  const stereo = synthesizePianoNotePCM({
    midi,
    velocity: qVel,
    durationSeconds,
    sustainPedal: true,
    sampleRate: context.sampleRate,
  });
  const buffer = createAudioBufferFromStereo(context, stereo);

  if (pianoBufferCache.size >= MAX_CACHED_PIANO_BUFFERS) {
    const oldestKey = pianoBufferCache.keys().next().value;
    if (oldestKey !== undefined) pianoBufferCache.delete(oldestKey);
  }
  pianoBufferCache.set(key, buffer);
  return buffer;
}

function dampVoice(context: AudioContext, voice: ActivePianoVoice, releaseSeconds = 0.085): void {
  if (voice.released) return;
  voice.released = true;
  const now = context.currentTime;
  try {
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + releaseSeconds);
    voice.source.stop(now + releaseSeconds + 0.02);
  } catch {
    // Source may have already finished naturally
  }
}

export interface PlayPianoNoteParams {
  readonly midi: number;
  readonly velocity?: number;
  readonly delaySeconds?: number;
  readonly durationSeconds?: number;
}

/**
 * Play a single Concert Grand Piano note via Web Audio API.
 * Safe no-op if muted or running outside a browser environment.
 */
export function playPianoNote(params: PlayPianoNoteParams): void {
  const prefs = getAudioPreferences();
  if (prefs.muted) return;

  const midi = MidiNoteSchema.parse(params.midi);
  const graph = getMusicAudioGraph();
  if (!graph) return;
  if (graph.context.state === "suspended") {
    void unlockMusicAudio();
  }

  const velocity = params.velocity ?? 0.75;
  const startAt = graph.context.currentTime + Math.max(0, params.delaySeconds ?? 0);
  const buffer = getOrCreatePianoBuffer(graph.context, midi, velocity);

  // Gently damp any existing voice on the same key to avoid muddy buildup
  const existing = activeVoices.get(midi);
  if (existing && existing.length > 0) {
    for (const v of existing) {
      dampVoice(graph.context, v, 0.035);
    }
    existing.length = 0;
  }

  const source = graph.context.createBufferSource();
  source.buffer = buffer;

  const voiceGain = graph.context.createGain();
  voiceGain.gain.setValueAtTime(1, startAt);

  source.connect(voiceGain);
  voiceGain.connect(graph.pianoGain);

  const voice: ActivePianoVoice = {
    midi,
    source,
    gain: voiceGain,
    sustained: false,
    released: false,
  };

  const list = activeVoices.get(midi) ?? [];
  list.push(voice);
  activeVoices.set(midi, list);

  source.onended = () => {
    const currentList = activeVoices.get(midi);
    if (!currentList) return;
    const idx = currentList.indexOf(voice);
    if (idx !== -1) currentList.splice(idx, 1);
    if (currentList.length === 0) activeVoices.delete(midi);
  };

  source.start(startAt);

  if (params.durationSeconds !== undefined && !sustainPedalDown) {
    const releaseAt = startAt + Math.max(0.03, params.durationSeconds);
    const damperTime = 0.085;
    voiceGain.gain.setValueAtTime(1, releaseAt);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, releaseAt + damperTime);
    source.stop(releaseAt + damperTime + 0.02);
  }
}

/** Release a held piano key (applies damper unless sustain pedal is pressed). */
export function releasePianoNote(midiInput: number): void {
  const midi = MidiNoteSchema.parse(midiInput);
  const graph = getMusicAudioGraph();
  if (!graph) return;
  const voices = activeVoices.get(midi);
  if (!voices || voices.length === 0) return;

  for (const voice of voices) {
    if (sustainPedalDown) {
      voice.sustained = true;
    } else {
      dampVoice(graph.context, voice);
    }
  }
}

/** Toggle the concert grand damper/sustain pedal. Lifting it releases all sustained voices. */
export function setSustainPedal(down: boolean): void {
  sustainPedalDown = down;
  if (down) return;
  const graph = getMusicAudioGraph();
  if (!graph) return;

  for (const voices of activeVoices.values()) {
    for (const voice of voices) {
      if (voice.sustained) {
        dampVoice(graph.context, voice);
      }
    }
  }
}

export function getSustainPedal(): boolean {
  return sustainPedalDown;
}

/** Immediately damp all currently sounding piano notes. */
export function stopAllPianoNotes(): void {
  const graph = getMusicAudioGraph();
  if (!graph) return;
  for (const voices of activeVoices.values()) {
    for (const voice of voices) {
      dampVoice(graph.context, voice, 0.03);
    }
  }
  activeVoices.clear();
}

export interface PlayPianoChordParams {
  readonly notes: readonly number[];
  readonly velocity?: number;
  readonly durationSeconds?: number;
  readonly arpeggiateMs?: number;
  readonly delaySeconds?: number;
}

/** Play a chord (simultaneous or rolled/arpeggiated) with automatic polyphonic velocity headroom. */
export function playPianoChord(params: PlayPianoChordParams): void {
  if (params.notes.length === 0) return;
  const baseVelocity = params.velocity ?? 0.75;
  const scaledVelocity = Math.max(
    0.2,
    baseVelocity / Math.sqrt(Math.max(1, params.notes.length * 0.65)),
  );
  const arpStepSec = Math.max(0, params.arpeggiateMs ?? 0) / 1000;
  const baseDelay = Math.max(0, params.delaySeconds ?? 0);

  for (let i = 0; i < params.notes.length; i += 1) {
    const midi = params.notes[i];
    if (midi === undefined) continue;
    playPianoNote({
      midi,
      velocity: scaledVelocity,
      delaySeconds: baseDelay + i * arpStepSec,
      ...(params.durationSeconds !== undefined ? { durationSeconds: params.durationSeconds } : {}),
    });
  }
}

/** Play a musical interval harmonically (together) or melodically (root then upper/lower note). */
export function playPianoInterval(
  rootMidi: number,
  semitones: number,
  modeInput: IntervalPlaybackMode = "melodic",
  options?: {
    readonly velocity?: number;
    readonly melodicGapSeconds?: number;
    readonly durationSeconds?: number;
  },
): void {
  const mode = IntervalPlaybackModeSchema.parse(modeInput);
  const secondMidi = rootMidi + semitones;
  const velocity = options?.velocity ?? 0.75;
  const durationSeconds = options?.durationSeconds ?? 1.1;

  if (mode === "harmonic") {
    playPianoChord({ notes: [rootMidi, secondMidi], velocity, durationSeconds });
    return;
  }

  const gap = options?.melodicGapSeconds ?? 0.48;
  playPianoNote({ midi: rootMidi, velocity, durationSeconds: gap + 0.35 });
  playPianoNote({ midi: secondMidi, velocity, delaySeconds: gap, durationSeconds });
}

function getOrCreateMetronomeBuffer(context: AudioContext, voice: MetronomeVoiceKind): AudioBuffer {
  const cached = metronomeBufferCache.get(voice);
  if (cached && cached.sampleRate === context.sampleRate) return cached;
  const stereo = synthesizeMetronomeClickPCM(voice, context.sampleRate);
  const buffer = createAudioBufferFromStereo(context, stereo);
  metronomeBufferCache.set(voice, buffer);
  return buffer;
}

export interface MusicMetronomeController {
  readonly start: () => void;
  readonly stop: () => void;
  readonly updateConfig: (next: Partial<MetronomeConfigInput>) => MetronomeConfig;
  readonly getConfig: () => MetronomeConfig;
  readonly isRunning: () => boolean;
}

/**
 * Sample-accurate lookahead Web Audio metronome supporting 2/4, 3/4, 4/4, 6/8, 9/8, 12/8,
 * Chopin 2:3 & 3:4 polyrhythms, woodblock accent on beat 1, and count-in bars.
 */
export function createMusicMetronome(
  initialConfig: MetronomeConfigInput = {},
  onTick?: (event: MetronomeTickEvent) => void,
): MusicMetronomeController {
  let config = MetronomeConfigSchema.parse(initialConfig);
  let running = false;
  let timerId: ReturnType<typeof setInterval> | null = null;
  let currentBar = 0;
  let nextBarStartTime = 0;
  let nextPulseIndex = 0;
  let barPulses = computeBarSchedule(config);

  const scheduleAheadSeconds = 0.12;
  const lookaheadMs = 25;

  const scheduleTick = (context: AudioContext, time: number, bar: number, pulseIdx: number) => {
    const pulse = barPulses[pulseIdx];
    if (!pulse) return;
    const graph = getMusicAudioGraph();
    if (!graph) return;

    const prefs = getAudioPreferences();
    if (!prefs.muted) {
      const source = context.createBufferSource();
      source.buffer = getOrCreateMetronomeBuffer(context, pulse.voice);
      source.connect(graph.metronomeGain);
      source.start(time);
    }

    if (onTick) {
      const event: MetronomeTickEvent = {
        bar,
        beat: pulse.beatIndex + 1,
        isCountIn: bar < config.countInBars,
        isAccent: pulse.isAccent,
        voice: pulse.voice,
        fractionOfBar: pulse.fractionOfBar,
        scheduledTime: time,
      };
      const delayMs = Math.max(0, (time - context.currentTime) * 1000);
      setTimeout(() => {
        if (running) onTick(event);
      }, delayMs);
    }
  };

  const schedulerLoop = () => {
    const graph = getMusicAudioGraph();
    if (!graph || !running) return;
    const now = graph.context.currentTime;
    const barDuration = getBarDurationSeconds(config.bpm, config.timeSignature);

    while (true) {
      const pulse = barPulses[nextPulseIndex];
      if (!pulse) break;
      const pulseTime = nextBarStartTime + pulse.fractionOfBar * barDuration;
      if (pulseTime > now + scheduleAheadSeconds) break;

      scheduleTick(graph.context, pulseTime, currentBar, nextPulseIndex);
      nextPulseIndex += 1;
      if (nextPulseIndex >= barPulses.length) {
        nextPulseIndex = 0;
        currentBar += 1;
        nextBarStartTime += barDuration;
      }
    }
  };

  const stop = () => {
    running = false;
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  };

  const start = () => {
    if (running) return;
    const graph = getMusicAudioGraph();
    if (!graph) return;
    if (graph.context.state === "suspended") {
      void unlockMusicAudio();
    }

    running = true;
    currentBar = 0;
    nextPulseIndex = 0;
    barPulses = computeBarSchedule(config);
    nextBarStartTime = graph.context.currentTime + 0.04;
    schedulerLoop();
    timerId = setInterval(schedulerLoop, lookaheadMs);
  };

  const updateConfig = (next: Partial<MetronomeConfigInput>): MetronomeConfig => {
    config = MetronomeConfigSchema.parse({ ...config, ...next });
    barPulses = computeBarSchedule(config);
    if (nextPulseIndex >= barPulses.length) {
      nextPulseIndex = 0;
    }
    return config;
  };

  return {
    start,
    stop,
    updateConfig,
    getConfig: () => config,
    isRunning: () => running,
  };
}

export interface PlayMusicSfxOptions {
  readonly countdownFinal?: boolean;
  readonly rhythmAccuracy?: RhythmHitAccuracy;
}

/**
 * Play a subtle, purposeful UI / learning SFX.
 * Honors mute, sfxVolume, and prefers-reduced-motion.
 */
export function playMusicSfx(kind: MusicSfxKind, options?: PlayMusicSfxOptions): void {
  const prefs = getAudioPreferences();
  if (prefs.muted) return;
  const graph = getMusicAudioGraph();
  if (!graph) return;
  if (graph.context.state === "suspended") {
    void unlockMusicAudio();
  }

  const reducedMotion = prefs.respectReducedMotion && isReducedMotionPreferred();
  const renderOpts = SfxRenderOptionsSchema.parse({
    kind,
    sampleRate: graph.context.sampleRate,
    reducedMotion,
    countdownFinal: options?.countdownFinal ?? false,
    rhythmAccuracy: options?.rhythmAccuracy ?? "on-beat",
  });

  const cacheKey = `${renderOpts.kind}:${renderOpts.reducedMotion}:${renderOpts.countdownFinal}:${renderOpts.rhythmAccuracy}:${renderOpts.sampleRate}`;
  let buffer = sfxBufferCache.get(cacheKey);
  if (!buffer) {
    const stereo = synthesizeSfxPCM(renderOpts);
    buffer = createAudioBufferFromStereo(graph.context, stereo);
    sfxBufferCache.set(cacheKey, buffer);
  }

  const source = graph.context.createBufferSource();
  source.buffer = buffer;
  source.connect(graph.sfxGain);
  source.start(graph.context.currentTime);
}
