# AI Studio OS — Plugin SDK

Build plugins for AI Studio OS using the Plugin SDK.

## Quick Start

```json
{
  "id": "com.yourname.my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "minHostVersion": "0.1.0",
  "author": "Your Name",
  "description": "Does something amazing",
  "entry": "index.js",
  "permissions": [
    { "type": "filesystem", "description": "Save exported files" }
  ]
}
```

## Manifest Format

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Reverse-domain ID, e.g. `com.example.my-plugin` |
| `name` | string | ✅ | Human-readable name (max 64 chars) |
| `version` | string | ✅ | SemVer, e.g. `1.0.0` |
| `minHostVersion` | string | ✅ | Minimum host version required |
| `author` | string | - | Plugin author/creator |
| `description` | string | - | Short description (max 256 chars) |
| `icon` | string | - | Icon path relative to plugin root |
| `license` | string | - | SPDX license identifier |
| `homepage` | string | - | URL for docs/support |
| `updateUrl` | string | - | URL where updates are fetched |
| `repository` | string | - | Source code repository URL |
| `keywords` | string[] | - | Search keywords (max 20) |
| `entry` | string | - | Entry JS file (default: `index.js`) |
| `permissions` | array | - | Permissions the plugin requests |
| `settingsSchema` | object | - | JSON Schema for plugin settings |

## Host API

Plugins receive a `HostAPI` object in their `activate()` hook. The API is organized into namespaces:

### store — State Management
```typescript
host.store.get<T>(key: string): T | undefined
host.store.set<T>(key: string, value: T): void
host.store.subscribe<T>(key: string, cb: (value: T) => void): () => void
host.store.dispatch(action: { type: string; payload?: unknown }): void
```

### panels — UI Registration
```typescript
host.panels.register(panel: {
  id: string;
  label: string;
  icon?: string;
  component: ComponentType;
  position?: "sidebar" | "topbar" | "float";
}): void
host.panels.unregister(id: string): void
host.panels.open(id: string): void
host.panels.close(id: string): void
```

### commands — Keyboard Shortcuts & Menus
```typescript
host.commands.register(command: {
  id: string;
  label: string;
  shortcut?: string;
  category?: string;
  execute: (...args: unknown[]) => void;
}): void
host.commands.unregister(id: string): void
host.commands.invoke(id: string, ...args: unknown[]): void
```

### notifications — Toast Notifications
```typescript
host.notifications.info(message: string, timeout?: number): string
host.notifications.success(message: string, timeout?: number): string
host.notifications.warning(message: string, timeout?: number): string
host.notifications.error(message: string, timeout?: number): string
host.notifications.dismiss(id: string): void
```

### dialogs — Native Dialogs
```typescript
host.dialogs.openFile(options?: { filters?, multiple? }): Promise<string[] | null>
host.dialogs.saveFile(options?: { defaultName?, filters? }): Promise<string | null>
host.dialogs.selectDirectory(): Promise<string | null>
host.dialogs.confirm(message: string): Promise<boolean>
host.dialogs.prompt(message: string, defaultValue?: string): Promise<string | null>
```

### filesystem — Scoped File Access
```typescript
host.filesystem.readPluginFile(path: string): Promise<Uint8Array>
host.filesystem.writePluginFile(path: string, data: Uint8Array | string): Promise<void>
host.filesystem.deletePluginFile(path: string): Promise<void>
host.filesystem.listPluginFiles(dir?: string): Promise<string[]>
host.filesystem.readUserFile(path: string): Promise<Uint8Array>  // requires permission
host.filesystem.getPluginDir(): string
```

### ai — AI Provider Access
```typescript
host.ai.getActiveProvider(): { id: string; model: string } | null
host.ai.generateText(request: {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string>
host.ai.generateTextStream(request, callbacks: { onToken, onDone }): Promise<void>
host.ai.generateImage(request: { prompt: string; width?, height? }): Promise<string[]>
```

### projects — Project Access
```typescript
host.projects.getCurrent(): Record<string, unknown> | null
host.projects.updateCurrent(patch: Record<string, unknown>): void
host.projects.onSave(callback: (project) => void): () => void
host.projects.list(): Promise<{ id: string; name: string; updatedAt: string }[]>
```

### events — Pub/Sub
```typescript
host.events.on(event: string, handler: (data) => void): () => void
host.events.emit(event: string, data?: unknown): void
host.events.once(event: string, handler: (data) => void): void
```

### settings — Plugin Settings
```typescript
host.settings.get<T>(key: string): T | undefined
host.settings.set<T>(key: string, value: T): void
host.settings.getAll(): Record<string, unknown>
host.settings.onChanged(callback: (diff) => void): () => void
```

### locale — Internationalization
```typescript
host.locale.getLanguage(): string
host.locale.t(key: string, params?: Record<string, string>): string
```

## Extension Points

Plugins contribute to the host through these extension points, returned from `activate()`:

```typescript
interface PluginContributions {
  apps?: CreativeApp[];           // Register a workspace app
  animations?: AnimationProvider[]; // Animation presets/generators
  themes?: ThemeProvider[];       // Custom color themes
  templates?: TemplateProvider[]; // Project templates
  aiProviders?: AIProvider[];     // AI model provider
  voiceProviders?: VoiceProvider[]; // TTS/voice cloning
  captionEngines?: CaptionEngine[]; // Caption generation
  transitions?: TransitionProvider[]; // Video transitions
  backgrounds?: BackgroundProvider[]; // Background effects
  assetProviders?: AssetProvider[]; // Asset library integrations
  renderEngines?: RenderEngine[]; // Custom export renderers
}
```

## Permissions

Declared in `manifest.json` and approved by the user at install time:

| Permission | Controls | Risk Level |
|-----------|----------|------------|
| `filesystem` | File read/write in plugin directory and user-approved paths | High |
| `network` | HTTP requests to specified domains | Medium |
| `ai` | AI text/image generation | Low |
| `voice` | TTS and voice cloning | Low |
| `clipboard` | System clipboard access | Medium |
| `native-shell` | Shell command execution | High |

## Lifecycle

```typescript
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  minHostVersion: string;
  permissions?: PluginPermission[];

  // Called once after plugin is loaded and validated
  activate?(host: HostAPI): PluginContributions | Promise<PluginContributions>;

  // Called when the user disables or uninstalls the plugin
  deactivate?(): void | Promise<void>;

  // Called after all plugins have activated
  onReady?(): void | Promise<void>;

  // Called when host settings change
  onSettingsChanged?(diff: Record<string, unknown>): void;
}
```

## Sandbox

Untrusted (community) plugins run in an isolated iframe sandbox:

- `allow-scripts allow-same-origin` sandbox attributes
- Host API is proxied through `postMessage`
- Each API call is validated against granted permissions
- Plugin cannot access host globals, DOM, or make network requests outside the proxy
- Verified plugins can request full process access

## Distribution

Package your plugin as a `.zip` file with `manifest.json` at the root:

```
my-plugin.zip
├── manifest.json
├── index.js
├── icon.png
└── assets/
    └── ...
```

Users can drag-and-drop the `.zip` into the App Store to install.