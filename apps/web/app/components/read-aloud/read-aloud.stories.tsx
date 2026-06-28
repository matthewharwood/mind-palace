import type { Meta, StoryObj } from "@storybook/react-vite";

import { ReadAloudButton } from "./index";

const meta = {
  title: "App/ReadAloudButton",
  component: ReadAloudButton,
} satisfies Meta<typeof ReadAloudButton>;

export default meta;
type Story = StoryObj<typeof ReadAloudButton>;

// Tap to hear the sample read aloud (uses the browser's speech synthesis); tap
// again to pause, again to resume.
export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-3 p-4">
      <ReadAloudButton
        getText={() =>
          "A binding is the connection between a name and a value. Tap the button again to pause."
        }
      />
      <span className="text-sm">Read aloud</span>
    </div>
  ),
};
