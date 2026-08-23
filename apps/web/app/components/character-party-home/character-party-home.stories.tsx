import type { Meta, StoryObj } from "@storybook/react-vite";

import { CharacterPartyHome } from "./index";

const meta = {
  title: "App/CharacterParty/Home",
  component: CharacterPartyHome,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof CharacterPartyHome>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ModePicker: Story = {
  args: {
    drawHref: "/apps/character-party/draw",
    headbandHref: "/apps/character-party/headband",
    characterCount: 180,
    printableCardCount: 150,
  },
};
