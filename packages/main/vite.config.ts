import { type ChildProcess, spawn } from "node:child_process";
import { getNodeMajorVersion } from "@app/electron-versions";
import electronPath from "electron";
import { defineConfig, type Plugin, type PluginOption, type ViteDevServer } from "vite";

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
  plugins: [handleHotReload()],
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
  let electronApp: ChildProcess | null = null;
  let rendererWatchServer: ViteDevServer | null = null;

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

      rendererWatchServer =
        rendererWatchServerProvider.api.provideRendererWatchServer();

      process.env.VITE_DEV_SERVER_URL = rendererWatchServer?.resolvedUrls?.local[0];

      return {
        build: {
          watch: {},
        },
      };
    },

    writeBundle() {
      if (process.env.NODE_ENV !== "development") {
        return;
      }

      if (electronApp !== null) {
        electronApp.removeListener("exit", process.exit);
        electronApp.kill("SIGINT");
        electronApp = null;
      }

      electronApp = spawn(String(electronPath), ["--inspect", "."], {
        stdio: "inherit",
      });

      electronApp.addListener("exit", process.exit);
    },
  };
}
