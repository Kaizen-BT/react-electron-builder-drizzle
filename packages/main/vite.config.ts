import { spawn } from "node:child_process";
import { getNodeMajorVersion } from "@app/electron-versions";
import electronPath from "electron";
import { defineConfig, Plugin, PluginOption } from "vite";

export default defineConfig({
  build: {
    ssr: true,
    sourcemap: "inline",
    outDir: "dist",
    assetsDir: ".",
    target: `node${getNodeMajorVersion()}`,
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
    },
    rollupOptions: {
      output: {
        entryFileNames: "[name].js",
      },
    },
    emptyOutDir: true,
    reportCompressedSize: false,
  },
  // TODO: Add plugins
});

/**
 * Type Predicate to help narrow down types of PluginOptions
 * NOTE: This is likely not robust enough but is sufficient
 * for the use case of this application
 */
function isPlugin(plugin: PluginOption): plugin is Plugin {
  return (plugin as Plugin).name !== undefined;
}

function handleHotReload(): Plugin {
  return {
    name: "@app/main-process-hot-reload",

    config(config, env) {
      if (env.mode !== "development") {
        return;
      }

      const rendererWatchServerProvider = config.plugins
        ?.filter((p) => isPlugin(p))
        .find((plugin) => plugin.name === "@app/renderer-watch-server-provider");

      if (!rendererWatchServerProvider) {
        throw new Error("Renderer watch server provider not found");
      }
    },
  };
}
