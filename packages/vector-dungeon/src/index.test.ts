import { describe, expect, test } from "bun:test";

import {
  applyMove,
  coordinateToRoomId,
  getRoomAt,
  isDungeonComplete,
  isUnitStep,
  resolveDungeonAction,
  START_COORDINATE,
  VECTOR_DUNGEON_ROOMS,
  VectorDungeonCoordinateSchema,
  VectorDungeonMoveSchema,
  validateMove,
} from "./index";

describe("vector dungeon grid", () => {
  test("authors a complete 5x5 dungeon with three actions per room", () => {
    expect(VECTOR_DUNGEON_ROOMS).toHaveLength(25);
    expect(new Set(VECTOR_DUNGEON_ROOMS.map((room) => room.id)).size).toBe(25);
    for (const room of VECTOR_DUNGEON_ROOMS) {
      expect(room.actions).toHaveLength(3);
      expect(getRoomAt(room.coordinate)?.id).toBe(room.id);
    }
  });

  test("uses the origin as the start room", () => {
    const room = getRoomAt(START_COORDINATE);
    expect(room?.id).toBe(coordinateToRoomId({ x: 0, y: 0 }));
    expect(room?.title).toBe("Camp Origin");
  });

  test("rejects coordinates outside the authored grid", () => {
    const result = VectorDungeonCoordinateSchema.safeParse({ x: 3, y: 0 });
    expect(result.success).toBe(false);
  });
});

describe("movement", () => {
  test("allows only one cardinal step", () => {
    expect(isUnitStep({ dx: 1, dy: 0 })).toBe(true);
    expect(isUnitStep({ dx: 0, dy: -1 })).toBe(true);
    expect(VectorDungeonMoveSchema.safeParse({ dx: 1, dy: 1 }).success).toBe(false);
    expect(isUnitStep({ dx: 2, dy: 0 })).toBe(false);
  });

  test("applies in-bounds moves and rejects out-of-bounds targets", () => {
    expect(applyMove({ x: 0, y: 0 }, { dx: -1, dy: 0 })).toEqual({ x: -1, y: 0 });
    expect(applyMove({ x: 2, y: 2 }, { dx: 1, dy: 0 })).toBeNull();
  });

  test("validates relative movement vectors", () => {
    expect(validateMove({ x: 0, y: 0 }, { dx: -1, dy: 0 })).toMatchObject({
      valid: true,
      target: { x: -1, y: 0 },
      move: { dx: -1, dy: 0 },
    });
    expect(validateMove({ x: -1, y: 0 }, { dx: -1, dy: 0 })).toMatchObject({
      valid: true,
      target: { x: -2, y: 0 },
      move: { dx: -1, dy: 0 },
    });
    expect(validateMove({ x: 0, y: 0 }, { dx: 1, dy: 1 })).toEqual({
      valid: false,
      reason: "diagonal",
    });
    expect(validateMove({ x: 0, y: 0 }, { dx: 2, dy: 0 })).toEqual({
      valid: false,
      reason: "too-far",
    });
    expect(validateMove({ x: -2, y: 0 }, { dx: -1, dy: 0 })).toEqual({
      valid: false,
      reason: "out-of-bounds",
    });
  });
});

describe("action resolution", () => {
  test("returns success when the roll meets the DC", () => {
    const room = VECTOR_DUNGEON_ROOMS[0]!;
    const action = room.actions[0]!;
    expect(resolveDungeonAction(room, action.id, action.dc)).toMatchObject({
      outcome: "success",
      hpDelta: 0,
      reward: action.reward,
    });
  });

  test("returns a gentle setback below the DC", () => {
    const room = VECTOR_DUNGEON_ROOMS[0]!;
    const action = room.actions[1]!;
    expect(resolveDungeonAction(room, action.id, action.dc - 1)).toMatchObject({
      outcome: "setback",
      hpDelta: -1,
    });
  });

  test("completion requires each room reward", () => {
    const allRewards = VECTOR_DUNGEON_ROOMS.flatMap((room) =>
      room.actions[0]?.reward ? [room.actions[0].reward] : [],
    );
    expect(isDungeonComplete(allRewards)).toBe(true);
    expect(isDungeonComplete(allRewards.slice(1))).toBe(false);
  });
});
