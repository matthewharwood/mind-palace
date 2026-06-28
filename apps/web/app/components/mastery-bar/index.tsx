import type { CardPhase } from "@mind-palace/srs";
import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";

// A horizontal stacked bar showing the spaced-repetition phase mix of a set of
// cards (mastered / learning / relearning / not-started). Pure + presentational
// — no router, no IDB — so it stories cleanly and is the reusable progress
// primitive the report composes.

const SEGMENTS: { key: CardPhase; label: string; className: string }[] = [
  { key: "review", label: "Mastered", className: "bg-[#47d096]" },
  { key: "learning", label: "Learning", className: "bg-[#fbc768]" },
  { key: "relearning", label: "Relearning", className: "bg-[#e16540]" },
  { key: "new", label: "Not started", className: "bg-light-taupe" },
];

export const MasteryBarPropsSchema = z.object({
  counts: z.custom<Record<CardPhase, number>>(),
  total: z.number(),
});
export type MasteryBarProps = z.infer<typeof MasteryBarPropsSchema>;

export const MasteryBar = defineComponent(
  MasteryBarPropsSchema,
  ({ counts, total }: MasteryBarProps): ReactNode => {
    const label = `${counts.review} mastered, ${counts.learning} learning, ${counts.relearning} relearning, ${counts.new} not started of ${total}`;
    return (
      <div
        role="img"
        aria-label={label}
        className="flex h-2 w-full overflow-hidden rounded-full bg-light-taupe"
      >
        {SEGMENTS.map((segment) => {
          const count = counts[segment.key];
          if (count <= 0 || total <= 0) return null;
          const widthPct = (count / total) * 100;
          return (
            <span
              key={segment.key}
              className={segment.className}
              // Dynamic proportion — a data-driven width can't be a static class.
              style={{ width: `${widthPct}%` }}
            />
          );
        })}
      </div>
    );
  },
);
