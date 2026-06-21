import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";

import { sharedPlugins } from "../vite.shared.ts";

const config: StorybookConfig = {
  framework: { name: "@storybook/react-vite", options: {} },

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
      plugins: sharedPlugins(),
    });
  },
};

export default config;
