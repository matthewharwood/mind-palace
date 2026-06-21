import { CardStateSchema } from "@mind-palace/srs";
import * as z from "zod";

// Pillar 3 contract — every IDB-backed schema declares its zero via `.default()`
// on each defaultable field, and exports a named `<NAME>_DEFAULT` companion when
// the entire shape is defaultable. atomWithIDB consumers import the companion
// instead of inlining a literal — single source of truth for the zero.

export const SettingsSchema = z.object({
  id: z.literal("settings").default("settings"),
  theme: z.enum(["light", "dark"]).default("light"),
  reducedMotion: z.boolean().default(false),
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
