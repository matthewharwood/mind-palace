import { ArrowRight, BookOpen, ScrollText, Shield } from "lucide-react";
import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";

export const AppHubItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  href: z.string().min(1),
  kind: z.enum(["study", "dm"]),
  cta: z.string().min(1),
});
export type AppHubItem = z.infer<typeof AppHubItemSchema>;

export const AppHubPropsSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  items: z.array(AppHubItemSchema).min(1),
});
export type AppHubProps = z.infer<typeof AppHubPropsSchema>;

function itemIcon(kind: AppHubItem["kind"]): ReactNode {
  if (kind === "study") return <BookOpen className="size-5" aria-hidden="true" />;
  return <Shield className="size-5" aria-hidden="true" />;
}

export const AppHub = defineComponent(
  AppHubPropsSchema,
  ({ title, description, items }: AppHubProps): ReactNode => {
    return (
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-7 px-5 py-8 sm:px-8 sm:py-12">
        <header className="flex max-w-2xl flex-col gap-2">
          <div className="flex items-center gap-2 text-intelligence-blue text-sm">
            <ScrollText className="size-4" aria-hidden="true" />
            <span className="font-medium">Mind Palace applications</span>
          </div>
          <h1 className="text-pretty text-[clamp(2rem,1.35rem+3vw,3.25rem)] text-midnight-ink leading-[1.05]">
            {title}
          </h1>
          <p className="text-muted-ash text-sm leading-6 sm:text-base">{description}</p>
        </header>

        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="group flex h-full flex-col justify-between gap-6 rounded-card border border-black/10 bg-canvas-white p-5 shadow-card transition-colors hover:bg-whisper-gray focus-visible:bg-whisper-gray dark:border-white/10"
              >
                <span className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[8px] bg-intelligence-blue/10 text-intelligence-blue">
                    {itemIcon(item.kind)}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-semibold text-lg text-midnight-ink">{item.title}</span>
                    <span className="text-muted-ash text-sm leading-6">{item.description}</span>
                  </span>
                </span>
                <span className="inline-flex items-center gap-2 font-medium text-intelligence-blue text-sm">
                  {item.cta}
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    );
  },
);
