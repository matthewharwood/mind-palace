import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";

import { AvaSymbols } from "~/components/ava-symbols";
import { rateAvaSymbolCard } from "~/lib/ava-symbols";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";
import { avaLettersSessionAtom } from "~/state/atoms";

export const Route = createFileRoute("/apps/ava-letters")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps/ava-letters",
      title: "Ava's Letters",
      description:
        "Explore all 26 letters as uppercase, lowercase, and picture words, with 2D, 3D, and video cards.",
    }),
    links: buildSeoLinks({ path: "/apps/ava-letters" }),
  }),
  component: AvaSymbolsRoute,
});

function AvaSymbolsRoute() {
  const [session, setSession] = useAtom(avaLettersSessionAtom);
  return (
    <AvaSymbols
      session={session}
      onSessionChange={setSession}
      onRate={(rating) => setSession((previous) => rateAvaSymbolCard(previous, rating, Date.now()))}
    />
  );
}
