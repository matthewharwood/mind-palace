import type { Flashcard } from "@mind-palace/curriculum";
import { type ReactNode, useRef } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import { useAnime } from "~/motion/use-anime";
import { type SwipeRating, useSwipeCard } from "~/motion/use-swipe-card";

import { Body } from "../flashcard-view/body";

// StudyCard — one swipeable card in the no-scroll Study deck. Fills its stage
// (h-full) and clips overflow so the active-study screen never scrolls; the deck
// only feeds it recall cards (MCQ/code), which fit. Swipe to rate (Tinder) via
// useSwipeCard; the rating buttons in the deck footer are the always-present
// fallback. Side channels (anime.js) stay in the hooks, never in render.

const TYPE_LABEL: Record<string, string> = {
  "multiple-choice": "Quiz",
  code: "Write code",
};

export const StudyCardPropsSchema = z.object({
  flashcard: z.custom<Flashcard>(),
  onRate: z.custom<(rating: SwipeRating) => void>(),
});
export type StudyCardProps = z.infer<typeof StudyCardPropsSchema>;

export const StudyCard = defineComponent(
  StudyCardPropsSchema,
  ({ flashcard, onRate }: StudyCardProps): ReactNode => {
    const cardRef = useRef<HTMLElement>(null);
    useSwipeCard(cardRef, onRate);
    // Subtle enter on each new card (replays per id; reduced-motion no-ops).
    useAnime(cardRef, { opacity: [0, 1], scale: [0.96, 1], duration: 220, ease: "out(2)" }, [
      flashcard.id,
    ]);

    return (
      <article
        ref={cardRef}
        data-test="study-card"
        className="flex h-full w-full max-w-md touch-none select-none flex-col gap-3 overflow-hidden rounded-3xl border border-black/10 bg-canvas-white p-5 text-midnight-ink shadow-[0_12px_48px_rgba(17,17,17,0.14)]"
      >
        <span className="font-mono text-[10px] text-muted-ash uppercase tracking-[0.22em]">
          {TYPE_LABEL[flashcard.content.type] ?? "Card"}
        </span>
        <h2 className="text-pretty font-semibold text-[1.35rem] leading-tight">
          {flashcard.title}
        </h2>
        <div className="min-h-0 flex-1 overflow-hidden">
          <Body flashcard={flashcard} />
        </div>
      </article>
    );
  },
);
