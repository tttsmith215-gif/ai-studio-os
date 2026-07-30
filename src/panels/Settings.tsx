import { useState } from "react";
import { useStore } from "../hooks/useStore";
import { chat, buildEndpoint, buildModel } from "../ai";

const PROVIDER_DEFAULTS: Record<string, { endpoint: string; model: string }> = {
  ollama: { endpoint: "http://localhost:11434", model: "llama3.2" },
  openai: { endpoint: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  anthropic: { endpoint: "https://api.anthropic.com/v1", model: "claude-3-haiku-20240307" },
  openrouter: { endpoint: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini" },
};

export function Settings() {
  const { state, dispatch } = useStore();
  const s = state.settings;
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [testMsg, setTestMsg] = useState("");

  const update = (patch: Record<string, any>) =>
    dispatch({ type: "SETTINGS_UPDATE", settings: patch });

  const handleProviderChange = (provider: string) => {
    const defs = PROVIDER_DEFAULTS[provider];
    update({
      aiProvider: provider,
      aiEndpoint: defs?.endpoint || s.aiEndpoint,
      aiModel: defs?.model || s.aiModel,
    });
  };

  const testConnection = async () => {
    setTestStatus("testing");
    setTestMsg("");
    try {
      const endpoint = buildEndpoint(s.aiProvider, s.aiEndpoint);
      await chat(endpoint, s.aiModel, { messages: [{ role: "user", content: "ping" }], maxTokens: 1 }, s.aiApiKey || undefined);
      setTestStatus("ok");
      setTestMsg("Connection successful");
    } catch (err: any) {
      setTestStatus("fail");
      setTestMsg(err.message);
    }
  };

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
            <select className="input" value={s.aiProvider} onChange={(e) => handleProviderChange(e.target.value)}>
              <option value="ollama">Ollama (Local)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>
          <div className="settings-field">
            <label className="field-label">Model</label>
            <input className="input" value={s.aiModel} onChange={(e) => update({ aiModel: e.target.value })} placeholder={buildModel(s.aiProvider, "")} />
          </div>
          <div className="settings-field">
            <label className="field-label">Endpoint</label>
            <input className="input" value={s.aiEndpoint} onChange={(e) => update({ aiEndpoint: e.target.value })} placeholder={buildEndpoint(s.aiProvider, "")} />
          </div>
          <div className="settings-field">
            <label className="field-label">API Key</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                className="input flex-1"
                type={showKey ? "text" : "password"}
                value={s.aiApiKey}
                onChange={(e) => update({ aiApiKey: e.target.value })}
                placeholder={s.aiProvider === "ollama" ? "Not needed for local Ollama" : "sk-..."}
                style={{ width: 300 }}
              />
              <button className="btn" onClick={() => setShowKey(!showKey)} style={{ fontSize: 12 }}>
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div className="settings-field">
            <label className="field-label">Test Connection</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn btn-primary" onClick={testConnection} disabled={testStatus === "testing"}>
                {testStatus === "testing" ? "Testing..." : "Test"}
              </button>
              {testStatus === "ok" && <span style={{ color: "var(--success)" }}>✓ {testMsg}</span>}
              {testStatus === "fail" && <span style={{ color: "var(--danger)" }}>✗ {testMsg}</span>}
            </div>
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