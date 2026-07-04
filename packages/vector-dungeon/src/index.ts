import * as z from "zod";

export const GRID_MIN = -2;
export const GRID_MAX = 2;
export const START_COORDINATE = { x: 0, y: 0 } as const;
export const MAX_HP = 5;

export const VectorDungeonCoordinateSchema = z.object({
  x: z.int().min(GRID_MIN).max(GRID_MAX),
  y: z.int().min(GRID_MIN).max(GRID_MAX),
});
export type VectorDungeonCoordinate = z.infer<typeof VectorDungeonCoordinateSchema>;

export const VectorDungeonMoveSchema = z
  .object({
    dx: z.int().min(-1).max(1),
    dy: z.int().min(-1).max(1),
  })
  .refine((move) => Math.abs(move.dx) + Math.abs(move.dy) === 1, {
    error: "move must be exactly one cardinal grid step",
  });
export type VectorDungeonMove = z.infer<typeof VectorDungeonMoveSchema>;

export const VectorDungeonActionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  prompt: z.string().min(1),
  dc: z.int().min(2).max(20),
  success: z.string().min(1),
  setback: z.string().min(1),
  reward: z.string().min(1).optional(),
});
export type VectorDungeonAction = z.infer<typeof VectorDungeonActionSchema>;

export const VectorDungeonRoomSchema = z.object({
  id: z.string().min(1),
  coordinate: VectorDungeonCoordinateSchema,
  title: z.string().min(1),
  narration: z.string().min(1),
  feature: z.string().min(1),
  actions: z.array(VectorDungeonActionSchema).length(3),
});
export type VectorDungeonRoom = z.infer<typeof VectorDungeonRoomSchema>;

export const VectorDungeonActionResolutionSchema = z.object({
  actionId: z.string().min(1),
  roll: z.int().min(1).max(20),
  dc: z.int().min(2).max(20),
  outcome: z.enum(["success", "setback"]),
  narration: z.string().min(1),
  hpDelta: z.int().min(-1).max(0),
  reward: z.string().min(1).optional(),
});
export type VectorDungeonActionResolution = z.infer<typeof VectorDungeonActionResolutionSchema>;

export const VectorDungeonMoveValidationSchema = z.discriminatedUnion("valid", [
  z.object({
    valid: z.literal(true),
    from: VectorDungeonCoordinateSchema,
    target: VectorDungeonCoordinateSchema,
    move: VectorDungeonMoveSchema,
    room: VectorDungeonRoomSchema,
  }),
  z.object({
    valid: z.literal(false),
    reason: z.enum(["same-space", "diagonal", "too-far", "out-of-bounds", "missing-room"]),
  }),
]);
export type VectorDungeonMoveValidation = z.infer<typeof VectorDungeonMoveValidationSchema>;

type RoomBlueprint = {
  coordinate: VectorDungeonCoordinate;
  title: string;
  narration: string;
  feature: string;
  reward: string;
};

