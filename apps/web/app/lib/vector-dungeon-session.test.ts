import { expect, test } from "bun:test";
import { VECTOR_DUNGEON_SESSION_DEFAULT } from "@mind-palace/schemas";
import {
  getRoomAt,
  resolveDungeonAction,
  START_COORDINATE,
  validateMove,
} from "@mind-palace/vector-dungeon";

import {
  moveVectorDungeonSession,
  recoverVectorDungeonAtCamp,
  resolveVectorDungeonAction,
  selectVectorDungeonAction,
} from "./vector-dungeon-session";

test("moveVectorDungeonSession applies a valid coordinate answer", () => {
  const validation = validateMove(START_COORDINATE, { x: 1, y: 0 });
  if (!validation.valid) throw new Error("expected valid move");

  const next = moveVectorDungeonSession(VECTOR_DUNGEON_SESSION_DEFAULT, validation);

  expect(next.position).toEqual({ x: 1, y: 0 });
  expect(next.visitedRoomIds).toContain(validation.room.id);
  expect(next.log.at(-1)?.message).toContain("(0, 0) + (1, 0) = (1, 0)");
});

test("selectVectorDungeonAction persists the pending action id", () => {
  const room = getRoomAt(START_COORDINATE);
  if (!room) throw new Error("missing start room");

  const next = selectVectorDungeonAction(VECTOR_DUNGEON_SESSION_DEFAULT, room.actions[0]!.id);

  expect(next.pendingActionId).toBe(room.actions[0]!.id);
});

test("resolveVectorDungeonAction clears pending action and applies gentle HP loss", () => {
  const room = getRoomAt(START_COORDINATE);
  if (!room) throw new Error("missing start room");
  const action = room.actions[1]!;
  const pending = selectVectorDungeonAction(VECTOR_DUNGEON_SESSION_DEFAULT, action.id);
  const resolution = resolveDungeonAction(room, action.id, action.dc - 1);

  const next = resolveVectorDungeonAction(pending, room, resolution);

  expect(next.pendingActionId).toBeUndefined();
  expect(next.hp).toBe(VECTOR_DUNGEON_SESSION_DEFAULT.hp - 1);
  expect(next.log.at(-1)?.kind).toBe("setback");
  expect(next.log.at(-1)?.message).toMatch(/^Setback:/);
});

test("recoverVectorDungeonAtCamp restores HP and returns to the origin", () => {
  const damaged = { ...VECTOR_DUNGEON_SESSION_DEFAULT, hp: 0, position: { x: 2, y: 1 } };

  const next = recoverVectorDungeonAtCamp(damaged);

  expect(next.hp).toBe(VECTOR_DUNGEON_SESSION_DEFAULT.hp);
  expect(next.position).toEqual(START_COORDINATE);
  expect(next.log.at(-1)?.kind).toBe("camp");
});
