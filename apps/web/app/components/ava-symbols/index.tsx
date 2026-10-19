import {
  AVA_LETTERS_SESSION_DEFAULT,
  AVA_NUMBERS_SESSION_DEFAULT,
  type AvaSymbolRepresentation,
  type AvaSymbolsSession,
  AvaSymbolsSessionSchema,
} from "@mind-palace/schemas";
import type { Rating } from "@mind-palace/srs";
import { ArrowLeft, ArrowRight, RotateCcw, Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import * as z from "zod";

import { speakAvaWord } from "~/audio/ava-word-speech";
import { AvaMedia } from "~/components/ava-media";
import { AvaSymbolPicture } from "~/components/ava-symbol-picture";
import { RatingButtons } from "~/components/rating-buttons";
import { buildAvaSymbolImage, getAvaSymbolCards, getAvaSymbolLabel } from "~/lib/ava-symbols";
import { defineComponent } from "~/lib/define-component";
import { useHydrated } from "~/lib/use-hydrated";

const BASE_URL = import.meta.env.BASE_URL;
const REPRESENTATIONS: readonly AvaSymbolRepresentation[] = ["symbol", "alternate", "word"];

const AvaSymbolsPropsSchema = z.object({
  session: AvaSymbolsSessionSchema,
  onSessionChange: z.custom<(session: AvaSymbolsSession) => void>(),
  onRate: z.custom<(rating: Rating) => void>(),
});
export type AvaSymbolsProps = z.infer<typeof AvaSymbolsPropsSchema>;

export const AvaSymbols = defineComponent(
  AvaSymbolsPropsSchema,
  ({ session, onSessionChange, onRate }): ReactNode => {
    const interactive = useHydrated();
    const numbers = session.id === "ava-numbers";
    const initial = numbers ? AVA_NUMBERS_SESSION_DEFAULT : AVA_LETTERS_SESSION_DEFAULT;
    const displayed = interactive ? session : initial;
    const cards = getAvaSymbolCards(session.id);
    const card = cards[displayed.selectedIndex];
    if (!card) throw new Error("The selected symbol is missing from its deck");
    const title = numbers ? "Ava's Numbers" : "Ava's Letters";
    const label = getAvaSymbolLabel(card);
    const reviewed = cards.filter((item) => displayed.states[item.id]?.reps).length;
    const representationLabels = numbers
      ? ["Numeral", "Count", "Word"]
      : ["Uppercase", "Lowercase", "Picture word"];
    function selectIndex(selectedIndex: number): void {
      onSessionChange({ ...session, selectedIndex });
    }
    return (
      <section className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-3 overflow-y-auto px-3 py-3 sm:px-6 sm:py-5">
        <header className="flex shrink-0 items-start justify-between gap-3">
          <div>
            <h1 className="font-semibold text-2xl text-midnight-ink sm:text-3xl">{title}</h1>
            <p className="mt-1 text-muted-ash text-sm">
              {numbers
                ? "0–10 · See it, count it, say it"
                : "A–Z · Big letters, little letters, familiar words"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSessionChange(initial)}
            disabled={!interactive}
            aria-label={`Start ${numbers ? "numbers" : "letters"} over`}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-canvas-white text-muted-ash shadow-sm disabled:opacity-50"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </button>
        </header>
        <div className="grid shrink-0 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="flex min-h-0 flex-col gap-2">
            <AvaMedia
              key={card.id}
              label={label}
              mode={displayed.viewMode}
              onModeChange={(viewMode) => onSessionChange({ ...session, viewMode })}
              twoDContent={
                <AvaSymbolPicture
                  key={`2d-${displayed.representation}`}
                  card={card}
                  representation={displayed.representation}
                  mode="2d"
                />
              }
              threeDContent={
                <AvaSymbolPicture
                  key={`3d-${displayed.representation}`}
                  card={card}
                  representation={displayed.representation}
                  mode="3d"
                />
              }
              videoSrc={`${BASE_URL}ava-symbols/videos/${session.id}/${card.id}.mp4`}
              videoPoster={buildAvaSymbolImage(card, "symbol")}
              videoFallback={
                <div className="relative grid size-full min-h-0 place-items-center overflow-hidden bg-[#fffaf0]">
                  <img
                    src={buildAvaSymbolImage(card, displayed.representation)}
                    alt={`${label}: ${displayed.representation} representation`}
                    className="absolute inset-0 size-full object-contain"
                  />
                </div>
              }
            />
            <fieldset className="grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-black/5 p-1 dark:bg-white/5">
              <legend className="sr-only">Representation</legend>
              {REPRESENTATIONS.map((representation, index) => (
                <button
                  key={representation}
                  type="button"
                  aria-pressed={displayed.representation === representation}
                  disabled={!interactive}
                  onClick={() => onSessionChange({ ...session, representation })}
                  className={`min-h-11 rounded-lg px-2 font-semibold text-sm ${displayed.representation === representation ? "bg-canvas-white text-midnight-ink shadow-sm" : "text-muted-ash"}`}
                >
                  {representationLabels[index]}
                </button>
              ))}
            </fieldset>
          </div>
          <aside className="flex min-h-0 flex-col gap-4 rounded-3xl border border-black/10 bg-canvas-white p-4 shadow-card dark:border-white/10">
            <div className="flex items-center justify-between gap-2">
              <h2 aria-live="polite" className="font-semibold text-2xl text-midnight-ink">
                {label}
              </h2>
              <button
                type="button"
                aria-label={`Say ${label}`}
                disabled={!interactive}
                onClick={() => speakAvaWord(label)}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-intelligence-blue text-white"
              >
                <Volume2 className="size-5" aria-hidden="true" />
              </button>
            </div>
            <nav
              aria-label={`Choose a ${numbers ? "number" : "letter"}`}
              className="grid grid-cols-6 gap-1.5"
            >
              {cards.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={!interactive}
                  aria-label={`Choose ${item.kind === "number" ? item.value : item.upper}`}
                  aria-pressed={index === displayed.selectedIndex}
                  onClick={() => selectIndex(index)}
                  className={`relative min-h-11 rounded-xl font-semibold text-lg transition-colors ${index === displayed.selectedIndex ? "bg-intelligence-blue text-white" : "bg-whisper-gray text-midnight-ink hover:bg-intelligence-blue/10"}`}
                >
                  {item.kind === "number" ? item.value : item.upper}
                  {displayed.states[item.id]?.reps ? (
                    <span
                      className="absolute right-1 bottom-1 size-1 rounded-full bg-current"
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
              ))}
            </nav>
            <div className="flex items-center justify-between gap-2 text-muted-ash text-sm">
              <button
                type="button"
                aria-label="Previous card"
                disabled={!interactive}
                onClick={() =>
                  selectIndex((displayed.selectedIndex + cards.length - 1) % cards.length)
                }
                className="grid size-11 place-items-center rounded-full bg-whisper-gray"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
              </button>
              <span>
                {displayed.selectedIndex + 1} / {cards.length}
              </span>
              <button
                type="button"
                aria-label="Next card"
                disabled={!interactive}
                onClick={() => selectIndex((displayed.selectedIndex + 1) % cards.length)}
                className="grid size-11 place-items-center rounded-full bg-whisper-gray"
              >
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-auto flex flex-col gap-2">
              <p className="text-center text-muted-ash text-xs" aria-live="polite">
                {reviewed} of {cards.length} {numbers ? "numbers" : "letters"} practiced
              </p>
              <p className="text-center font-medium text-midnight-ink text-sm">How did Ava do?</p>
              <RatingButtons onRate={onRate} />
            </div>
          </aside>
        </div>
      </section>
    );
  },
);