const ROOM_BLUEPRINTS: RoomBlueprint[] = [
  {
    coordinate: { x: -2, y: 2 },
    title: "Frost Rune Balcony",
    narration: "Cold blue runes glow on a balcony above the dungeon mist.",
    feature: "frost rune",
    reward: "blue rune",
  },
  {
    coordinate: { x: -1, y: 2 },
    title: "Owlbear Library",
    narration: "A tiny owlbear librarian stamps scrolls with serious paws.",
    feature: "floating scroll",
    reward: "map scrap",
  },
  {
    coordinate: { x: 0, y: 2 },
    title: "North Star Gate",
    narration: "A silver gate points straight up the y-axis like a compass needle.",
    feature: "north star",
    reward: "silver key",
  },
  {
    coordinate: { x: 1, y: 2 },
    title: "Thunder Tile Hall",
    narration: "Yellow floor tiles hum each time a boot touches the grid.",
    feature: "thunder tile",
    reward: "spark badge",
  },
  {
    coordinate: { x: 2, y: 2 },
    title: "Cloud Dragon Roost",
    narration: "A sleepy cloud dragon curls around the corner tower.",
    feature: "cloud nest",
    reward: "dragon feather",
  },
  {
    coordinate: { x: -2, y: 1 },
    title: "Mossy Minus Wall",
    narration: "Green moss covers the far-left wall where x is deeply negative.",
    feature: "minus wall",
    reward: "moss shield",
  },
  {
    coordinate: { x: -1, y: 1 },
    title: "Lantern Beetle Den",
    narration: "Lantern beetles blink in pairs, lighting small coordinate marks.",
    feature: "lantern beetles",
    reward: "glow bead",
  },
  {
    coordinate: { x: 0, y: 1 },
    title: "Training Bridge",
    narration: "A short bridge crosses one square north from camp.",
    feature: "practice bridge",
    reward: "bridge token",
  },
  {
    coordinate: { x: 1, y: 1 },
    title: "Mirror Knight Nook",
    narration: "A mirror knight copies every step, then gives a polite bow.",
    feature: "mirror shield",
    reward: "polished coin",
  },
  {
    coordinate: { x: 2, y: 1 },
    title: "Clockwork Sparrow Loft",
    narration: "Clockwork sparrows hop east and west on brass rails.",
    feature: "brass rail",
    reward: "gear feather",
  },
  {
    coordinate: { x: -2, y: 0 },
    title: "West Wind Armory",
    narration: "The armory flags flap left, showing the way to smaller x values.",
    feature: "west wind banner",
    reward: "banner patch",
  },
  {
    coordinate: { x: -1, y: 0 },
    title: "Minus One Guardpost",
    narration: "A friendly guard asks for the vector that brought Dean one step left.",
    feature: "guardpost chalkboard",
    reward: "chalk star",
  },
  {
    coordinate: { x: 0, y: 0 },
    title: "Camp Origin",
    narration: "Dean's camp sits at the origin, where the x and y axes cross.",
    feature: "origin campfire",
    reward: "camp ember",
  },
  {
    coordinate: { x: 1, y: 0 },
    title: "Plus One Pantry",
    narration: "A pantry door opens one square to the right of camp.",
    feature: "pantry door",
    reward: "apple tart",
  },
  {
    coordinate: { x: 2, y: 0 },
    title: "East Arrow Gallery",
    narration: "Painted arrows point toward larger x values across the wall.",
    feature: "east arrow mural",
    reward: "arrow charm",
  },
  {
    coordinate: { x: -2, y: -1 },
    title: "Echo Well",
    narration: "A stone well echoes every number Dean says back twice.",
    feature: "echo well",
    reward: "echo pearl",
  },
  {
    coordinate: { x: -1, y: -1 },
    title: "Goblin Abacus Shop",
    narration: "A shopkeeper slides beads to count steps through the dungeon.",
    feature: "abacus counter",
    reward: "counting bead",
  },
  {
    coordinate: { x: 0, y: -1 },
    title: "South Step Stair",
    narration: "A stair drops one square down from camp into warmer air.",
    feature: "south stair",
    reward: "stair token",
  },
  {
    coordinate: { x: 1, y: -1 },
    title: "Potion Bubble Bath",
    narration: "Round potion bubbles drift up and pop into tiny plus signs.",
    feature: "potion bubble",
    reward: "bubble vial",
  },
  {
    coordinate: { x: 2, y: -1 },
    title: "Phoenix Ash Oven",
    narration: "A warm oven puffs red ash that settles into grid lines.",
    feature: "ash oven",
    reward: "warm coal",
  },
  {
    coordinate: { x: -2, y: -2 },
    title: "Deep Left Vault",
    narration: "The vault door is far left and far down, locked with two numbers.",
    feature: "number lock",
    reward: "vault gem",
  },
  {
    coordinate: { x: -1, y: -2 },
    title: "Crystal Bat Cave",
    narration: "Crystal bats chirp short patterns: left, right, up, down.",
    feature: "crystal bat",
    reward: "crystal chip",
  },
  {
    coordinate: { x: 0, y: -2 },
    title: "South Star Pool",
    narration: "A still pool reflects the y-axis below camp.",
    feature: "south star",
    reward: "pool drop",
  },
  {
    coordinate: { x: 1, y: -2 },
    title: "Ruby Slime Kitchen",
    narration: "Ruby slime cooks soup by hopping exactly one square at a time.",
    feature: "soup cauldron",
    reward: "ruby spoon",
  },
  {
    coordinate: { x: 2, y: -2 },
    title: "Final Vector Door",
    narration: "The last door shines with arrows that all add up to adventure.",
    feature: "vector door",
    reward: "vector crown",
  },
];

function makeActionIds(roomId: string): [string, string, string] {
  return [`${roomId}:study`, `${roomId}:help`, `${roomId}:brave`];
}

function makeRoom(blueprint: RoomBlueprint): VectorDungeonRoom {
  const id = coordinateToRoomId(blueprint.coordinate);
  const [studyId, helpId, braveId] = makeActionIds(id);
  return VectorDungeonRoomSchema.parse({
    id,
    coordinate: blueprint.coordinate,
    title: blueprint.title,
    narration: blueprint.narration,
    feature: blueprint.feature,
    actions: [
      {
        id: studyId,
        label: `Study the ${blueprint.feature}`,
        prompt: "Roll to notice the important pattern in this room.",
        dc: 8,
        success: `Dean studies the ${blueprint.feature} and spots a useful clue.`,
        setback: `The ${blueprint.feature} is confusing for a moment. Dean marks the room and tries again later.`,
        reward: blueprint.reward,
      },
      {
        id: helpId,
        label: "Help someone nearby",
        prompt: "Roll to solve a small dungeon problem with kindness.",
        dc: 10,
        success: `Dean helps with brave manners. The room shares the ${blueprint.reward}.`,
        setback: "The helper says thank you anyway, but the dungeon drains one heart of energy.",
        reward: blueprint.reward,
      },
      {
        id: braveId,
        label: "Try a knightly stunt",
        prompt: "Roll to do something bold without knocking over the scenery.",
        dc: 12,
        success: `A clean knightly move wins cheers and the ${blueprint.reward}.`,
        setback: "The stunt turns into a tumble. No disaster, but Dean loses one heart.",
      },
    ],
  });
}

