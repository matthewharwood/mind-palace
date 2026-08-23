import {
  ALCHEMY_BOARD_DEFAULT,
  type AlchemyBoard,
  AlchemyBoardSchema,
  AVA_SHAPES_SESSION_DEFAULT,
  type AvaShapesSession,
  AvaShapesSessionSchema,
  CHARACTER_PARTY_SESSION_DEFAULT,
  type CharacterPartySession,
  CharacterPartySessionSchema,
  type CurriculumProgress,
  CurriculumProgressSchema,
  type Progress,
  ProgressSchema,
  SETTINGS_DEFAULT,
  type Settings,
  SettingsSchema,
  VECTOR_DUNGEON_SESSION_DEFAULT,
  type VectorDungeonSession,
  VectorDungeonSessionSchema,
} from "@mind-palace/schemas";

import { getDB } from "./db";

export type HydratedState = {
  progress: ReadonlyMap<string, Progress>;
  settings: Settings;
  alchemyBoard: AlchemyBoard;
  curriculumProgress: ReadonlyMap<string, CurriculumProgress>;
  vectorDungeonSession: VectorDungeonSession;
  avaShapesSession: AvaShapesSession;
  characterPartySession: CharacterPartySession;
};

export type StoreName = keyof HydratedState;

let resolvedSnapshot: HydratedState | null = null;

export function getHydratedSnapshot(): HydratedState | null {
  return resolvedSnapshot;
}

// Started at module-evaluation time. The root <Suspense> boundary calls
// `use(idbHydrationPromise)` once; until it resolves, no atom is read.
// In a prerender / SSR-shell context (no indexedDB), resolves with empty state.
export const idbHydrationPromise: Promise<HydratedState> = (async () => {
  if (typeof indexedDB === "undefined") {
    const empty: HydratedState = {
      progress: new Map(),
      settings: SETTINGS_DEFAULT,
      alchemyBoard: ALCHEMY_BOARD_DEFAULT,
      curriculumProgress: new Map(),
      vectorDungeonSession: VECTOR_DUNGEON_SESSION_DEFAULT,
      avaShapesSession: AVA_SHAPES_SESSION_DEFAULT,
      characterPartySession: CHARACTER_PARTY_SESSION_DEFAULT,
    };
    resolvedSnapshot = empty;
    return empty;
  }
  const db = await getDB();
  const [
    rawProgress,
    rawSettings,
    rawBoard,
    rawCurriculum,
    rawVectorDungeonSession,
    rawAvaShapesSession,
    rawCharacterPartySession,
  ] = await Promise.all([
    db.getAll("progress"),
    db.get("settings", "settings"),
    db.get("alchemyBoard", "board"),
    db.getAll("curriculumProgress"),
    db.get("vectorDungeonSessions", "vector-dungeon"),
    db.get("avaShapeSessions", "ava-shapes"),
    db.get("characterPartySessions", "character-party"),
  ]);
  const progress = new Map<string, Progress>();
  for (const raw of rawProgress) {
    const parsed = ProgressSchema.safeParse(raw);
    if (parsed.success) progress.set(parsed.data.id, parsed.data);
  }
  const settings = SettingsSchema.parse(rawSettings ?? SETTINGS_DEFAULT);
  const alchemyBoard = AlchemyBoardSchema.parse(rawBoard ?? ALCHEMY_BOARD_DEFAULT);
  const curriculumProgress = new Map<string, CurriculumProgress>();
  for (const raw of rawCurriculum) {
    const parsed = CurriculumProgressSchema.safeParse(raw);
    if (parsed.success) curriculumProgress.set(parsed.data.id, parsed.data);
  }
  const vectorDungeonSession = VectorDungeonSessionSchema.parse(
    rawVectorDungeonSession ?? VECTOR_DUNGEON_SESSION_DEFAULT,
  );
  const avaShapesSession = AvaShapesSessionSchema.parse(
    rawAvaShapesSession ?? AVA_SHAPES_SESSION_DEFAULT,
  );
  const characterPartySession = CharacterPartySessionSchema.parse(
    rawCharacterPartySession ?? CHARACTER_PARTY_SESSION_DEFAULT,
  );
  const snapshot: HydratedState = {
    progress,
    settings,
    alchemyBoard,
    curriculumProgress,
    vectorDungeonSession,
    avaShapesSession,
    characterPartySession,
  };
  resolvedSnapshot = snapshot;
  return snapshot;
})();
