import type { Meta, StoryObj } from "@storybook/react-vite";

import { RatingButtons } from "./index";

const meta = {
  title: "App/RatingButtons",
  component: RatingButtons,
} satisfies Meta<typeof RatingButtons>;

export default meta;
type Story = StoryObj<typeof RatingButtons>;

export const Default: Story = {
  render: () => (
    <div className="max-w-md p-4">
      <RatingButtons onRate={() => undefined} />
    </div>
  ),
};
