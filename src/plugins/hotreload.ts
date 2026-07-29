export type HotReloadEvent = {
  type: "reloaded" | "error" | "skipped";
  pluginId: string;
  message: string;
  timestamp: number;
};

type HotReloadListener = (event: HotReloadEvent) => void;

class HotReloadManager {
  private listeners = new Set<HotReloadListener>();
  private enabled = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  start(pluginDirs: string[], pollMs = 2000): void {
    if (this.enabled) return;
    this.enabled = true;
    this.pollInterval = setInterval(() => {
      this.pollPlugins(pluginDirs);
    }, pollMs);
    this.emit({ type: "reloaded", pluginId: "system", message: "Hot-reload started, watching " + pluginDirs.length + " dir(s)", timestamp: Date.now() });
  }

  stop(): void {
    this.enabled = false;
    if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
  }

  isEnabled(): boolean { return this.enabled; }

  subscribe(listener: HotReloadListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  simulateChange(pluginId: string): void {
    if (!this.enabled) return;
    this.emit({ type: "reloaded", pluginId, message: "Plugin " + pluginId + " hot-reloaded", timestamp: Date.now() });
  }

  private pollPlugins(dirs: string[]): void {
    for (const dir of dirs) {
      this.emit({ type: "reloaded", pluginId: "watcher", message: "Polling " + dir + " - " + this.listeners.size + " listener(s)", timestamp: Date.now() });
    }
  }

  private emit(event: HotReloadEvent): void {
    for (const listener of this.listeners) {
      try { listener(event); } catch {}
    }
  }
}

export const hotReload = new HotReloadManager();