// ---------------------------------------------------------------------------
// AI Studio OS — Plugin SDK: Core Plugin Manifest & Lifecycle
// ---------------------------------------------------------------------------
// Every plugin exports a single PluginManifest as its default entry point.
// The host discovers plugins via the registry, validates their manifest,
// and calls lifecycle hooks at the appropriate times.
// ---------------------------------------------------------------------------

import type { CreativeApp } from "./app";
import type { AnimationProvider } from "./animations";
import type { ThemeProvider } from "./themes";
import type { TemplateProvider } from "./templates";
import type { AIProvider } from "./ai";
import type { VoiceProvider } from "./voice";
import type { CaptionEngine } from "./captions";
import type { TransitionProvider } from "./transitions";
import type { BackgroundProvider } from "./backgrounds";
import type { AssetProvider } from "./assets";
import type { RenderEngine } from "./rendering";
import type { HostAPI } from "./host";

// ---------------------------------------------------------------------------
// Extension points a plugin can contribute to.
// A plugin can contribute to multiple extension points.
// ---------------------------------------------------------------------------
export interface PluginContributions {
  apps?: CreativeApp[];
  animations?: AnimationProvider[];
  themes?: ThemeProvider[];
  templates?: TemplateProvider[];
  aiProviders?: AIProvider[];
  voiceProviders?: VoiceProvider[];
  captionEngines?: CaptionEngine[];
  transitions?: TransitionProvider[];
  backgrounds?: BackgroundProvider[];
  assetProviders?: AssetProvider[];
  renderEngines?: RenderEngine[];
}

// ---------------------------------------------------------------------------
// Plugin manifest — the single export every plugin package must provide.
// ---------------------------------------------------------------------------
export interface PluginManifest {
  /** Unique reverse-domain ID, e.g. "com.example.my-plugin" */
  id: string;
  /** Human-readable name */
  name: string;
  /** SemVer */
  version: string;
  /** Minimum host version required */
  minHostVersion: string;
  /** Author / maintainer */
  author?: string;
  /** Short description */
  description?: string;
  /** Optional icon path (relative to plugin root) */
  icon?: string;
  /** Optional license identifier */
  license?: string;
  /** Optional URL for docs/support */
  homepage?: string;
  /** URL where updates are fetched */
  updateUrl?: string;
  /** Permissions the plugin requests (shown to user at install time) */
  permissions?: PluginPermission[];

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------
  /** Called once after plugin is loaded and validated. Receives the host API. */
  activate?(host: HostAPI): PluginContributions | Promise<PluginContributions>;
  /** Called when the user disables or uninstalls the plugin. Cleanup. */
  deactivate?(): void | Promise<void>;
  /** Called after all plugins have activated. Good for cross-plugin wiring. */
  onReady?(): void | Promise<void>;
  /** Called when host settings change (passes the diff). */
  onSettingsChanged?(diff: Record<string, unknown>): void;
}

// ---------------------------------------------------------------------------
// Permissions — shown to the user at install time, enforced at runtime.
// ---------------------------------------------------------------------------
export type PluginPermission =
  | { type: "filesystem"; description: string; paths?: string[] }
  | { type: "network"; description: string; domains?: string[] }
  | { type: "ai"; description: string }
  | { type: "voice"; description: string }
  | { type: "clipboard"; description: string }
  | { type: "native-shell"; description: string }
  | { type: "custom"; id: string; description: string };

// ---------------------------------------------------------------------------
// Plugin status — host tracks every plugin through its lifecycle.
// ---------------------------------------------------------------------------
export type PluginStatus =
  | "discovered"
  | "loading"
  | "loaded"
  | "activating"
  | "active"
  | "error"
  | "disabled"
  | "uninstalling";

// ---------------------------------------------------------------------------
// Plugin metadata — what the host stores about an installed plugin.
// ---------------------------------------------------------------------------
export interface PluginMetadata {
  manifest: PluginManifest;
  status: PluginStatus;
  error?: string;
  installPath: string;
  installedAt: string; // ISO date
  enabled: boolean;
  /** Cached contributions (populated after activation) */
  contributions?: PluginContributions;
}