import { createFileRoute } from "@tanstack/react-router";

import { env } from "~/env";
import { buildSeoLinks } from "~/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({ links: buildSeoLinks({ path: "/" }) }),
  component: Home,
});

function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 font-display">
      <h1 className="text-3xl">{env.VITE_GAME_TITLE}</h1>
      <p className="text-sm opacity-70">A fresh mind-palace app. Start building here.</p>
    </main>
  );
}
