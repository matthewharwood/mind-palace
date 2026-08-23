import { createFileRoute } from "@tanstack/react-router";

import { CharacterPartyHome } from "~/components/character-party-home";
import { buildHeadbandDeck, CHARACTER_LIBRARY, HEADBAND_DECK_SIZE } from "~/lib/character-party";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";

const BASE_URL = import.meta.env.BASE_URL;
const PRINTABLE_CARD_COUNT = buildHeadbandDeck(CHARACTER_LIBRARY).length;

export const Route = createFileRoute("/apps/character-party")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps/character-party",
      title: "Character Party",
      description:
        "A cross-generational family party game for drawing characters and printable headband guessing.",
    }),
    links: buildSeoLinks({ path: "/apps/character-party" }),
  }),
  component: CharacterPartyRoute,
});

function CharacterPartyRoute() {
  return (
    <CharacterPartyHome
      drawHref={`${BASE_URL}apps/character-party/draw`}
      headbandHref={`${BASE_URL}apps/character-party/headband`}
      characterCount={CHARACTER_LIBRARY.length}
      printableCardCount={Math.min(PRINTABLE_CARD_COUNT, HEADBAND_DECK_SIZE)}
    />
  );
}
