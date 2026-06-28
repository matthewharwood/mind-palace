import { type ReactNode, useState } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";

// SettingsPanel — presentational settings surface (rendered by the /settings
// route into the main stage). The destructive reset action is injected as
// `onClear` so the route owns the real clear-storage + reload while the story
// can pass a no-op (Pillar 2). Inline two-step confirm; no modal dependency.

export const SettingsPanelPropsSchema = z.object({
  /** Wipe local data + reload to the latest version. Awaited; the page reloads after. */
  onClear: z.custom<() => void | Promise<void>>(),
  /** The IDB schema version, shown for support/debugging. */
  version: z.number().optional(),
});
export type SettingsPanelProps = z.infer<typeof SettingsPanelPropsSchema>;

export const SettingsPanel = defineComponent(
  SettingsPanelPropsSchema,
  ({ onClear, version }: SettingsPanelProps): ReactNode => {
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);

    async function clear(): Promise<void> {
      setBusy(true);
      await onClear();
      // The route reloads the page; no further state needed.
    }

    return (
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-8" data-test="settings-panel">
        <header className="flex flex-col gap-1">
          <h1 className="text-pretty text-[clamp(1.6rem,1.1rem+2vw,2.25rem)] text-midnight-ink leading-[1.12]">
            Settings
          </h1>
          <p className="text-muted-ash text-sm">
            Manage local data on this device.
            {version !== undefined ? ` Data format v${version}.` : ""}
          </p>
        </header>

        <div className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-canvas-white p-5">
          <h2 className="font-semibold text-base text-midnight-ink">Reset & update</h2>
          <p className="text-[15px] text-midnight-ink/80 leading-7">
            Clears all saved progress and cached data on this device, then reloads to the latest
            version of the app. Your learning history here will be erased and cannot be undone.
          </p>

          {confirming ? (
            <div className="flex flex-wrap items-center gap-2 pt-1" data-test="settings-confirm">
              <span className="text-[15px] text-midnight-ink">
                Erase everything on this device?
              </span>
              <button
                type="button"
                data-test="settings-clear-confirm"
                disabled={busy}
                onClick={clear}
                className="rounded-lg bg-rose-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
              >
                {busy ? "Clearing…" : "Clear everything"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-black/15 px-4 py-2 text-midnight-ink text-sm transition-colors hover:bg-black/[0.03]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="pt-1">
              <button
                type="button"
                data-test="settings-clear"
                onClick={() => setConfirming(true)}
                className="rounded-lg border border-rose-300 px-4 py-2 font-medium text-rose-700 text-sm transition-colors hover:bg-rose-50 dark:border-rose-500/50 dark:text-rose-300 dark:hover:bg-rose-500/10"
              >
                Clear local data & update
              </button>
            </div>
          )}
        </div>
      </section>
    );
  },
);
