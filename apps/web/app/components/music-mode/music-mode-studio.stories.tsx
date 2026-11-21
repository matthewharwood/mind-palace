import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { createInitialMusicModeState } from "~/lib/music-mode/curriculum";
import type { MusicModeState } from "~/lib/music-mode/schemas";
import { MusicModeStudio } from "./music-mode-studio";

function InteractiveStudioStory({ initialState }: { initialState: MusicModeState }) {
  const [state, setState] = useState<MusicModeState>(initialState);
  return <MusicModeStudio state={state} onUpdateState={setState} />;
}

const meta: Meta<typeof MusicModeStudio> = {
  title: "Music Mode/MusicModeStudio",
  component: MusicModeStudio,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof MusicModeStudio>;

export const DayOneStudio: Story = {
  render: () => <InteractiveStudioStory initialState={createInitialMusicModeState()} />,
};

export const ChopinMasteryDay26: Story = {
  render: () => (
    <InteractiveStudioStory
      initialState={{
        ...createInitialMusicModeState(),
        currentDay: 26,
        activeSprintIndex: 5,
        adaptiveDifficulty: 8,
        rollingAccuracy: 0.88,
        streakDays: 26,
        totalMinutesPracticed: 6100,
        completedSprintsByDay: {
          "25": [0, 1, 2, 3, 4, 5, 6, 7],
          "26": [0, 1, 2, 3, 4],
        },
      }}
    />
  ),
};
