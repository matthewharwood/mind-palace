import { Timer } from "lucide-react";
import type { ReactNode } from "react";
import * as z from "zod";

import { formatCountdown } from "~/lib/character-party";
import { defineComponent } from "~/lib/define-component";

export const CharacterRoundTimerPropsSchema = z.object({
  durationSeconds: z.union([z.literal(0), z.literal(60), z.literal(90)]),
  secondsRemaining: z.int().min(0).max(90).nullable(),
  onStart: z.custom<() => void>(),
});
export type CharacterRoundTimerProps = z.infer<typeof CharacterRoundTimerPropsSchema>;

function liveTimerMessage(secondsRemaining: number | null): string {
  if (secondsRemaining === 10) return "10 seconds remaining";
  if (secondsRemaining === 0) return "Time is up";
  return "";
}

export const CharacterRoundTimer = defineComponent(
  CharacterRoundTimerPropsSchema,
  ({ durationSeconds, secondsRemaining, onStart }: CharacterRoundTimerProps): ReactNode => {
    if (durationSeconds === 0) {
      return (
        <span className="inline-flex min-h-12 items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 font-semibold text-[#24172c]/65 text-sm dark:border-white/15 dark:bg-white/10 dark:text-white/70">
          <Timer className="size-4" aria-hidden="true" />
          No round timer
        </span>
      );
    }

    if (secondsRemaining === null) {
      return (
        <button
          type="button"
          onClick={onStart}
          className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#24172c]/15 bg-white px-5 font-semibold text-[#24172c] text-sm shadow-sm transition-colors hover:bg-[#fff8e8] dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
        >
          <Timer className="size-4" aria-hidden="true" />
          Start {durationSeconds}-second timer
        </button>
      );
    }

    const expired = secondsRemaining === 0;
    return (
      <div className="flex flex-col items-center gap-1">
        <span
          role="timer"
          aria-label={expired ? "Time is up" : `${secondsRemaining} seconds remaining`}
          className={[
            "inline-flex min-w-28 items-center justify-center rounded-full px-5 py-2 font-mono font-semibold text-2xl tabular-nums",
            expired ? "bg-[#24172c] text-white" : "bg-[#fff0b8] text-[#523b00]",
          ].join(" ")}
        >
          {expired ? "TIME!" : formatCountdown(secondsRemaining)}
        </span>
        <span className="sr-only" aria-live="polite">
          {liveTimerMessage(secondsRemaining)}
        </span>
      </div>
    );
  },
);
