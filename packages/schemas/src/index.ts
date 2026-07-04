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
