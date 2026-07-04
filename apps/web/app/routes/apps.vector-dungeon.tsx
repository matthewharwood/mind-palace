import {
  coordinateLabel,
  getRoomAt,
  resolveDungeonAction,
  START_COORDINATE,
  validateMove,
} from "@mind-palace/vector-dungeon";
import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";

import { roomForSession, VectorDungeonDm } from "~/components/vector-dungeon";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";
import {
  moveVectorDungeonSession,
  recoverVectorDungeonAtCamp,
  resetVectorDungeonSession,
  resolveVectorDungeonAction,
  selectVectorDungeonAction,
} from "~/lib/vector-dungeon-session";
import { vectorDungeonSessionAtom } from "~/state/atoms";

const PDF_URL = `${import.meta.env.BASE_URL}vector-dungeon/dean-vector-dungeon.pdf`;

export const Route = createFileRoute("/apps/vector-dungeon")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps/vector-dungeon",
      title: "Vector Dungeon DM App",
      description:
        "A mobile Dungeon Master app for teaching coordinate vectors with a printable grid adventure.",
    }),
    links: buildSeoLinks({ path: "/apps/vector-dungeon" }),
  }),
  component: VectorDungeonRoute,
});

function moveError(reason: string): string {
  if (reason === "same-space") return "Dean stayed on the same square. Pick a one-step move.";
  if (reason === "diagonal")
    return "That is diagonal. This dungeon only allows one axis at a time.";
  if (reason === "too-far") return "Use -1, 0, or 1, and move exactly one square.";
  if (reason === "out-of-bounds") return "That coordinate is outside the 5 by 5 dungeon.";
  return "That room is not in the dungeon yet.";
}

function VectorDungeonRoute() {
  const [session, setSession] = useAtom(vectorDungeonSessionAtom);
  const currentRoom = roomForSession(session) ?? getRoomAt(START_COORDINATE);
  if (!currentRoom) throw new Error("Vector dungeon start room is missing");

  return (
    <VectorDungeonDm
      session={session}
      currentRoom={currentRoom}
      pdfUrl={PDF_URL}
      onMove={(move) => {
        const validation = validateMove(session.position, move);
        if (!validation.valid) return { ok: false, message: moveError(validation.reason) };
        setSession((prev) => moveVectorDungeonSession(prev, validation));
        return {
          ok: true,
          message: `Correct: ${coordinateLabel(session.position)} + (${validation.move.dx}, ${validation.move.dy}) = ${coordinateLabel(validation.target)}. Read the new room.`,
        };
      }}
      onSelectAction={(actionId) =>
        setSession((prev) => selectVectorDungeonAction(prev, currentRoom, actionId))
      }
      onResolveRoll={(roll) => {
        const pendingActionId = session.pendingActionId;
        if (!pendingActionId) return { ok: false, message: "Pick an action before rolling." };
        const resolution = resolveDungeonAction(currentRoom, pendingActionId, roll);
        setSession((prev) => resolveVectorDungeonAction(prev, currentRoom, resolution));
        return {
          ok: resolution.outcome === "success",
          message:
            resolution.outcome === "success"
              ? `Success. ${resolution.narration}`
              : `Setback. ${resolution.narration}`,
        };
      }}
      onRecover={() => setSession((prev) => recoverVectorDungeonAtCamp(prev))}
      onReset={() => setSession(resetVectorDungeonSession())}
    />
  );
}
