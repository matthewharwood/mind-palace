import { coordinateLabel, VECTOR_DUNGEON_ROOMS } from "@mind-palace/vector-dungeon";
import { BookOpen, Dices, Heart, MoveRight } from "lucide-react";
import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";

export const VectorDungeonGuidePropsSchema = z.object({
  title: z.string().min(1).default("Dean's Vector Dungeon"),
});
export type VectorDungeonGuideProps = z.infer<typeof VectorDungeonGuidePropsSchema>;

const examples = [
  { start: "(0, 0)", velocity: "(1, 0)", target: "(1, 0)", note: "one step right" },
  { start: "(1, 0)", velocity: "(0, 1)", target: "(1, 1)", note: "one step up" },
  { start: "(0, 1)", velocity: "(-1, 0)", target: "(-1, 1)", note: "one step left" },
  { start: "(-1, 1)", velocity: "(0, -1)", target: "(-1, 0)", note: "one step down" },
] as const;
const GUIDE_HEART_KEYS = [
  "guide-heart-1",
  "guide-heart-2",
  "guide-heart-3",
  "guide-heart-4",
  "guide-heart-5",
] as const;
const VECTOR_TRAIL_KEYS = [
  "trail-1",
  "trail-2",
  "trail-3",
  "trail-4",
  "trail-5",
  "trail-6",
  "trail-7",
  "trail-8",
] as const;

function renderMiniGrid(): ReactNode {
  const rows = [2, 1, 0, -1, -2];
  const columns = [-2, -1, 0, 1, 2];
  return (
    <div className="grid aspect-square w-full grid-cols-5 gap-[3px]">
      {rows.flatMap((y) =>
        columns.map((x) => (
          <div
            key={`${x},${y}`}
            className={[
              "grid place-items-center border border-midnight-ink/30 font-mono text-[8px]",
              x === 0 && y === 0 ? "bg-intelligence-blue text-white" : "bg-white",
            ].join(" ")}
          >
            {x},{y}
          </div>
        )),
      )}
    </div>
  );
}

export const VectorDungeonGuide = defineComponent(
  VectorDungeonGuidePropsSchema,
  ({ title }: VectorDungeonGuideProps): ReactNode => {
    const featuredRooms = VECTOR_DUNGEON_ROOMS.filter((room) =>
      ["room:0:0", "room:1:0", "room:0:1", "room:-1:0", "room:0:-1", "room:2:2"].includes(room.id),
    );
    return (
      <main className="mx-auto min-h-dvh bg-white p-4 text-midnight-ink print:p-0">
        <article className="mx-auto flex min-h-[11in] w-full max-w-[8.5in] flex-col gap-4 bg-white p-6 shadow-card print:min-h-[11in] print:w-[8.5in] print:max-w-none print:shadow-none">
          <header className="grid gap-3 border-midnight-ink border-b pb-3 sm:grid-cols-[1fr_220px]">
            <div>
              <p className="flex items-center gap-2 font-medium text-intelligence-blue text-sm">
                <BookOpen className="size-4" aria-hidden="true" />
                Printable knight map
              </p>
              <h1 className="mt-1 text-4xl text-midnight-ink leading-none">{title}</h1>
              <p className="mt-2 text-sm leading-6">
                Dean is a knight on a coordinate grid. Each turn, choose one velocity vector, add it
                to the starting position, and write the target room.
              </p>
            </div>
            {renderMiniGrid()}
          </header>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[8px] border border-midnight-ink/25 p-3">
              <h2 className="flex items-center gap-2 font-semibold text-base">
                <MoveRight className="size-4" aria-hidden="true" />
                The rule
              </h2>
              <p className="mt-2 font-mono text-lg">start + velocity = target</p>
              <p className="mt-2 text-sm leading-6">
                Only one number changes each step. Right is `+1` on x. Left is `-1` on x. Up is `+1`
                on y. Down is `-1` on y.
              </p>
            </div>
            <div className="rounded-[8px] border border-midnight-ink/25 p-3">
              <h2 className="flex items-center gap-2 font-semibold text-base">
                <Dices className="size-4" aria-hidden="true" />
                Dice and hearts
              </h2>
              <p className="mt-2 text-sm leading-6">
                After a correct coordinate, choose a room action. Roll a d20. If the roll misses,
                cross off one heart and keep adventuring.
              </p>
              <fieldset className="mt-3 flex gap-1 border-0 p-0">
                <legend className="sr-only">Five HP hearts</legend>
                {GUIDE_HEART_KEYS.map((key) => (
                  <span
                    key={key}
                    className="grid size-8 place-items-center border border-midnight-ink"
                  >
                    <Heart className="size-4" aria-hidden="true" />
                  </span>
                ))}
              </fieldset>
            </div>
          </section>

          <section>
            <h2 className="font-semibold text-base">Worked examples</h2>
            <table className="mt-2 w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-midnight-ink border-y">
                  <th className="py-1 pr-2">Start</th>
                  <th className="py-1 pr-2">Velocity</th>
                  <th className="py-1 pr-2">Target</th>
                  <th className="py-1">Means</th>
                </tr>
              </thead>
              <tbody>
                {examples.map((example) => (
                  <tr
                    key={`${example.start}-${example.velocity}`}
                    className="border-midnight-ink/20 border-b"
                  >
                    <td className="py-1.5 pr-2 font-mono">{example.start}</td>
                    <td className="py-1.5 pr-2 font-mono">{example.velocity}</td>
                    <td className="py-1.5 pr-2 font-mono">{example.target}</td>
                    <td className="py-1.5">{example.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="grid min-h-0 flex-1 gap-3 sm:grid-cols-[1fr_1fr]">
            <div>
              <h2 className="font-semibold text-base">Room journal</h2>
              <div className="mt-2 grid gap-2">
                {featuredRooms.map((room) => (
                  <div key={room.id} className="rounded-[8px] border border-midnight-ink/25 p-2">
                    <p className="font-semibold text-sm">
                      {coordinateLabel(room.coordinate)} {room.title}
                    </p>
                    <div className="mt-2 h-10 border-midnight-ink/25 border-t" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-base">My vector trail</h2>
              <div className="mt-2 grid grid-rows-8 gap-2">
                {VECTOR_TRAIL_KEYS.map((key) => (
                  <div key={key} className="grid grid-cols-[1fr_1fr_1fr] gap-2 text-xs">
                    <span className="border-midnight-ink/25 border-b pb-1">Start</span>
                    <span className="border-midnight-ink/25 border-b pb-1">Velocity</span>
                    <span className="border-midnight-ink/25 border-b pb-1">Target</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </article>
      </main>
    );
  },
);
