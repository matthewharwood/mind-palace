import { expect, test } from "bun:test";
import { VECTOR_DUNGEON_SESSION_DEFAULT } from "@mind-palace/schemas";
import {
  getRoomAt,
  resolveDungeonAction,
  START_COORDINATE,
  validateMove,
} from "@mind-palace/vector-dungeon";

import {
  acceptVectorDungeonSetback,
  moveVectorDungeonSession,
  recoverVectorDungeonAtCamp,
  resolveVectorDungeonAction,
  selectVectorDungeonAction,
  spendVectorDungeonMagic,
} from "./vector-dungeon-session";

test("moveVectorDungeonSession applies a valid relative move", () => {
  const validation = validateMove(START_COORDINATE, { dx: 1, dy: 0 });
  if (!validation.valid) throw new Error("expected valid move");
  const acted = { ...VECTOR_DUNGEON_SESSION_DEFAULT, actedRoomId: "room:0:0" };

  const next = moveVectorDungeonSession(acted, validation);

  expect(next.position).toEqual({ x: 1, y: 0 });
  expect(next.visitedRoomIds).toContain(validation.room.id);
  expect(next.actedRoomId).toBeUndefined();
  expect(next.log.at(-1)?.message).toContain("(0, 0) + (1, 0) = (1, 0)");
});

test("selectVectorDungeonAction persists the pending action id", () => {
  const room = getRoomAt(START_COORDINATE);
  if (!room) throw new Error("missing start room");

  const next = selectVectorDungeonAction(VECTOR_DUNGEON_SESSION_DEFAULT, room, room.actions[0]!.id);

  expect(next.pendingActionId).toBe(room.actions[0]!.id);
});

test("a successful roll claims the reward and locks the room", () => {
  const room = getRoomAt(START_COORDINATE);
  if (!room) throw new Error("missing start room");
  const action = room.actions[1]!;
  const pending = selectVectorDungeonAction(VECTOR_DUNGEON_SESSION_DEFAULT, room, action.id);
  const resolution = resolveDungeonAction(room, action.id, 20);

  const next = resolveVectorDungeonAction(pending, room, resolution);

  expect(next.pendingActionId).toBeUndefined();
  expect(next.actedRoomId).toBe(room.id);
  expect(next.hp).toBe(VECTOR_DUNGEON_SESSION_DEFAULT.hp);
  expect(next.discoveredRewards).toContain(resolution.reward!);
  expect(next.log.at(-1)?.kind).toBe("success");
});

test("a missed roll waits for a magic-or-setback decision without losing a heart", () => {
  const room = getRoomAt(START_COORDINATE);
  if (!room) throw new Error("missing start room");
  const action = room.actions[1]!;
  const pending = selectVectorDungeonAction(VECTOR_DUNGEON_SESSION_DEFAULT, room, action.id);
  const resolution = resolveDungeonAction(room, action.id, action.dc - 1);

  const missed = resolveVectorDungeonAction(pending, room, resolution);

  expect(missed.hp).toBe(VECTOR_DUNGEON_SESSION_DEFAULT.hp);
  expect(missed.pendingMiss).toEqual({ roll: action.dc - 1, dc: action.dc });
  expect(missed.pendingActionId).toBe(action.id);
  expect(missed.actedRoomId).toBeUndefined();
});

test("using magic spends a token, clears the miss, and keeps the action pending", () => {
  const room = getRoomAt(START_COORDINATE);
  if (!room) throw new Error("missing start room");
  const action = room.actions[1]!;
  const pending = selectVectorDungeonAction(VECTOR_DUNGEON_SESSION_DEFAULT, room, action.id);
  const missed = resolveVectorDungeonAction(
    pending,
    room,
    resolveDungeonAction(room, action.id, action.dc - 1),
  );

  const rerolled = spendVectorDungeonMagic(missed);

  expect(rerolled.magicRemaining).toBe(VECTOR_DUNGEON_SESSION_DEFAULT.magicRemaining - 1);
  expect(rerolled.pendingMiss).toBeUndefined();
  expect(rerolled.pendingActionId).toBe(action.id);
  expect(rerolled.hp).toBe(VECTOR_DUNGEON_SESSION_DEFAULT.hp);
});

test("magic is a no-op with an empty pouch, forcing the setback", () => {
  const room = getRoomAt(START_COORDINATE);
  if (!room) throw new Error("missing start room");
  const action = room.actions[1]!;
  const noMagic = { ...VECTOR_DUNGEON_SESSION_DEFAULT, magicRemaining: 0 };
  const missed = resolveVectorDungeonAction(
    selectVectorDungeonAction(noMagic, room, action.id),
    room,
    resolveDungeonAction(room, action.id, action.dc - 1),
  );

  const stillMissed = spendVectorDungeonMagic(missed);
  const settled = acceptVectorDungeonSetback(missed, room);

  expect(stillMissed.pendingMiss).toEqual({ roll: action.dc - 1, dc: action.dc });
  expect(settled.hp).toBe(VECTOR_DUNGEON_SESSION_DEFAULT.hp - 1);
  expect(settled.actedRoomId).toBe(room.id);
  expect(settled.pendingMiss).toBeUndefined();
  expect(settled.log.at(-1)?.kind).toBe("setback");
});

test("a claimed room refuses new actions — Dean must move again", () => {
  const room = getRoomAt(START_COORDINATE);
  if (!room) throw new Error("missing start room");
  const claimed = resolveVectorDungeonAction(
    selectVectorDungeonAction(VECTOR_DUNGEON_SESSION_DEFAULT, room, room.actions[0]!.id),
    room,
    resolveDungeonAction(room, room.actions[0]!.id, 20),
  );

  const blocked = selectVectorDungeonAction(claimed, room, room.actions[1]!.id);

  expect(blocked.pendingActionId).toBeUndefined();
});

test("recoverVectorDungeonAtCamp restores HP and returns to the origin", () => {
  const damaged = {
    ...VECTOR_DUNGEON_SESSION_DEFAULT,
    hp: 0,
    position: { x: 2, y: 1 },
    actedRoomId: "room:2:1",
  };

  const next = recoverVectorDungeonAtCamp(damaged);

  expect(next.hp).toBe(VECTOR_DUNGEON_SESSION_DEFAULT.hp);
  expect(next.position).toEqual(START_COORDINATE);
  expect(next.actedRoomId).toBeUndefined();
  expect(next.log.at(-1)?.kind).toBe("camp");
});
