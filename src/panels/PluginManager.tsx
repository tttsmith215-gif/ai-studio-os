import { useState, useEffect } from "react";
import { hotReload } from "../plugins/hotreload";
import { useStore } from "../store/context";

export function PluginManager() {
  const { state, dispatch } = useStore();
  const [hotReloadActive, setHotReloadActive] = useState(false);
  const [reloadLog, setReloadLog] = useState<string[]>([]);

  useEffect(() => {
    setHotReloadActive(hotReload.isEnabled());
    const unsub = hotReload.subscribe((event) => {
      setReloadLog((prev) => [`[${new Date(event.timestamp).toLocaleTimeString()}] ${event.message}`, ...prev].slice(0, 50));
    });
    return unsub;
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

  return (
    <div className="panel-container">
      <div className="panel-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 className="panel-title">Plugin Manager</h1>
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

      {reloadLog.length > 0 && (
        <div className="console-panel" style={{ height: 120, marginBottom: 20 }}>
          {reloadLog.map((line, i) => (
            <div key={i} className="console-line info" style={{ fontSize: 11 }}>{line}</div>
          ))}
        </div>
      )}

      <div className="panel-grid">
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
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>v{p.version}</span>
              <button className={`btn ${p.installed ? "" : "btn-primary"}`} style={{ padding: "4px 12px", fontSize: 11 }} onClick={() => togglePlugin(p.id)}>
                {p.installed ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}