import { createFileRoute } from "@tanstack/react-router";

import { HeadbandCardDeck } from "~/components/headband-card-deck";
import { buildHeadbandDeck, CHARACTER_LIBRARY, HEADBAND_DECK_SIZE } from "~/lib/character-party";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";

const BACK_URL = `${import.meta.env.BASE_URL}apps/character-party/headband`;
const HEADBAND_DECK = buildHeadbandDeck(CHARACTER_LIBRARY, HEADBAND_DECK_SIZE);

export const Route = createFileRoute("/apps/character-party_/headband_/print")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps/character-party/headband/print",
      title: "Printable Character Party Cards",
      description: "A 150-card US Letter printable deck for the Character Party headband game.",
    }),
    links: buildSeoLinks({ path: "/apps/character-party/headband/print" }),
  }),
  component: CharacterPartyPrintRoute,
});

function CharacterPartyPrintRoute() {
  return <HeadbandCardDeck cards={HEADBAND_DECK} backHref={BACK_URL} />;
}
