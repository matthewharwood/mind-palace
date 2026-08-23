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

// Teacher-led spaced-repetition session for Ava's shape cards. Static card
// content is generated in the app; only the SRS scheduling overlay persists.
export const AvaShapesSessionSchema = z.object({
  id: z.literal("ava-shapes").default("ava-shapes"),
  states: z.record(z.string(), CardStateSchema).default({}),
});
export type AvaShapesSession = z.infer<typeof AvaShapesSessionSchema>;
export const AVA_SHAPES_SESSION_DEFAULT: AvaShapesSession = AvaShapesSessionSchema.parse({});

export const CharacterDifficultySchema = z.enum(["easy", "medium", "hard"]);
export type CharacterDifficulty = z.infer<typeof CharacterDifficultySchema>;

export const CharacterGenerationSchema = z.enum([
  "classics",
  "1990s-2000s",
  "modern-kids",
  "cross-generational",
]);
export type CharacterGeneration = z.infer<typeof CharacterGenerationSchema>;

export const CharacterCategorySchema = z.enum([
  "cartoon",
  "movie",
  "television",
  "video-game",
  "superhero",
  "puppet",
  "mascot",
  "creature",
]);
export type CharacterCategory = z.infer<typeof CharacterCategorySchema>;

// Static character content. Mutable repetition history intentionally lives in
// CharacterPartySessionSchema below so updating the JSON library never resets
// play history or bakes device-specific usage into source-controlled content.
export const CharacterDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  franchise: z.string().min(1),
  difficulty: CharacterDifficultySchema,
  generation: CharacterGenerationSchema,
  category: CharacterCategorySchema,
  drawable: z.boolean(),
  headbandEligible: z.boolean(),
  imageSearchTerm: z.string().min(1),
  wikipediaTitle: z.string().min(1),
});
export type CharacterDefinition = z.infer<typeof CharacterDefinitionSchema>;

export const CharacterLibrarySchema = z
  .array(CharacterDefinitionSchema)
  .min(150)
  .max(200)
  .superRefine((characters, context) => {
    const ids = new Set<string>();
    const names = new Set<string>();
    for (const [index, character] of characters.entries()) {
      const normalizedName = character.name.toLocaleLowerCase("en-US");
      if (ids.has(character.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate character id: ${character.id}`,
          path: [index, "id"],
        });
      }
      if (names.has(normalizedName)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate character name: ${character.name}`,
          path: [index, "name"],
        });
      }
      ids.add(character.id);
      names.add(normalizedName);
    }
  });

export const CharacterUsageSchema = z.object({
  usedCount: z.int().min(0).default(0),
  lastUsed: z.number().min(0).nullable().default(null),
  lastSkippedAtTurn: z.int().min(0).nullable().default(null),
});
export type CharacterUsage = z.infer<typeof CharacterUsageSchema>;

export const CharacterPartySessionDurationSchema = z.union([
  z.literal(0),
  z.literal(30),
  z.literal(45),
  z.literal(60),
]);
export type CharacterPartySessionDuration = z.infer<typeof CharacterPartySessionDurationSchema>;

export const CharacterPartyRoundDurationSchema = z.union([
  z.literal(0),
  z.literal(60),
  z.literal(90),
]);
export type CharacterPartyRoundDuration = z.infer<typeof CharacterPartyRoundDurationSchema>;

export const CharacterPartySessionSchema = z.object({
  id: z.literal("character-party").default("character-party"),
  phase: z.enum(["setup", "prompt", "revealed"]).default("setup"),
  selectedDifficulties: z
    .array(CharacterDifficultySchema)
    .min(1)
    .default(["easy", "medium", "hard"]),
  sessionDurationMinutes: CharacterPartySessionDurationSchema.default(45),
  roundDurationSeconds: CharacterPartyRoundDurationSchema.default(60),
  sessionStartedAt: z.number().min(0).nullable().default(null),
  roundStartedAt: z.number().min(0).nullable().default(null),
  currentCharacterId: z.string().min(1).nullable().default(null),
  recentCharacterIds: z.array(z.string().min(1)).max(25).default([]),
  completedCharacterIds: z.array(z.string().min(1)).default([]),
  presentedCount: z.int().min(0).default(0),
  history: z.record(z.string().min(1), CharacterUsageSchema).default({}),
});
export type CharacterPartySession = z.infer<typeof CharacterPartySessionSchema>;
export const CHARACTER_PARTY_SESSION_DEFAULT: CharacterPartySession =
  CharacterPartySessionSchema.parse({});

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
