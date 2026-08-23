import type { Meta, StoryObj } from "@storybook/react-vite";

import { CHARACTER_LIBRARY } from "~/lib/character-party";
import { HeadbandCardDeck } from "./index";

const meta = {
  title: "App/CharacterParty/HeadbandCardDeck",
  component: HeadbandCardDeck,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HeadbandCardDeck>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NineCardSheet: Story = {
  args: {
    cards: CHARACTER_LIBRARY.filter((character) => character.headbandEligible).slice(0, 9),
    backHref: "/apps/character-party/headband",
  },
};

export const PartialFinalSheet: Story = {
  args: {
    cards: CHARACTER_LIBRARY.filter((character) => character.headbandEligible).slice(0, 5),
    backHref: "/apps/character-party/headband",
  },
};
