import { VECTOR_DUNGEON_SESSION_DEFAULT, VectorDungeonSessionSchema } from "@mind-palace/schemas";
import { getRoomAt, resolveDungeonAction, START_COORDINATE } from "@mind-palace/vector-dungeon";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { VectorDungeonDm } from "./index";

const startRoom = getRoomAt(START_COORDINATE);
if (!startRoom) throw new Error("Missing vector dungeon start room");
const startRoomSecondAction = startRoom.actions[1];
if (!startRoomSecondAction) throw new Error("Missing vector dungeon start room action");

const pdfUrl = "/vector-dungeon/dean-vector-dungeon.pdf";

const meta = {
  title: "App/VectorDungeon",
  component: VectorDungeonDm,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof VectorDungeonDm>;

export default meta;
type Story = StoryObj<typeof VectorDungeonDm>;

const baseArgs = {
  session: VECTOR_DUNGEON_SESSION_DEFAULT,
  currentRoom: startRoom,
  pdfUrl,
  onMoveTarget: () => ({ ok: true, message: "Correct. Dean moves one square." }),
  onSelectAction: () => undefined,
  onResolveRoll: () => ({ ok: true, message: "Success." }),
  onRecover: () => undefined,
  onReset: () => undefined,
};

export const FreshSession: Story = {
  args: baseArgs,
};

export const PendingAction: Story = {
  args: {
    ...baseArgs,
    session: VectorDungeonSessionSchema.parse({
      ...VECTOR_DUNGEON_SESSION_DEFAULT,
      pendingActionId: startRoom.actions[0]?.id,
      log: [
        {
          id: "1:move",
          turn: 1,
          kind: "move",
          message: "Moved (0, 0) + (0, 1) = (0, 1).",
        },
      ],
    }),
  },
};

export const LowHp: Story = {
  args: {
    ...baseArgs,
    session: VectorDungeonSessionSchema.parse({
      ...VECTOR_DUNGEON_SESSION_DEFAULT,
      hp: 1,
      discoveredRewards: ["camp ember", "bridge token", "spark badge"],
      log: [
        {
          id: "1:setback",
          turn: 1,
          kind: "setback",
          message: resolveDungeonAction(startRoom, startRoomSecondAction.id, 1).narration,
        },
      ],
    }),
  },
};

export const CampRecovery: Story = {
  args: {
    ...baseArgs,
    session: VectorDungeonSessionSchema.parse({
      ...VECTOR_DUNGEON_SESSION_DEFAULT,
      hp: 0,
      log: [
        {
          id: "1:setback",
          turn: 1,
          kind: "setback",
          message: "Dean loses the last heart and needs camp.",
        },
      ],
    }),
  },
};
