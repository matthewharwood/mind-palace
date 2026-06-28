import type { Flashcard } from "@mind-palace/curriculum";
import type { CardState, Rating } from "@mind-palace/srs";
import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";

import { Body } from "./body";

// The lesson-node view: header + the polymorphic content body + the SRS rating
// row. The per-content-type renderers live in sibling files (read/choice/code/
// video/mini-game). Presentational — the route owns SRS state and passes onRate.

const RATINGS: Rating[] = ["again", "hard", "good", "easy"];

export const FlashcardViewPropsSchema = z.object({
  flashcard: z.custom<Flashcard>(),
  phase: z.custom<CardState["phase"]>().optional(),
  onRate: z.custom<(rating: Rating) => void>(),
});
export type FlashcardViewProps = z.infer<typeof FlashcardViewPropsSchema>;

export const FlashcardView = defineComponent(
  FlashcardViewPropsSchema,
  ({ flashcard, phase = "new", onRate }: FlashcardViewProps): ReactNode => {
    return (
      <section
        className="mx-auto flex w-full max-w-[44rem] flex-col gap-7"
        data-test="flashcard-view"
      >
        <header className="flex flex-col gap-2 border-black/[0.07] border-b pb-5">
          <span className="font-mono text-[11px] text-muted-ash uppercase tracking-[0.2em]">
            {phase}
          </span>
          <h1 className="text-pretty text-[clamp(1.6rem,1.1rem+2vw,2.25rem)] text-midnight-ink leading-[1.12]">
            {flashcard.title}
          </h1>
        </header>
        <Body flashcard={flashcard} />
        <footer className="flex flex-col gap-2.5 border-black/[0.07] border-t pt-5">
          <p className="font-mono text-[11px] text-muted-ash uppercase tracking-[0.15em]">
            How well did you know this?
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RATINGS.map((rating) => (
              <button
                key={rating}
                type="button"
                data-test={`rate-${rating}`}
                onClick={() => onRate(rating)}
                className="rounded-lg border border-black/15 px-3 py-2.5 text-midnight-ink text-sm capitalize transition-colors hover:border-black/25 hover:bg-whisper-gray"
              >
                {rating}
              </button>
            ))}
          </div>
        </footer>
      </section>
    );
  },
);
