import { CardStateSchema } from "@mind-palace/srs";
import {
  coordinateToRoomId,
  MAX_HP,
  MAX_MAGIC,
  START_COORDINATE,
  VectorDungeonCoordinateSchema,
} from "@mind-palace/vector-dungeon";
import * as z from "zod";

// Pillar 3 contract — every IDB-backed schema declares its zero via `.default()`
// on each defaultable field, and exports a named `<NAME>_DEFAULT` companion when
// the entire shape is defaultable. atomWithIDB consumers import the companion
// instead of inlining a literal — single source of truth for the zero.

export const SettingsSchema = z.object({
  id: z.literal("settings").default("settings"),
  theme: z.enum(["light", "dark"]).default("light"),
  reducedMotion: z.boolean().default(false),
  // Graph view preference, shared by every GraphView (goal flow + curriculum
  // network). "auto" follows the viewport; an explicit pick persists. Read-parse
  // supplies the default for pre-existing records, so no DB migration is needed.
  graphView: z.enum(["list", "diagram", "auto"]).default("auto"),
});
export type Settings = z.infer<typeof SettingsSchema>;
export const SETTINGS_DEFAULT: Settings = SettingsSchema.parse({});

// `id` is caller-supplied (per-record), so there is no fully-defaulted PROGRESS_DEFAULT.
// Callers construct via `ProgressSchema.parse({ id })` — same parse path, same source of truth.
export const ProgressSchema = z.object({
  id: z.string().min(1),
  level: z.int().min(1).default(1),
  completed: z.boolean().default(false),
});
export type Progress = z.infer<typeof ProgressSchema>;

// Singleton board for the alchemy drag-and-drop demo (proves @mind-palace/cards
// dovetails with the IDB-first / Jotai stack). `slots` maps a reagent slot id to
// the element-card id placed there; absent ids sit in the tray.
export const AlchemyBoardSchema = z.object({
  id: z.literal("board").default("board"),
  slots: z.record(z.string(), z.string()).default({}),
});
export type AlchemyBoard = z.infer<typeof AlchemyBoardSchema>;
export const ALCHEMY_BOARD_DEFAULT: AlchemyBoard = AlchemyBoardSchema.parse({});

// Spaced-repetition progress for one curriculum: per-flashcard scheduling state
// keyed by flashcard id. Static curriculum content lives in @mind-palace/curriculum;
// this is the mutable, IDB-persisted overlay. `id` = the curriculum id.
export const CurriculumProgressSchema = z.object({
  id: z.string().min(1),
  states: z.record(z.string(), CardStateSchema).default({}),
});
export type CurriculumProgress = z.infer<typeof CurriculumProgressSchema>;

export const AvaShapeKindSchema = z.enum(["square", "oval", "rhombus", "circle", "triangle"]);
export type AvaShapeKind = z.infer<typeof AvaShapeKindSchema>;

export const AvaShapeColorSchema = z.enum([
  "colorless",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
]);
export type AvaShapeColor = z.infer<typeof AvaShapeColorSchema>;

export const AvaShapeCardSchema = z.object({
  id: z.string().min(1),
  shape: AvaShapeKindSchema,
  color: AvaShapeColorSchema,
});
export type AvaShapeCard = z.infer<typeof AvaShapeCardSchema>;

export const AvaMediaModeSchema = z.enum(["2d", "3d", "video"]);
export type AvaMediaMode = z.infer<typeof AvaMediaModeSchema>;

export const AvaCollectionIdSchema = z.enum([
  "ava-actions",
  "ava-needs",
  "ava-opposites",
  "ava-positions",
  "ava-two-words",
]);
export type AvaCollectionId = z.infer<typeof AvaCollectionIdSchema>;
export const AvaLearningModeSchema = z.enum(["discover", "recognize", "connect"]);
export const AvaLearningSubjectSchema = z.enum(["ava", "mommy", "daddy", "dog"]);
export const AvaLearningRecordSchema = z
  .object({
    introduced: z.boolean().default(false),
    attempts: z.int().min(0).default(0),
    correct: z.int().min(0).default(0),
  })
  .refine((record) => record.correct <= record.attempts, {
    error: "Correct answers cannot exceed attempts",
  });
export const AvaLearningSessionSchema = z
  .object({
    id: AvaCollectionIdSchema,
    selectedIndex: z.int().min(0).default(0),
    setStart: z.int().min(0).default(0),
    mode: AvaLearningModeSchema.default("discover"),
    viewMode: AvaMediaModeSchema.default("3d"),
    subject: AvaLearningSubjectSchema.default("ava"),
    soundEnabled: z.boolean().default(false),
    questionNumber: z.int().min(0).default(0),
    records: z.record(z.string(), AvaLearningRecordSchema).default({}),
  })
  .refine(
    (session) => {
      const length = session.id === "ava-positions" ? 12 : 20;
      return (
        session.selectedIndex < length &&
        session.setStart < length &&
        session.setStart % 5 === 0 &&
        session.selectedIndex >= session.setStart &&
        session.selectedIndex < session.setStart + 5
      );
    },
    { error: "The card and little set must belong to this collection" },
  );
