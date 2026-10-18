import { AvaLearningSessionSchema } from "@mind-palace/schemas";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { withAvaRouter } from "../../../.storybook/with-ava-router";
import { AvaLearning, type AvaLearningProps } from "./index";

function Controlled(args: AvaLearningProps) {
  const [, update] = useArgs<AvaLearningProps>();
  return <AvaLearning {...args} onSessionChange={(session) => update({ session })} />;
}
const meta = {
  title: "Ava/Learning",
  component: AvaLearning,
  parameters: { layout: "fullscreen" },
  decorators: [
    withAvaRouter<AvaLearningProps>(),
    (Story) => (
      <div className="h-dvh">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AvaLearning>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Discover: Story = {
  render: Controlled,
  args: {
    session: AvaLearningSessionSchema.parse({ id: "ava-actions" }),
    onSessionChange: () => undefined,
  },
};
export const Recognize: Story = {
  ...Discover,
  args: {
    ...Discover.args,
    session: AvaLearningSessionSchema.parse({ id: "ava-actions", mode: "recognize" }),
  },
};
export const Connect: Story = {
  ...Discover,
  args: {
    ...Discover.args,
    session: AvaLearningSessionSchema.parse({
      id: "ava-actions",
      mode: "connect",
      subject: "mommy",
    }),
  },
};
export const Positions: Story = {
  ...Discover,
  args: {
    ...Discover.args,
    session: AvaLearningSessionSchema.parse({ id: "ava-positions", selectedIndex: 3 }),
  },
};
