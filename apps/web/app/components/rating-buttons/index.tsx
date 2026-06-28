import type { Rating } from "@mind-palace/srs";
import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";

// RatingButtons — the SRS self-grade row shared by the lesson view and the study
// deck. Numbered 1–4 (Again → Easy) and colour-ramped by difficulty (rose →
// amber → emerald → sky) so the order reads at a glance, like Anki. Dark-aware.
// data-test hooks (`rate-<rating>`) are load-bearing — Playwright drives them.

const RATINGS: { rating: Rating; label: string; num: string; tone: keyof typeof TONE }[] = [
  { rating: "again", label: "Again", num: "1", tone: "rose" },
  { rating: "hard", label: "Hard", num: "2", tone: "amber" },
  { rating: "good", label: "Good", num: "3", tone: "emerald" },
  { rating: "easy", label: "Easy", num: "4", tone: "sky" },
];

const TONE = {
  rose: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20",
  amber:
    "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20",
  sky: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20",
} as const;

export const RatingButtonsPropsSchema = z.object({
  onRate: z.custom<(rating: Rating) => void>(),
});
export type RatingButtonsProps = z.infer<typeof RatingButtonsPropsSchema>;

export const RatingButtons = defineComponent(
  RatingButtonsPropsSchema,
  ({ onRate }: RatingButtonsProps): ReactNode => {
    return (
      <div className="grid grid-cols-4 gap-2">
        {RATINGS.map(({ rating, label, num, tone }) => (
          <button
            key={rating}
            type="button"
            data-test={`rate-${rating}`}
            onClick={() => onRate(rating)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border py-2.5 transition-colors ${TONE[tone]}`}
          >
            <span className="flex size-5 items-center justify-center rounded-md border border-current font-mono text-[11px] leading-none opacity-80">
              {num}
            </span>
            <span className="font-medium text-[14px] leading-none">{label}</span>
          </button>
        ))}
      </div>
    );
  },
);
