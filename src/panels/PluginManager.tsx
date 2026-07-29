// ---------------------------------------------------------------------------
// AI Studio OS — Plugin Manager
// ---------------------------------------------------------------------------
// Manage installed plugins: enable/disable, uninstall, view permissions,
// configure settings, and toggle hot-reload.
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";
import { hotReload } from "../plugins/hotreload";
import { dynamicLoader, type InstalledPlugin } from "../plugins/dynamic-loader";
import { permissionManager } from "../plugins/permissions";
import { useStore } from "../store/context";

export function PluginManager() {
  const { state, dispatch } = useStore();
  const [hotReloadActive, setHotReloadActive] = useState(false);
  const [reloadLog, setReloadLog] = useState<string[]>([]);
  const [userPlugins, setUserPlugins] = useState<InstalledPlugin[]>([]);
  const [tab, setTab] = useState<"builtin" | "user" | "permissions">("builtin");
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);

  useEffect(() => {
    setHotReloadActive(hotReload.isEnabled());
    const unsub = hotReload.subscribe((event) => {
      setReloadLog((prev) => [`[${new Date(event.timestamp).toLocaleTimeString()}] ${event.message}`, ...prev].slice(0, 50));
    });
    return unsub;
  }, []);

  // Load user-installed plugins
  useEffect(() => {
    setUserPlugins(dynamicLoader.getInstalled());
  }, []);

  const toggleHotReload = () => {
    if (hotReload.isEnabled()) {
      hotReload.stop();
      setHotReloadActive(false);
    } else {
      hotReload.start(["plugins/user", "plugins/built-in"], 3000);
      setHotReloadActive(true);
    }
  };

  const togglePlugin = (id: string) => {
    dispatch({ type: "PLUGIN_TOGGLE", id });
  };

  const handleUninstall = async (id: string) => {
    await dynamicLoader.uninstallPlugin(id);
    setUserPlugins(dynamicLoader.getInstalled());
    dispatch({ type: "NOTIFY", id: `uninstall-${id}`, message: `Plugin "${id}" uninstalled`, level: "info" });
  };

  const handleToggleUserPlugin = async (id: string, enabled: boolean) => {
    await dynamicLoader.togglePlugin(id, enabled);
    setUserPlugins(dynamicLoader.getInstalled());
  };

  const selectedUserPlugin = selectedPlugin
    ? userPlugins.find((p) => p.id === selectedPlugin)
    : null;

  return (
    <div className="panel-container">
      <div className="panel-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 className="panel-title">⚙️ Plugin Manager</h1>
          <p className="panel-subtitle">Install, manage, and configure plugins</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Hot-Reload</span>
          <label className="toggle" style={{ position: "relative", display: "inline-block", width: 36, height: 20 }}>
            <input type="checkbox" checked={hotReloadActive} onChange={toggleHotReload} style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{ position: "absolute", inset: 0, background: hotReloadActive ? "var(--success)" : "var(--bg-active)", borderRadius: 10, transition: "all var(--transition)", cursor: "pointer" }}>
              <span style={{ position: "absolute", left: hotReloadActive ? 18 : 2, top: 2, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "all var(--transition)" }} />
            </span>
          </label>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-8 mb-16" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
        <button
          className={`sidebar-item ${tab === "builtin" ? "active" : ""}`}
          onClick={() => setTab("builtin")}
          style={{ borderRadius: 6, padding: "4px 12px", fontSize: 12 }}
        >
          📦 Built-in ({state.plugins.length})
        </button>
        <button
          className={`sidebar-item ${tab === "user" ? "active" : ""}`}
          onClick={() => setTab("user")}
          style={{ borderRadius: 6, padding: "4px 12px", fontSize: 12 }}
        >
          👤 User ({userPlugins.length})
        </button>
        <button
          className={`sidebar-item ${tab === "permissions" ? "active" : ""}`}
          onClick={() => setTab("permissions")}
          style={{ borderRadius: 6, padding: "4px 12px", fontSize: 12 }}
        >
          🔑 Permissions
        </button>
      </div>

      {/* Hot-reload log */}
      {reloadLog.length > 0 && tab === "builtin" && (
        <div className="console-panel" style={{ height: 100, marginBottom: 16 }}>
          {reloadLog.map((line, i) => (
            <div key={i} className="console-line info" style={{ fontSize: 11 }}>{line}</div>
          ))}
        </div>
      )}

      {/* Built-in plugins tab */}
      {tab === "builtin" && (
        <div className="panel-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {state.plugins.map((p) => (
            <div key={p.id} className="panel-card" style={{ cursor: "default" }}>
              <div className="panel-card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`badge ${p.installed ? "badge-success" : "badge-warning"}`}>
                  {p.installed ? "Active" : "Inactive"}
                </span>
                {p.name}
              </div>
              <div className="panel-card-desc" style={{ margin: "8px 0" }}>{p.description}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <span className="flex items-center gap-4" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  v{p.version}
                  <span className="badge badge-default" style={{ fontSize: 10 }}>{p.category}</span>
                </span>
                <button
                  className={`btn ${p.installed ? "" : "btn-primary"}`}
                  style={{ padding: "4px 12px", fontSize: 11 }}
                  onClick={() => togglePlugin(p.id)}
                >
                  {p.installed ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User-installed plugins tab */}
      {tab === "user" && (
        <div>
          {userPlugins.length === 0 ? (
            <div className="placeholder-panel" style={{ height: 150 }}>
              <div className="placeholder-text" style={{ fontSize: 13 }}>
                No user-installed plugins yet. Drag and drop a .zip file in the App Store to install one.
              </div>
            </div>
          ) : (
            <div className="panel-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {userPlugins.map((p) => {
                const grants = permissionManager.getGrants(p.id);
                return (
                  <div
                    key={p.id}
                    className={`panel-card ${selectedPlugin === p.id ? "theme-card-active" : ""}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedPlugin(selectedPlugin === p.id ? null : p.id)}
                  >
                    <div className="panel-card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className={`badge ${p.enabled ? "badge-success" : "badge-warning"}`}>
                        {p.enabled ? "Active" : "Disabled"}
                      </span>
                      {p.manifest.name}
                    </div>
                    <div className="panel-card-desc" style={{ margin: "8px 0" }}>
                      {p.manifest.description || "No description"}
                    </div>
                    <div className="flex items-center gap-8" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      <span>v{p.manifest.version}</span>
                      <span>👤 {p.manifest.author || "Unknown"}</span>
                      <span>📅 {new Date(p.installedAt).toLocaleDateString()}</span>
                    </div>
                    {grants.length > 0 && (
                      <div className="flex gap-4 flex-wrap" style={{ marginTop: 8 }}>
                        {grants.map((g, i) => (
                          <span
                            key={i}
                            className={`badge ${g.granted ? "badge-success" : "badge-warning"}`}
                            style={{ fontSize: 10 }}
                          >
                            {g.granted ? "✅" : "❌"} {g.permission.type}
                          </span>
                        ))}
                      </div>
                    )}
                    {selectedPlugin === p.id && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
                        <div className="flex gap-8">
                          <button
                            className={`btn btn-sm ${p.enabled ? "btn-outline" : "btn-primary"}`}
                            style={{ fontSize: 11 }}
                            onClick={(e) => { e.stopPropagation(); handleToggleUserPlugin(p.id, !p.enabled); }}
                          >
                            {p.enabled ? "Disable" : "Enable"}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            style={{ fontSize: 11 }}
                            onClick={(e) => { e.stopPropagation(); handleUninstall(p.id); }}
                          >
                            🗑️ Uninstall
                          </button>
                        </div>
                        {p.manifest.homepage && (
                          <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
                            📎 <a href={p.manifest.homepage} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>{p.manifest.homepage}</a>
                          </div>
                        )}
                        {p.manifest.license && (
                          <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
                            📜 License: {p.manifest.license}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Permissions tab */}
      {tab === "permissions" && (
        <div>
          <div
            className="mb-16"
            style={{
              padding: "12px 16px",
              background: "rgba(108, 92, 231, 0.1)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            🔑 Permissions are shown to the user when a plugin is installed. Each permission type controls access to a specific host API. Denied permissions prevent the corresponding API calls from working.
          </div>

          <div className="panel-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {[
              { type: "filesystem", label: "File System", icon: "📁", desc: "Read/write files in plugin data directory and user-approved paths", danger: "high" },
              { type: "network", label: "Network", icon: "🌐", desc: "Make HTTP requests to specified domains", danger: "medium" },
              { type: "ai", label: "AI Provider", icon: "🤖", desc: "Access text generation, image generation, and streaming", danger: "low" },
              { type: "voice", label: "Voice Engine", icon: "🎤", desc: "Access text-to-speech and voice cloning", danger: "low" },
              { type: "clipboard", label: "Clipboard", icon: "📋", desc: "Read and write to the system clipboard", danger: "medium" },
              { type: "native-shell", label: "Native Shell", icon: "💻", desc: "Execute shell commands on the host system", danger: "high" },
            ].map((perm) => (
              <div key={perm.type} className="panel-card" style={{ cursor: "default" }}>
                <div className="flex items-center gap-8 mb-8">
                  <span style={{ fontSize: 20 }}>{perm.icon}</span>
                  <span className={`badge ${perm.danger === "high" ? "badge-warning" : perm.danger === "medium" ? "" : "badge-success"}`}>
                    {perm.danger === "high" ? "High Risk" : perm.danger === "medium" ? "Medium" : "Low Risk"}
                  </span>
                </div>
                <div className="panel-card-title">{perm.label}</div>
                <div className="panel-card-desc">{perm.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}