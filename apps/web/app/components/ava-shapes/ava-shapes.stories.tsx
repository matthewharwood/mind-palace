import { AVA_SHAPES_SESSION_DEFAULT } from "@mind-palace/schemas";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { useArgs } from "storybook/preview-api";

import { AVA_COLORLESS_SHAPE_CARDS, rateAvaShapeCard } from "~/lib/ava-shapes";
import { AvaShapes, type AvaShapesProps } from "./index";

const STORY_NOW = 1_000_000_000;
const colorsUnlockedSession = AVA_COLORLESS_SHAPE_CARDS.reduce(
  (session, card) => rateAvaShapeCard(session, card.id, "easy", STORY_NOW),
  AVA_SHAPES_SESSION_DEFAULT,
);

function ControlledStory(args: AvaShapesProps): ReactElement {
  const [, updateArgs] = useArgs<AvaShapesProps>();

  return (
    <AvaShapes
      {...args}
      onModeChange={(viewMode) => {
        args.onModeChange(viewMode);
        updateArgs({ session: { ...args.session, viewMode } });
      }}
    />
  );
}

const meta = {
  title: "App/AvaShapes",
  component: AvaShapes,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AvaShapes>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ColorlessFoundation: Story = {
  render: ControlledStory,
  args: {
    session: AVA_SHAPES_SESSION_DEFAULT,
    now: STORY_NOW,
    onModeChange: () => undefined,
    onRate: () => AVA_SHAPES_SESSION_DEFAULT,
    onReset: () => undefined,
  },
};

export const ColorsUnlocked: Story = {
  render: ControlledStory,
  args: {
    session: colorsUnlockedSession,
    now: STORY_NOW,
    onModeChange: () => undefined,
    onRate: () => colorsUnlockedSession,
    onReset: () => undefined,
  },
};

export const LitThreeD: Story = {
  ...ColorlessFoundation,
  args: {
    ...ColorlessFoundation.args,
    session: { ...AVA_SHAPES_SESSION_DEFAULT, viewMode: "3d" },
  },
};

export const VideoGate: Story = {
  ...ColorlessFoundation,
  args: {
    ...ColorlessFoundation.args,
    session: { ...AVA_SHAPES_SESSION_DEFAULT, viewMode: "video" },
  },
};