export type AvaLearningSession = z.infer<typeof AvaLearningSessionSchema>;

// Teacher-led spaced-repetition session for Ava's shape cards. Static card
// content is generated in the app; only the SRS scheduling overlay persists.
export const AvaShapesSessionSchema = z.object({
  id: z.literal("ava-shapes").default("ava-shapes"),
  states: z.record(z.string(), CardStateSchema).default({}),
  viewMode: AvaMediaModeSchema.default("2d"),
});
export type AvaShapesSession = z.infer<typeof AvaShapesSessionSchema>;
export const AVA_SHAPES_SESSION_DEFAULT: AvaShapesSession = AvaShapesSessionSchema.parse({});

// Teacher-led spaced-repetition session for Ava's first-word cards. The static
// word/media manifest remains app code; IDB stores only scheduling + the view
// Ava last chose so a live iPad refresh returns to the same experience.
export const AvaFirstWordsSessionSchema = z.object({
  id: z.literal("ava-first-words").default("ava-first-words"),
  states: z.record(z.string(), CardStateSchema).default({}),
  viewMode: AvaMediaModeSchema.default("2d"),
});
export type AvaFirstWordsSession = z.infer<typeof AvaFirstWordsSessionSchema>;
export const AVA_FIRST_WORDS_SESSION_DEFAULT: AvaFirstWordsSession =
  AvaFirstWordsSessionSchema.parse({});

export const AvaSymbolAppSchema = z.enum(["ava-numbers", "ava-letters"]);
export type AvaSymbolApp = z.infer<typeof AvaSymbolAppSchema>;
export const AvaSymbolRepresentationSchema = z.enum(["symbol", "alternate", "word"]);
export type AvaSymbolRepresentation = z.infer<typeof AvaSymbolRepresentationSchema>;
export const AvaSymbolsSessionSchema = z
  .object({
    id: AvaSymbolAppSchema,
    selectedIndex: z.int().min(0).default(0),
    representation: AvaSymbolRepresentationSchema.default("symbol"),
    viewMode: AvaMediaModeSchema.default("2d"),
    states: z.record(z.string(), CardStateSchema).default({}),
  })
  .refine((session) => session.selectedIndex < (session.id === "ava-numbers" ? 11 : 26), {
    error: "selectedIndex must belong to this app's deck",
    path: ["selectedIndex"],
  });
export type AvaSymbolsSession = z.infer<typeof AvaSymbolsSessionSchema>;
export const AVA_NUMBERS_SESSION_DEFAULT = AvaSymbolsSessionSchema.parse({ id: "ava-numbers" });
export const AVA_LETTERS_SESSION_DEFAULT = AvaSymbolsSessionSchema.parse({ id: "ava-letters" });

export const VectorDungeonLogEntrySchema = z.object({
  id: z.string().min(1),
  turn: z.int().min(0),
  kind: z.enum(["move", "success", "setback", "camp"]),
  message: z.string().min(1),
});
export type VectorDungeonLogEntry = z.infer<typeof VectorDungeonLogEntrySchema>;

export const VectorDungeonSessionSchema = z.object({
  id: z.literal("vector-dungeon").default("vector-dungeon"),
  position: VectorDungeonCoordinateSchema.default(START_COORDINATE),
  hp: z.int().min(0).max(MAX_HP).default(MAX_HP),
  // Magic re-roll tokens; default via schema so stored sessions from before this
  // field hydrate with a full pouch (no IDB migration needed).
  magicRemaining: z.int().min(0).max(MAX_MAGIC).default(MAX_MAGIC),
  visitedRoomIds: z.array(z.string().min(1)).default([coordinateToRoomId(START_COORDINATE)]),
  discoveredRewards: z.array(z.string().min(1)).default([]),
  pendingActionId: z.string().min(1).optional(),
  // A missed roll awaiting the player's choice: spend magic to re-roll, or take
  // the setback. Holds the roll + target so the UI can explain the miss.
  pendingMiss: z.object({ roll: z.int().min(1).max(20), dc: z.int().min(2).max(20) }).optional(),
  actedRoomId: z.string().min(1).optional(),
  turn: z.int().min(0).default(0),
  log: z.array(VectorDungeonLogEntrySchema).default([]),
});
export type VectorDungeonSession = z.infer<typeof VectorDungeonSessionSchema>;
export const VECTOR_DUNGEON_SESSION_DEFAULT: VectorDungeonSession =
  VectorDungeonSessionSchema.parse({});
