import { ArrowRight, PartyPopper, PencilLine, Printer, Sparkles } from "lucide-react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";

export const CharacterPartyHomePropsSchema = z.object({
  drawHref: z.string().min(1),
  headbandHref: z.string().min(1),
  characterCount: z.int().min(150),
  printableCardCount: z.int().min(120).max(150),
});
export type CharacterPartyHomeProps = z.infer<typeof CharacterPartyHomePropsSchema>;

export const CharacterPartyHome = defineComponent(
  CharacterPartyHomePropsSchema,
  ({ drawHref, headbandHref, characterCount, printableCardCount }: CharacterPartyHomeProps) => {
    return (
      <section className="relative isolate min-h-full overflow-hidden bg-[#fff8e8] px-4 py-8 text-[#24172c] sm:px-8 sm:py-12 dark:bg-[#17131d] dark:text-white">
        <div
          className="pointer-events-none absolute -top-28 -right-28 -z-10 size-80 rounded-full bg-[#ff6d6a]/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-28 -left-28 -z-10 size-80 rounded-full bg-[#6d5dfc]/20 blur-3xl"
          aria-hidden="true"
        />

        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <header className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#24172c]/10 bg-white/70 px-3 py-1.5 font-semibold text-xs uppercase tracking-[0.18em] shadow-sm backdrop-blur dark:border-white/15 dark:bg-white/10">
              <PartyPopper className="size-4 text-[#c83d53]" aria-hidden="true" />
              Character Party
            </span>
            <h1 className="mt-5 text-balance text-[clamp(2.6rem,8vw,5.5rem)] leading-[0.94]">
              What do you want to play?
            </h1>
            <p className="mt-4 max-w-2xl text-pretty text-base leading-7 opacity-70 sm:text-lg">
              One cross-generational cast. Two ways to make a table full of people laugh.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            <a
              href={drawHref}
              className="group flex min-h-72 flex-col justify-between overflow-hidden rounded-[2rem] bg-[#c83d53] p-6 text-white shadow-[0_24px_70px_rgba(152,43,54,0.24)] transition-transform hover:-translate-y-1 focus-visible:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0 sm:p-8"
            >
              <span>
                <span className="grid size-14 place-items-center rounded-2xl bg-white/18">
                  <PencilLine className="size-7" aria-hidden="true" />
                </span>
                <span className="mt-7 block font-semibold text-sm uppercase tracking-[0.18em]">
                  Phone + paper
                </span>
                <span className="mt-2 block text-balance font-semibold text-4xl leading-none sm:text-5xl">
                  Draw the Character
                </span>
                <span className="mt-4 block max-w-sm text-sm leading-6 text-white sm:text-base">
                  Put the phone in the middle, draw the giant prompt, then reveal the real
                  character.
                </span>
              </span>
              <span className="mt-8 inline-flex items-center gap-2 font-semibold">
                Start drawing
                <ArrowRight
                  className="size-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                  aria-hidden="true"
                />
              </span>
            </a>

            <a
              href={headbandHref}
              className="group flex min-h-72 flex-col justify-between overflow-hidden rounded-[2rem] bg-[#5d50e6] p-6 text-white shadow-[0_24px_70px_rgba(62,51,165,0.24)] transition-transform hover:-translate-y-1 focus-visible:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0 sm:p-8"
            >
              <span>
                <span className="grid size-14 place-items-center rounded-2xl bg-white/18">
                  <Printer className="size-7" aria-hidden="true" />
                </span>
                <span className="mt-7 block font-semibold text-sm uppercase tracking-[0.18em]">
                  Print + cut
                </span>
                <span className="mt-2 block text-balance font-semibold text-4xl leading-none sm:text-5xl">
                  Who&apos;s on My Head?
                </span>
                <span className="mt-4 block max-w-sm text-sm leading-6 text-white/85 sm:text-base">
                  Print {printableCardCount} big-name cards, shuffle, and ask yes-or-no questions.
                </span>
              </span>
              <span className="mt-8 inline-flex items-center gap-2 font-semibold">
                Get the cards
                <ArrowRight
                  className="size-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                  aria-hidden="true"
                />
              </span>
            </a>
          </div>

          <p className="mx-auto inline-flex items-center gap-2 text-center font-medium text-sm opacity-65">
            <Sparkles className="size-4 text-[#c83d53]" aria-hidden="true" />
            {characterCount} familiar characters · kids and grown-ups · built for 45-minute play
          </p>
        </div>
      </section>
    );
  },
);
