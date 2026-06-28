import type { Meta, StoryObj } from "@storybook/react-vite";

import { getFlashcard } from "~/data/curriculum-data";
import { StudyCard } from "./index";

const meta = {
  title: "App/StudyCard",
  component: StudyCard,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof StudyCard>;

export default meta;
type Story = StoryObj<typeof StudyCard>;

// The card fills its stage; the story frames it in a phone-height, centered
// stage (whisper-gray) like the Study route does.
function Stage({ nodeId }: { nodeId: string }) {
  const fc = getFlashcard("c-rust-foundations", nodeId);
  return (
    <div className="grid h-[100dvh] place-items-center bg-whisper-gray p-4">
      {fc ? (
        <div className="grid h-full max-h-[680px] w-full max-w-md place-items-stretch">
          <StudyCard flashcard={fc} onRate={() => undefined} />
        </div>
      ) : (
        <div>no card</div>
      )}
    </div>
  );
}

export const Quiz: Story = { render: () => <Stage nodeId="mut-required" /> };
export const QuizWithCode: Story = { render: () => <Stage nodeId="shadowing-output" /> };
export const WriteCode: Story = { render: () => <Stage nodeId="hello-world" /> };
