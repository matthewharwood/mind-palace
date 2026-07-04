import {
  VECTOR_DUNGEON_SESSION_DEFAULT,
  type VectorDungeonLogEntry,
  type VectorDungeonSession,
  VectorDungeonSessionSchema,
} from "@mind-palace/schemas";
import {
  coordinateLabel,
  coordinateToRoomId,
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

export function moveVectorDungeonSession(
  session: VectorDungeonSession,
  validation: Extract<VectorDungeonMoveValidation, { valid: true }>,
): VectorDungeonSession {
  const parsed = VectorDungeonSessionSchema.parse(session);
  const base = withoutPendingAction(parsed);
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
  actionId: string,
): VectorDungeonSession {
  return VectorDungeonSessionSchema.parse({ ...session, pendingActionId: actionId });
}

export function resolveVectorDungeonAction(
  session: VectorDungeonSession,
  room: VectorDungeonRoom,
  resolution: VectorDungeonActionResolution,
): VectorDungeonSession {
  const parsed = VectorDungeonSessionSchema.parse(session);
  const base = withoutPendingAction(parsed);
  const hp = Math.max(0, Math.min(MAX_HP, parsed.hp + resolution.hpDelta));
  const rewardText = resolution.reward ? ` Reward: ${resolution.reward}.` : "";
  const outcomeLabel = resolution.outcome === "success" ? "Success" : "Setback";
  return appendLog(
    VectorDungeonSessionSchema.parse({
      ...base,
      hp,
      discoveredRewards: appendUnique(parsed.discoveredRewards, resolution.reward),
    }),
    resolution.outcome,
    `${outcomeLabel}: ${room.title}: ${resolution.narration}${rewardText}`,
  );
}

export function recoverVectorDungeonAtCamp(session: VectorDungeonSession): VectorDungeonSession {
  const parsed = VectorDungeonSessionSchema.parse(session);
  const base = withoutPendingAction(parsed);
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
