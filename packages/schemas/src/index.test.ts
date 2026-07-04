import { expect, test } from "bun:test";
import { coordinateToRoomId, MAX_HP, START_COORDINATE } from "@mind-palace/vector-dungeon";

import { VECTOR_DUNGEON_SESSION_DEFAULT, VectorDungeonSessionSchema } from "./index";

test("VectorDungeonSessionSchema fills the singleton defaults", () => {
  expect(VECTOR_DUNGEON_SESSION_DEFAULT).toEqual({
    id: "vector-dungeon",
    position: START_COORDINATE,
    hp: MAX_HP,
    visitedRoomIds: [coordinateToRoomId(START_COORDINATE)],
    discoveredRewards: [],
    turn: 0,
    log: [],
  });
});

test("VectorDungeonSessionSchema rejects impossible persisted positions", () => {
  const result = VectorDungeonSessionSchema.safeParse({
    id: "vector-dungeon",
    position: { x: 9, y: 0 },
  });
  expect(result.success).toBe(false);
});
