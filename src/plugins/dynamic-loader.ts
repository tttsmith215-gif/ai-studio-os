// ---------------------------------------------------------------------------
// AI Studio OS — Dynamic Plugin Loader
// ---------------------------------------------------------------------------
// Loads plugins from the plugins/ directory, supports drag-and-drop .zip
// install, and manages plugin lifecycle (activate/deactivate).
// ---------------------------------------------------------------------------

import { pluginRegistry } from "./registry";
import { validateManifest, satisfies, type PluginManifestFile } from "./manifest-schema";
import type { PluginManifest, PluginMetadata, PluginStatus, PluginContributions } from "../sdk/plugin";
import type { HostAPI } from "../sdk/host";
import type { PluginInfo } from "../store/types";

// Re-export the manifest type for consumer use
export type { PluginManifestFile } from "./manifest-schema";

// =========================================================================
// User-Installable Plugin Entry
// =========================================================================
export interface InstalledPlugin {
  id: string;
  manifest: PluginManifestFile;
  installPath: string;
  installedAt: string;
  enabled: boolean;
}

// =========================================================================
// Loader Events
// =========================================================================
export interface LoaderEvent {
  type: "installed" | "uninstalled" | "enabled" | "disabled" | "error" | "activating" | "deactivating";
  pluginId: string;
  message: string;
  timestamp: number;
}

type LoaderListener = (event: LoaderEvent) => void;

// =========================================================================
// Dynamic Plugin Loader
// =========================================================================
class DynamicPluginLoader {
  private listeners = new Set<LoaderListener>();
  private installedPlugins = new Map<string, InstalledPlugin>();
  private activePluginApis = new Map<string, HostAPI>();
  private pluginDir = "plugins/user";

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------
  subscribe(listener: LoaderListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: LoaderEvent): void {
    for (const listener of this.listeners) {
      try { listener(event); } catch (e) { console.error("[PluginLoader] listener error:", e); }
    }
  }

  // -----------------------------------------------------------------------
  // Directory scanning
  // -----------------------------------------------------------------------
  async scanPluginDir(dir?: string): Promise<InstalledPlugin[]> {
    const scanDir = dir || this.pluginDir;
    const found: InstalledPlugin[] = [];

    try {
      // In a real Tauri app, this would use fs:readDir
      // For the web version, we check localStorage for installed plugins
      const stored = localStorage.getItem("aios-installed-plugins");
      if (stored) {
        const plugins: InstalledPlugin[] = JSON.parse(stored);
        for (const p of plugins) {
          this.installedPlugins.set(p.id, p);
          found.push(p);
        }
      }
    } catch (e) {
      console.error("[PluginLoader] scan error:", e);
    }

    return found;
  }

