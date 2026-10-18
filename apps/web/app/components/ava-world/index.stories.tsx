import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { withAvaRouter } from "../../../.storybook/with-ava-router";
import { AvaWorld } from "./index";

const meta = {
  title: "Ava/World",
  component: AvaWorld,
  parameters: { layout: "fullscreen" },
  decorators: [withAvaRouter<ComponentProps<typeof AvaWorld>>()],
} satisfies Meta<typeof AvaWorld>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
