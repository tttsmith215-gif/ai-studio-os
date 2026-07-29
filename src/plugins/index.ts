// ---------------------------------------------------------------------------
// AI Studio OS — Plugin System: Plugin SDK index
// ---------------------------------------------------------------------------
// Main entry point for the plugin system. Re-exports the SDK and the
// registry/loader for use by the host.
// ---------------------------------------------------------------------------

export { pluginRegistry, ExtensionRegistry, PluginRegistry } from "./registry";
export { PluginLoader, validateManifest } from "./loader";
export type { PluginLoadResult, PluginLoaderOptions } from "./loader";

export * from "../sdk/index";