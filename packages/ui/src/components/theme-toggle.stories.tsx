import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { ThemeToggle } from "./theme-toggle";

const meta = {
  title: "UI/ThemeToggle",
  component: ThemeToggle,
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

// Controlled demo: toggles the .dark class on the story root so you can see both
// themes. In the app, the host wires `theme`/`onToggle` to an IDB-backed atom.
export const Default: Story = {
  render: () => {
    const [theme, setTheme] = useState<"light" | "dark">("light");
    return (
      <div className={theme === "dark" ? "dark" : undefined}>
        <div className="rounded-md bg-background p-6 text-foreground">
          <ThemeToggle
            theme={theme}
            onToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          />
        </div>
      </div>
    );
  },
};
