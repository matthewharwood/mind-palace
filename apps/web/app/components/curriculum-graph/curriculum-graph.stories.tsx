import type { Meta, StoryObj } from "@storybook/react-vite";

import { getCurriculum } from "~/data/curriculum-data";
import { CurriculumGraph } from "./index";

const meta = {
  title: "App/CurriculumGraph",
  component: CurriculumGraph,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof CurriculumGraph>;

export default meta;

export const Default: StoryObj<typeof CurriculumGraph> = {
  render: () => {
    const curriculum = getCurriculum("c-std-io-slices");
    return curriculum ? (
      <CurriculumGraph curriculum={curriculum} states={{}} onSelect={() => undefined} />
    ) : (
      <div>no curriculum</div>
    );
  },
};
