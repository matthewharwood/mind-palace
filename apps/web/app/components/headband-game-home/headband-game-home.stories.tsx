import type { Meta, StoryObj } from "@storybook/react-vite";

import { HeadbandGameHome } from "./index";

const meta = {
  title: "App/CharacterParty/HeadbandHome",
  component: HeadbandGameHome,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HeadbandGameHome>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PrintableDeck: Story = {
  args: {
    homeHref: "/apps/character-party",
    printHref: "/apps/character-party/headband/print",
    libraryCount: 180,
    cardCount: 150,
  },
};
