import { AVA_SHAPES_SESSION_DEFAULT } from "@mind-palace/schemas";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { AVA_COLORLESS_SHAPE_CARDS, rateAvaShapeCard } from "~/lib/ava-shapes";
import { AvaShapes } from "./index";

const STORY_NOW = 1_000_000_000;
const colorsUnlockedSession = AVA_COLORLESS_SHAPE_CARDS.reduce(
  (session, card) => rateAvaShapeCard(session, card.id, "easy", STORY_NOW),
  AVA_SHAPES_SESSION_DEFAULT,
);

const meta = {
  title: "App/AvaShapes",
  component: AvaShapes,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AvaShapes>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ColorlessFoundation: Story = {
  args: {
    session: AVA_SHAPES_SESSION_DEFAULT,
    now: STORY_NOW,
    onRate: () => AVA_SHAPES_SESSION_DEFAULT,
    onReset: () => undefined,
  },
};

export const ColorsUnlocked: Story = {
  args: {
    session: colorsUnlockedSession,
    now: STORY_NOW,
    onRate: () => colorsUnlockedSession,
    onReset: () => undefined,
  },
};
