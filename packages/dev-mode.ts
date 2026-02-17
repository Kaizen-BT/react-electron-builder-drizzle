import path from "node:path";
import {
  RENDERER_DEV_SERVER_PLUGIN_NAME,
  type RendererDevServerPlugin,
} from "@app/tools";
import { build, createServer } from "vite";

/**
 * This script is designed to run multiple packages of your application in a special development mode.
 * To do this, you need to follow a few steps:
 */

/**
 * 1. We create a few flags to let everyone know that we are in development mode.
 * NOTE: Using build and createServer in the same process require the following env flags
 * See: https://vite.dev/guide/api-javascript#createserver
 */

const mode = "development";
process.env.NODE_ENV = mode;
process.env.MODE = mode;

/**
 * 2. We create a development server for the renderer. It is assumed that the renderer exists and is located in the “renderer” package.
 * This server should be started first because other packages depend on its settings.
 */

const rendererWatchServer = await createServer({
  mode,
  root: path.resolve("packages/renderer"),
});

await rendererWatchServer.listen();

/**
 * 3. We are creating a simple provider plugin.
 * Its only purpose is to provide access to the renderer dev-server to all other build processes.
 */
const rendererDevServer: RendererDevServerPlugin = {
  name: RENDERER_DEV_SERVER_PLUGIN_NAME,
  api: rendererWatchServer,
};

/**
 * 4. Start building all other packages.
 * For each of them, we add a plugin provider so that each package can implement its own hot update mechanism.
 */

const packagesToStart = ["packages/preload", "packages/main"];

for (const pkg of packagesToStart) {
  await build({
    mode,
    root: path.resolve(pkg),
    plugins: [rendererDevServer],
  });
}
