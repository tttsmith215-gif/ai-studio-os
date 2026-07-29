// ---------------------------------------------------------------------------
// AI Studio OS — Plugin System: Plugin SDK index
// ---------------------------------------------------------------------------
// Main entry point for the plugin system. Re-exports the SDK and the
// registry/loader for use by the host.
// ---------------------------------------------------------------------------

export { pluginRegistry, ExtensionRegistry, PluginRegistry } from "./registry";
export { dynamicLoader, hotReload, initializePluginSystem } from "./loader";
export { validateManifest, satisfies } from "./manifest-schema";
export { permissionManager } from "./permissions";
export { marketplace } from "./marketplace";
export { createPluginSandbox } from "./sandbox";

export * from "../sdk/index";