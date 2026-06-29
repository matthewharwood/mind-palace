import type { Flashcard } from "@mind-palace/curriculum";
import { type ReactNode, useRef } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import { useAnime } from "~/motion/use-anime";

import { Body } from "../flashcard-view/body";

// StudyCard — one card in the no-scroll Study deck. Fills its stage (h-full) and
// clips overflow so the active-study screen never scrolls; the deck only feeds it
// recall cards (MCQ/code), which fit. Rating is driven by the deck footer buttons
// and the route plays the exit→enter transition. No drag gesture: a draggable
// forces `touch-action: none`, which trapped horizontal scrolling inside wide
// code blocks. The enter animation is a side channel (anime.js in the hook).

const TYPE_LABEL: Record<string, string> = {
  "multiple-choice": "Quiz",
  code: "Write code",
};

export const StudyCardPropsSchema = z.object({
  flashcard: z.custom<Flashcard>(),
});
export type StudyCardProps = z.infer<typeof StudyCardPropsSchema>;

export const StudyCard = defineComponent(
  StudyCardPropsSchema,
  ({ flashcard }: StudyCardProps): ReactNode => {
    const cardRef = useRef<HTMLElement>(null);
    // Subtle enter on each new card — rises in + settles (replays per id;
    // reduced-motion no-ops). Pairs with the route's exit (recede up + fade).
    useAnime(
      cardRef,
      { y: [16, 0], scale: [0.96, 1], opacity: [0, 1], duration: 320, ease: "out(4)" },
      [flashcard.id],
    );

    // Code-bearing cards get a wider stage on desktop so the snippet fits without
    // a horizontal scrollbar (clamped to the viewport); plain cards stay compact.
    const content = flashcard.content;
    const hasCode =
      content.type === "code" || (content.type === "multiple-choice" && Boolean(content.code));
    const widthClass = hasCode ? "max-w-md md:max-w-[min(56rem,92vw)]" : "max-w-md";

    return (
      <article
        ref={cardRef}
        data-test="study-card"
        className={`flex h-full w-full ${widthClass} select-none flex-col gap-3 overflow-hidden rounded-3xl border border-black/10 bg-canvas-white p-5 text-midnight-ink shadow-[0_12px_48px_rgba(17,17,17,0.14)] dark:border-white/10`}
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
