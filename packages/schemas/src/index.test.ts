import { expect, test } from "bun:test";
import {
  coordinateToRoomId,
  MAX_HP,
  MAX_MAGIC,
  START_COORDINATE,
} from "@mind-palace/vector-dungeon";

import {
  AVA_SHAPES_SESSION_DEFAULT,
  AvaShapeCardSchema,
  AvaShapesSessionSchema,
  CHARACTER_PARTY_SESSION_DEFAULT,
  CharacterDefinitionSchema,
  CharacterLibrarySchema,
  CharacterPartySessionSchema,
  VECTOR_DUNGEON_SESSION_DEFAULT,
  VectorDungeonSessionSchema,
} from "./index";

test("AvaShapesSessionSchema fills the singleton defaults", () => {
  expect(AVA_SHAPES_SESSION_DEFAULT).toEqual({ id: "ava-shapes", states: {} });
});

test("AvaShapeCardSchema rejects unknown shape and color names", () => {
  expect(
    AvaShapeCardSchema.safeParse({ id: "hexagon-teal", shape: "hexagon", color: "teal" }).success,
  ).toBe(false);
  expect(AvaShapesSessionSchema.safeParse({ id: "another-child", states: {} }).success).toBe(false);
});

test("VectorDungeonSessionSchema fills the singleton defaults", () => {
  expect(VECTOR_DUNGEON_SESSION_DEFAULT).toEqual({
    id: "vector-dungeon",
    position: START_COORDINATE,
    hp: MAX_HP,
    magicRemaining: MAX_MAGIC,
    visitedRoomIds: [coordinateToRoomId(START_COORDINATE)],
    discoveredRewards: [],
    turn: 0,
    log: [],
  });
});

test("a session stored before magicRemaining hydrates with a full pouch", () => {
  const legacy = VectorDungeonSessionSchema.parse({
    id: "vector-dungeon",
    position: { x: 1, y: 0 },
    hp: 3,
    visitedRoomIds: [coordinateToRoomId(START_COORDINATE), "room:1:0"],
    discoveredRewards: ["apple tart"],
  });
  expect(legacy.magicRemaining).toBe(MAX_MAGIC);
  expect(legacy.pendingMiss).toBeUndefined();
});

test("VectorDungeonSessionSchema rejects impossible persisted positions", () => {
  const result = VectorDungeonSessionSchema.safeParse({
    id: "vector-dungeon",
    position: { x: 9, y: 0 },
  });
  expect(result.success).toBe(false);
});

test("CharacterPartySessionSchema fills durable game defaults", () => {
  expect(CHARACTER_PARTY_SESSION_DEFAULT).toEqual({
    id: "character-party",
    phase: "setup",
    selectedDifficulties: ["easy", "medium", "hard"],
    sessionDurationMinutes: 45,
    roundDurationSeconds: 60,
    sessionStartedAt: null,
    roundStartedAt: null,
    currentCharacterId: null,
    recentCharacterIds: [],
    completedCharacterIds: [],
    presentedCount: 0,
    history: {},
  });
});

test("CharacterPartySessionSchema rejects an empty difficulty selection", () => {
  const result = CharacterPartySessionSchema.safeParse({ selectedDifficulties: [] });
  expect(result.success).toBe(false);
  if (!result.success) expect(result.error.issues[0]?.path).toEqual(["selectedDifficulties"]);
});

test("CharacterDefinitionSchema rejects unstable ids and unsupported categories", () => {
  const base = {
    id: "sponge-bob",
    name: "SpongeBob SquarePants",
    franchise: "SpongeBob SquarePants",
    difficulty: "easy",
    generation: "1990s-2000s",
    category: "cartoon",
    drawable: true,
    headbandEligible: true,
    imageSearchTerm: "SpongeBob SquarePants character",
    wikipediaTitle: "SpongeBob SquarePants (character)",
  };
  expect(CharacterDefinitionSchema.safeParse(base).success).toBe(true);
  expect(CharacterDefinitionSchema.safeParse({ ...base, id: "Sponge Bob" }).success).toBe(false);
  expect(CharacterDefinitionSchema.safeParse({ ...base, category: "politician" }).success).toBe(
    false,
  );
});

test("CharacterLibrarySchema rejects duplicate ids and names", () => {
  const character = CharacterDefinitionSchema.parse({
    id: "mario",
    name: "Mario",
    franchise: "Super Mario",
    difficulty: "easy",
    generation: "cross-generational",
    category: "video-game",
    drawable: true,
    headbandEligible: true,
    imageSearchTerm: "Mario Nintendo character",
    wikipediaTitle: "Mario",
  });
  const tooSmallAndDuplicated = Array.from({ length: 150 }, () => character);
  expect(CharacterLibrarySchema.safeParse(tooSmallAndDuplicated).success).toBe(false);
});
