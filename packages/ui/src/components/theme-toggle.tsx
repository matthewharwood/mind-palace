import { Moon, Sun } from "lucide-react";

import { Button } from "./button";

// ThemeToggle — CONTROLLED light/dark switch (Sun/Moon). Stateless + portable:
// the host owns the theme value + persistence (e.g. IDB) and passes `onToggle`.
export type ThemeToggleProps = {
  theme: "light" | "dark";
  onToggle: () => void;
};

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
