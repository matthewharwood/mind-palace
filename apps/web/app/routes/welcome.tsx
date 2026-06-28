import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Splash } from "~/components/splash";
import { env } from "~/env";
import { buildSeoLinks } from "~/lib/seo";

// The parti-derived hero model (image → image-to-3D → public/splash/hero.glb).
// BASE_URL keeps the path correct under the GH Pages base.
const HERO_MODEL = `${import.meta.env.BASE_URL}splash/hero.glb`;

export const Route = createFileRoute("/welcome")({
  head: () => ({ links: buildSeoLinks({ path: "/welcome" }) }),
  component: Welcome,
});

function Welcome() {
  const navigate = useNavigate();
  return (
    <Splash
      title={env.VITE_GAME_TITLE}
      modelUrl={HERO_MODEL}
      onEnter={() => {
        // Mark this session entered so `/` stops redirecting back here, then go home.
        if (typeof window !== "undefined") sessionStorage.setItem("mp-entered", "1");
        void navigate({ to: "/" });
      }}
    />
  );
}
