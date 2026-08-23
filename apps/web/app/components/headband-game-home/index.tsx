import {
  CheckCircle2,
  ChevronLeft,
  Clock3,
  HelpCircle,
  Printer,
  Scissors,
  Shuffle,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";

export const HeadbandGameHomePropsSchema = z.object({
  homeHref: z.string().min(1),
  printHref: z.string().min(1),
  libraryCount: z.int().min(150),
  cardCount: z.int().min(120).max(150),
});
export type HeadbandGameHomeProps = z.infer<typeof HeadbandGameHomePropsSchema>;

const QUESTION_STARTERS = [
  "Am I human?",
  "Am I animated?",
  "Am I an animal?",
  "Am I from a movie?",
  "Am I a superhero?",
  "Do I have powers?",
  "Am I from a video game?",
  "Do I wear a hat?",
] as const;

const SETUP_STEPS = [
  "Print the deck at 100% and cut on the dashed lines.",
  "Shuffle the cards and put the deck face down.",
  "Take a card without looking and place it in your headband facing out.",
  "Ask yes-or-no questions. A correct guess earns one point.",
] as const;

export const HeadbandGameHome = defineComponent(
  HeadbandGameHomePropsSchema,
  ({ homeHref, printHref, libraryCount, cardCount }: HeadbandGameHomeProps): ReactNode => {
    return (
      <section className="min-h-full bg-[#eef1ff] px-4 py-6 text-[#211d4c] sm:px-8 sm:py-10 dark:bg-[#121329] dark:text-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-7">
          <a
            href={homeHref}
            className="inline-flex w-fit items-center gap-2 rounded-full py-2 font-semibold text-sm opacity-65 hover:opacity-100"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Character Party
          </a>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="rounded-[2rem] bg-[#5d50e6] p-6 text-white shadow-[0_24px_70px_rgba(62,51,165,0.2)] sm:p-8">
              <p className="flex items-center gap-2 font-semibold text-sm uppercase tracking-[0.18em] text-white">
                <Users className="size-4" aria-hidden="true" />
                Printable party game
              </p>
              <h1 className="mt-4 text-balance text-[clamp(2.7rem,8vw,5.2rem)] leading-[0.93]">
                Who&apos;s on My Head?
              </h1>
              <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-white sm:text-lg">
                A giant mixed-generation deck for kids, parents, grandparents, and every pop-culture
                memory in between.
              </p>

              <div className="mt-8 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/12 p-3">
                  <span className="block font-semibold text-2xl">{cardCount}</span>
                  <span className="text-white/90 text-xs">cards</span>
                </div>
                <div className="rounded-2xl bg-white/12 p-3">
                  <span className="block font-semibold text-2xl">{Math.ceil(cardCount / 9)}</span>
                  <span className="text-white/90 text-xs">sheets</span>
                </div>
                <div className="rounded-2xl bg-white/12 p-3">
                  <span className="block font-semibold text-2xl">90</span>
                  <span className="text-white/90 text-xs">min ready</span>
                </div>
              </div>

              <a
                href={printHref}
                className="mt-8 inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 font-semibold text-[#342b9c] text-lg shadow-[0_14px_36px_rgba(26,18,103,0.2)] transition-transform active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                <Printer className="size-5" aria-hidden="true" />
                Open printable cards
              </a>
              <p className="mt-3 text-center text-white/90 text-xs">
                US Letter · 9 cards per page · black-and-white friendly
              </p>
            </div>

            <aside className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-3xl border border-[#211d4c]/10 bg-white/75 p-5 shadow-sm dark:border-white/15 dark:bg-white/10">
                <Scissors
                  className="size-6 text-[#5d50e6] dark:text-[#a9a1ff]"
                  aria-hidden="true"
                />
                <h2 className="mt-3 font-semibold text-lg">Print and cut</h2>
                <p className="mt-1 text-sm leading-6 opacity-65">
                  Dashed lines make nine cards per sheet.
                </p>
              </div>
              <div className="rounded-3xl border border-[#211d4c]/10 bg-white/75 p-5 shadow-sm dark:border-white/15 dark:bg-white/10">
                <Shuffle className="size-6 text-[#5d50e6] dark:text-[#a9a1ff]" aria-hidden="true" />
                <h2 className="mt-3 font-semibold text-lg">Shuffle freely</h2>
                <p className="mt-1 text-sm leading-6 opacity-65">
                  Confusing card? Put it on the bottom and keep playing.
                </p>
              </div>
              <div className="rounded-3xl border border-[#211d4c]/10 bg-white/75 p-5 shadow-sm dark:border-white/15 dark:bg-white/10">
                <Clock3 className="size-6 text-[#5d50e6] dark:text-[#a9a1ff]" aria-hidden="true" />
                <h2 className="mt-3 font-semibold text-lg">Pick a pace</h2>
                <p className="mt-1 text-sm leading-6 opacity-65">
                  Try 60–90 seconds per turn or play without a clock.
                </p>
              </div>
            </aside>
          </div>

          <details
            open
            className="group rounded-[2rem] border border-[#211d4c]/10 bg-white/75 p-5 shadow-sm dark:border-white/15 dark:bg-white/10 sm:p-7"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 font-semibold text-xl marker:hidden">
              <span className="grid size-10 place-items-center rounded-full bg-[#5d50e6]/10 text-[#5d50e6] dark:bg-white/10 dark:text-[#a9a1ff]">
                <HelpCircle className="size-5" aria-hidden="true" />
              </span>
              How to play
            </summary>
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              <ol className="grid gap-3">
                {SETUP_STEPS.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm leading-6">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#5d50e6] font-semibold text-white text-xs">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div>
                <h3 className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="size-5 text-[#2c9b67]" aria-hidden="true" />
                  Good questions
                </h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {QUESTION_STARTERS.map((question) => (
                    <li
                      key={question}
                      className="rounded-full border border-[#211d4c]/10 bg-[#eef1ff] px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10"
                    >
                      {question}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm leading-6 opacity-65">
                  Other players answer yes, no, or maybe. Guess whenever you are ready. The most
                  correct characters after 45 minutes wins—or skip scoring entirely.
                </p>
              </div>
            </div>
          </details>

          <p className="text-center text-sm opacity-55">
            Selected from {libraryCount} family-friendly characters, balanced across eras and
            difficulty.
          </p>
        </div>
      </section>
    );
  },
);
