import { type VectorDungeonSession, VectorDungeonSessionSchema } from "@mind-palace/schemas";
import {
  coordinateKey,
  coordinateLabel,
  coordinateToRoomId,
  getActionById,
  getRoomAt,
  MAX_HP,
  START_COORDINATE,
  VECTOR_DUNGEON_ROOMS,
  type VectorDungeonCoordinate,
  VectorDungeonCoordinateSchema,
  VectorDungeonRoomSchema,
  validMovesFrom,
} from "@mind-palace/vector-dungeon";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Download, RotateCcw } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";

const NumberInputSchema = z.coerce.number().pipe(z.int());
const RollInputSchema = z.coerce.number().pipe(z.int().min(1).max(20));
const HEART_KEYS = ["heart-1", "heart-2", "heart-3", "heart-4", "heart-5"] as const;

export const VectorDungeonCommandResultSchema = z.object({
  ok: z.boolean(),
  message: z.string().min(1),
});
export type VectorDungeonCommandResult = z.infer<typeof VectorDungeonCommandResultSchema>;

export const VectorDungeonDmPropsSchema = z.object({
  session: VectorDungeonSessionSchema,
  currentRoom: VectorDungeonRoomSchema,
  pdfUrl: z.string().min(1),
  onMoveTarget: z.custom<(target: VectorDungeonCoordinate) => VectorDungeonCommandResult>(),
  onSelectAction: z.custom<(actionId: string) => void>(),
  onResolveRoll: z.custom<(roll: number) => VectorDungeonCommandResult>(),
  onRecover: z.custom<() => void>(),
  onReset: z.custom<() => void>(),
});
export type VectorDungeonDmProps = z.infer<typeof VectorDungeonDmPropsSchema>;

function movementIcon(dx: number, dy: number): ReactNode {
  if (dx < 0) return <ArrowLeft className="size-3.5" aria-hidden="true" />;
  if (dx > 0) return <ArrowRight className="size-3.5" aria-hidden="true" />;
  if (dy > 0) return <ArrowUp className="size-3.5" aria-hidden="true" />;
  return <ArrowDown className="size-3.5" aria-hidden="true" />;
}

function roomCellClass(current: boolean, visited: boolean): string {
  if (current) return "border-intelligence-blue bg-intelligence-blue text-white";
  if (visited) return "border-emerald-400 bg-emerald-50 text-emerald-900";
  return "border-black/10 bg-canvas-white text-muted-ash dark:border-white/10";
}

const DungeonGridPropsSchema = z.object({
  session: VectorDungeonSessionSchema,
});
type DungeonGridProps = z.infer<typeof DungeonGridPropsSchema>;

