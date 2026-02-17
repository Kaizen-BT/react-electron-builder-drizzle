import { type ChildProcess, spawn } from "node:child_process";
import { getNodeMajorVersion } from "@app/electron-versions";
import { isRendererDevServerPlugin } from "@app/tools";
import electronPath from "electron";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";

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
 * HotReload plugin for main package
 * @see {@link https://rollupjs.org/plugin-development/#direct-plugin-communication | Rollup}
 * @returns {Plugin}
 */
function handleHotReload(): Plugin {
  let electronApp: ChildProcess | null = null;
  let rendererWatchServer: ViteDevServer | undefined;

  return {
    name: "@app/main-process-hot-reload",

    config(config, env) {
      if (env.mode !== "development") {
        return;
      }

      // This is the recommended way for inter-plugin communication
      // See: https://rollupjs.org/plugin-development/#direct-plugin-communication
      const rendererWatchServerProvider = config.plugins?.find(
        isRendererDevServerPlugin,
      );

      if (!rendererWatchServerProvider) {
        throw new Error("Vite-Dev-Server-Error: Renderer not found");
      }

      rendererWatchServer = rendererWatchServerProvider.api;

      process.env.VITE_DEV_SERVER_URL = rendererWatchServer.resolvedUrls?.local[0];

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

      // Kill active Electron instance and restart to ensure changes
      // are reflected
      if (electronApp !== null) {
        electronApp.removeListener("exit", process.exit);
        electronApp.kill("SIGINT");
        electronApp = null;
      }

      // Launch electron
      // Equivalent to: npx electron . (resolves the root package.json's "main" field)
      electronApp = spawn(String(electronPath), ["--inspect", "."], {
        stdio: "inherit",
      });

      // Close electron when Node.js process is exited
      electronApp.addListener("exit", process.exit);
    },
  };
}
