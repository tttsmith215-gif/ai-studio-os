// ---------------------------------------------------------------------------
// AI Studio OS — Plugin Loader (Entry Point)
// ---------------------------------------------------------------------------
// Initializes the plugin system: scans for user plugins, loads built-in
// apps, and activates everything.
// ---------------------------------------------------------------------------

import { pluginRegistry } from "./registry";
import { dynamicLoader } from "./dynamic-loader";
import { hotReload } from "./hotreload";
import { builtinRegistry } from "./builtin";

export { pluginRegistry, dynamicLoader, hotReload, builtinRegistry };

// ---------------------------------------------------------------------------
// Initialize the plugin system
// ---------------------------------------------------------------------------
export async function initializePluginSystem(): Promise<void> {
  console.log("[PluginLoader] Initializing plugin system...");

  // 1. Scan for user-installed plugins
  const userPlugins = await dynamicLoader.scanPluginDir();

  // 2. Activate user plugins that are enabled
  for (const plugin of userPlugins) {
    if (plugin.enabled) {
      await dynamicLoader.activatePlugin(plugin.id);
    }
  }

  // 3. Start hot-reload for development
  hotReload.start(["plugins/user", "plugins/built-in"], 3000);

  console.log(`[PluginLoader] System initialized: ${pluginRegistry.getAll().length} plugins registered, ${userPlugins.length} user plugins`);
}

// ---------------------------------------------------------------------------
// Auto-initialize on import
// ---------------------------------------------------------------------------
initializePluginSystem().catch(console.error);