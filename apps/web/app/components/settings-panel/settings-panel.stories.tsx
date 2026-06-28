import type { Meta, StoryObj } from "@storybook/react-vite";

import { SettingsPanel } from "./index";

const meta = {
  title: "App/SettingsPanel",
  component: SettingsPanel,
} satisfies Meta<typeof SettingsPanel>;

export default meta;
type Story = StoryObj<typeof SettingsPanel>;

// onClear is a no-op here so the story never wipes Storybook's own IndexedDB.
export const Default: Story = {
  args: {
    version: 4,
    onClear: () => undefined,
  },
};
