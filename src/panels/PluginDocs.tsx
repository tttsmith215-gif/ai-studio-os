// ---------------------------------------------------------------------------
// AI Studio OS — Plugin API Documentation Panel
// ---------------------------------------------------------------------------
// Auto-generated reference for the entire Plugin SDK API surface.
// Useful for plugin developers during development.
// ---------------------------------------------------------------------------

import { useState } from "react";

interface ApiSection {
  name: string;
  description: string;
  methods: ApiMethod[];
}

interface ApiMethod {
  name: string;
  signature: string;
  description: string;
  returns?: string;
  example?: string;
  permissionRequired?: string;
}

const apiDocs: ApiSection[] = [
  {
    name: "Plugin Manifest",
    description: "Every plugin ships a manifest.json in its root directory. This file describes the plugin, its entry point, version, and required permissions.",
    methods: [
      {
        name: "manifest.json",
        signature: `{
  "id": "com.example.my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "minHostVersion": "0.1.0",
  "author": "Your Name",
  "description": "Does something amazing",
  "icon": "icon.png",
  "license": "MIT",
  "entry": "index.js",
  "permissions": [
    { "type": "filesystem", "description": "Save exported files", "paths": ["~/Documents"] }
  ]
}`,
        description: "The manifest.json file sits at the root of your plugin directory or ZIP archive.",
        returns: "Required fields: id, name, version, minHostVersion",
      },
    ],
  },
  {
    name: "Host API: Store",
    description: "Read and write typed state shared across the host and other plugins.",
    methods: [
      { name: "host.store.get<T>(key)", signature: "host.store.get<T>(key: string): T | undefined", description: "Read a value from the shared store by key", returns: "The stored value or undefined", example: "const theme = host.store.get<string>('activeTheme')" },
      { name: "host.store.set<T>(key, value)", signature: "host.store.set<T>(key: string, value: T): void", description: "Write a value to the shared store", example: "host.store.set('mySetting', 'dark')" },
      { name: "host.store.subscribe(key, cb)", signature: "host.store.subscribe(key: string, cb: (value) => void): () => void", description: "Subscribe to changes on a store key", returns: "Unsubscribe function", example: "const unsub = host.store.subscribe('activeTheme', (v) => console.log(v))" },
      { name: "host.store.dispatch(action)", signature: "host.store.dispatch(action: { type: string, payload?: unknown }): void", description: "Dispatch a state action to the host reducer", example: "host.store.dispatch({ type: 'NAVIGATE', payload: 'dashboard' })" },
    ],
  },
  {
    name: "Host API: Panels",
    description: "Register custom UI panels that appear in the host sidebar and workspace.",
    methods: [
      { name: "host.panels.register(panel)", signature: "host.panels.register(panel: { id, label, icon?, component, position? }): void", description: "Register a custom panel in the host UI", example: "host.panels.register({ id: 'my-panel', label: 'My Panel', icon: '🧩', component: MyPanel, position: 'sidebar' })" },
      { name: "host.panels.unregister(id)", signature: "host.panels.unregister(id: string): void", description: "Remove a previously registered panel", example: "host.panels.unregister('my-panel')" },
      { name: "host.panels.open(id)", signature: "host.panels.open(id: string): void", description: "Programmatically open a panel", example: "host.panels.open('my-panel')" },
      { name: "host.panels.close(id)", signature: "host.panels.close(id: string): void", description: "Programmatically close a panel", example: "host.panels.close('my-panel')" },
    ],
  },
  {
    name: "Host API: Commands",
    description: "Register keyboard shortcuts and menu commands that users can discover via the command palette.",
    methods: [
      { name: "host.commands.register(cmd)", signature: "host.commands.register(cmd: { id, label, shortcut?, category?, execute }): void", description: "Register a command with optional keyboard shortcut", example: "host.commands.register({ id: 'my-plugin.action', label: 'Run Action', shortcut: 'Ctrl+Shift+A', execute: () => alert('Action!') })" },
      { name: "host.commands.unregister(id)", signature: "host.commands.unregister(id: string): void", description: "Remove a registered command", example: "host.commands.unregister('my-plugin.action')" },
      { name: "host.commands.invoke(id)", signature: "host.commands.invoke(id: string, ...args): void", description: "Invoke a command programmatically", example: "host.commands.invoke('my-plugin.action')" },
    ],
  },
  {
    name: "Host API: Notifications",
    description: "Show toast notifications to the user.",
    methods: [
      { name: "host.notifications.info(msg)", signature: "host.notifications.info(message: string, timeout?: number): string", description: "Show an info notification", returns: "Notification ID", example: "host.notifications.info('Processing complete')" },
      { name: "host.notifications.success(msg)", signature: "host.notifications.success(message: string, timeout?: number): string", description: "Show a success notification", returns: "Notification ID", example: "host.notifications.success('Export finished!')" },
      { name: "host.notifications.warning(msg)", signature: "host.notifications.warning(message: string, timeout?: number): string", description: "Show a warning notification", returns: "Notification ID", example: "host.notifications.warning('Disk space low')" },
      { name: "host.notifications.error(msg)", signature: "host.notifications.error(message: string, timeout?: number): string", description: "Show an error notification", returns: "Notification ID", example: "host.notifications.error('Render failed')" },
      { name: "host.notifications.dismiss(id)", signature: "host.notifications.dismiss(id: string): void", description: "Dismiss a notification by ID", example: "host.notifications.dismiss('notif-123')" },
    ],
  },
  {
    name: "Host API: Dialogs",
    description: "Show native file dialogs, confirmations, and prompts.",
    methods: [
      { name: "host.dialogs.openFile(opts)", signature: "host.dialogs.openFile(options?: { filters?, multiple? }): Promise<string[] | null>", description: "Open a native file picker dialog", returns: "Array of file paths or null", example: "const files = await host.dialogs.openFile({ filters: [{ name: 'Images', extensions: ['png', 'jpg'] }] })" },
      { name: "host.dialogs.saveFile(opts)", signature: "host.dialogs.saveFile(options?: { defaultName?, filters? }): Promise<string | null>", description: "Open a native save dialog", returns: "File path or null", example: "const path = await host.dialogs.saveFile({ defaultName: 'output.mp4' })" },
      { name: "host.dialogs.selectDirectory()", signature: "host.dialogs.selectDirectory(): Promise<string | null>", description: "Open a directory picker", returns: "Directory path or null" },
      { name: "host.dialogs.confirm(msg)", signature: "host.dialogs.confirm(message: string): Promise<boolean>", description: "Show a confirmation dialog", returns: "true if confirmed", example: "const ok = await host.dialogs.confirm('Delete this project?')" },
      { name: "host.dialogs.prompt(msg, default?)", signature: "host.dialogs.prompt(message: string, defaultValue?: string): Promise<string | null>", description: "Show a prompt dialog", returns: "Input value or null", example: "const name = await host.dialogs.prompt('Project name:', 'Untitled')" },
    ],
  },
  {
    name: "Host API: Filesystem",
    description: "Scoped file access that respects plugin permissions. Plugins can only access their own data directory and user-approved paths.",
    methods: [
      { name: "host.filesystem.readPluginFile(path)", signature: "host.filesystem.readPluginFile(path: string): Promise<Uint8Array>", description: "Read a file from the plugin's private data directory", permissionRequired: "filesystem", example: "const data = await host.filesystem.readPluginFile('config.json')" },
      { name: "host.filesystem.writePluginFile(path, data)", signature: "host.filesystem.writePluginFile(path: string, data: Uint8Array | string): Promise<void>", description: "Write a file to the plugin's private data directory", permissionRequired: "filesystem", example: "await host.filesystem.writePluginFile('output.mp4', buffer)" },
      { name: "host.filesystem.deletePluginFile(path)", signature: "host.filesystem.deletePluginFile(path: string): Promise<void>", description: "Delete a file from the plugin's data directory", permissionRequired: "filesystem" },
      { name: "host.filesystem.listPluginFiles(dir?)", signature: "host.filesystem.listPluginFiles(dir?: string): Promise<string[]>", description: "List files in the plugin's data directory", permissionRequired: "filesystem" },
      { name: "host.filesystem.getPluginDir()", signature: "host.filesystem.getPluginDir(): string", description: "Get the plugin's data directory path" },
    ],
  },
  {
    name: "Host API: AI",
    description: "Access the host's active AI provider for text generation, image generation, and streaming.",
    methods: [
      { name: "host.ai.generateText(req)", signature: "host.ai.generateText(request: { prompt, systemPrompt?, maxTokens?, temperature? }): Promise<string>", description: "Send a prompt to the active AI provider", permissionRequired: "ai", example: "const text = await host.ai.generateText({ prompt: 'Write a script', temperature: 0.8 })" },
      { name: "host.ai.generateTextStream(req, cb)", signature: "host.ai.generateTextStream(request, { onToken, onDone }): Promise<void>", description: "Stream a response from the AI provider token by token", permissionRequired: "ai" },
      { name: "host.ai.generateImage(req)", signature: "host.ai.generateImage(request: { prompt, width?, height? }): Promise<string[]>", description: "Generate images from a text prompt", permissionRequired: "ai", returns: "Array of data URIs" },
    ],
  },
  {
    name: "Host API: Events",
    description: "Pub/sub event system for cross-plugin and host communication.",
    methods: [
      { name: "host.events.on(event, handler)", signature: "host.events.on(event: string, handler: (data) => void): () => void", description: "Subscribe to an event", returns: "Unsubscribe function", example: "const unsub = host.events.on('project:opened', (p) => console.log(p))" },
      { name: "host.events.emit(event, data?)", signature: "host.events.emit(event: string, data?: unknown): void", description: "Emit an event to all subscribers", example: "host.events.emit('my-plugin:done', { result: 'ok' })" },
      { name: "host.events.once(event, handler)", signature: "host.events.once(event: string, handler: (data) => void): void", description: "Subscribe to one event firing only", example: "host.events.once('render:complete', () => notify())" },
    ],
  },
  {
    name: "Host API: Settings & Locale",
    description: "Read/write plugin settings and get locale information.",
    methods: [
      { name: "host.settings.get<T>(key)", signature: "host.settings.get<T>(key: string): T | undefined", description: "Read a plugin setting", example: "const apiKey = host.settings.get<string>('apiKey')" },
      { name: "host.settings.set<T>(key, value)", signature: "host.settings.set<T>(key: string, value: T): void", description: "Write a plugin setting (persisted by host)", example: "host.settings.set('theme', 'dark')" },
      { name: "host.locale.getLanguage()", signature: "host.locale.getLanguage(): string", description: "Get the current UI language code", returns: "e.g. 'en', 'de', 'ja'" },
      { name: "host.locale.t(key, params?)", signature: "host.locale.t(key: string, params?: Record<string, string>): string", description: "Translate a key using the host's i18n system", example: "host.locale.t('plugin.greeting', { name: 'World' })" },
    ],
  },
  {
    name: "Permission Types",
    description: "Permissions are declared in manifest.json and approved by the user at install time.",
    methods: [
      {
        name: "filesystem",
        signature: `{ type: "filesystem", description: string, paths?: string[] }`,
        description: "Access to the file system. Plugin-scoped by default; user-approved paths for broader access.",
        permissionRequired: "User approval required",
      },
      {
        name: "network",
        signature: `{ type: "network", description: string, domains?: string[] }`,
        description: "Network access to make HTTP requests. If domains are specified, only those domains are allowed.",
        permissionRequired: "User approval required",
      },
      {
        name: "ai",
        signature: `{ type: "ai", description: string }`,
        description: "Access to the host's AI provider (text generation, image generation).",
        permissionRequired: "User approval required",
      },
      {
        name: "clipboard",
        signature: `{ type: "clipboard", description: string }`,
        description: "Access to read and write the system clipboard.",
        permissionRequired: "User approval required",
      },
      {
        name: "native-shell",
        signature: `{ type: "native-shell", description: string }`,
        description: "Access to execute native shell commands. High-risk permission.",
        permissionRequired: "User approval required (high risk)",
      },
    ],
  },
  {
    name: "Extension Points",
    description: "Plugins can contribute to these extension points through their activate() hook.",
    methods: [
      { name: "apps", signature: "CreativeApp[]", description: "Register a new creative app workspace (Motion Studio, Video Editor, etc.)", example: "activate(host) { return { apps: [{ id: 'my-app', name: 'My App', component: MyWorkspace }] } }" },
      { name: "animations", signature: "AnimationProvider[]", description: "Provide animation presets and keyframe generators", example: "activate(host) { return { animations: [myAnimationProvider] } }" },
      { name: "themes", signature: "ThemeProvider[]", description: "Provide custom color themes for the host UI" },
      { name: "templates", signature: "TemplateProvider[]", description: "Provide project templates and asset templates" },
      { name: "aiProviders", signature: "AIProvider[]", description: "Register a custom AI provider (OpenAI-compatible)" },
      { name: "voiceProviders", signature: "VoiceProvider[]", description: "Register a text-to-speech or voice cloning provider" },
      { name: "renderEngines", signature: "RenderEngine[]", description: "Register a custom render engine for export" },
    ],
  },
  {
    name: "Sandbox & Security",
    description: "Untrusted plugins run in an isolated iframe sandbox. The sandbox limits API access based on granted permissions.",
    methods: [
      {
        name: "Sandbox Isolation",
        signature: "iframe[sandbox=\"allow-scripts allow-same-origin\"]",
        description: "Third-party plugins are loaded into a sandboxed iframe with a controlled API proxy. The plugin cannot access the DOM, host globals, or make network requests outside the proxy.",
      },
      {
        name: "Permission Enforcement",
        signature: "host.* methods are checked against granted permissions",
        description: "Every host.* method call from a sandboxed plugin is validated against the permissions the user approved at install time. Denied calls throw a PermissionDenied error.",
      },
      {
        name: "Trusted vs Untrusted",
        signature: "Trusted = verified author, Untrusted = community",
        description: "Official and verified plugins run in the same process with full API access. Community plugins are sandboxed by default. Plugin authors can apply for verified status.",
      },
    ],
  },
];