  // -----------------------------------------------------------------------
  // Install from .zip (drag-and-drop)
  // -----------------------------------------------------------------------
  async installFromZip(zipBuffer: ArrayBuffer): Promise<InstalledPlugin | null> {
    this.emit({ type: "activating", pluginId: "loader", message: "Installing plugin from zip...", timestamp: Date.now() });

    try {
      // Parse the manifest from the zip
      const manifest = await this.extractManifestFromZip(zipBuffer);
      if (!manifest) {
        this.emit({ type: "error", pluginId: "unknown", message: "No valid manifest.json found in plugin archive", timestamp: Date.now() });
        return null;
      }

      // Validate manifest
      const validation = validateManifest(manifest);
      if (!validation.valid) {
        this.emit({ type: "error", pluginId: manifest.id, message: `Invalid manifest: ${validation.errors.join(", ")}`, timestamp: Date.now() });
        return null;
      }

      // Check host version compatibility
      if (!satisfies("0.1.0", manifest.minHostVersion)) {
        this.emit({ type: "error", pluginId: manifest.id, message: `Plugin requires host v${manifest.minHostVersion}+`, timestamp: Date.now() });
        return null;
      }

      // Check for duplicate
      if (this.installedPlugins.has(manifest.id)) {
        this.emit({ type: "error", pluginId: manifest.id, message: "Plugin already installed. Uninstall first to reinstall.", timestamp: Date.now() });
        return null;
      }

      // Store the plugin data
      const id = manifest.id;
      const installPath = `${this.pluginDir}/${id}`;
      const installed: InstalledPlugin = {
        id,
        manifest,
        installPath,
        installedAt: new Date().toISOString(),
        enabled: true,
      };

      // Store zip in localStorage for persistence (in Tauri, this would write to disk)
      try {
        const existing = JSON.parse(localStorage.getItem("aios-installed-plugins") || "[]");
        existing.push(installed);
        localStorage.setItem("aios-installed-plugins", JSON.stringify(existing));
        // Store the zip data
        const zipKey = `aios-plugin-zip-${id}`;
        const bytes = new Uint8Array(zipBuffer);
        const base64 = btoa(String.fromCharCode(...bytes));
        // Only store if small enough (< 5MB)
        if (base64.length < 5 * 1024 * 1024) {
          localStorage.setItem(zipKey, base64);
        }
      } catch (e) {
        console.warn("[PluginLoader] Could not persist plugin:", e);
      }

      this.installedPlugins.set(id, installed);

      this.emit({ type: "installed", pluginId: id, message: `"${manifest.name}" v${manifest.version} installed`, timestamp: Date.now() });

      // Auto-activate if enabled
      if (installed.enabled) {
        await this.activatePlugin(id);
      }

      return installed;
    } catch (e: any) {
      this.emit({ type: "error", pluginId: "unknown", message: `Install failed: ${e.message}`, timestamp: Date.now() });
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Extract manifest from zip buffer
  // -----------------------------------------------------------------------
  private async extractManifestFromZip(buffer: ArrayBuffer): Promise<PluginManifestFile | null> {
    // Simple ZIP parsing for manifest.json
    // In production, this would use a proper ZIP library (JSZip, etc.)
    try {
      const view = new DataView(buffer);
      const bytes = new Uint8Array(buffer);

      // Look for "manifest.json" in the ZIP entries (local file headers)
      const manifestStr = this.findFileInZip(bytes, "manifest.json");
      if (manifestStr) {
        return JSON.parse(manifestStr) as PluginManifestFile;
      }

      // Fallback: try to find it at the start of the buffer
      const text = new TextDecoder().decode(bytes.slice(0, Math.min(1024 * 1024, bytes.length)));
      const match = text.match(/\{[\s\S]*?"id"[\s\S]*?"name"[\s\S]*?\}/);
      if (match) {
        try {
          return JSON.parse(match[0]) as PluginManifestFile;
        } catch {}
      }
    } catch {}

    // If no manifest found, create a minimal one from the zip name
    return null;
  }

  // -----------------------------------------------------------------------
  // Simple ZIP entry finder (finds first file with matching name)
  // -----------------------------------------------------------------------
  private findFileInZip(bytes: Uint8Array, fileName: string): string | null {
    // ZIP local file header: PK\x03\x04
    let i = 0;
    while (i < bytes.length - 30) {
      // Check for PK\x03\x04 signature
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x03 && bytes[i + 3] === 0x04) {
        const compression = bytes[i + 8] | (bytes[i + 9] << 8);
        const nameLen = bytes[i + 26] | (bytes[i + 27] << 8);
        const extraLen = bytes[i + 28] | (bytes[i + 29] << 8);
        const nameStart = i + 30;
        const nameEnd = nameStart + nameLen;
        if (nameEnd <= bytes.length) {
          const name = new TextDecoder().decode(bytes.slice(nameStart, nameEnd));
          if (name === fileName || name.endsWith("/" + fileName)) {
            const dataStart = nameEnd + extraLen;
            // For stored (uncompressed) entries
            if (compression === 0) {
              // Read the central directory to get uncompressed size
              const dataEnd = this.findDataEnd(bytes, dataStart);
              if (dataEnd > dataStart) {
                return new TextDecoder().decode(bytes.slice(dataStart, Math.min(dataEnd, dataStart + 1024 * 1024)));
              }
              // Fallback: read until next header or end
              const nextHeader = this.findNextPK(bytes, dataStart);
              if (nextHeader > dataStart) {
                return new TextDecoder().decode(bytes.slice(dataStart, Math.min(nextHeader, dataStart + 1024 * 1024)));
              }
            }
            // For deflated entries, we can't easily decompress without a library
            // Return a placeholder
            return null;
          }
        }
        // Skip to next entry
        const skip = 30 + nameLen + extraLen;
        i += skip;
      } else {
        i++;
      }
    }
    return null;
  }

  private findDataEnd(bytes: Uint8Array, start: number): number {
    // Look for next PK\x03\x04 or PK\x01\x02 (central directory)
    for (let i = start + 1; i < bytes.length - 3; i++) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b) {
        const sig = bytes[i + 2] | (bytes[i + 3] << 8);
        if (sig === 0x0403 || sig === 0x0201 || sig === 0x0605) {
          return i;
        }
      }
    }
    return bytes.length;
  }

  private findNextPK(bytes: Uint8Array, start: number): number {
    for (let i = start + 1; i < bytes.length - 3; i++) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b) return i;
    }
    return bytes.length;
  }

  // -----------------------------------------------------------------------
  // Activate a plugin
  // -----------------------------------------------------------------------
  async activatePlugin(id: string): Promise<boolean> {
    const plugin = this.installedPlugins.get(id);
    if (!plugin) {
      this.emit({ type: "error", pluginId: id, message: "Plugin not found", timestamp: Date.now() });
      return false;
    }

    this.emit({ type: "activating", pluginId: id, message: `Activating "${plugin.manifest.name}"...`, timestamp: Date.now() });

    try {
      // Register the plugin in the plugin registry
      const meta: PluginMetadata = {
        manifest: this.convertToManifest(plugin.manifest),
        status: "active",
        installPath: plugin.installPath,
        installedAt: plugin.installedAt,
        enabled: plugin.enabled,
      };

      pluginRegistry.register(meta);

      this.emit({ type: "enabled", pluginId: id, message: `"${plugin.manifest.name}" activated`, timestamp: Date.now() });
      return true;
    } catch (e: any) {
      this.emit({ type: "error", pluginId: id, message: `Activation failed: ${e.message}`, timestamp: Date.now() });
      return false;
    }
  }

  // -----------------------------------------------------------------------
  // Deactivate a plugin
  // -----------------------------------------------------------------------
  async deactivatePlugin(id: string): Promise<boolean> {
    const plugin = this.installedPlugins.get(id);
    if (!plugin) return false;

    this.emit({ type: "deactivating", pluginId: id, message: `Deactivating "${plugin.manifest.name}"...`, timestamp: Date.now() });

    try {
      pluginRegistry.remove(id);
      this.activePluginApis.delete(id);

      this.emit({ type: "disabled", pluginId: id, message: `"${plugin.manifest.name}" deactivated`, timestamp: Date.now() });
      return true;
    } catch (e: any) {
      this.emit({ type: "error", pluginId: id, message: `Deactivation failed: ${e.message}`, timestamp: Date.now() });
      return false;
    }
  }

  // -----------------------------------------------------------------------
  // Uninstall a plugin
  // -----------------------------------------------------------------------
  async uninstallPlugin(id: string): Promise<boolean> {
    await this.deactivatePlugin(id);

    this.installedPlugins.delete(id);

    // Remove from localStorage
    try {
      const existing = JSON.parse(localStorage.getItem("aios-installed-plugins") || "[]");
      const filtered = existing.filter((p: InstalledPlugin) => p.id !== id);
      localStorage.setItem("aios-installed-plugins", JSON.stringify(filtered));
      localStorage.removeItem(`aios-plugin-zip-${id}`);
    } catch {}

    this.emit({ type: "uninstalled", pluginId: id, message: `Plugin "${id}" uninstalled`, timestamp: Date.now() });
    return true;
  }

  // -----------------------------------------------------------------------
  // Toggle enable/disable
  // -----------------------------------------------------------------------
  async togglePlugin(id: string, enabled: boolean): Promise<boolean> {
    const plugin = this.installedPlugins.get(id);
    if (!plugin) return false;

    plugin.enabled = enabled;

    try {
      const existing = JSON.parse(localStorage.getItem("aios-installed-plugins") || "[]");
      const idx = existing.findIndex((p: InstalledPlugin) => p.id === id);
      if (idx >= 0) {
        existing[idx].enabled = enabled;
        localStorage.setItem("aios-installed-plugins", JSON.stringify(existing));
      }
    } catch {}

    if (enabled) {
      return this.activatePlugin(id);
    } else {
      return this.deactivatePlugin(id);
    }
  }

  // -----------------------------------------------------------------------
  // Get all installed plugins
  // -----------------------------------------------------------------------
  getInstalled(): InstalledPlugin[] {
    return Array.from(this.installedPlugins.values());
  }

  getPlugin(id: string): InstalledPlugin | undefined {
    return this.installedPlugins.get(id);
  }

  // -----------------------------------------------------------------------
  // Convert to PluginInfo[] for store
  // -----------------------------------------------------------------------
  toPluginInfoList(): PluginInfo[] {
    return this.getInstalled().map((p) => ({
      id: p.id,
      name: p.manifest.name,
      description: p.manifest.description || "",
      installed: p.enabled,
      version: p.manifest.version,
      category: "system",
    }));
  }

  // -----------------------------------------------------------------------
  // Convert manifest file format to SDK format
  // -----------------------------------------------------------------------
  private convertToManifest(file: PluginManifestFile): PluginManifest {
    return {
      id: file.id,
      name: file.name,
      version: file.version,
      minHostVersion: file.minHostVersion,
      author: file.author,
      description: file.description,
      icon: file.icon,
      license: file.license,
      homepage: file.homepage,
      updateUrl: file.updateUrl,
      permissions: file.permissions?.map((p) => ({
        type: p.type,
        description: p.description,
        paths: p.paths,
        domains: p.domains,
      })) as any,
    };
  }
}

// Singleton
export const dynamicLoader = new DynamicPluginLoader();