import type { Plugin, PluginOption, ViteDevServer } from "vite";

export const RENDERER_DEV_SERVER_PLUGIN_NAME = "@app/renderer-watch-server-provider";

export interface RendererDevServerPlugin extends Plugin {
  api: ViteDevServer;
}

/**
 * Type predicate to determine if the PluginOption is
 * the plugin containing information on the vite-dev-server
 * used by the renderer
 */
export function isRendererDevServerPlugin(
  plugin: PluginOption,
): plugin is RendererDevServerPlugin {
  if (!plugin || Array.isArray(plugin) || "then" in plugin) {
    return false;
  }

  return (
    plugin.name === RENDERER_DEV_SERVER_PLUGIN_NAME &&
    typeof (plugin as RendererDevServerPlugin).api.resolvedUrls === "object"
  );
}
