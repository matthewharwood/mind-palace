import {
  AVA_FIRST_WORDS_SESSION_DEFAULT,
  type AvaFirstWordsSession,
  AvaFirstWordsSessionSchema,
  type AvaMediaMode,
} from "@mind-palace/schemas";
import type { Rating } from "@mind-palace/srs";
import { Info, RotateCcw, Volume2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useSyncExternalStore } from "react";
import * as z from "zod";

import { speakAvaWord, stopAvaWordSpeech } from "~/audio/ava-word-speech";
import { useAvaCard3D } from "~/canvas/use-ava-card-3d";
import { AvaMedia } from "~/components/ava-media";
import { RatingButtons } from "~/components/rating-buttons";
import {
  AVA_FIRST_WORD_CARDS,
  AVA_FIRST_WORD_CATEGORY_LABELS,
  AvaFirstWordCardSchema,
  countAvaFirstWordsReviewedCards,
  selectAvaFirstWordCard,
} from "~/lib/ava-first-words";
import { defineComponent } from "~/lib/define-component";

const BASE_URL = import.meta.env.BASE_URL;
const subscribeToHydration = (): (() => void) => () => undefined;
const getClientHydrationSnapshot = (): boolean => true;
const getServerHydrationSnapshot = (): boolean => false;

const AvaFirstWordPicturePropsSchema = z.object({
  card: AvaFirstWordCardSchema,
});
type AvaFirstWordPictureProps = z.infer<typeof AvaFirstWordPicturePropsSchema>;

const AvaFirstWordPicture = defineComponent(
  AvaFirstWordPicturePropsSchema,
  ({ card }: AvaFirstWordPictureProps): ReactNode => (
    <div className="grid size-full min-h-0 place-items-center overflow-hidden bg-[#fffaf0] p-3 sm:p-5">
      <img
        src={`${BASE_URL}${card.imagePath}`}
        alt={`Illustration of ${card.label.toLowerCase()}`}
        className="max-h-full max-w-full rounded-3xl object-contain drop-shadow-[0_18px_26px_rgba(91,60,37,0.16)]"
      />
    </div>
  ),
);

const AvaFirstWordCard3DPropsSchema = z.object({
  card: AvaFirstWordCardSchema,
});
type AvaFirstWordCard3DProps = z.infer<typeof AvaFirstWordCard3DPropsSchema>;

const AvaFirstWordCard3D = defineComponent(
  AvaFirstWordCard3DPropsSchema,
  ({ card }: AvaFirstWordCard3DProps): ReactNode => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const status = useAvaCard3D(canvasRef, {
      kind: "picture",
      imageUrl: `${BASE_URL}${card.imagePath}`,
    });

    return (
      <div className="relative size-full min-h-0 overflow-hidden bg-[radial-gradient(circle_at_top,#fff8e8_0%,#f0dcc7_100%)]">
        {status !== "ready" ? (
          <div className="absolute inset-0">
            <AvaFirstWordPicture card={card} />
            {status === "error" ? (
              <p
                role="status"
                className="absolute inset-x-0 bottom-0 border-black/10 border-t bg-canvas-white/95 px-4 py-3 text-center font-medium text-muted-ash text-sm"
              >
                3D is unavailable on this device. Showing the local picture.
              </p>
            ) : null}
          </div>
        ) : null}
        <canvas
          ref={canvasRef}
          role="img"
          aria-hidden={status !== "ready"}
          aria-label={`${card.label} shown as a lit 3D picture card`}
          data-test="ava-first-word-3d"
          data-word={card.slug}
          className={`absolute inset-0 block !size-full ${status === "ready" ? "opacity-100" : "opacity-0"}`}
        />
      </div>
    );
  },
);

export const AvaFirstWordsPropsSchema = z.object({
  session: AvaFirstWordsSessionSchema,
  now: z.number(),
  onModeChange: z.custom<(mode: AvaMediaMode) => void>(),
  onRate: z.custom<(cardId: string, rating: Rating) => AvaFirstWordsSession>(),
  onReset: z.custom<() => void>(),
});
export type AvaFirstWordsProps = z.infer<typeof AvaFirstWordsPropsSchema>;

