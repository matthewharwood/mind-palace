import type { Flashcard } from "@mind-palace/curriculum";
import type { CardState, Rating } from "@mind-palace/srs";
import { createTimeline, stagger } from "animejs";
import { type ReactNode, useEffect, useRef } from "react";
import * as z from "zod";

import { RatingButtons } from "~/components/rating-buttons";
import { ReadAloudButton } from "~/components/read-aloud";
import { defineComponent } from "~/lib/define-component";

import { Body } from "./body";

// The lesson-node view: header (phase + title + read-aloud) + the polymorphic
// content body + the SRS rating row. The route keys this by nodeId, so it
// remounts per card — and on mount it scrolls the scroller to the top and plays
// an anime.js entrance: the card fades/zooms in while its three sections cascade
// up on a stagger (a per-child timeline CSS can't express). The route plays the
// matching exit before advancing. Reduced-motion → instant. Transform + opacity
// only, so it stays on the GPU compositor.

const PRM = "(prefers-reduced-motion: reduce)";

export const FlashcardViewPropsSchema = z.object({
  flashcard: z.custom<Flashcard>(),
  phase: z.custom<CardState["phase"]>().optional(),
  onRate: z.custom<(rating: Rating) => void>(),
});
export type FlashcardViewProps = z.infer<typeof FlashcardViewPropsSchema>;

export const FlashcardView = defineComponent(
  FlashcardViewPropsSchema,
  ({ flashcard, phase = "new", onRate }: FlashcardViewProps): ReactNode => {
    const sectionRef = useRef<HTMLElement>(null);
    const headerRef = useRef<HTMLElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLElement>(null);

    // Mount-only — the route remounts this per nodeId (via key), so the entrance
    // + scroll-to-top replay per card.
    useEffect(() => {
      // A new card always starts at the top (rate-advance otherwise inherits the
      // old scroll position near the footer).
      document.querySelector("main")?.scrollTo({ top: 0 });

      const section = sectionRef.current;
      if (!section) return;
      if (typeof window !== "undefined" && window.matchMedia(PRM).matches) return;

      const blocks = [headerRef.current, bodyRef.current, footerRef.current].filter(
        (el): el is HTMLElement => el !== null,
      );
      const tl = createTimeline();
      tl.add(section, { opacity: [0, 1], scale: [0.96, 1], duration: 300, ease: "out(3)" });
      tl.add(blocks, { y: [26, 0], delay: stagger(75), duration: 400, ease: "out(4)" }, "<+=80");
      return () => {
        tl.revert();
      };
    }, []);

    // Read the card aloud: its title + body, minus the chrome (phase eyebrow +
    // rating footer carry `data-read-aloud-skip`). Cloned so the live DOM is safe.
    function getCardText(): string {
      const el = sectionRef.current;
      if (!el) return "";
      const clone = el.cloneNode(true);
      if (!(clone instanceof Element)) return el.textContent ?? "";
      for (const skip of clone.querySelectorAll("[data-read-aloud-skip]")) skip.remove();
      return clone.textContent ?? "";
    }

    return (
      <section
        ref={sectionRef}
        className="mx-auto flex w-full max-w-[44rem] flex-col gap-7"
        data-test="flashcard-view"
      >
        <header
          ref={headerRef}
          className="flex flex-col gap-2 border-black/[0.07] border-b pb-5 dark:border-white/[0.08]"
        >
          <span
            className="font-mono text-[11px] text-muted-ash uppercase tracking-[0.2em]"
            data-read-aloud-skip
          >
            {phase}
          </span>
          <div className="flex items-start gap-3">
            <h1 className="flex-1 text-pretty text-[clamp(1.6rem,1.1rem+2vw,2.25rem)] text-midnight-ink leading-[1.12]">
              {flashcard.title}
            </h1>
            <ReadAloudButton getText={getCardText} />
          </div>
        </header>
        <div ref={bodyRef}>
          <Body flashcard={flashcard} />
        </div>
        <footer
          ref={footerRef}
          className="flex flex-col gap-2.5 border-black/[0.07] border-t pt-5 dark:border-white/[0.08]"
          data-read-aloud-skip
        >
          <p className="font-mono text-[11px] text-muted-ash uppercase tracking-[0.15em]">
            How well did you know this?
          </p>
          <RatingButtons onRate={onRate} />
        </footer>
      </section>
    );
  },
);
