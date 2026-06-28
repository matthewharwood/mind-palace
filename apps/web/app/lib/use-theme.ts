import { useAtom } from "jotai";
import { useEffect } from "react";

import { settingsAtom } from "~/state/atoms";

// Theme = the IDB-persisted `settings.theme` (Pillar 3 — the source of truth is
// IDB; this hook mirrors it to the `dark` class on <html> so @mind-palace/ui's
// semantic tokens flip). Kept out of AppShell so the shell stays a thin layout.
export function useTheme(): { theme: "light" | "dark"; toggle: () => void } {
  const [settings, setSettings] = useAtom(settingsAtom);
  const { theme } = settings;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return {
    theme,
    toggle: () =>
      setSettings((prev) => ({ ...prev, theme: prev.theme === "dark" ? "light" : "dark" })),
  };
}
