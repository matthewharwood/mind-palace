import type { Flashcard } from "@mind-palace/curriculum";
import type { CardState, Rating } from "@mind-palace/srs";
import { createTimeline, stagger, utils } from "animejs";
import { type ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import * as z from "zod";

import { RatingButtons } from "~/components/rating-buttons";
import { ReadAloudButton } from "~/components/read-aloud";
import { defineComponent } from "~/lib/define-component";
import { buildSpeechTrack } from "~/lib/speech-track";

import { Body } from "./body";

// useLayoutEffect on the client (fires before paint, so the entrance start-state
// lands before the first paint = no flash); falls back to useEffect during
// prerender, where layout effects don't run and would warn.
const useIsomorphicLayoutEffect = typeof document !== "undefined" ? useLayoutEffect : useEffect;

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
    // + scroll-to-top replay per card. A layout effect + a synchronous utils.set
    // applies the hidden start state BEFORE the browser paints, so the card
    // animates INTO view instead of flashing fully-rendered for a frame first.
    useIsomorphicLayoutEffect(() => {
      // A new card always starts at the top (rate-advance otherwise inherits the
      // old scroll position near the footer).
      document.querySelector("main")?.scrollTo({ top: 0 });

      const section = sectionRef.current;
      if (!section) return;
      if (typeof window !== "undefined" && window.matchMedia(PRM).matches) return;

      const blocks = [headerRef.current, bodyRef.current, footerRef.current].filter(
        (el): el is HTMLElement => el !== null,
      );
      utils.set(section, { opacity: 0, scale: 0.96 });
      utils.set(blocks, { y: 26 });
      const tl = createTimeline();
      tl.add(section, { opacity: 1, scale: 1, duration: 300, ease: "out(3)" });
      tl.add(blocks, { y: 0, delay: stagger(75), duration: 400, ease: "out(4)" }, "<+=80");
      return () => {
        tl.revert();
      };
    }, []);

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
          <span className="font-mono text-[11px] text-muted-ash uppercase tracking-[0.2em]">
            {phase}
          </span>
          <div className="flex items-start gap-3">
            <h1 className="flex-1 text-pretty text-[clamp(1.6rem,1.1rem+2vw,2.25rem)] text-midnight-ink leading-[1.12]">
              {flashcard.title}
            </h1>
            {/* Speech is compiled from the card DATA (not scraped from the DOM):
                structured markdown is the prosody source — see lib/speech-track. */}
            <ReadAloudButton getSegments={() => buildSpeechTrack(flashcard)} />
          </div>
        </header>
        <div ref={bodyRef}>
          <Body flashcard={flashcard} />
        </div>
        <footer
          ref={footerRef}
          className="flex flex-col gap-2.5 border-black/[0.07] border-t pt-5 dark:border-white/[0.08]"
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
