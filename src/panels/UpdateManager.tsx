import { useState, useEffect } from "react";

const CURRENT_VERSION = "v0.1.0";
const REPO_URL = "https://api.github.com/repos/trev2/ai-studio-os/releases/latest";

interface ReleaseInfo {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
}

export function UpdateManager() {
  const [checking, setChecking] = useState(false);
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  const checkForUpdates = async () => {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(REPO_URL);
      if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
      const data: ReleaseInfo = await res.json();
      setRelease(data);
      setLastCheck(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err.message);
      setRelease(null);
    } finally {
      setChecking(false);
    }
  };

  // Auto-check on mount
  useEffect(() => {
    checkForUpdates();
  }, []);

  const isLatest = release && release.tag_name === CURRENT_VERSION;
  const hasUpdate = release && release.tag_name !== CURRENT_VERSION;

  return (
    <div className="panel-container">
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="panel-title">Update Manager</h1>
          <p className="panel-subtitle">Check for updates to AI Studio OS and plugins</p>
        </div>
        <button className="btn" onClick={checkForUpdates} disabled={checking}>
          {checking ? "🔄 Checking..." : "🔄 Check for Updates"}
        </button>
      </div>

      {/* Current version */}
      <div className="settings-section" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="stat-card-icon" style={{ background: isLatest ? "rgba(46,204,113,0.15)" : hasUpdate ? "rgba(243,156,18,0.15)" : "rgba(108,92,231,0.15)" }}>
            {isLatest ? "✅" : hasUpdate ? "🔄" : "⚡"}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>AI Studio OS {CURRENT_VERSION}</div>
            <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
              {isLatest
                ? "You're on the latest version."
                : hasUpdate
                  ? `Update available: ${release!.tag_name}`
                  : error
                    ? "Could not check for updates"
                    : "Checking..."}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="settings-section" style={{ borderColor: "rgba(231,76,60,0.3)" }}>
          <p style={{ color: "var(--danger)", fontSize: 13 }}>
            ⚠ Update check failed: {error}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
            Make sure you have an internet connection. The app will check again on next launch.
          </p>
        </div>
      )}

      {hasUpdate && release && (
        <div className="settings-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{release.name}</h3>
              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                Published {new Date(release.published_at).toLocaleDateString()}
              </span>
            </div>
            <a href={release.html_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: "none" }}>
              Download Update
            </a>
          </div>
          <div
            style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 300, overflow: "auto" }}
          >
            {release.body}
          </div>
        </div>
      )}

      {lastCheck && (
        <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 12 }}>
          Last checked: {lastCheck}
        </div>
      )}
    </div>
  );
}