import type { Flashcard } from "@mind-palace/curriculum";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { FlashcardView } from "./index";

const copyContext = {
  goalTitle: "Graphics & Shaders",
  goalDescription: "Learn vector motion, GPU drawing, and FF6-style visual effects.",
  pathTitle: "FF6 VFX Path",
  curriculumId: "c-gfx-vectors",
  curriculumTitle: "Vector Motion",
  curriculumSource: "github-repo: https://example.test/magic-vectors @ main",
  lessonId: "au",
  lessonIndex: 1,
  lessonCount: 8,
  prerequisites: [{ id: "grid", title: "Coordinate Grid" }],
  previousLesson: { id: "origin", title: "Origin Point" },
  nextLesson: { id: "velocity", title: "Velocity" },
  canonicalPath: "/curriculum/c-gfx-vectors/node/au",
};

const readCard: Flashcard = {
  id: "au",
  title: "Gold (Au)",
  content: {
    type: "read",
    markdown: "**Gold** — symbol Au, atomic number 79. A soft, dense metal.",
  },
};

const mcqCard: Flashcard = {
  id: "fe",
  title: "Iron (Fe)",
  content: {
    type: "multiple-choice",
    question: "What is iron's chemical symbol?",
    options: ["Ir", "Fe", "In"],
    answerIndex: 1,
  },
};

const codeCard: Flashcard = {
  id: "hello-world",
  title: "Write Hello, World!",
  content: {
    type: "code",
    language: "rust",
    prompt: "Type a Rust program that prints `Hello, world!` to the console.",
    solution: 'fn main() {\n    println!("Hello, world!");\n}',
  },
};

const meta = {
  title: "App/FlashcardView",
  component: FlashcardView,
  parameters: { layout: "centered" },
  args: { onRate: () => undefined, phase: "new", copyContext },
} satisfies Meta<typeof FlashcardView>;

export default meta;
type Story = StoryObj<typeof FlashcardView>;

export const Read: Story = { args: { flashcard: readCard } };
export const MultipleChoice: Story = { args: { flashcard: mcqCard } };
export const Code: Story = { args: { flashcard: codeCard } };
