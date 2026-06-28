import type { Meta, StoryObj } from "@storybook/react-vite";

import { CodeBlock } from "./index";

const meta = {
  title: "App/CodeBlock",
  component: CodeBlock,
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof CodeBlock>;

export const Block: Story = {
  args: {
    language: "rust",
    code: `fn main() {
    let (x, y) = (10, 20);
    println!("{}", x + y);
}`,
  },
};

export const Inline: Story = {
  render: () => (
    <p className="text-base">
      A pattern like <CodeBlock inline code="let (x, y) = (10, 20);" /> introduces two bindings.
    </p>
  ),
};
