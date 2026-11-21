export {
  analyzeBuffer,
  computeFFT,
  computeRMS,
  findSpectralPeakNear,
} from "./analysis";
export {
  getAudioPreferences,
  installAudioUnlockListeners,
  isReducedMotionPreferred,
  setAudioPreferences,
  unlockMusicAudio,
} from "./context";
export {
  frequencyToMidi,
  midiToFrequency,
  midiToNoteName,
  midiToPan,
  mixToMono,
} from "./dsp-core";
export {
  createMusicMetronome,
  getSustainPedal,
  type MusicMetronomeController,
  playMusicSfx,
  playPianoChord,
  playPianoInterval,
  playPianoNote,
  releasePianoNote,
  setSustainPedal,
  stopAllPianoNotes,
} from "./engine";
export {
  computeBarSchedule,
  formatTimeSignature,
  getBarDurationSeconds,
  getTimeSignatureSpec,
  synthesizeMetronomeClickPCM,
} from "./metronome-dsp";
export { synthesizePianoChordPCM, synthesizePianoNotePCM } from "./piano-dsp";
export {
  AudioPreferencesSchema,
  DEFAULT_SAMPLE_RATE,
  MetronomeConfigSchema,
  MidiNoteSchema,
  PIANO_MAX_MIDI,
  PIANO_MIN_MIDI,
  type TimeSignature,
} from "./schemas";
export { synthesizeSfxPCM } from "./sfx-dsp";
