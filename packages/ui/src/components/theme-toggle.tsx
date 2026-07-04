import { Moon, Sun } from "lucide-react";

import { Button } from "./button";

// ThemeToggle — CONTROLLED light/dark switch (Sun/Moon). Stateless + portable:
// the host owns the theme value + persistence (e.g. IDB) and passes `onToggle`.
export type ThemeToggleProps = {
  theme: "light" | "dark";
  onToggle: () => void;
  disabled?: boolean;
};

export function ThemeToggle({ theme, onToggle, disabled = false }: ThemeToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={onToggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
