// ---------------------------------------------------------------------------
// AI Studio OS — Plugin Loader
// ---------------------------------------------------------------------------
// Discovers, validates, and activates plugins. The loader:
// 1. Scans plugin directories for manifest files
// 2. Parses and validates each manifest
// 3. Calls activate() to get contributions
// 4. Registers contributions into the registry
// 5. Calls onReady() when all plugins are active
// ---------------------------------------------------------------------------

import type { PluginManifest, PluginMetadata, PluginContributions } from "../sdk/plugin";
import type { HostAPI } from "../sdk/host";
import { pluginRegistry } from "./registry";

export interface PluginLoadResult {
  loaded: number;
  failed: { id: string; error: string }[];
  skipped: { id: string; reason: string }[];
}

export interface PluginLoaderOptions {
  /** Directory to scan for plugins */
  pluginDirs: string[];
  /** Whether to load plugins from npm packages */
  loadFromNodeModules?: boolean;
  /** Host API instance to pass to plugins */
  hostAPI: HostAPI;
  /** Called when a plugin's status changes */
  onStatusChange?: (id: string, status: string) => void;
}

// =========================================================================
// Manifest validation
// =========================================================================
export function validateManifest(m: Record<string, unknown> | PluginManifest): m is PluginManifest {
  if (!m || typeof m !== "object") return false;
  if (typeof (m as any).id !== "string" || !(m as any).id) return false;
  if (typeof (m as any).name !== "string" || !(m as any).name) return false;
  if (typeof (m as any).version !== "string" || !(m as any).version) return false;
  if (typeof (m as any).minHostVersion !== "string") return false;
  return true;
}

// =========================================================================
// Plugin Loader
// =========================================================================
export class PluginLoader {
  private options: PluginLoaderOptions;

  constructor(options: PluginLoaderOptions) {
    this.options = options;
  }

  // -----------------------------------------------------------------------
  // Main entry point: scan, validate, load, activate
  // -----------------------------------------------------------------------
  async loadAll(): Promise<PluginLoadResult> {
    const result: PluginLoadResult = { loaded: 0, failed: [], skipped: [] };

    // 1. Discover manifests
    const manifests = await this.discoverManifests();

    // 2. Validate & instantiate
    for (const manifest of manifests) {
      if (!validateManifest(manifest)) {
        result.skipped.push({ id: (manifest as any).id || "unknown", reason: "Invalid manifest" });
        continue;
      }

      // Check version compatibility
      if (!this.isHostCompatible(manifest.minHostVersion)) {
        result.skipped.push({ id: manifest.id, reason: `Requires host >= ${manifest.minHostVersion}` });
        continue;
      }

      // Check if already loaded
      if (pluginRegistry.get(manifest.id)?.status === "active") {
        result.skipped.push({ id: manifest.id, reason: "Already loaded" });
        continue;
      }

      // 3. Load the plugin module
      try {
        await this.activatePlugin(manifest);
        result.loaded++;
      } catch (err: any) {
        result.failed.push({ id: manifest.id, error: err.message || String(err) });
        pluginRegistry.setStatus(manifest.id, "error", err.message);
      }
    }

    // 4. Call onReady on all active plugins
    for (const meta of pluginRegistry.getByStatus("active")) {
      try {
        await meta.manifest.onReady?.();
      } catch (err: any) {
        console.warn(`[PluginLoader] onReady error for ${meta.manifest.id}:`, err);
      }
    }

    return result;
  }

  // -----------------------------------------------------------------------
  // Activate a single plugin
  // -----------------------------------------------------------------------
  private async activatePlugin(manifest: PluginManifest): Promise<void> {
    pluginRegistry.setStatus(manifest.id, "loading");
    this.options.onStatusChange?.(manifest.id, "loading");

    // Create metadata entry
    const meta: PluginMetadata = {
      manifest,
      status: "loaded",
      installPath: "", // resolved during discovery
      installedAt: new Date().toISOString(),
      enabled: true,
    };
    pluginRegistry.register(meta);

    // Call activate
    if (manifest.activate) {
      pluginRegistry.setStatus(manifest.id, "activating");
      this.options.onStatusChange?.(manifest.id, "activating");

      const contributions = await manifest.activate(this.options.hostAPI);

      if (contributions) {
        meta.contributions = contributions;
        pluginRegistry.applyContributions(manifest.id, contributions);
      }
    }

    pluginRegistry.setStatus(manifest.id, "active");
    this.options.onStatusChange?.(manifest.id, "active");
  }

  // -----------------------------------------------------------------------
  // Deactivate a plugin (uninstall / disable)
  // -----------------------------------------------------------------------
  async deactivatePlugin(id: string): Promise<void> {
    const meta = pluginRegistry.get(id);
    if (!meta) return;

    try {
      await meta.manifest.deactivate?.();
    } catch (err: any) {
      console.warn(`[PluginLoader] deactivate error for ${id}:`, err);
    }

    pluginRegistry.extension.unregisterAllByPlugin(id);
    pluginRegistry.setStatus(id, "disabled");
    pluginRegistry.setEnabled(id, false);
  }

  // -----------------------------------------------------------------------
  // Discover manifests from plugin directories
  // -----------------------------------------------------------------------
  private async discoverManifests(): Promise<PluginManifest[]> {
    const manifests: PluginManifest[] = [];

    for (const dir of this.options.pluginDirs) {
      try {
        const found = await this.scanDir(dir);
        manifests.push(...found);
      } catch {
        // Directory doesn't exist or is inaccessible — skip
      }
    }

    // If configured, also scan node_modules for packages starting with "aios-plugin-"
    if (this.options.loadFromNodeModules) {
      try {
        const npm = await this.scanNodeModules();
        manifests.push(...npm);
      } catch {
        // No node_modules or error reading
      }
    }

    return manifests;
  }

  private async scanDir(_dir: string): Promise<PluginManifest[]> {
    // In a real implementation, this would:
    // 1. Read the directory
    // 2. Look for plugin.json, package.json, or index.ts files
    // 3. Parse and validate manifests
    // 4. Return the list
    //
    // For now, built-in plugins are registered directly.
    return [];
  }

  private async scanNodeModules(): Promise<PluginManifest[]> {
    // In a real implementation, this would:
    // 1. Scan node_modules for @aios/plugin-* or aios-plugin-* packages
    // 2. Read their package.json → plugin section
    // 3. Import the module
    // 4. Return manifests
    return [];
  }

  // -----------------------------------------------------------------------
  // Version compatibility check
  // -----------------------------------------------------------------------
  private isHostCompatible(minHostVersion: string): boolean {
    // Simple semver comparison. In production, use a semver library.
    const host = this.options.hostAPI.hostVersion;
    const minParts = minHostVersion.split(".").map(Number);
    const hostParts = host.split(".").map(Number);

    for (let i = 0; i < Math.max(minParts.length, hostParts.length); i++) {
      const m = minParts[i] || 0;
      const h = hostParts[i] || 0;
      if (h < m) return false;
      if (h > m) return true;
    }
    return true;
  }
}