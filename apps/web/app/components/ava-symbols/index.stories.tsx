import { AVA_LETTERS_SESSION_DEFAULT, AVA_NUMBERS_SESSION_DEFAULT } from "@mind-palace/schemas";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { rateAvaSymbolCard } from "~/lib/ava-symbols";
import { AvaSymbols, type AvaSymbolsProps } from "./index";

function ControlledStory(args: AvaSymbolsProps) {
  const [, updateArgs] = useArgs<AvaSymbolsProps>();
  return (
    <AvaSymbols
      {...args}
      onSessionChange={(session) => updateArgs({ session })}
      onRate={(rating) =>
        updateArgs({ session: rateAvaSymbolCard(args.session, rating, Date.now()) })
      }
    />
  );
}
const meta = {
  title: "App/AvaSymbols",
  component: AvaSymbols,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="h-dvh">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AvaSymbols>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Numbers: Story = {
  render: ControlledStory,
  args: {
    session: AVA_NUMBERS_SESSION_DEFAULT,
    onSessionChange: () => undefined,
    onRate: () => undefined,
  },
};
export const Letters: Story = {
  ...Numbers,
  args: { ...Numbers.args, session: AVA_LETTERS_SESSION_DEFAULT },
};
export const Counting: Story = {
  ...Numbers,
  args: {
    ...Numbers.args,
    session: { ...AVA_NUMBERS_SESSION_DEFAULT, selectedIndex: 10, representation: "alternate" },
  },
};
export const Lowercase: Story = {
  ...Letters,
  args: {
    ...Letters.args,
    session: { ...AVA_LETTERS_SESSION_DEFAULT, selectedIndex: 25, representation: "alternate" },
  },
};
export const ThreeD: Story = {
  ...Numbers,
  args: { ...Numbers.args, session: { ...AVA_NUMBERS_SESSION_DEFAULT, viewMode: "3d" } },
};
export const Video: Story = {
  ...Letters,
  args: { ...Letters.args, session: { ...AVA_LETTERS_SESSION_DEFAULT, viewMode: "video" } },
};
