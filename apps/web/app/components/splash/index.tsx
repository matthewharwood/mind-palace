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
  onEnter: z.custom<() => void>().optional(),
  entries: z
    .array(
      z.object({
        label: z.string().min(1),
        description: z.string().min(1).optional(),
        href: z.string().min(1).optional(),
        onSelect: z.custom<() => void>().optional(),
      }),
    )
    .min(1)
    .optional(),
});
export type SplashProps = z.infer<typeof SplashPropsSchema>;

export const Splash = defineComponent(
  SplashPropsSchema,
  ({ title, modelUrl, onEnter, entries }: SplashProps): ReactNode => {
    const actions = entries ?? [
      {
        label: "Enter the palace",
        onSelect: onEnter ?? (() => undefined),
      },
    ];
    return (
      <div
        data-test="splash"
        className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_26%,#eef2ff_0%,#f4f3ef_58%,#e7e4df_100%)] text-midnight-ink dark:bg-[radial-gradient(circle_at_50%_28%,#143442_0%,#0a1622_56%,#05080d_100%)]"
      >
        <header className="shrink-0 px-6 pt-[max(2rem,env(safe-area-inset-top))] text-center">
          <h1 className="font-display text-[clamp(2.4rem,2rem+5vw,3.6rem)] text-midnight-ink leading-[1.04]">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-balance text-muted-ash text-sm">
            Build a palace of memory — one connected idea at a time.
          </p>
        </header>

        <div className="grid min-h-0 flex-1 place-items-center px-6">
          <div className="aspect-square w-full max-w-[min(78vw,360px)]">
            <GlbViewer label={title} modelUrl={modelUrl} />
          </div>
        </div>

        <footer className="shrink-0 px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
            {actions.map((entry, index) =>
              entry.href ? (
                <a
                  key={entry.label}
                  href={entry.href}
                  data-test={index === 0 ? "splash-enter" : undefined}
                  className={[
                    "w-full rounded-full px-8 py-3.5 text-center font-medium text-[15px] transition-transform active:scale-[0.98]",
                    index === 0
                      ? "bg-midnight-ink text-canvas-white"
                      : "border border-midnight-ink/15 bg-canvas-white/80 text-midnight-ink backdrop-blur-sm",
                  ].join(" ")}
                >
                  <span className="block">{entry.label}</span>
                  {entry.description ? (
                    <span className="mt-0.5 block text-[12px] opacity-75">{entry.description}</span>
                  ) : null}
                </a>
              ) : (
                <button
                  key={entry.label}
                  type="button"
                  data-test={index === 0 ? "splash-enter" : undefined}
                  onClick={entry.onSelect}
                  className={[
                    "w-full rounded-full px-8 py-3.5 text-center font-medium text-[15px] transition-transform active:scale-[0.98]",
                    index === 0
                      ? "bg-midnight-ink text-canvas-white"
                      : "border border-midnight-ink/15 bg-canvas-white/80 text-midnight-ink backdrop-blur-sm",
                  ].join(" ")}
                >
                  <span className="block">{entry.label}</span>
                  {entry.description ? (
                    <span className="mt-0.5 block text-[12px] opacity-75">{entry.description}</span>
                  ) : null}
                </button>
              ),
            )}
          </div>
        </footer>
      </div>
    );
  },
);
