import type { Meta, StoryObj } from "@storybook/react-vite";

import { getPath } from "~/data/curriculum-data";
import { LearningPathTree } from "./index";

const meta = {
  title: "App/LearningPathTree",
  component: LearningPathTree,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof LearningPathTree>;

export default meta;

export const Default: StoryObj<typeof LearningPathTree> = {
  render: () => {
    const path = getPath("p-periodic");
    return path ? <LearningPathTree path={path} onSelect={() => undefined} /> : <div>no path</div>;
  },
};
