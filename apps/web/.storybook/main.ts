import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";

import { onRollupWarn, sharedPlugins } from "../vite.shared.ts";

const config: StorybookConfig = {
  framework: { name: "@storybook/react-vite", options: {} },

  // Storybook's Vite builder otherwise discovers ../vite.config.ts and loads
  // the app-only TanStack Start plugin. Point it at an intentionally empty
  // Storybook-only config; shared plugins are still merged below.
  core: {
    builder: {
      name: "@storybook/builder-vite",
      options: { viteConfigPath: "./.storybook/storybook-only-vite.config.ts" },
    },
  },

  // Co-located stories — the app's components tree plus workspace UI packages,
  // so a portable package's stories travel with it (clone the package dir and
  // its stories come along). Pillar 1.
  stories: [
    "../app/components/**/*.stories.@(ts|tsx)",
    "../../../packages/*/src/**/*.stories.@(ts|tsx)",
  ],

  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],

  async viteFinal(viteConfig) {
    return mergeConfig(viteConfig, {
      build: {
        // Storybook includes its docs renderer, accessibility tooling, and
        // both Three.js backends. Keep the warning threshold just above that
        // intentional baseline so meaningful future bundle growth is visible.
        chunkSizeWarningLimit: 1_300,
        rollupOptions: { onwarn: onRollupWarn },
      },
      plugins: sharedPlugins(),
    });
  },
};

export default config;
