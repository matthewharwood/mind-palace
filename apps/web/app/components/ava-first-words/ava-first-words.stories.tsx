import { AVA_FIRST_WORDS_SESSION_DEFAULT } from "@mind-palace/schemas";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { useArgs } from "storybook/preview-api";

import { AvaFirstWords, type AvaFirstWordsProps } from "./index";

const STORY_NOW = 1_000_000_000;

function ControlledStory(args: AvaFirstWordsProps): ReactElement {
  const [, updateArgs] = useArgs<AvaFirstWordsProps>();

  return (
    <AvaFirstWords
      {...args}
      onModeChange={(viewMode) => {
        args.onModeChange(viewMode);
        updateArgs({ session: { ...args.session, viewMode } });
      }}
    />
  );
}

const meta = {
  title: "App/AvaFirstWords",
  component: AvaFirstWords,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AvaFirstWords>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PictureMode: Story = {
  render: ControlledStory,
  args: {
    session: AVA_FIRST_WORDS_SESSION_DEFAULT,
    now: STORY_NOW,
    onModeChange: () => undefined,
    onRate: () => AVA_FIRST_WORDS_SESSION_DEFAULT,
    onReset: () => undefined,
  },
};

export const ThreeDMode: Story = {
  ...PictureMode,
  args: {
    ...PictureMode.args,
    session: { ...AVA_FIRST_WORDS_SESSION_DEFAULT, viewMode: "3d" },
  },
};

export const VideoMode: Story = {
  ...PictureMode,
  args: {
    ...PictureMode.args,
    session: { ...AVA_FIRST_WORDS_SESSION_DEFAULT, viewMode: "video" },
  },
};
