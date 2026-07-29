import { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { TitleBar } from "./components/TitleBar";
import { CommandPalette } from "./components/CommandPalette";
import { Dashboard } from "./panels/Dashboard";
import { Projects } from "./panels/Projects";
import { Templates } from "./panels/Templates";
import { ThemeLibrary } from "./panels/ThemeLibrary";
import { AnimationLibrary } from "./panels/AnimationLibrary";
import { AssetLibrary } from "./panels/AssetLibrary";
import { PromptLibrary } from "./panels/PromptLibrary";
import { AIAgents } from "./panels/AIAgents";
import { Settings } from "./panels/Settings";
import { RenderQueue } from "./panels/RenderQueue";
import { ExportManager } from "./panels/ExportManager";
import { PluginManager } from "./panels/PluginManager";
import { UpdateManager } from "./panels/UpdateManager";
import { ConsoleLogs } from "./panels/Console";
import { StoreProvider, useStore } from "./store/context";
import { shortcuts, registerDefaultShortcuts } from "./shortcuts";
import { hotReload } from "./plugins/hotreload";
import { AutoSaveManager, type AutoSaveStatus, getAutoSaveStatus } from "./autosave";
import { pluginRegistry } from "./plugins/registry";
import "./styles/globals.css";

const panelMap: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  projects: Projects,
  templates: Templates,
  "theme-library": ThemeLibrary,
  "animation-library": AnimationLibrary,
  "asset-library": AssetLibrary,
  "prompt-library": PromptLibrary,
  "ai-agents": AIAgents,
  settings: Settings,
  "render-queue": RenderQueue,
  "export-manager": ExportManager,
  "plugin-manager": PluginManager,
  "update-manager": UpdateManager,
  console: ConsoleLogs,
};

pluginRegistry.extension.apps.forEach((app) => {
  panelMap[app.id] = app.component;
});

const panelTitles: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  templates: "Templates",
  "theme-library": "Theme Library",
  "animation-library": "Animation Library",
  "asset-library": "Asset Library",
  "prompt-library": "Prompt Library",
  "ai-agents": "AI Agents",
  settings: "Settings",
  "render-queue": "Render Queue",
  "export-manager": "Export Manager",
  "plugin-manager": "Plugin Manager",
  "update-manager": "Update Manager",
  console: "Console / Logs",
};