const DungeonGrid = defineComponent(
  DungeonGridPropsSchema,
  ({ session }: DungeonGridProps): ReactNode => {
    const rows = [2, 1, 0, -1, -2];
    const columns = [-2, -1, 0, 1, 2];
    return (
      <table
        aria-label="Vector dungeon coordinate grid"
        className="aspect-square w-full table-fixed border-separate border-spacing-1"
      >
        <tbody>
          {rows.map((y) => (
            <tr key={`row-${y}`}>
              {columns.map((x) => {
                const coordinate = { x, y };
                const key = coordinateKey(coordinate);
                const roomId = coordinateToRoomId(coordinate);
                const current = key === coordinateKey(session.position);
                const visited = session.visitedRoomIds.includes(roomId);
                return (
                  <td
                    key={key}
                    aria-label={`${coordinateLabel(coordinate)}${current ? ", current position" : ""}`}
                    data-test={`vector-cell-${x}-${y}`}
                    className={[
                      "min-w-0 rounded-[6px] border text-center align-middle font-mono text-[11px] tabular-nums transition-colors sm:text-xs",
                      roomCellClass(current, visited),
                    ].join(" ")}
                  >
                    {x},{y}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
);

const HpMeterPropsSchema = z.object({
  hp: z.number().int().min(0).max(MAX_HP),
});
type HpMeterProps = z.infer<typeof HpMeterPropsSchema>;

const HpMeter = defineComponent(HpMeterPropsSchema, ({ hp }: HpMeterProps): ReactNode => {
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium text-midnight-ink text-sm">HP</span>
      <meter
        className="sr-only"
        aria-label={`HP ${hp} of ${MAX_HP}`}
        min={0}
        max={MAX_HP}
        value={hp}
      >
        {hp}/{MAX_HP}
      </meter>
      <span className="grid grid-cols-5 gap-1">
        {HEART_KEYS.map((key, index) => (
          <span
            key={key}
            className={[
              "h-2.5 w-5 rounded-full border",
              index < hp
                ? "border-rose-500 bg-rose-500"
                : "border-black/10 bg-light-taupe dark:border-white/10",
            ].join(" ")}
          />
        ))}
      </span>
      <span className="font-mono text-muted-ash text-xs tabular-nums">
        {hp}/{MAX_HP}
      </span>
    </div>
  );
});

const ValidMoveListPropsSchema = z.object({
  session: VectorDungeonSessionSchema,
});
type ValidMoveListProps = z.infer<typeof ValidMoveListPropsSchema>;

const ValidMoveList = defineComponent(
  ValidMoveListPropsSchema,
  ({ session }: ValidMoveListProps): ReactNode => {
    const moves = validMovesFrom(session.position);
    return (
      <ul className="flex flex-wrap gap-2" aria-label="Valid movement vectors">
        {moves.map((move) => {
          const target = {
            x: session.position.x + move.dx,
            y: session.position.y + move.dy,
          };
          return (
            <li
              key={`${move.dx},${move.dy}`}
              className="inline-flex items-center gap-1.5 rounded-[7px] border border-black/10 px-2.5 py-1.5 font-mono text-[12px] text-midnight-ink dark:border-white/10"
            >
              {movementIcon(move.dx, move.dy)}
              <span>
                ({move.dx}, {move.dy}) -&gt; {coordinateLabel(target)}
              </span>
            </li>
          );
        })}
      </ul>
    );
  },
);

function latestLog(session: VectorDungeonSession): string {
  return session.log.at(-1)?.message ?? "Dean begins at Camp Origin, the coordinate (0, 0).";
}

export const VectorDungeonDm = defineComponent(
  VectorDungeonDmPropsSchema,
  ({
    session,
    currentRoom,
    pdfUrl,
    onMoveTarget,
    onSelectAction,
    onResolveRoll,
    onRecover,
    onReset,
  }: VectorDungeonDmProps): ReactNode => {
    const [moveMessage, setMoveMessage] = useState(
      "Choose a one-step vector and enter Dean's target coordinate.",
    );
    const [rollMessage, setRollMessage] = useState("Pick an action to reveal the d20 target.");
    const pendingAction = session.pendingActionId
      ? getActionById(currentRoom, session.pendingActionId)
      : undefined;
    let actionPanel: ReactNode;

    function submitMove(event: FormEvent<HTMLFormElement>): void {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const x = NumberInputSchema.safeParse(formData.get("x"));
      const y = NumberInputSchema.safeParse(formData.get("y"));
      if (!x.success || !y.success) {
        setMoveMessage("Enter whole numbers for x and y.");
        return;
      }
      const target = VectorDungeonCoordinateSchema.safeParse({ x: x.data, y: y.data });
      if (!target.success) {
        setMoveMessage("That coordinate is outside the dungeon grid.");
        return;
      }
      const result = VectorDungeonCommandResultSchema.parse(onMoveTarget(target.data));
      setMoveMessage(result.message);
      if (result.ok) setRollMessage("Pick an action to reveal the d20 target.");
    }

    function submitRoll(event: FormEvent<HTMLFormElement>): void {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const roll = RollInputSchema.safeParse(formData.get("roll"));
      if (!roll.success) {
        setRollMessage("Enter a d20 roll from 1 to 20.");
        return;
      }
      const result = VectorDungeonCommandResultSchema.parse(onResolveRoll(roll.data));
      setRollMessage(result.message);
    }

    if (session.hp === 0) {
      actionPanel = (
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold text-base text-midnight-ink">Back to camp</h2>
          <p className="text-[15px] text-midnight-ink/80 leading-7">
            Dean is out of hearts. Return to camp, refill HP, and keep every discovered room.
          </p>
          <button
            type="button"
            onClick={onRecover}
            className="inline-flex w-fit items-center gap-2 rounded-[8px] bg-midnight-ink px-4 py-2.5 font-medium text-canvas-white text-sm"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Recover at camp
          </button>
        </div>
      );
    } else if (pendingAction) {
      actionPanel = (
        <form onSubmit={submitRoll} className="flex flex-col gap-3">
          <div>
            <h2 className="font-semibold text-base text-midnight-ink">{pendingAction.label}</h2>
            <p className="mt-1 text-muted-ash text-sm">{pendingAction.prompt}</p>
          </div>
          <div className="rounded-[8px] bg-amber-50 p-3 text-amber-950 text-sm">
            Roll d20. Dean needs <span className="font-mono">{pendingAction.dc}</span> or higher.
          </div>
          <label className="flex max-w-[12rem] flex-col gap-1 text-midnight-ink text-sm">
            d20 roll
            <input
              name="roll"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              className="rounded-[8px] border border-black/10 bg-canvas-white px-3 py-2 font-mono text-base dark:border-white/10"
            />
          </label>
          <p className="text-muted-ash text-sm">{rollMessage}</p>
          <button
            type="submit"
            className="w-fit rounded-[8px] bg-midnight-ink px-4 py-2.5 font-medium text-canvas-white text-sm"
          >
            Resolve roll
          </button>
        </form>
      );
    } else {
      actionPanel = (
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="font-semibold text-base text-midnight-ink">Room actions</h2>
            <p className="mt-1 text-muted-ash text-sm">
              Choose one option, then reveal the d20 target.
            </p>
          </div>
          <div className="grid gap-2">
            {currentRoom.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onSelectAction(action.id)}
                className="rounded-[8px] border border-black/10 px-3 py-2.5 text-left transition-colors hover:bg-whisper-gray dark:border-white/10"
              >
                <span className="font-medium text-midnight-ink">{action.label}</span>
                <span className="mt-1 block text-muted-ash text-sm">{action.prompt}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-black/10 bg-canvas-white p-4 shadow-card dark:border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl text-midnight-ink">Vector Dungeon</h1>
                <p className="mt-1 text-muted-ash text-sm">
                  Current position:{" "}
                  <span className="font-mono text-midnight-ink">
                    {coordinateLabel(session.position)}
                  </span>
                </p>
              </div>
              <a
                href={pdfUrl}
                download
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] border border-black/10 px-3 py-2 font-medium text-[13px] text-midnight-ink transition-colors hover:bg-whisper-gray dark:border-white/10"
              >
                <Download className="size-4" aria-hidden="true" />
                PDF
              </a>
            </div>

            <div className="mt-4">
              <DungeonGrid session={session} />
            </div>
            <div className="mt-4">
              <HpMeter hp={session.hp} />
            </div>
          </div>

          <div className="rounded-card border border-black/10 bg-canvas-white p-4 dark:border-white/10">
            <h2 className="font-semibold text-base text-midnight-ink">Movement vectors</h2>
            <p className="mt-1 text-muted-ash text-sm">
              Dean chooses one, adds it, then says the target.
            </p>
            <div className="mt-3">
              <ValidMoveList session={session} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-black/10 bg-canvas-white p-4 shadow-card dark:border-white/10">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-intelligence-blue text-xs">
                {coordinateLabel(currentRoom.coordinate)}
              </span>
              <h2 className="font-semibold text-xl text-midnight-ink">{currentRoom.title}</h2>
              <p className="text-[15px] text-midnight-ink/80 leading-7">{currentRoom.narration}</p>
            </div>
            <p className="mt-4 rounded-[8px] bg-whisper-gray p-3 text-[14px] text-midnight-ink leading-6">
              {latestLog(session)}
            </p>
          </div>

          <form
            key={coordinateKey(session.position)}
            onSubmit={submitMove}
            className="rounded-card border border-black/10 bg-canvas-white p-4 dark:border-white/10"
          >
            <h2 className="font-semibold text-base text-midnight-ink">Check Dean's coordinate</h2>
            <p className="mt-1 text-muted-ash text-sm">{moveMessage}</p>
            <div className="mt-4 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <label className="flex min-w-0 flex-col gap-1 text-midnight-ink text-sm">
                Target X
                <input
                  name="x"
                  type="number"
                  inputMode="numeric"
                  defaultValue={session.position.x}
                  className="min-w-0 rounded-[8px] border border-black/10 bg-canvas-white px-3 py-2 font-mono text-base dark:border-white/10"
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-midnight-ink text-sm">
                Target Y
                <input
                  name="y"
                  type="number"
                  inputMode="numeric"
                  defaultValue={session.position.y}
                  className="min-w-0 rounded-[8px] border border-black/10 bg-canvas-white px-3 py-2 font-mono text-base dark:border-white/10"
                />
              </label>
              <button
                type="submit"
                disabled={session.hp === 0}
                className="rounded-[8px] bg-midnight-ink px-4 py-2.5 font-medium text-canvas-white text-sm transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                Check
              </button>
            </div>
          </form>

          <div className="rounded-card border border-black/10 bg-canvas-white p-4 dark:border-white/10">
            {actionPanel}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-card border border-black/10 bg-canvas-white p-4 dark:border-white/10">
              <h2 className="font-semibold text-base text-midnight-ink">Rewards</h2>
              <p className="mt-1 font-mono text-muted-ash text-xs">
                {session.discoveredRewards.length}/{VECTOR_DUNGEON_ROOMS.length}
              </p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {session.discoveredRewards.length ? (
                  session.discoveredRewards.map((reward) => (
                    <li
                      key={reward}
                      className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-900 text-xs"
                    >
                      {reward}
                    </li>
                  ))
                ) : (
                  <li className="text-muted-ash text-sm">No rewards yet.</li>
                )}
              </ul>
            </div>

            <div className="rounded-card border border-black/10 bg-canvas-white p-4 dark:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-base text-midnight-ink">Session</h2>
                <button
                  type="button"
                  onClick={onReset}
                  className="rounded-[7px] border border-black/10 px-3 py-1.5 text-midnight-ink text-xs transition-colors hover:bg-whisper-gray dark:border-white/10"
                >
                  Reset
                </button>
              </div>
              <ol className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
                {session.log.length ? (
                  session.log
                    .slice()
                    .reverse()
                    .map((entry) => (
                      <li key={entry.id} className="text-[13px] text-muted-ash leading-5">
                        <span className="font-mono text-midnight-ink">#{entry.turn}</span>{" "}
                        {entry.message}
                      </li>
                    ))
                ) : (
                  <li className="text-muted-ash text-sm">The adventure log is empty.</li>
                )}
              </ol>
            </div>
          </div>
        </div>
      </section>
    );
  },
);

export function roomForSession(session: VectorDungeonSession) {
  return getRoomAt(session.position) ?? getRoomAt(START_COORDINATE);
}
