import { Link } from "@tanstack/react-router";
import { ArrowRight, Flower2, Heart } from "lucide-react";
import type { ReactNode } from "react";
import * as z from "zod";
import { avaIllustrationPath } from "~/lib/ava-illustrations";
import { AVA_COLLECTIONS } from "~/lib/ava-learning-catalog";
import { defineComponent } from "~/lib/define-component";

const BASE = import.meta.env.BASE_URL;
const PICTURES = {
  "ava-actions": "ava-jump",
  "ava-needs": "ava-need-help",
  "ava-opposites": "ava-opposite-big",
  "ava-positions": "ava-position-behind",
  "ava-two-words": "dog-run",
};
const FOUNDATIONS = [
  {
    title: "Ava's Shape Sounds",
    subtitle: "Shape, color & sound",
    path: "ava-shapes",
    scene: "shape-circle-blue",
  },
  {
    title: "Ava's First 100 Words",
    subtitle: "The familiar things around us",
    path: "ava-first-words",
    scene: "word-teddy-bear",
  },
  {
    title: "Ava's Numbers",
    subtitle: "See, count & say 0–10",
    path: "ava-numbers",
    scene: "number-5",
  },
  {
    title: "Ava's Letters",
    subtitle: "Big letters, little letters",
    path: "ava-letters",
    scene: "letter-a",
  },
] as const;
export const AvaWorld = defineComponent(
  z.object({}),
  (): ReactNode => (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 bg-[#faf6ed] px-5 py-6 text-[#354d40] sm:px-8 sm:py-8">
      <header className="flex items-center justify-between">
        <h1 className="font-sans font-semibold text-xl">Kid apps</h1>
        <span className="inline-flex items-center gap-2 font-medium text-[#64745f] text-xs">
          <Flower2 className="size-4" aria-hidden="true" />
          Ava&apos;s little world
        </span>
      </header>
      <Link
        to="/apps/ava-actions"
        className="group grid overflow-hidden rounded-[2rem] border border-[#eae2d2] bg-[#f5ead8] shadow-[0_10px_40px_rgba(96,78,48,.04)] sm:grid-cols-[1fr_.9fr]"
      >
        <div className="flex flex-col justify-center px-6 py-8 sm:px-9">
          <span className="mb-5 font-semibold text-[#64745f] text-[10px] uppercase tracking-[.2em]">
            A little discovery, every day
          </span>
          <h2 className="max-w-sm font-display text-4xl leading-[1.12] sm:text-5xl">
            Little words.
            <br />A bigger world.
          </h2>
          <p className="mt-4 max-w-xs text-[#64745f] text-sm leading-6">
            See it. Hear it. Try it together. Playful little collections for making sense of the
            world.
          </p>
          <span className="mt-6 inline-flex min-h-12 w-fit items-center gap-3 rounded-full bg-[#668565] px-5 font-semibold text-white text-sm">
            Discover Action Words
            <ArrowRight className="size-4" aria-hidden="true" />
          </span>
          <span className="mt-3 text-[#64745f] text-xs">Start with five familiar actions.</span>
        </div>
        <img
          src={`${BASE}ava-studio/artwork/action-cover.jpg`}
          alt="A joyful illustrated child jumping in teal overalls"
          className="aspect-square size-full min-h-0 object-cover"
        />
      </Link>
      <div>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold text-2xl">Growing little conversations</h2>
            <p className="mt-1 text-[#64745f] text-sm">
              From doing, to asking, to putting words together.
            </p>
          </div>
          <Heart className="mb-1 size-5 text-[#bcae8d]" aria-hidden="true" />
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {AVA_COLLECTIONS.map((collection, index) => (
            <li key={collection.id}>
              <Link
                to={`/apps/${collection.id}`}
                className="group flex h-full gap-4 rounded-2xl border border-[#e6e7d8] bg-white/80 p-3 transition-colors hover:bg-white"
              >
                <img
                  src={`${BASE}${avaIllustrationPath(PICTURES[collection.id])}`}
                  alt=""
                  className="size-24 shrink-0 rounded-xl object-cover"
                />
                <span className="flex min-w-0 flex-1 flex-col justify-center">
                  <span className="mb-1 text-[#64745f] text-[10px] uppercase tracking-[.13em]">
                    Collection {index + 1} · {collection.cards.length} words
                  </span>
                  <span className="font-semibold text-[#4f6753] text-base">{collection.title}</span>
                  <span className="mt-1 text-[#64745f] text-xs">{collection.subtitle}</span>
                </span>
                <ArrowRight className="my-auto size-4 shrink-0 text-[#a4b59a]" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h2 className="mb-4 font-semibold text-2xl">Keep exploring</h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {FOUNDATIONS.map((app) => (
            <li key={app.path}>
              <Link
                to={`/apps/${app.path}`}
                className="flex h-full flex-col gap-3 rounded-2xl border border-[#e6e7d8] bg-white/70 p-3"
              >
                <img
                  src={`${BASE}${avaIllustrationPath(app.scene)}`}
                  alt=""
                  className="aspect-[3/2] w-full rounded-xl object-contain"
                />
                <span className="font-semibold text-[#617759] text-sm">{app.title}</span>
                <span className="-mt-2 text-[#64745f] text-xs">{app.subtitle}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <footer className="flex flex-wrap gap-4 border-[#e8e5d6] border-t pt-5 text-[#64745f] text-xs">
        <span>More family play:</span>
        <Link to="/apps/vector-dungeon" className="underline underline-offset-4">
          Vector Dungeon
        </Link>
      </footer>
    </section>
  ),
);
