import type { Meta, StoryObj } from "@storybook/react-vite";

import { AlchemyBoard } from "./index";

// The bespoke board reads/writes the IDB-backed alchemyBoardAtom; the Storybook
// preview decorator provides the same root hydration + Jotai Provider the app
// uses, so placements persist here exactly as they do in the app.
const meta = {
  title: "App/Alchemy Board",
  component: AlchemyBoard,
  parameters: { layout: "centered" },
} satisfies Meta<typeof AlchemyBoard>;

export default meta;

export const Default: StoryObj<typeof AlchemyBoard> = {};
