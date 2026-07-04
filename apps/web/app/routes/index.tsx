import { createFileRoute } from "@tanstack/react-router";

import { Splash } from "~/components/splash";
import { env } from "~/env";
import { buildSeoLinks } from "~/lib/seo";

// The home page IS the splash: the 3D hero + title + "Enter the palace". Enter
// goes to the goal list at /goals. The 3D is browser-only (prerender emits an
// empty canvas); the route still carries the canonical link for SEO.
const HERO_MODEL = `${import.meta.env.BASE_URL}splash/hero.glb`;
const BASE_URL = import.meta.env.BASE_URL;

export const Route = createFileRoute("/")({
  head: () => ({ links: buildSeoLinks({ path: "/" }) }),
  component: Home,
});

function Home() {
  return (
    <Splash
      title={env.VITE_GAME_TITLE}
      modelUrl={HERO_MODEL}
      entries={[
        {
          label: "Study Guide",
          description: "Learning paths and lessons",
          href: `${BASE_URL}goals`,
        },
        {
          label: "Dungeon Master Apps",
          description: "Parent-run printable adventures",
          href: `${BASE_URL}apps`,
        },
      ]}
    />
  );
}
