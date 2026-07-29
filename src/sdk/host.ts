// ---------------------------------------------------------------------------
// AI Studio OS — Plugin SDK: Host API
// ---------------------------------------------------------------------------
// The HostAPI is the bridge between plugins and the host application.
// It is the ONLY way plugins interact with the host. This keeps the
// boundary clean and makes the host replaceable.
//
// The host provides a HostAPI instance to every plugin's activate() hook.
// ---------------------------------------------------------------------------

import type { ComponentType } from "react";

// =========================================================================
// 1. STORE — read/write typed state
// =========================================================================
export interface HostStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  subscribe<T>(key: string, callback: (value: T) => void): () => void;
  dispatch(action: { type: string; payload?: unknown }): void;
}

// =========================================================================
// 2. PANELS — register custom panels in the host UI
// =========================================================================
export interface HostPanels {
  register(panel: {
    id: string;
    label: string;
    icon?: string;
    component: ComponentType;
    position?: "sidebar" | "topbar" | "float";
  }): void;
  unregister(id: string): void;
  open(id: string): void;
  close(id: string): void;
}

// =========================================================================
// 3. COMMANDS — register and invoke commands (keyboard shortcuts, menus)
// =========================================================================
export interface HostCommands {
  register(command: {
    id: string;
    label: string;
    shortcut?: string;
    category?: string;
    execute: (...args: unknown[]) => void;
  }): void;
  unregister(id: string): void;
  invoke(id: string, ...args: unknown[]): void;
  getAll(): { id: string; label: string; shortcut?: string }[];
}

// =========================================================================
// 4. NOTIFICATIONS — show toast/notification to the user
// =========================================================================
export interface HostNotifications {
  info(message: string, timeout?: number): string;
  success(message: string, timeout?: number): string;
  warning(message: string, timeout?: number): string;
  error(message: string, timeout?: number): string;
  dismiss(id: string): void;
}

// =========================================================================
// 5. DIALOGS — native file dialogs, confirmations, prompts
// =========================================================================
export interface HostDialogs {
  openFile(options?: {
    filters?: { name: string; extensions: string[] }[];
    multiple?: boolean;
  }): Promise<string[] | null>;
  saveFile(options?: {
    defaultName?: string;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<string | null>;
  selectDirectory(): Promise<string | null>;
  confirm(message: string): Promise<boolean>;
  prompt(message: string, defaultValue?: string): Promise<string | null>;
}

// =========================================================================
// 6. FILESYSTEM — scoped file access (respecting permissions)
// =========================================================================
export interface HostFilesystem {
  /** Read a file from the plugin's own data directory */
  readPluginFile(path: string): Promise<Uint8Array>;
  /** Write a file to the plugin's own data directory */
  writePluginFile(path: string, data: Uint8Array | string): Promise<void>;
  /** Delete a file from the plugin's data directory */
  deletePluginFile(path: string): Promise<void>;
  /** List files in the plugin's data directory */
  listPluginFiles(dir?: string): Promise<string[]>;
  /** Read a file the user selected (requires permission) */
  readUserFile(path: string): Promise<Uint8Array>;
  /** Get the plugin's data directory path */
  getPluginDir(): string;
}

// =========================================================================
// 7. PROJECTS — read/write the current project
// =========================================================================
export interface HostProjects {
  getCurrent(): Record<string, unknown> | null;
  updateCurrent(patch: Record<string, unknown>): void;
  onSave(callback: (project: Record<string, unknown>) => void): () => void;
  list(): Promise<{ id: string; name: string; updatedAt: string }[]>;
}

// =========================================================================
// 8. AI — access the active AI provider
// =========================================================================
export interface HostAI {
  /** Get the currently active AI provider */
  getActiveProvider(): { id: string; model: string } | null;
  /** Send a prompt to the active provider */
  generateText(request: {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string>;
  /** Send a prompt and stream the response */
  generateTextStream(
    request: { prompt: string; systemPrompt?: string; maxTokens?: number },
    callbacks: { onToken: (t: string) => void; onDone: () => void },
  ): Promise<void>;
  /** Generate an image */
  generateImage(request: {
    prompt: string;
    width?: number;
    height?: number;
  }): Promise<string[]>; // returns data URIs
}

// =========================================================================
// 9. SETTINGS — read/write plugin settings (persisted by the host)
// =========================================================================
export interface HostSettings {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  getAll(): Record<string, unknown>;
  onChanged(callback: (diff: Record<string, unknown>) => void): () => void;
}

// =========================================================================
// 10. LOCALE — i18n helpers
// =========================================================================
export interface HostLocale {
  /** Current language code */
  getLanguage(): string;
  /** Translate a key */
  t(key: string, params?: Record<string, string>): string;
}

// =========================================================================
// 11. EVENTS — pub/sub for cross-plugin and host communication
// =========================================================================
export interface HostEvents {
  on(event: string, handler: (data: unknown) => void): () => void;
  emit(event: string, data?: unknown): void;
  once(event: string, handler: (data: unknown) => void): void;
}

// =========================================================================
// 12. IPC — direct Tauri backend calls (advanced use)
// =========================================================================
export interface HostIPC {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
  listen<T>(event: string, handler: (event: T) => void): () => void;
}

// =========================================================================
// 13. EXPORT — programmatic rendering/export
// =========================================================================
export interface HostExport {
  /** Queue a render job */
  queue(job: {
    composition: Record<string, unknown>;
    format: string;
    outputPath: string;
  }): Promise<string>; // returns job ID
  /** Get render queue status */
  getQueue(): { id: string; status: string; progress: number }[];
  /** Cancel a render job */
  cancel(jobId: string): void;
}

// =========================================================================
// COMPLETE HOST API
// =========================================================================
export interface HostAPI {
  readonly pluginId: string;
  readonly hostVersion: string;
  readonly platform: "windows" | "macos" | "linux" | "web";

  store: HostStore;
  panels: HostPanels;
  commands: HostCommands;
  notifications: HostNotifications;
  dialogs: HostDialogs;
  filesystem: HostFilesystem;
  projects: HostProjects;
  ai: HostAI;
  settings: HostSettings;
  locale: HostLocale;
  events: HostEvents;
  ipc: HostIPC;
  export: HostExport;
}