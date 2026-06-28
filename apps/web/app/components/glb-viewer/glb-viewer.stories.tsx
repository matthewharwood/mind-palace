import type { Meta, StoryObj } from "@storybook/react-vite";

import { GlbViewer } from "./index";

const meta = {
  title: "App/GlbViewer",
  component: GlbViewer,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof GlbViewer>;

export default meta;
type Story = StoryObj<typeof GlbViewer>;

// The placeholder model ships in public/splash/; swap it for the parti-derived
// GLB. Framed on a dark stage so the lit, transparent-canvas model reads.
export const Default: Story = {
  render: () => (
    <div className="grid h-[100dvh] place-items-center bg-[#0a121b]">
      <div className="size-80">
        <GlbViewer label="Hero" modelUrl={`${import.meta.env.BASE_URL}splash/hero.glb`} />
      </div>
    </div>
  ),
};
