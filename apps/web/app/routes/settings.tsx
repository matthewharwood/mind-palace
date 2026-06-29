import { createFileRoute } from "@tanstack/react-router";

import { SettingsPanel } from "~/components/settings-panel";
import { clearAllStorage } from "~/lib/clear-storage";
import { buildSeoLinks } from "~/lib/seo";
import { useTheme } from "~/lib/use-theme";
import { DB_VERSION } from "~/state/db";

export const Route = createFileRoute("/settings")({
  head: () => ({ links: buildSeoLinks({ path: "/settings" }) }),
  component: SettingsView,
});

function SettingsView() {
  const { theme, toggle } = useTheme();

  async function clearAndReload(): Promise<void> {
    await clearAllStorage();
    window.location.reload();
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <SettingsPanel
        version={DB_VERSION}
        theme={theme}
        onToggleTheme={toggle}
        onClear={clearAndReload}
      />
    </div>
  );
}
