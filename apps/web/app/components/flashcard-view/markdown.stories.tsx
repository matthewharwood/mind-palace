import type { Meta, StoryObj } from "@storybook/react-vite";

import { Prose } from "./markdown";

const meta = {
  title: "App/Prose",
  component: Prose,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Prose>;

export default meta;
type Story = StoryObj<typeof Prose>;

// Exercises the full type system: headings, paragraphs, lists, inline code,
// bold/italic/highlight emphasis, and a fenced code block.
export const FullTypography: Story = {
  args: {
    markdown: [
      "Every value in Rust lives in a **binding** introduced with `let`. By default a binding is ==immutable== — once set, it can never be reassigned.",
      "",
      "## Making it mutable",
      "Add the `mut` keyword to opt in to change:",
      "",
      "- `let x = 5;` — fixed for its whole scope",
      "- `let mut x = 5;` — `x` can be reassigned later",
      "",
      "### A note on const",
      "A `const` is *always* immutable and is computed at ==compile time==.",
      "",
      "```rust",
      "fn main() {",
      '    println!("Hello, world!");',
      "}",
      "```",
    ].join("\n"),
  },
};

export const ProseOnly: Story = {
  args: {
    markdown:
      "Scalars cover integers (`i32` is the default), floats (`f64`), `bool`, and `char`. Compound types group values: **tuples** mix types, while **arrays** hold one type at a ==fixed length==.",
  },
};
