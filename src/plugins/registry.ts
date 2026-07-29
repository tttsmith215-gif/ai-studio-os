// ---------------------------------------------------------------------------
// AI Studio OS — Plugin Registry
// ---------------------------------------------------------------------------
// The registry is the single source of truth for all contributed
// extension points. Plugins register through the HostAPI; the host
// queries the registry to discover what's available.
//
// Every extension point is a Map<string, T> so multiple plugins can
// contribute the same type of thing. The last registration wins on ID
// collision (the host warns the user).
// ---------------------------------------------------------------------------

import type { PluginManifest, PluginMetadata, PluginContributions, PluginStatus } from "../sdk/plugin";
import type { CreativeApp } from "../sdk/app";
import type { AnimationProvider } from "../sdk/animations";
import type { ThemeProvider } from "../sdk/themes";
import type { TemplateProvider } from "../sdk/templates";
import type { AIProvider } from "../sdk/ai";
import type { VoiceProvider } from "../sdk/voice";
import type { CaptionEngine } from "../sdk/captions";
import type { TransitionProvider } from "../sdk/transitions";
import type { BackgroundProvider } from "../sdk/backgrounds";
import type { AssetProvider } from "../sdk/assets";
import type { RenderEngine } from "../sdk/rendering";

// =========================================================================
// Extension Point Registries
// =========================================================================
type ExtensionPointMap<T extends { id: string }> = Map<string, T & { pluginId: string }>;

export class ExtensionRegistry {
  readonly apps: ExtensionPointMap<CreativeApp> = new Map();
  readonly animations: ExtensionPointMap<AnimationProvider> = new Map();
  readonly themes: ExtensionPointMap<ThemeProvider> = new Map();
  readonly templates: ExtensionPointMap<TemplateProvider> = new Map();
  readonly aiProviders: ExtensionPointMap<AIProvider> = new Map();
  readonly voiceProviders: ExtensionPointMap<VoiceProvider> = new Map();
  readonly captionEngines: ExtensionPointMap<CaptionEngine> = new Map();
  readonly transitions: ExtensionPointMap<TransitionProvider> = new Map();
  readonly backgrounds: ExtensionPointMap<BackgroundProvider> = new Map();
  readonly assetProviders: ExtensionPointMap<AssetProvider> = new Map();
  readonly renderEngines: ExtensionPointMap<RenderEngine> = new Map();

  register<T extends { id: string }>(
    map: ExtensionPointMap<T>,
    pluginId: string,
    item: T,
  ): void {
    map.set(item.id, { ...item, pluginId });
  }

  unregister<T extends { id: string }>(
    map: ExtensionPointMap<T>,
    id: string,
  ): void {
    map.delete(id);
  }

  unregisterAllByPlugin(pluginId: string): void {
    const allMaps = [
      this.apps, this.animations, this.themes, this.templates,
      this.aiProviders, this.voiceProviders, this.captionEngines,
      this.transitions, this.backgrounds, this.assetProviders, this.renderEngines,
    ];
    for (const map of allMaps) {
      for (const [key, value] of map) {
        if (value.pluginId === pluginId) map.delete(key);
      }
    }
  }
}

// =========================================================================
// Plugin Metadata Registry
// =========================================================================
export class PluginRegistry {
  readonly plugins = new Map<string, PluginMetadata>();
  readonly extension = new ExtensionRegistry();

  register(meta: PluginMetadata): void {
    this.plugins.set(meta.manifest.id, meta);
  }

  get(id: string): PluginMetadata | undefined {
    return this.plugins.get(id);
  }

  getAll(): PluginMetadata[] {
    return Array.from(this.plugins.values());
  }

  getByStatus(status: PluginStatus): PluginMetadata[] {
    return this.getAll().filter((p) => p.status === status);
  }

  getEnabled(): PluginMetadata[] {
    return this.getAll().filter((p) => p.enabled);
  }

  setStatus(id: string, status: PluginStatus, error?: string): void {
    const meta = this.plugins.get(id);
    if (meta) {
      meta.status = status;
      if (error) meta.error = error;
    }
  }

  setEnabled(id: string, enabled: boolean): void {
    const meta = this.plugins.get(id);
    if (meta) meta.enabled = enabled;
  }

  remove(id: string): void {
    this.extension.unregisterAllByPlugin(id);
    this.plugins.delete(id);
  }

  /** Register a plugin's contributions into the extension registry */
  applyContributions(pluginId: string, contributions: PluginContributions): void {
    const tag = (id: string) => ({ pluginId });

    contributions.apps?.forEach((a) => this.extension.register(this.extension.apps, pluginId, a));
    contributions.animations?.forEach((a) => this.extension.register(this.extension.animations, pluginId, a));
    contributions.themes?.forEach((t) => this.extension.register(this.extension.themes, pluginId, t));
    contributions.templates?.forEach((t) => this.extension.register(this.extension.templates, pluginId, t));
    contributions.aiProviders?.forEach((a) => this.extension.register(this.extension.aiProviders, pluginId, a));
    contributions.voiceProviders?.forEach((v) => this.extension.register(this.extension.voiceProviders, pluginId, v));
    contributions.captionEngines?.forEach((c) => this.extension.register(this.extension.captionEngines, pluginId, c));
    contributions.transitions?.forEach((t) => this.extension.register(this.extension.transitions, pluginId, t));
    contributions.backgrounds?.forEach((b) => this.extension.register(this.extension.backgrounds, pluginId, b));
    contributions.assetProviders?.forEach((a) => this.extension.register(this.extension.assetProviders, pluginId, a));
    contributions.renderEngines?.forEach((r) => this.extension.register(this.extension.renderEngines, pluginId, r));
  }
}

// Singleton
export const pluginRegistry = new PluginRegistry();