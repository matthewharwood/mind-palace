import { Hand, Play, RotateCcw, RotateCw } from "lucide-react";
import { type ReactNode, useRef } from "react";
import * as z from "zod";
import { type AvaSceneRuntime, AvaSceneVariantSchema } from "~/canvas/ava-scene-runtime";
import { useAvaScene } from "~/canvas/use-ava-scene";
import { defineComponent } from "~/lib/define-component";
import { useMediaQuery } from "~/lib/use-media-query";

const AvaScenePropsSchema = z.object({
  sceneId: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  variant: AvaSceneVariantSchema.optional(),
  ariaLabel: z.string().optional(),
});
export const AvaScene = defineComponent(
  AvaScenePropsSchema,
  ({ sceneId, label, variant = "all", ariaLabel }): ReactNode => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const controlsRef = useRef<AvaSceneRuntime | null>(null);
    const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
    const base = `${import.meta.env.BASE_URL}ava-studio`;
    const status = useAvaScene(
      canvasRef,
      controlsRef,
      `${base}/models/${sceneId}.glb`,
      variant,
      reducedMotion,
    );
    return (
      <div className="relative size-full min-h-0 overflow-hidden bg-[#fbf5e9]">
        {status !== "ready" ? (
          <img
            src={`${base}/posters/${sceneId}.jpg`}
            alt={`${label} illustration`}
            className="absolute inset-0 size-full object-contain"
          />
        ) : null}
        <div className="absolute inset-x-0 top-0 bottom-16">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={ariaLabel ?? `${label} interactive 3D scene`}
            aria-hidden={status !== "ready"}
            className={`absolute inset-0 !size-full touch-none ${status === "ready" ? "opacity-100" : "opacity-0"}`}
          />
        </div>
        {status === "ready" ? (
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2">
            <button
              type="button"
              aria-label="Turn scene left"
              onClick={() => controlsRef.current?.turn(-0.45)}
              className="grid size-11 place-items-center rounded-full border border-black/5 bg-white/90 text-[#455c55] shadow-sm"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
            </button>
            <span className="inline-flex h-11 items-center gap-2 rounded-full border border-black/5 bg-white/90 px-4 text-[#455c55] text-xs">
              <Hand className="size-4" aria-hidden="true" />
              Drag to look around
            </span>
            <button
              type="button"
              aria-label="Turn scene right"
              onClick={() => controlsRef.current?.turn(0.45)}
              className="grid size-11 place-items-center rounded-full border border-black/5 bg-white/90 text-[#455c55] shadow-sm"
            >
              <RotateCw className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={reducedMotion ? "Next action pose" : "Replay action"}
              onClick={() => controlsRef.current?.replay()}
              className="grid size-11 place-items-center rounded-full border border-black/5 bg-white/90 text-[#455c55] shadow-sm"
            >
              <Play className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
        {status === "error" ? (
          <p
            role="status"
            className="absolute inset-x-0 bottom-0 bg-white/95 p-3 text-center text-muted-ash text-xs"
          >
            The 3D scene could not load. The illustration is still available.
          </p>
        ) : null}
      </div>
    );
  },
);
