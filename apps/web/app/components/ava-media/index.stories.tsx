import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { useArgs } from "storybook/preview-api";

import { AvaMedia } from "./index";
import type { AvaMediaMode, AvaMediaProps } from "./schema";

const TwoDExample = (
  <div
    role="img"
    aria-label="Flat yellow circle"
    className="grid size-full min-h-72 place-items-center bg-[#fff9e8] p-8"
  >
    <div className="aspect-square h-3/4 max-h-64 rounded-full border-8 border-midnight-ink bg-[#ffcf3f]" />
  </div>
);

const ThreeDExample = (
  <div
    role="img"
    aria-label="Lit yellow sphere"
    className="grid size-full min-h-72 place-items-center bg-[radial-gradient(circle_at_top,#eff8ff_0%,#dcecff_70%)] p-8"
  >
    <div className="aspect-square h-3/4 max-h-64 rounded-full bg-[radial-gradient(circle_at_30%_24%,#fff7b8_0%,#ffcf3f_34%,#dd8614_78%,#9b510b_100%)] shadow-[0_30px_35px_rgba(74,43,10,0.28)]" />
  </div>
);

const LocalFallbackExample = (
  <div className="grid size-full min-h-72 place-items-center bg-[#fff9e8] p-8 text-center">
    <div>
      <div
        role="img"
        aria-label="Small local yellow circle"
        className="mx-auto size-32 rounded-full border-4 border-midnight-ink bg-[#ffcf3f]"
      />
      <p className="mt-4 font-semibold text-midnight-ink">Local picture</p>
    </div>
  </div>
);

function ControlledStory(args: AvaMediaProps): ReactElement {
  const [, updateArgs] = useArgs<AvaMediaProps>();

  function changeMode(mode: AvaMediaMode): void {
    args.onModeChange(mode);
    updateArgs({ mode });
  }

  return (
    <div className="h-[32rem] w-[min(42rem,90vw)]">
      <AvaMedia {...args} onModeChange={changeMode} />
    </div>
  );
}

const meta = {
  title: "App/AvaMedia",
  component: AvaMedia,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    mode: { control: "inline-radio", options: ["2d", "3d", "video"] },
    onModeChange: { action: "mode changed" },
    twoDContent: { control: false },
    threeDContent: { control: false },
    videoFallback: { control: false },
  },
} satisfies Meta<typeof AvaMedia>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: ControlledStory,
  args: {
    label: "Yellow circle",
    mode: "2d",
    onModeChange: () => undefined,
    twoDContent: TwoDExample,
    threeDContent: ThreeDExample,
    youtubeVideoId: "jlzX8jt0Now",
    youtubeStartSeconds: 18,
    youtubeSourceLabel: "YouTube learning channel",
    videoFallback: LocalFallbackExample,
  },
};

export const MissingClipFallback: Story = {
  render: ControlledStory,
  args: {
    ...Interactive.args,
    mode: "video",
    youtubeVideoId: null,
  },
};
