import { getChromeMajorVersion } from "@app/electron-versions";
import { resolveModuleExportNames } from "mlly";
import { defineConfig, type Plugin, type PluginOption, type ViteDevServer } from "vite";

export default defineConfig({
  build: {
    ssr: true,
    sourcemap: "inline",
    outDir: "dist",
    target: `chrome${getChromeMajorVersion()}`,
    assetsDir: ".",
    lib: {
      entry: ["src/exposed.ts", "virtual:browser.js"],
    },
    rollupOptions: {
      output: [
        {
          // ESM preload scripts must have the .mjs extension
          // https://www.electronjs.org/docs/latest/tutorial/esm#esm-preload-scripts-must-have-the-mjs-extension
          entryFileNames: "[name].mjs",
        },
      ],
    },
    emptyOutDir: true,
    reportCompressedSize: false,
  },
  plugins: [mockExposed(), handleHotReload()],
});

/**
 * This plugin creates a browser (renderer) version of `preload` package.
 * Basically, it just read all nominals you exported from package and define it as globalThis properties
 * expecting that real values were exposed by `electron.contextBridge.exposeInMainWorld()`
 *
 * Example:
 * ```ts
 * // index.ts
 * export const someVar = 'my-value';
 * ```
 *
 * Output
 * ```js
 * // _virtual_browser.mjs
 * export const someVar = globalThis[<hash>] // 'my-value'
 * ```
 *
 * @returns {Plugin}
 */
function mockExposed(): Plugin {
  const virtualModuleId = "virtual:browser.js";
  const resolvedVirtualModuleId = `\0{virtualModuleId}`;

  return {
    name: "electron-main-exposer",
    resolveId(id) {
      if (id.endsWith(virtualModuleId)) {
        return resolvedVirtualModuleId;
      }
    },
    async load(id) {
      if (id === resolvedVirtualModuleId) {
        const exportedNames = await resolveModuleExportNames("./src/index.ts", {
          url: import.meta.url,
        });
        return exportedNames.reduce((s, key) => {
          return (
            s +
            (key === "default"
              ? `export default globalThis['${btoa(key)}'];\n`
              : `export const ${key} = globalThis['${btoa(key)}'];\n`)
          );
        }, "");
      }
    },
  };
}

interface RendererDevServerPlugin extends Plugin {
  api: ViteDevServer;
}

/**
 * Type predicate to determine if the PluginOption is
 * the plugin containing information on the vite-dev-server
 * used by the renderer
 */
function isViteDevServerPlugin(
  plugin: PluginOption,
): plugin is RendererDevServerPlugin {
  if (!plugin || Array.isArray(plugin) || "then" in plugin) {
    return false;
  }

  return (
    plugin.name === "@app/renderer-watch-server-provider" &&
    typeof (plugin as RendererDevServerPlugin).api.resolvedUrls === "object"
  );
}

/**
 * Implement Electron webview reload when some file was changed
 * @return {Plugin}
 */
function handleHotReload(): Plugin {
  let rendererWatchServer: ViteDevServer | undefined;

  return {
    name: "@app/preload-process-hot-reload",
    config(config, env) {
      if (env.mode !== "development") {
        return;
      }

      const rendererWatchServerProvider = config.plugins?.find(isViteDevServerPlugin);

      if (!rendererWatchServerProvider) {
        throw new Error("Vite-Dev-Server-Error: Renderer not found");
      }

      rendererWatchServer = rendererWatchServerProvider.api;
      return {
        build: {
          watch: {},
        },
      };
    },
    writeBundle() {
      if (!rendererWatchServer) {
        return;
      }

      rendererWatchServer.ws.send({
        type: "full-reload",
      });
    },
  };
}
