import { expect, test } from "bun:test";
import {
  coordinateToRoomId,
  MAX_HP,
  MAX_MAGIC,
  START_COORDINATE,
} from "@mind-palace/vector-dungeon";

import { VECTOR_DUNGEON_SESSION_DEFAULT, VectorDungeonSessionSchema } from "./index";

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