function AppShell() {
  const { state, dispatch } = useStore();
  const [activePanel, setActivePanel] = useState("dashboard");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMode, setPaletteMode] = useState<"commands" | "quickOpen">("commands");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [hotReloadEvent, setHotReloadEvent] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>({ dirty: false, saving: false, lastSaveSec: 0, active: false });
  const autoSaveRef = useRef<AutoSaveManager | null>(null);

  const Panel = panelMap[activePanel] || Dashboard;

  // Initialize keyboard shortcuts
  useEffect(() => {
    const handleShortcutAction = (action: string) => {
      switch (action) {
        case "palette.commands":
          setPaletteMode("commands");
          setPaletteOpen(true);
          break;
        case "palette.quickOpen":
          setPaletteMode("quickOpen");
          setPaletteOpen(true);
          break;
        case "settings.open":
          setActivePanel("settings");
          break;
        case "console.toggle":
          setActivePanel((prev) => prev === "console" ? "dashboard" : "console");
          break;
        case "sidebar.toggle":
          setSidebarVisible((v) => !v);
          break;
        case "theme.dark":
          dispatch({ type: "THEME_SET", theme: "dark" });
          break;
        case "theme.light":
          dispatch({ type: "THEME_SET", theme: "light" });
          break;
        case "fullscreen.toggle":
          document.fullscreenElement
            ? document.exitFullscreen()
            : document.documentElement.requestFullscreen();
          break;
        case "project.save":
          autoSaveRef.current?.flush();
          break;
        case "project.create":
          setActivePanel("projects");
          break;
        case "project.open":
          setActivePanel("projects");
          break;
        case "export.render":
          setActivePanel("render-queue");
          break;
        case "navigate.dashboard":
          setActivePanel("dashboard");
          break;
        case "navigate.projects":
          setActivePanel("projects");
          break;
        case "navigate.settings":
          setActivePanel("settings");
          break;
        case "navigate.templates":
          setActivePanel("templates");
          break;
        case "navigate.assets":
          setActivePanel("asset-library");
          break;
        case "navigate.themes":
          setActivePanel("theme-library");
          break;
        case "navigate.plugins":
          setActivePanel("plugin-manager");
          break;
        case "navigate.queue":
          setActivePanel("render-queue");
          break;
      }
    };

    registerDefaultShortcuts(handleShortcutAction);
    const unsub = shortcuts.subscribe(handleShortcutAction);
    const handler = (e: KeyboardEvent) => shortcuts.handleKeyEvent(e);
    window.addEventListener("keydown", handler);
    return () => {
      unsub();
      window.removeEventListener("keydown", handler);
    };
  }, [dispatch]);

  // Initialize auto-save
  useEffect(() => {
    if (!state.settings.autosave) return;
    const manager = new AutoSaveManager({
      interval: state.settings.autosaveInterval,
      onSave: async (data) => {
        localStorage.setItem("aios-autosave", data);
      },
      onSaved: () => {
        setAutoSaveStatus(getAutoSaveStatus(manager));
      },
      onError: (err) => {
        console.error("[AutoSave]", err.message);
      },
    });
    manager.start();
    autoSaveRef.current = manager;
    const statusInterval = setInterval(() => {
      setAutoSaveStatus(getAutoSaveStatus(manager));
    }, 1000);
    return () => {
      manager.stop();
      clearInterval(statusInterval);
    };
  }, [state.settings.autosave, state.settings.autosaveInterval]);

  // Initialize hot-reload
  useEffect(() => {
    const unsub = hotReload.subscribe((event) => {
      const msg = `[${new Date(event.timestamp).toLocaleTimeString()}] ${event.message}`;
      setHotReloadEvent(msg);
      setTimeout(() => setHotReloadEvent(null), 4000);
    });
    hotReload.start(["plugins/user", "plugins/built-in"], 3000);
    return () => {
      unsub();
      hotReload.stop();
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const next = state.activeTheme === "dark" ? "light" : "dark";
    dispatch({ type: "THEME_SET", theme: next });
  }, [state.activeTheme, dispatch]);

  const openCommandPalette = useCallback(() => {
    setPaletteMode("commands");
    setPaletteOpen(true);
  }, []);

  const autoSaveLabel = autoSaveStatus.saving
    ? "Saving..." : autoSaveStatus.dirty
      ? "Unsaved changes" : "All changes saved";

  const autoSaveClass = autoSaveStatus.saving
    ? "autosave-indicator saving" : !autoSaveStatus.dirty
      ? "autosave-indicator saved" : "autosave-indicator";

  return (
    <div className="app-layout flex-col">
      <TitleBar
        title="AI Studio OS"
        theme={state.activeTheme}
        onThemeToggle={toggleTheme}
        onOpenCommandPalette={openCommandPalette}
      />

      {hotReloadEvent && (
        <div className="hotreload-banner">
          {" "}{hotReloadEvent}
          <span className="hotreload-banner-dismiss" onClick={() => setHotReloadEvent(null)}>x</span>
        </div>
      )}

      <div className="flex flex-1" style={{ minHeight: 0 }}>
        {sidebarVisible && <Sidebar />}
        <main className="main-area">
          <div className="topbar">
            <div className="topbar-left">
              <span className="topbar-breadcrumb">AI Studio OS</span>
              <span style={{ color: "var(--text-muted)" }}>/</span>
              <span className="topbar-title">{panelTitles[activePanel] || activePanel}</span>
            </div>
            <div className="topbar-right">
              <span className={autoSaveClass}>
                {autoSaveStatus.saving && <span className="autosave-dot" />}
                {autoSaveLabel}
              </span>
              <button className="topbar-btn" onClick={openCommandPalette} title="Commands (Ctrl+Shift+P)">cmd</button>
              <button className="topbar-btn" onClick={toggleTheme} title="Toggle theme">
                {state.activeTheme === "dark" ? "sun" : "moon"}
              </button>
            </div>
          </div>
          <div className="content-area">
            <Panel />
          </div>
        </main>
      </div>

      {paletteOpen && (
        <CommandPalette onClose={() => setPaletteOpen(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}