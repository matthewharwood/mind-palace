import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Splash } from "~/components/splash";
import { env } from "~/env";
import { buildSeoLinks } from "~/lib/seo";

// The home page IS the splash: the 3D hero + title + "Enter the palace". Enter
// goes to the goal list at /goals. The 3D is browser-only (prerender emits an
// empty canvas); the route still carries the canonical link for SEO.
const HERO_MODEL = `${import.meta.env.BASE_URL}splash/hero.glb`;

export const Route = createFileRoute("/")({
  head: () => ({ links: buildSeoLinks({ path: "/" }) }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  return (
    <Splash
      title={env.VITE_GAME_TITLE}
      modelUrl={HERO_MODEL}
      onEnter={() => void navigate({ to: "/goals" })}
    />
  );
}
