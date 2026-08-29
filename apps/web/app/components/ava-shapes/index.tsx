import {
  AVA_SHAPES_SESSION_DEFAULT,
  type AvaMediaMode,
  type AvaShapeCard,
  AvaShapeCardSchema,
  type AvaShapeColor,
  AvaShapesSessionSchema,
} from "@mind-palace/schemas";
import type { Rating } from "@mind-palace/srs";
import { Info, RotateCcw, Volume2 } from "lucide-react";
import { Graphics } from "pixi.js";
import { type ReactNode, useEffect, useRef, useSyncExternalStore } from "react";
import * as z from "zod";

import { playAvaShapeSound } from "~/audio/ava-shape-sounds";
import { useAvaCard3D } from "~/canvas/use-ava-card-3d";
import { usePixiApp } from "~/canvas/use-pixi-app";
import { AvaMedia } from "~/components/ava-media";
import { RatingButtons } from "~/components/rating-buttons";
import {
  AVA_COLORLESS_SHAPE_CARDS,
  AVA_SHAPE_CARDS,
  areAvaColorsUnlocked,
  avaShapeAnswer,
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

const AvaShapeVideoClipSchema = z.object({
  youtubeVideoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  startSeconds: z.int().min(0),
});

const AVA_SHAPE_VIDEO_CLIPS = z
  .record(z.enum(["square", "oval", "rhombus", "circle", "triangle"]), AvaShapeVideoClipSchema)
  .parse({
    circle: { youtubeVideoId: "jlzX8jt0Now", startSeconds: 18 },
    square: { youtubeVideoId: "jlzX8jt0Now", startSeconds: 63 },
    triangle: { youtubeVideoId: "jlzX8jt0Now", startSeconds: 108 },
    oval: { youtubeVideoId: "jlzX8jt0Now", startSeconds: 211 },
    rhombus: { youtubeVideoId: "jlzX8jt0Now", startSeconds: 266 },
  });

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
      <div className="relative size-full min-h-0 min-w-0 overflow-hidden">
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

export const AvaShapeCanvas3DPropsSchema = z.object({
  card: AvaShapeCardSchema,
});
export type AvaShapeCanvas3DProps = z.infer<typeof AvaShapeCanvas3DPropsSchema>;

export const AvaShapeCanvas3D = defineComponent(
  AvaShapeCanvas3DPropsSchema,
  ({ card }: AvaShapeCanvas3DProps): ReactNode => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const status = useAvaCard3D(canvasRef, {
      kind: "shape",
      shape: card.shape,
      color: card.color,
    });

    return (
      <div className="relative size-full min-h-0 min-w-0 overflow-hidden bg-[radial-gradient(circle_at_top,#f5fbff_0%,#c9d9e9_100%)]">
        {status !== "ready" ? (
          <div className="absolute inset-0">
            <AvaShapeCanvas card={card} />
            {status === "error" ? (
              <p
                role="status"
                className="absolute inset-x-0 bottom-0 border-black/10 border-t bg-canvas-white/95 px-4 py-3 text-center font-medium text-muted-ash text-sm"
              >
                3D is unavailable on this device. Showing the local shape.
              </p>
            ) : null}
          </div>
        ) : null}
        <canvas
          ref={canvasRef}
          role="img"
          aria-hidden={status !== "ready"}
          aria-label={`${avaShapeAnswer(card)} rendered as a lit 3D shape`}
          data-test="ava-shape-canvas-3d"
          data-shape={card.shape}
          data-color={card.color}
          className={`absolute inset-0 block !size-full ${status === "ready" ? "opacity-100" : "opacity-0"}`}
        />
      </div>
    );
  },
);

export const AvaShapesPropsSchema = z.object({
  session: AvaShapesSessionSchema,
  now: z.number(),
  onModeChange: z.custom<(mode: AvaMediaMode) => void>(),
  onRate: z.custom<(cardId: string, rating: Rating) => z.infer<typeof AvaShapesSessionSchema>>(),
  onReset: z.custom<() => void>(),
});
export type AvaShapesProps = z.infer<typeof AvaShapesPropsSchema>;

