import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: [
    "entrypoints/background.ts",
    "entrypoints/popup/index.html",
    "entrypoints/popup/main.ts",
    "wxt.config.ts",
  ],
  project: ["entrypoints/**/*.ts", "entrypoints/**/*.svelte", "utils/**/*.ts", "tests/**/*.ts"],
  ignoreExportsUsedInFile: true,
  ignore: ["utils/offscreen-document.ts"],
  ignoreDependencies: ["@wxt-dev/module-svelte"],
};

export default config;
