import type { Meta, StoryObj } from "@storybook/react-vite";

import { buildSpeechTrack } from "~/lib/speech-track";

import { ReadAloudButton } from "./index";

const meta = {
  title: "App/ReadAloudButton",
  component: ReadAloudButton,
} satisfies Meta<typeof ReadAloudButton>;

export default meta;
type Story = StoryObj<typeof ReadAloudButton>;

// Tap to hear the sample read aloud (browser speech synthesis); tap again to
// pause, again to resume. The track comes from the same compiler the lesson
// routes use: heading slower, ==highlight== gets a spoken beat, WGSL is
// pronounced via the lexicon, and the fenced block is skipped with a notice.
export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-3 p-4">
      <ReadAloudButton
        getSegments={() =>
          buildSpeechTrack({
            id: "demo",
            title: "Shaders & Bindings",
            content: {
              type: "read",
              markdown:
                "## What a fragment shader does\nA fragment shader runs ==once per pixel== and returns a color. WGSL is the language it is written in.\n```wgsl\n@fragment fn f() {}\n```\nThat is the whole loop.",
            },
          })
        }
      />
      <span className="text-sm">Read aloud</span>
    </div>
  ),
};
