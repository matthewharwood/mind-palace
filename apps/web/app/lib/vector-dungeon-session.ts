import {
  VECTOR_DUNGEON_SESSION_DEFAULT,
  type VectorDungeonLogEntry,
  type VectorDungeonSession,
  VectorDungeonSessionSchema,
} from "@mind-palace/schemas";
import {
  coordinateLabel,
  coordinateToRoomId,
  getActionById,
  isRoomRewardClaimed,
  MAX_HP,
  START_COORDINATE,
  type VectorDungeonActionResolution,
  type VectorDungeonMoveValidation,
  type VectorDungeonRoom,
} from "@mind-palace/vector-dungeon";

function appendUnique(values: readonly string[], value: string | undefined): string[] {
  if (!value || values.includes(value)) return [...values];
  return [...values, value];
}

function appendLog(
  session: VectorDungeonSession,
  kind: VectorDungeonLogEntry["kind"],
  message: string,
): VectorDungeonSession {
  const turn = session.turn + 1;
  return VectorDungeonSessionSchema.parse({
    ...session,
    turn,
    log: [...session.log, { id: `${turn}:${kind}`, turn, kind, message }],
  });
}

function withoutPendingAction(session: VectorDungeonSession): VectorDungeonSession {
  const next = { ...session };
  delete next.pendingActionId;
  return VectorDungeonSessionSchema.parse(next);
}

function withoutRoomActionLock(session: VectorDungeonSession): VectorDungeonSession {
  const next = { ...session };
  delete next.actedRoomId;
  return VectorDungeonSessionSchema.parse(next);
}

function withoutPendingMiss(session: VectorDungeonSession): VectorDungeonSession {
  const next = { ...session };
  delete next.pendingMiss;
  return VectorDungeonSessionSchema.parse(next);
}

export function moveVectorDungeonSession(
  session: VectorDungeonSession,
  validation: Extract<VectorDungeonMoveValidation, { valid: true }>,
): VectorDungeonSession {
  const parsed = VectorDungeonSessionSchema.parse(session);
  const base = withoutPendingMiss(withoutRoomActionLock(withoutPendingAction(parsed)));
  return appendLog(
    VectorDungeonSessionSchema.parse({
      ...base,
      position: validation.target,
      visitedRoomIds: appendUnique(parsed.visitedRoomIds, validation.room.id),
    }),
    "move",
    `Moved ${coordinateLabel(parsed.position)} + (${validation.move.dx}, ${validation.move.dy}) = ${coordinateLabel(validation.target)}.`,
  );
}

export function selectVectorDungeonAction(
  session: VectorDungeonSession,
  room: VectorDungeonRoom,
  actionId: string,
): VectorDungeonSession {
  const parsed = VectorDungeonSessionSchema.parse(session);
  // A cleared (totally-green) room has no actions left — you must move again.
  if (isRoomRewardClaimed(room, parsed.discoveredRewards)) return parsed;
  if (parsed.actedRoomId === room.id || parsed.pendingMiss) return parsed;
  if (!getActionById(room, actionId)) return parsed;
  return VectorDungeonSessionSchema.parse({ ...parsed, pendingActionId: actionId });
}

/** Resolve a d20 roll. Success claims the reward immediately; a miss becomes a
 *  pending decision — spend magic to re-roll, or take the setback — so no heart
 *  is lost yet. */
export function resolveVectorDungeonAction(
  session: VectorDungeonSession,
  room: VectorDungeonRoom,
  resolution: VectorDungeonActionResolution,
): VectorDungeonSession {
  const parsed = VectorDungeonSessionSchema.parse(session);
  if (resolution.outcome === "success") {
    const rewardText = resolution.reward ? ` Reward: ${resolution.reward}.` : "";
    return appendLog(
      VectorDungeonSessionSchema.parse({
        ...withoutPendingMiss(withoutPendingAction(parsed)),
        actedRoomId: room.id,
        discoveredRewards: appendUnique(parsed.discoveredRewards, resolution.reward),
      }),
      "success",
      `Success: ${room.title}: ${resolution.narration}${rewardText}`,
    );
  }
  // Miss: hold the outcome. Keep the pending action so a re-roll can retry it.
  return VectorDungeonSessionSchema.parse({
    ...parsed,
    pendingMiss: { roll: resolution.roll, dc: resolution.dc },
  });
}

/** Spend one magic token to clear a pending miss and re-roll the same action. */
export function spendVectorDungeonMagic(session: VectorDungeonSession): VectorDungeonSession {
  const parsed = VectorDungeonSessionSchema.parse(session);
  if (!parsed.pendingMiss || parsed.magicRemaining <= 0) return parsed;
  return appendLog(
    withoutPendingMiss(
      VectorDungeonSessionSchema.parse({ ...parsed, magicRemaining: parsed.magicRemaining - 1 }),
    ),
    "move",
    `Dean spends magic (${parsed.magicRemaining - 1} left) and rolls again.`,
  );
}

/** Accept a pending miss: lose one heart and finish the room action. */
export function acceptVectorDungeonSetback(
  session: VectorDungeonSession,
  room: VectorDungeonRoom,
): VectorDungeonSession {
  const parsed = VectorDungeonSessionSchema.parse(session);
  if (!parsed.pendingMiss) return parsed;
  const hp = Math.max(0, parsed.hp - 1);
  return appendLog(
    withoutPendingMiss(
      withoutPendingAction(
        VectorDungeonSessionSchema.parse({ ...parsed, hp, actedRoomId: room.id }),
      ),
    ),
    "setback",
    `Setback: ${room.title}: the moment passes and Dean loses one heart.`,
  );
}

export function recoverVectorDungeonAtCamp(session: VectorDungeonSession): VectorDungeonSession {
  const parsed = VectorDungeonSessionSchema.parse(session);
  const base = withoutPendingMiss(withoutRoomActionLock(withoutPendingAction(parsed)));
  return appendLog(
    VectorDungeonSessionSchema.parse({
      ...base,
      hp: MAX_HP,
      position: START_COORDINATE,
      visitedRoomIds: appendUnique(parsed.visitedRoomIds, coordinateToRoomId(START_COORDINATE)),
    }),
    "camp",
    "Dean returns to Camp Origin, eats a snack, and restores every heart.",
  );
}

export function resetVectorDungeonSession(): VectorDungeonSession {
  return VECTOR_DUNGEON_SESSION_DEFAULT;
}
