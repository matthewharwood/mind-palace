import type { Meta, StoryObj } from "@storybook/react-vite";

import { DayRoadmapDrawer } from "./day-roadmap-drawer";

const meta: Meta<typeof DayRoadmapDrawer> = {
  title: "Music Mode/DayRoadmapDrawer",
  component: DayRoadmapDrawer,
  parameters: { layout: "padded" },
  args: {
    currentDay: 1,
    activeSprintIndex: 0,
    completedSprintsByDay: { "1": [0, 1] },
    streakDays: 4,
    totalMinutesPracticed: 175,
    habitIdentityCue: "I read intervals and shapes ahead of my hands, one bar at a time.",
    cadence: {
      dailyGoalMinutes: "15",
      weeklyGraceDaysRemaining: 1,
      graceWeekIso: "2026-W47",
    },
    onUpdateCadence: () => undefined,
    onSelectDay: () => undefined,
    onSelectSprint: () => undefined,
    onCompleteSprint: () => undefined,
  },
};

export default meta;
type Story = StoryObj<typeof DayRoadmapDrawer>;

export const DayOneFoundations: Story = {};

export const DayTwentyFiveChopin: Story = {
  args: {
    currentDay: 25,
    activeSprintIndex: 6,
    completedSprintsByDay: {
      "1": [0, 1, 2, 3, 4, 5, 6, 7],
      "24": [0, 1, 2, 3, 4, 5, 6, 7],
      "25": [0, 1, 2, 3, 4, 5],
    },
    streakDays: 25,
    totalMinutesPracticed: 5820,
  },
};
