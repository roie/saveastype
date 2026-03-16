import { defineConfig } from "wxt";

export default defineConfig({
  manifestVersion: 3,
  modules: ["@wxt-dev/module-svelte"],
  manifest: {
    name: "SaveAsType",
    description:
      "Right-click any image to save it as PNG, JPEG, WebP, or AVIF. Fast, local, open-source.",
    version: "0.1.0",
    permissions: ["contextMenus", "downloads", "offscreen", "storage"],
    host_permissions: [],
    action: {
      default_title: "SaveAsType",
      default_popup: "popup.html",
    },
    icons: {
      16: "assets/icons/icon-16.png",
      32: "assets/icons/icon-32.png",
      48: "assets/icons/icon-48.png",
      128: "assets/icons/icon-128.png",
    },
  },
});
