import type { Meta, StoryObj } from "@storybook/react-vite";

import { CodeEditor } from "./index";

const meta = {
  title: "App/CodeEditor",
  component: CodeEditor,
  parameters: { layout: "padded" },
} satisfies Meta<typeof CodeEditor>;

export default meta;
type Story = StoryObj<typeof CodeEditor>;

export const Rust: Story = {
  args: {
    initialValue: 'fn main() {\n    println!("Hello, world!");\n}',
    language: "rust",
    ariaLabel: "Rust code",
  },
};

export const Empty: Story = {
  args: { language: "rust", ariaLabel: "Type Rust here" },
};
