import { createFileRoute } from "@tanstack/react-router";

import { HeadbandGameHome } from "~/components/headband-game-home";
import { buildHeadbandDeck, CHARACTER_LIBRARY, HEADBAND_DECK_SIZE } from "~/lib/character-party";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";

const BASE_URL = import.meta.env.BASE_URL;
const HEADBAND_DECK = buildHeadbandDeck(CHARACTER_LIBRARY, HEADBAND_DECK_SIZE);

export const Route = createFileRoute("/apps/character-party_/headband")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps/character-party/headband",
      title: "Who's on My Head?",
      description:
        "Print 150 family-friendly character cards for a cross-generational headband guessing game.",
    }),
    links: buildSeoLinks({ path: "/apps/character-party/headband" }),
  }),
  component: HeadbandGameRoute,
});

function HeadbandGameRoute() {
  return (
    <HeadbandGameHome
      homeHref={`${BASE_URL}apps/character-party`}
      printHref={`${BASE_URL}apps/character-party/headband/print`}
      libraryCount={CHARACTER_LIBRARY.length}
      cardCount={HEADBAND_DECK.length}
    />
  );
}
