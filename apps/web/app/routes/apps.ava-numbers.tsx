import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";

import { AvaSymbols } from "~/components/ava-symbols";
import { rateAvaSymbolCard } from "~/lib/ava-symbols";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";
import { avaNumbersSessionAtom } from "~/state/atoms";

export const Route = createFileRoute("/apps/ava-numbers")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps/ava-numbers",
      title: "Ava's Numbers",
      description:
        "Explore numbers 0 through 10 as numerals, ten-frame counting groups, and words, with 2D, 3D, and video cards.",
    }),
    links: buildSeoLinks({ path: "/apps/ava-numbers" }),
  }),
  component: AvaSymbolsRoute,
});

function AvaSymbolsRoute() {
  const [session, setSession] = useAtom(avaNumbersSessionAtom);
  return (
    <AvaSymbols
      session={session}
      onSessionChange={setSession}
      onRate={(rating) => setSession((previous) => rateAvaSymbolCard(previous, rating, Date.now()))}
    />
  );
}
