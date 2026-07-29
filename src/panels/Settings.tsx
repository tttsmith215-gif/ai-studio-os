import { useStore } from "../store/context";

export function Settings() {
  const { state, dispatch } = useStore();
  const s = state.settings;

  const update = (patch: Record<string, any>) =>
    dispatch({ type: "SETTINGS_UPDATE", settings: patch });

  return (
    <div className="panel-container">
      <div className="panel-header">
        <h1 className="panel-title">Settings</h1>
        <p className="panel-subtitle">Configure AI Studio OS</p>
      </div>

      <div className="settings-sections">
        <div className="settings-section">
          <h2 className="settings-section-title">General</h2>
          <div className="settings-field">
            <label className="field-label">Language</label>
            <select className="input" value={s.language} onChange={(e) => update({ language: e.target.value })}>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
          <div className="settings-field">
            <label className="field-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={s.autosave} onChange={(e) => update({ autosave: e.target.checked })} />
              Autosave projects
            </label>
            <span className="field-hint">Automatically save changes every {s.autosaveInterval}s</span>
          </div>
          <div className="settings-field">
            <label className="field-label">Autosave Interval (seconds)</label>
            <input
              type="number"
              className="input"
              style={{ width: 100 }}
              value={s.autosaveInterval}
              onChange={(e) => update({ autosaveInterval: Math.max(30, Number(e.target.value)) })}
            />
          </div>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Appearance</h2>
          <div className="settings-field">
            <label className="field-label">Theme</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {state.themePresets.map((t) => (
                <button
                  key={t.id}
                  className={`btn ${state.activeTheme === t.id ? "btn-primary" : ""}`}
                  onClick={() => dispatch({ type: "THEME_SET", theme: t.id })}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">AI Providers</h2>
          <div className="settings-field">
            <label className="field-label">Provider</label>
            <select className="input" value={s.aiProvider} onChange={(e) => update({ aiProvider: e.target.value })}>
              <option value="ollama">Ollama (Local)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>
          <div className="settings-field">
            <label className="field-label">Model</label>
            <input className="input" value={s.aiModel} onChange={(e) => update({ aiModel: e.target.value })} placeholder="llama3" />
          </div>
          <div className="settings-field">
            <label className="field-label">Endpoint</label>
            <input className="input" value={s.aiEndpoint} onChange={(e) => update({ aiEndpoint: e.target.value })} placeholder="http://localhost:11434" />
          </div>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">System</h2>
          <div className="settings-field">
            <span className="field-label">Version</span>
            <span style={{ color: "var(--text-muted)" }}>AI Studio OS v0.1.0</span>
          </div>
          <div className="settings-field">
            <span className="field-label">Config Path</span>
            <span style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 12 }}>
              ~/.local/share/com.aisstudioos.app/
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}