export const VECTOR_DUNGEON_ROOMS: readonly VectorDungeonRoom[] = VectorDungeonRoomSchema.array()
  .length(25)
  .parse(ROOM_BLUEPRINTS.map(makeRoom));

const roomsById = new Map(VECTOR_DUNGEON_ROOMS.map((room) => [room.id, room]));
const roomsByCoordinate = new Map(
  VECTOR_DUNGEON_ROOMS.map((room) => [coordinateKey(room.coordinate), room]),
);

export function coordinateKey(coordinate: VectorDungeonCoordinate): string {
  const parsed = VectorDungeonCoordinateSchema.parse(coordinate);
  return `${parsed.x},${parsed.y}`;
}

export function coordinateToRoomId(coordinate: VectorDungeonCoordinate): string {
  const parsed = VectorDungeonCoordinateSchema.parse(coordinate);
  return `room:${parsed.x}:${parsed.y}`;
}

export function coordinateLabel(coordinate: VectorDungeonCoordinate): string {
  const parsed = VectorDungeonCoordinateSchema.parse(coordinate);
  return `(${parsed.x}, ${parsed.y})`;
}

export function getRoomAt(coordinate: VectorDungeonCoordinate): VectorDungeonRoom | undefined {
  return roomsByCoordinate.get(coordinateKey(coordinate));
}

export function getRoomById(roomId: string): VectorDungeonRoom | undefined {
  return roomsById.get(roomId);
}

export function movementVector(
  from: VectorDungeonCoordinate,
  target: VectorDungeonCoordinate,
): { dx: number; dy: number } {
  const parsedFrom = VectorDungeonCoordinateSchema.parse(from);
  const parsedTarget = VectorDungeonCoordinateSchema.parse(target);
  return { dx: parsedTarget.x - parsedFrom.x, dy: parsedTarget.y - parsedFrom.y };
}

export function isUnitStep(move: { dx: number; dy: number }): move is VectorDungeonMove {
  return VectorDungeonMoveSchema.safeParse(move).success;
}

export function applyMove(
  from: VectorDungeonCoordinate,
  move: VectorDungeonMove,
): VectorDungeonCoordinate | null {
  const parsedFrom = VectorDungeonCoordinateSchema.parse(from);
  const parsedMove = VectorDungeonMoveSchema.parse(move);
  const target = { x: parsedFrom.x + parsedMove.dx, y: parsedFrom.y + parsedMove.dy };
  const parsedTarget = VectorDungeonCoordinateSchema.safeParse(target);
  return parsedTarget.success ? parsedTarget.data : null;
}

export function validMovesFrom(from: VectorDungeonCoordinate): VectorDungeonMove[] {
  const moves: VectorDungeonMove[] = [
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  return moves.filter((move) => applyMove(from, move));
}

export function validateMove(
  from: VectorDungeonCoordinate,
  move: { dx: number; dy: number },
): VectorDungeonMoveValidation {
  const parsedFrom = VectorDungeonCoordinateSchema.parse(from);
  const rawMove = { dx: move.dx, dy: move.dy };
  if (rawMove.dx === 0 && rawMove.dy === 0) return { valid: false, reason: "same-space" };
  if (Math.abs(rawMove.dx) === 1 && Math.abs(rawMove.dy) === 1) {
    return { valid: false, reason: "diagonal" };
  }
  if (!isUnitStep(rawMove)) return { valid: false, reason: "too-far" };

  const target = applyMove(parsedFrom, rawMove);
  if (!target) return { valid: false, reason: "out-of-bounds" };

  const room = getRoomAt(target);
  if (!room) return { valid: false, reason: "missing-room" };

  return {
    valid: true,
    from: parsedFrom,
    target,
    move: rawMove,
    room,
  };
}

export function getActionById(
  room: VectorDungeonRoom,
  actionId: string,
): VectorDungeonAction | undefined {
  return room.actions.find((action) => action.id === actionId);
}

export function resolveDungeonAction(
  room: VectorDungeonRoom,
  actionId: string,
  roll: number,
): VectorDungeonActionResolution {
  const parsedRoom = VectorDungeonRoomSchema.parse(room);
  const parsedRoll = z.int().min(1).max(20).parse(roll);
  const action = getActionById(parsedRoom, actionId);
  if (!action) {
    throw new Error(`Unknown vector dungeon action: ${actionId}`);
  }
  const success = parsedRoll >= action.dc;
  return VectorDungeonActionResolutionSchema.parse({
    actionId: action.id,
    roll: parsedRoll,
    dc: action.dc,
    outcome: success ? "success" : "setback",
    narration: success ? action.success : action.setback,
    hpDelta: success ? 0 : -1,
    reward: success ? action.reward : undefined,
  });
}

export function isDungeonComplete(discoveredRewards: readonly string[]): boolean {
  const requiredRewards = new Set(VECTOR_DUNGEON_ROOMS.map((room) => room.actions[0]?.reward));
  for (const reward of discoveredRewards) requiredRewards.delete(reward);
  return requiredRewards.size === 0;
}
