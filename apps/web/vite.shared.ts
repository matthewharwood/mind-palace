import tailwindcss from "@tailwindcss/vite";
import type { PluginOption, UserConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

type BuildConfig = Exclude<UserConfig["build"], false | undefined>;
type RollupOptions = NonNullable<BuildConfig["rollupOptions"]>;
type RollupOnWarn = NonNullable<RollupOptions["onwarn"]>;

// React libraries legitimately ship this directive for framework-aware
// bundlers. Vite does not consume it, so Rollup's warning is informational.
export const onRollupWarn: RollupOnWarn = (warning, warn) => {
  if (warning.code === "MODULE_LEVEL_DIRECTIVE" && warning.message.includes('"use client"')) {
    return;
  }
  warn(warning);
};

// Plugins shared by the app and Storybook so the Tailwind v4 + path-alias
// config has a single source of truth (Pillar 1: Storybook-first; never fork).
// The TanStack Start plugin is app-only — Storybook should not run prerender.
export function sharedPlugins(): PluginOption[] {
  return [viteTsConfigPaths({ projects: ["./tsconfig.json"] }), tailwindcss()];
}
