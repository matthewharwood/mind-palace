import type { Meta, StoryObj } from "@storybook/react-vite";

import { GraphView } from "./index";

const meta = {
  title: "App/GraphView",
  component: GraphView,
} satisfies Meta<typeof GraphView>;

export default meta;

const DemoDiagram = (
  <div className="grid h-[60vh] w-full place-items-center rounded-lg bg-slate-800 text-slate-400">
    [ diagram canvas ]
  </div>
);

const DemoList = (
  <nav aria-label="Lessons">
    <ul className="flex flex-col gap-1">
      {["Slices & Arrays", "Formatting", "I/O traits"].map((title) => (
        <li key={title}>
          <a href="#demo" className="block rounded-md bg-white/5 px-3 py-2 hover:bg-white/10">
            {title}
          </a>
        </li>
      ))}
    </ul>
  </nav>
);

// Defaults to the diagram on desktop; resize below `md` (768px) to see it fall
// back to the list. The segmented control overrides either way.
export const Default: StoryObj<typeof GraphView> = {
  render: () => <GraphView diagram={DemoDiagram} list={DemoList} />,
};
