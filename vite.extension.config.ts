import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

type TargetBrowser = "chrome" | "edge" | "firefox";

const browser = (process.env.EXTENSION_BROWSER ?? "chrome") as TargetBrowser;
if (!["chrome", "edge", "firefox"].includes(browser)) {
  throw new Error(`Unsupported EXTENSION_BROWSER: ${browser}`);
}

const packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf8"));

function extensionAssets(): Plugin {
  return {
    name: "extension-assets",
    generateBundle() {
      const manifest = {
        manifest_version: 3,
        name: "开发者工具箱",
        description: "离线使用文档差异、JSON、密码生成和编解码工具。",
        version: packageJson.version,
        offline_enabled: true,
        action: {
          default_title: "开发者工具箱",
          default_popup: "popup.html",
          default_icon: {
            16: "icon-16.png",
            32: "icon-32.png",
          },
        },
        icons: {
          16: "icon-16.png",
          32: "icon-32.png",
          48: "icon-48.png",
          96: "icon-96.png",
          128: "icon-128.png",
        },
        ...(browser === "firefox"
          ? {
              browser_specific_settings: {
                gecko: {
                  id: "dev-tools-box@local",
                  strict_min_version: "109.0",
                },
              },
            }
          : {}),
      };

      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: `${JSON.stringify(manifest, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig({
  root: resolve("extension"),
  base: "./",
  plugins: [react(), extensionAssets()],
  build: {
    emptyOutDir: true,
    outDir: resolve(`dist-extension/${browser}`),
    rollupOptions: {
      input: {
        popup: resolve("extension/popup.html"),
        toolbox: resolve("extension/toolbox.html"),
      },
    },
  },
});