export const AvaFirstWords = defineComponent(
  AvaFirstWordsPropsSchema,
  ({ session, now, onModeChange, onRate, onReset }: AvaFirstWordsProps): ReactNode => {
    const interactive = useSyncExternalStore(
      subscribeToHydration,
      getClientHydrationSnapshot,
      getServerHydrationSnapshot,
    );
    const displaySession = interactive ? session : AVA_FIRST_WORDS_SESSION_DEFAULT;
    const card = selectAvaFirstWordCard(displaySession, now);
    const reviewed = countAvaFirstWordsReviewedCards(displaySession);

    function rate(rating: Rating): void {
      if (!card) return;
      onRate(card.slug, rating);
    }

    useEffect(() => {
      if (!card || !interactive || session.viewMode === "video") return;
      speakAvaWord(card.label);
      return stopAvaWordSpeech;
    }, [card, interactive, session.viewMode]);

    if (!card) {
      return (
        <section className="grid h-full place-items-center p-6 text-center">
          <div className="max-w-sm rounded-3xl border border-black/10 bg-canvas-white p-7 shadow-card dark:border-white/10">
            <p className="text-4xl" aria-hidden="true">
              ✨
            </p>
            <h1 className="mt-3 font-semibold text-2xl text-midnight-ink">All caught up</h1>
            <p className="mt-2 text-muted-ash text-sm leading-6">
              Every word is resting. Come back when the next picture is due.
            </p>
          </div>
        </section>
      );
    }

    return (
      <section className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-y-auto bg-[radial-gradient(circle_at_top,#fff8e8_0%,transparent_48%)] px-2 py-2 sm:px-5 sm:py-4 dark:bg-none">
        <div className="relative grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-2 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-1 lg:items-stretch">
          <details className="group absolute top-14 right-1 z-10 sm:top-16">
            <summary className="grid size-9 list-none place-items-center rounded-full border border-black/10 bg-canvas-white/90 text-muted-ash shadow-sm backdrop-blur transition-colors hover:text-midnight-ink marker:hidden dark:border-white/10">
              <Info className="size-4" aria-hidden="true" />
              <span className="sr-only">Session details</span>
            </summary>
            <div className="mt-2 w-72 rounded-2xl border border-black/10 bg-canvas-white p-3 text-xs shadow-card dark:border-white/10">
              <p className="font-semibold text-midnight-ink">Ava&apos;s First 100 Words</p>
              <p className="mt-1 text-muted-ash">
                {reviewed} of {AVA_FIRST_WORD_CARDS.length} words introduced
              </p>
              <p className="mt-2 text-muted-ash leading-5">
                Video clips stream from YouTube only after you tap play. The picture and 3D card
                stay available offline.
              </p>
              <button
                type="button"
                onClick={onReset}
                disabled={!interactive}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-whisper-gray px-3 py-2 font-medium text-muted-ash transition-colors hover:text-midnight-ink disabled:cursor-wait disabled:opacity-60 dark:border-white/10"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Start over
              </button>
            </div>
          </details>

          <AvaMedia
            label={card.label}
            mode={displaySession.viewMode}
            onModeChange={onModeChange}
            twoDContent={<AvaFirstWordPicture card={card} />}
            threeDContent={<AvaFirstWordCard3D card={card} />}
            youtubeVideoId={card.videoClip?.youtubeVideoId}
            youtubeStartSeconds={card.videoClip?.startSeconds}
            youtubeSourceLabel={card.videoClip?.sourceChannel}
            videoFallback={<AvaFirstWordPicture card={card} />}
          />

          <div className="flex min-h-0 flex-col justify-end gap-2 rounded-[1.5rem] border border-black/[0.07] bg-canvas-white p-3 shadow-card sm:gap-3 sm:rounded-3xl sm:p-4 dark:border-white/10">
            <p className="text-center font-semibold text-[0.7rem] text-intelligence-blue uppercase tracking-[0.16em]">
              {AVA_FIRST_WORD_CATEGORY_LABELS[card.category]}
            </p>
            <div className="flex items-center justify-center gap-3">
              <h1 className="min-w-0 text-center font-semibold text-4xl text-midnight-ink leading-none sm:text-6xl lg:text-5xl">
                {card.label}
              </h1>
              <button
                type="button"
                onClick={() => speakAvaWord(card.label)}
                disabled={!interactive}
                aria-label={`Say ${card.label}`}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-intelligence-blue text-white shadow-[0_8px_22px_rgba(60,129,246,0.3)] transition-transform active:scale-95 disabled:cursor-wait disabled:opacity-60"
              >
                <Volume2 className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col gap-2" aria-live="polite">
              <p className="text-center font-medium text-midnight-ink text-sm">How did Ava do?</p>
              <RatingButtons onRate={rate} />
            </div>
          </div>
        </div>
      </section>
    );
  },
);