export const AvaShapes = defineComponent(
  AvaShapesPropsSchema,
  ({ session, now, onModeChange, onRate, onReset }: AvaShapesProps): ReactNode => {
    const interactive = useSyncExternalStore(
      subscribeToHydration,
      getClientHydrationSnapshot,
      getServerHydrationSnapshot,
    );
    const displaySession = interactive ? session : AVA_SHAPES_SESSION_DEFAULT;
    const card = selectAvaShapeCard(displaySession, now);
    const colorsUnlocked = areAvaColorsUnlocked(displaySession);
    const reviewed = countAvaReviewedCards(displaySession);
    const foundationReviewed = AVA_COLORLESS_SHAPE_CARDS.filter(
      (foundationCard) => (displaySession.states[foundationCard.id]?.reps ?? 0) > 0,
    ).length;
    const videoClip = card ? AVA_SHAPE_VIDEO_CLIPS[card.shape] : undefined;

    function play(cardToPlay: AvaShapeCard): void {
      void playAvaShapeSound(cardToPlay).catch(() => undefined);
    }

    function rate(rating: Rating): void {
      if (!card) return;
      onRate(card.id, rating);
    }

    useEffect(() => {
      if (!card || !interactive) return;
      void playAvaShapeSound(card).catch(() => undefined);
    }, [card, interactive]);

    return (
      <section
        className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-y-auto bg-[radial-gradient(circle_at_top,#eff8ff_0%,transparent_45%)] px-2 py-2 sm:px-5 sm:py-4 dark:bg-none"
        data-phase={colorsUnlocked ? "colors" : "foundation"}
      >
        {card ? (
          <div className="relative grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-2 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-1 lg:items-stretch">
            <details className="group absolute top-14 right-1 z-10 sm:top-16">
              <summary className="grid size-9 list-none place-items-center rounded-full border border-black/10 bg-canvas-white/90 text-muted-ash shadow-sm backdrop-blur transition-colors hover:text-midnight-ink marker:hidden dark:border-white/10">
                <Info className="size-4" aria-hidden="true" />
                <span className="sr-only">Session details</span>
              </summary>
              <div className="mt-2 w-64 rounded-2xl border border-black/10 bg-canvas-white p-3 text-xs shadow-card dark:border-white/10">
                <p className="font-semibold text-midnight-ink">Ava&apos;s Shape Sounds</p>
                <p className="mt-1 text-muted-ash">
                  {colorsUnlocked
                    ? `${reviewed} of ${AVA_SHAPE_CARDS.length} combinations introduced`
                    : `${foundationReviewed} of ${AVA_COLORLESS_SHAPE_CARDS.length} colorless shapes covered`}
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
              label={avaShapeAnswer(card)}
              mode={displaySession.viewMode}
              onModeChange={onModeChange}
              twoDContent={<AvaShapeCanvas card={card} />}
              threeDContent={<AvaShapeCanvas3D card={card} />}
              youtubeVideoId={videoClip?.youtubeVideoId}
              youtubeStartSeconds={videoClip?.startSeconds}
              videoFallback={<AvaShapeCanvas card={card} />}
            />

            <div className="flex min-h-0 flex-col justify-end gap-2 rounded-[1.5rem] border border-black/[0.07] bg-canvas-white p-3 shadow-card sm:gap-3 sm:rounded-3xl sm:p-4 dark:border-white/10">
              <div className="flex items-center justify-center gap-3">
                <h1 className="min-w-0 text-center font-semibold text-4xl text-midnight-ink leading-none sm:text-6xl lg:text-5xl">
                  {avaShapeAnswer(card)}
                </h1>
                <button
                  type="button"
                  onClick={() => play(card)}
                  disabled={!interactive}
                  aria-label="Play this shape sound"
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
