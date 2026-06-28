import type { ReactNode } from "react";
import * as z from "zod";

import { GlbViewer } from "~/components/glb-viewer";
import { defineComponent } from "~/lib/define-component";

// Splash — the app's full-screen, no-scroll intro: eyebrow + title + the
// auto-rotating 3D hero (the "orrery of knowledge") + an Enter button. Mobile
// first; fits a phone with zero scroll. The 3D is a side channel inside GlbViewer.

export const SplashPropsSchema = z.object({
  title: z.string().min(1),
  modelUrl: z.string().min(1),
  onEnter: z.custom<() => void>(),
});
export type SplashProps = z.infer<typeof SplashPropsSchema>;

export const Splash = defineComponent(
  SplashPropsSchema,
  ({ title, modelUrl, onEnter }: SplashProps): ReactNode => {
    return (
      <div
        data-test="splash"
        className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_28%,#143442_0%,#0a1622_56%,#05080d_100%)] text-white"
      >
        <header className="shrink-0 px-6 pt-[max(2rem,env(safe-area-inset-top))] text-center">
          <p className="font-mono text-[11px] text-white/45 uppercase tracking-[0.32em]">
            Mind Palace
          </p>
          <h1 className="mt-2.5 font-display text-[clamp(2.4rem,2rem+5vw,3.6rem)] leading-[1.04]">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-balance text-sm text-white/55">
            Build a palace of memory — one connected idea at a time.
          </p>
        </header>

        <div className="grid min-h-0 flex-1 place-items-center px-6">
          <div className="aspect-square w-full max-w-[min(78vw,360px)]">
            <GlbViewer label={title} modelUrl={modelUrl} />
          </div>
        </div>

        <footer className="shrink-0 px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            data-test="splash-enter"
            onClick={onEnter}
            className="mx-auto block w-full max-w-xs rounded-full bg-white px-8 py-3.5 text-center font-medium text-[#0a1622] text-[15px] transition-transform active:scale-[0.98]"
          >
            Enter the palace
          </button>
        </footer>
      </div>
    );
  },
);
