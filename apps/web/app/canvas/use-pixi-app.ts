// oxlint-disable react-doctor/exhaustive-deps -- API-design escape: `deps` is
// a public DependencyList parameter the caller owns. Biome's exhaustive-deps
// check honors `biome-ignore` (see inline comment below); react-doctor runs
// oxlint with the same rule under the `react-doctor/` namespace, which the
// inline Biome suppressions can't address. The disable lives at file scope so hook callers
// don't have to re-read the rationale at every call site. See use-anime.ts
// for the original (animejs) instance of the same pattern.
import { Application } from "pixi.js";
import { type DependencyList, type RefObject, useEffect } from "react";

const PRM = "(prefers-reduced-motion: reduce)";
// Cap the backing-store density. Retina/iPad are DPR 2; some phones are DPR 3.
// Render at the true device pixel ratio up to this cap so shapes/text are sharp
// without over-allocating on extreme-DPR displays.
const DEFAULT_MAX_RESOLUTION = 3;

// React's dev StrictMode double-mounts effects (mount → unmount → mount). Two
// `Application.init()` on the SAME canvas would otherwise run concurrently and
// share the canvas's single WebGL context — the cancelled one's `destroy()`
// then tears down the context the live app is using, leaving an intermittent
// blank/white canvas. We serialize init/teardown per canvas through this chain
// so a new init never starts until the previous app is fully torn down.
const canvasChain = new WeakMap<HTMLCanvasElement, Promise<unknown>>();

type SetupCleanup = (() => void) | void;
type SetupContext = { reducedMotion: boolean };
type Setup = (app: Application, ctx: SetupContext) => SetupCleanup;
type PixiRendererPreference = "webgl" | "canvas";
type PixiAppOptions = {
  autoStart?: boolean;
  backgroundAlpha?: number;
  maxResolution?: number;
  preference?: PixiRendererPreference;
};

// Pillar — PixiJS is a side channel exactly like anime.js. The scene graph
// mutates the canvas outside React's reconciler; render must stay pure. This
// hook owns the lifecycle: async `app.init({ canvas, ... })`, the `setup`
// callback (where the caller adds children, registers Ticker callbacks, etc.),
// and `app.destroy(false, { children: true, texture: true })` on unmount.
// `prefers-reduced-motion: reduce` is detected once and passed to setup so the
// caller can skip Ticker-driven animations the same way `useAnime` short-circuits.
// Static scenes can pass `autoStart: false` and call `app.render()` from their
// own resize/input handlers instead of paying for a continuous render loop.
export function usePixiApp(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  setup: Setup,
  deps: DependencyList = [],
  options: PixiAppOptions = {},
): void {
  useEffect(
    () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const reducedMotion = typeof window !== "undefined" && window.matchMedia(PRM).matches;

      let app: Application | null = null;
      let userCleanup: SetupCleanup;
      let cancelled = false;

      // Wait for any prior init/teardown on this canvas to finish before
      // starting ours — never two live apps (or inits) on one canvas at once.
      const previous = canvasChain.get(canvas) ?? Promise.resolve();
      const ready = previous.then(async () => {
        if (cancelled) return;
        const next = new Application();
        const resolution = getDeviceResolution(options.maxResolution ?? DEFAULT_MAX_RESOLUTION);

        await next.init({
          canvas,
          resizeTo: canvas.parentElement ?? canvas,
          antialias: true,
          autoDensity: true,
          ...(options.backgroundAlpha === undefined
            ? {}
            : { backgroundAlpha: options.backgroundAlpha }),
          resolution,
          roundPixels: true,
          // WebGL is the most reliable backend in headless Chromium (Playwright);
          // pixi will fall back to canvas if WebGL is unavailable.
          preference: options.preference ?? "webgl",
          autoStart: options.autoStart ?? !reducedMotion,
        });
        if (cancelled) {
          next.destroy(false, { children: true, texture: true });
          return;
        }
        app = next;
        userCleanup = setup(next, { reducedMotion });
      });
      canvasChain.set(
        canvas,
        ready.catch(() => undefined),
      );

      return () => {
        cancelled = true;
        // Tear down only after our own init settles, and publish the teardown
        // as the chain tail so the next mount waits for it.
        const done = ready.then(() => {
          if (typeof userCleanup === "function") userCleanup();
          if (app) app.destroy(false, { children: true, texture: true });
        });
        canvasChain.set(
          canvas,
          done.catch(() => undefined),
        );
      };
    },
    // KEEP — same API-design escape as `useAnime`. `deps` is the
    // public parameter the caller owns, opaque to biome's static dep
    // verifier. See use-anime.ts for the full reasoning.
    // biome-ignore lint/correctness/useExhaustiveDependencies: API design — `deps` is a public parameter the caller owns.
    deps,
  );
}

function getDeviceResolution(maxResolution: number): number {
  if (typeof window === "undefined") return 1;

  const deviceResolution = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;

  return Math.max(1, Math.min(deviceResolution, maxResolution));
}