export function PluginDocs() {
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<string>(apiDocs[0].name);
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);

  const filtered = apiDocs.filter((section) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      section.name.toLowerCase().includes(q) ||
      section.description.toLowerCase().includes(q) ||
      section.methods.some((m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q))
    );
  });

  const activeContent = filtered.find((s) => s.name === activeSection) || filtered[0];

  return (
    <div className="panel-container" style={{ maxWidth: "none" }}>
      <div className="panel-header">
        <h1 className="panel-title">📖 Plugin API Reference</h1>
        <p className="panel-subtitle">
          Complete SDK documentation for developing AI Studio OS plugins
        </p>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-8 mb-20"
        style={{
          padding: "8px 14px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <span>🔍</span>
        <input
          placeholder="Search API docs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
          style={{ border: "none", background: "transparent", outline: "none", fontSize: 14, color: "var(--text-primary)" }}
        />
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        {/* Sidebar nav */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {filtered.map((section) => (
            <button
              key={section.name}
              className={`sidebar-item ${activeSection === section.name ? "active" : ""}`}
              onClick={() => setActiveSection(section.name)}
              style={{ fontSize: 12, padding: "6px 10px" }}
            >
              {section.name}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeContent && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                {activeContent.name}
              </h2>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  marginBottom: 24,
                }}
              >
                {activeContent.description}
              </p>

              <div className="flex-col gap-12">
                {activeContent.methods.map((method, idx) => {
                  const isExpanded = expandedMethod === method.name;
                  return (
                    <div
                      key={method.name + idx}
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-md)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        className="flex items-center justify-between"
                        style={{
                          padding: "12px 16px",
                          cursor: "pointer",
                          borderBottom: isExpanded ? "1px solid var(--border-color)" : "none",
                        }}
                        onClick={() =>
                          setExpandedMethod(isExpanded ? null : method.name)
                        }
                      >
                        <div className="flex items-center gap-8">
                          <code
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--accent)",
                              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                            }}
                          >
                            {method.name}
                          </code>
                          {method.permissionRequired && (
                            <span
                              className="badge badge-warning"
                              style={{ fontSize: 10 }}
                            >
                              {method.permissionRequired}
                            </span>
                          )}
                        </div>
                        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                          {isExpanded ? "▾" : "▸"}
                        </span>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: "12px 16px" }}>
                          <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 12, color: "var(--text-secondary)" }}>
                            {method.description}
                          </div>

                          <div
                            style={{
                              background: "var(--bg-primary)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "var(--radius-sm)",
                              padding: "10px 14px",
                              marginBottom: 8,
                              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                              fontSize: 12,
                              color: "var(--text-primary)",
                              overflowX: "auto",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {method.signature}
                          </div>

                          {method.returns && (
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Returns:</span> {method.returns}
                            </div>
                          )}

                          {method.example && (
                            <div
                              style={{
                                background: "rgba(108, 92, 231, 0.1)",
                                border: "1px solid rgba(108, 92, 231, 0.2)",
                                borderRadius: "var(--radius-sm)",
                                padding: "8px 12px",
                                fontSize: 12,
                                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                color: "var(--accent)",
                                marginTop: 8,
                              }}
                            >
                              {/* {method.example} */}
                              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Example: </span>
                              {method.example}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}