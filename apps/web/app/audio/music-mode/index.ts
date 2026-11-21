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
  computeTransportClockAtTime,
  createMusicMetronome,
  getSustainPedal,
  getTransportClock,
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
export {
  createMicPianoListener,
  type DetectedNote,
  DetectedNoteSchema,
  detectActiveMidis,
  detectSinglePianoNote,
  estimateNoiseFloor,
  MIC_MAX_MIDI,
  MIC_MIN_MIDI,
  type MicDetectionConfig,
  type MicDetectionConfigInput,
  MicDetectionConfigSchema,
  type MicListenerStatus,
  MicListenerStatusSchema,
  type MicNoteOnEvent,
  MicNoteOnEventSchema,
  type MicNoteOnListener,
  MicNoteTracker,
  MicPianoListener,
  type MicPitchFrame,
  type MicPitchFrameListener,
  MicPitchFrameSchema,
  type MicStatusListener,
  type NoiseFloorEstimate,
  NoiseFloorEstimateSchema,
  rmsToVuLevel,
} from "./mic-listener";
export { synthesizePianoChordPCM, synthesizePianoNotePCM } from "./piano-dsp";
export {
  AudioPreferencesSchema,
  DEFAULT_SAMPLE_RATE,
  MetronomeConfigSchema,
  MidiNoteSchema,
  PIANO_MAX_MIDI,
  PIANO_MIN_MIDI,
  type TimeSignature,
  type TransportClockSnapshot,
  TransportClockSnapshotSchema,
} from "./schemas";
export { synthesizeSfxPCM } from "./sfx-dsp";
