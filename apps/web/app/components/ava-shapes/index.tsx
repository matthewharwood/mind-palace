import {
  type AvaShapeCard,
  AvaShapeCardSchema,
  type AvaShapeColor,
  AvaShapesSessionSchema,
} from "@mind-palace/schemas";
import type { Rating } from "@mind-palace/srs";
import { RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { Graphics } from "pixi.js";
import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import * as z from "zod";

import { playAvaShapeSound } from "~/audio/ava-shape-sounds";
import { usePixiApp } from "~/canvas/use-pixi-app";
import { RatingButtons } from "~/components/rating-buttons";
import {
  AVA_COLORLESS_SHAPE_CARDS,
  AVA_SHAPE_CARDS,
  areAvaColorsUnlocked,
  avaShapeAnswer,
  avaShapePrompt,
  countAvaReviewedCards,
  selectAvaShapeCard,
} from "~/lib/ava-shapes";
import { defineComponent } from "~/lib/define-component";

const PIXI_FILL: Record<AvaShapeColor, number> = {
  colorless: 0xfffdf7,
  red: 0xff5d67,
  orange: 0xffa43a,
  yellow: 0xffdc52,
  green: 0x59c987,
  blue: 0x55a8ff,
  purple: 0x9a7cff,
  pink: 0xff85bd,
};

const subscribeToHydration = (): (() => void) => () => undefined;
const getClientHydrationSnapshot = (): boolean => true;
const getServerHydrationSnapshot = (): boolean => false;

export const AvaShapeCanvasPropsSchema = z.object({
  card: AvaShapeCardSchema,
});
export type AvaShapeCanvasProps = z.infer<typeof AvaShapeCanvasPropsSchema>;

export const AvaShapeCanvas = defineComponent(
  AvaShapeCanvasPropsSchema,
  ({ card }: AvaShapeCanvasProps): ReactNode => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const latestCardRef = useRef(card);
    const redrawRef = useRef<(() => void) | null>(null);

    usePixiApp(
      canvasRef,
      (app) => {
        const graphics = new Graphics();
        app.stage.addChild(graphics);

        const render = (): void => {
          drawShape(graphics, latestCardRef.current, app.screen.width, app.screen.height);
          app.render();
        };
        redrawRef.current = render;
        render();

        const resize = (): void => {
          app.resize();
          render();
        };
        window.addEventListener("resize", resize);
        return () => {
          redrawRef.current = null;
          window.removeEventListener("resize", resize);
        };
      },
      [],
      { autoStart: false, backgroundAlpha: 0, preference: "webgl" },
    );

    useEffect(() => {
      latestCardRef.current = card;
      redrawRef.current?.();
    }, [card]);

    return (
      <div className="relative aspect-square w-full min-w-0 max-w-full overflow-hidden sm:max-w-[28rem]">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${avaShapeAnswer(card)} shape drawn with WebGL`}
          data-test="ava-shape-canvas"
          data-shape={card.shape}
          data-color={card.color}
          className="absolute inset-0 block !size-full"
        />
      </div>
    );
  },
);

export const AvaShapesPropsSchema = z.object({
  session: AvaShapesSessionSchema,
  now: z.number(),
  onRate: z.custom<(cardId: string, rating: Rating) => z.infer<typeof AvaShapesSessionSchema>>(),
  onReset: z.custom<() => void>(),
});
export type AvaShapesProps = z.infer<typeof AvaShapesPropsSchema>;

export const AvaShapes = defineComponent(
  AvaShapesPropsSchema,
  ({ session, now, onRate, onReset }: AvaShapesProps): ReactNode => {
    const interactive = useSyncExternalStore(
      subscribeToHydration,
      getClientHydrationSnapshot,
      getServerHydrationSnapshot,
    );
    const [revealedCardId, setRevealedCardId] = useState<string | null>(null);
    const card = selectAvaShapeCard(session, now);
    const colorsUnlocked = areAvaColorsUnlocked(session);
    const reviewed = countAvaReviewedCards(session);
    const foundationReviewed = AVA_COLORLESS_SHAPE_CARDS.filter(
      (foundationCard) => (session.states[foundationCard.id]?.reps ?? 0) > 0,
    ).length;
    const revealed = card?.id === revealedCardId;

    function play(cardToPlay: AvaShapeCard): void {
      void playAvaShapeSound(cardToPlay).catch(() => undefined);
    }

    function rate(rating: Rating): void {
      if (!card) return;
      onRate(card.id, rating);
    }

    return (
      <section
        className="mx-auto flex min-h-full w-full max-w-5xl flex-col bg-[radial-gradient(circle_at_top,#eff8ff_0%,transparent_45%)] px-4 py-4 sm:px-8 sm:py-7 dark:bg-none"
        data-phase={colorsUnlocked ? "colors" : "foundation"}
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 font-medium text-intelligence-blue text-xs uppercase tracking-[0.16em]">
              <Sparkles className="size-4" aria-hidden="true" />
              Ava&apos;s shape sounds
            </div>
            <h1 className="font-semibold text-2xl text-midnight-ink sm:text-3xl">
              {colorsUnlocked ? "Shape + color" : "Shape foundations"}
            </h1>
            <p className="mt-1 text-muted-ash text-sm">
              {colorsUnlocked
                ? `${reviewed} of ${AVA_SHAPE_CARDS.length} combinations introduced`
                : `${foundationReviewed} of ${AVA_COLORLESS_SHAPE_CARDS.length} colorless shapes covered`}
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            disabled={!interactive}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-black/10 bg-canvas-white px-3 py-2 font-medium text-muted-ash text-xs shadow-sm transition-colors hover:text-midnight-ink dark:border-white/10"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Start over
          </button>
        </header>

        {card ? (
          <div className="grid min-h-0 flex-1 gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center lg:gap-8">
            <div className="grid min-h-[17rem] min-w-0 place-items-center overflow-hidden rounded-[2rem] border border-black/[0.06] bg-canvas-white/80 p-3 shadow-[0_18px_60px_rgba(44,71,112,0.12)] backdrop-blur dark:border-white/10 dark:bg-midnight-ink/30">
              <AvaShapeCanvas card={card} />
            </div>

            <div className="flex flex-col gap-3 rounded-3xl border border-black/[0.07] bg-canvas-white p-4 shadow-card dark:border-white/10 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] text-muted-ash uppercase tracking-[0.2em]">
                    Ask Ava
                  </p>
                  <p className="mt-1 font-semibold text-lg text-midnight-ink">
                    {avaShapePrompt(card)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => play(card)}
                  disabled={!interactive}
                  aria-label="Play this shape sound"
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-intelligence-blue text-white shadow-[0_8px_22px_rgba(60,129,246,0.3)] transition-transform active:scale-95"
                >
                  <Volume2 className="size-5" aria-hidden="true" />
                </button>
              </div>

              <p className="text-muted-ash text-xs leading-5">
                The first tone names the shape. The second tone adds its color.
              </p>

              {revealed ? (
                <div className="flex flex-col gap-3" aria-live="polite">
                  <div className="rounded-2xl bg-whisper-gray px-4 py-3 text-center dark:bg-white/5">
                    <p className="text-muted-ash text-xs">Answer</p>
                    <h2 className="font-semibold text-2xl text-midnight-ink">
                      {avaShapeAnswer(card)}
                    </h2>
                  </div>
                  <p className="text-center font-medium text-midnight-ink text-sm">
                    How did Ava do?
                  </p>
                  <RatingButtons onRate={rate} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setRevealedCardId(card.id)}
                  disabled={!interactive}
                  className="min-h-12 rounded-2xl bg-midnight-ink px-5 py-3 font-semibold text-canvas-white transition-transform active:scale-[0.99]"
                >
                  Reveal answer
                </button>
              )}

              {!colorsUnlocked ? (
                <p className="rounded-xl bg-intelligence-blue/8 px-3 py-2 text-intelligence-blue text-xs leading-5">
                  Colors stay locked until all five plain shapes have appeared once.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="grid flex-1 place-items-center py-12 text-center">
            <div className="max-w-sm rounded-3xl border border-black/10 bg-canvas-white p-7 shadow-card dark:border-white/10">
              <p className="text-4xl" aria-hidden="true">
                ✨
              </p>
              <h2 className="mt-3 font-semibold text-2xl text-midnight-ink">All caught up</h2>
              <p className="mt-2 text-muted-ash text-sm leading-6">
                Every available card is resting. Come back when the next shape is due.
              </p>
            </div>
          </div>
        )}
      </section>
    );
  },
);

function drawShape(graphics: Graphics, card: AvaShapeCard, width: number, height: number): void {
  graphics.clear();
  const centerX = width / 2;
  const centerY = height / 2;
  const size = Math.min(width, height) * 0.62;
  const half = size / 2;
  const fill = PIXI_FILL[card.color];
  const stroke = { width: Math.max(5, size * 0.035), color: 0x17213b, join: "round" as const };

  if (card.shape === "square") {
    graphics
      .rect(centerX - half, centerY - half, size, size)
      .fill(fill)
      .stroke(stroke);
    return;
  }
  if (card.shape === "oval") {
    graphics
      .ellipse(centerX, centerY, half, half * 0.64)
      .fill(fill)
      .stroke(stroke);
    return;
  }
  if (card.shape === "rhombus") {
    graphics
      .poly(
        [
          centerX,
          centerY - half,
          centerX + half,
          centerY,
          centerX,
          centerY + half,
          centerX - half,
          centerY,
        ],
        true,
      )
      .fill(fill)
      .stroke(stroke);
    return;
  }
  if (card.shape === "circle") {
    graphics.circle(centerX, centerY, half).fill(fill).stroke(stroke);
    return;
  }
  graphics
    .poly(
      [centerX, centerY - half, centerX + half, centerY + half, centerX - half, centerY + half],
      true,
    )
    .fill(fill)
    .stroke(stroke);
}
