// Pronunciation lexicon for read-aloud — the browser Web Speech API does not
// parse SSML (every engine speaks the tags aloud), so pronunciation control
// happens here instead: written form → spoken form, applied to speech text
// only (display text is untouched). This is the in-browser stand-in for
// SSML's <sub>/<say-as>/<phoneme>. Spoken forms are plain words: spaced
// capital letters read as initialisms ("W G S L"), respellings steer engine
// pronunciation ("BEV ee").
//
// AUTHORING CONTRACT: when a curriculum introduces jargon an English TTS voice
// would mangle (initialisms, crate names, coined terms), add an entry here.
// Entries are matched case-sensitively on word boundaries; plurals need their
// own entry ("SDF" does not match "SDFs").

export const SPEECH_LEXICON: Readonly<Record<string, string>> = {
  // Graphics stack
  WGSL: "W G S L",
  GLSL: "G L S L",
  wgpu: "W G P U",
  glam: "glam",
  Bevy: "BEV ee",
  bevy: "BEV ee",
  rustc: "rust C",
  WASM: "wasm",
  wasm: "wasm",
  fBm: "fractional Brownian motion",
  SDF: "signed distance field",
  SDFs: "signed distance fields",
  UV: "U V",
  UVs: "U Vs",
  NDC: "N D C",
  ECS: "E C S",
  HDR: "H D R",
  MSAA: "M S double A",
  PBR: "P B R",
  TRS: "T R S",
  lerp: "lerp",
  slerp: "slerp",
  texel: "TEX el",
  quat: "kwat",
  // Rust / tooling
  IDB: "I D B",
  IndexedDB: "indexed D B",
  enum: "EE num",
  usize: "you size",
  impl: "IMPL",
  struct: "struckt",
  async: "AY sink",
  // SNES / FF6
  SNES: "ESS ness",
  HDMA: "H D M A",
  CGRAM: "C G RAM",
  VRAM: "V RAM",
  PPU: "P P U",
  SwdTech: "sword tech",
  Esper: "ESS per",
  Espers: "ESS pers",
  esper: "ESS per",
  espers: "ESS pers",
};
