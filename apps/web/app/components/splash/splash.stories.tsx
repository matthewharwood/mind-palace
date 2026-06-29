import type { Meta, StoryObj } from "@storybook/react-vite";

import { Splash } from "./index";

const meta = {
  title: "App/Splash",
  component: Splash,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Splash>;

export default meta;
type Story = StoryObj<typeof Splash>;

export const Default: Story = {
  render: () => (
    <Splash
      title="Mind Palace"
      modelUrl={`${import.meta.env.BASE_URL}splash/hero.glb`}
      onEnter={() => undefined}
    />
  ),
};
