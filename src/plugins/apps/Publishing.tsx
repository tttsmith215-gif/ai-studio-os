import { useState } from "react";
import type { AppModule } from "../types";
import { useStore } from "../../store/context";
import { exportComposition, exportFrames } from "../../engine/codecs";

const platforms = [
  { id: "youtube", name: "YouTube", icon: "▶️", formats: ["MP4", "WebM"], desc: "1920x1080, H.264" },
  { id: "tiktok", name: "TikTok", icon: "🎵", formats: ["MP4"], desc: "1080x1920, vertical" },
  { id: "instagram", name: "Instagram", icon: "📸", formats: ["MP4", "JPEG"], desc: "1080x1080, square" },
  { id: "twitter", name: "X / Twitter", icon: "🐦", formats: ["MP4", "GIF"], desc: "Optimized for timeline" },
  { id: "linkedin", name: "LinkedIn", icon: "💼", formats: ["MP4", "PDF"], desc: "Professional format" },
  { id: "web", name: "Web Export", icon: "🌐", formats: ["MP4", "GIF"], desc: "Web-optimized delivery" },
  { id: "local", name: "Local Export", icon: "💾", formats: ["MP4", "GIF", "PNG"], desc: "Save to your computer" },
];

export const Publishing: AppModule = {
  register(r) {
    r.register({
      id: "publishing",
      name: "Publishing",
      description: "Export and publish content to social media, web, and more",
      icon: "📡",
      version: "1.0.0",
      category: "manage",
      component: PublishingPanel,
    });
  },
};

function PublishingPanel() {
  const { state, dispatch } = useStore();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>("MP4");
  const [exporting, setExporting] = useState(false);

  const platform = platforms.find((p) => p.id === selectedPlatform);
  const hasProject = state.currentProject !== null;

  const handleExport = async () => {
    if (exporting || !hasProject) return;

    let comp;
    try {
      comp = JSON.parse(state.currentProjectData);
      if (!comp.width) throw new Error("Invalid");
    } catch {
      dispatch({ type: "NOTIFY", id: "pub-no-data", message: "No valid composition to export", level: "error" });
      return;
    }

    setExporting(true);
    const jobId = `pub-${Date.now()}`;
    dispatch({
      type: "RENDER_JOB_ADD",
      job: { id: jobId, name: `${comp.name} → ${platform?.name || "Export"}`, app: "Publishing", progress: 0, status: "queued", eta: "Starting..." },
    });

    try {
      const isPng = selectedFormat === "PNG" || selectedFormat === "JPEG";
      if (isPng) {
        await exportFrames(comp, {
          onProgress: (f, t) => {
            dispatch({ type: "RENDER_UPDATE", id: jobId, patch: { progress: Math.round((f / t) * 100), status: "rendering" } });
          },
        });
      } else {
        await exportComposition(comp, {
          onProgress: (f, t) => {
            dispatch({ type: "RENDER_UPDATE", id: jobId, patch: { progress: Math.round((f / t) * 100), status: "rendering" } });
          },
        });
      }

      dispatch({ type: "RENDER_UPDATE", id: jobId, patch: { progress: 100, status: "done", eta: "Done" } });
      dispatch({ type: "NOTIFY", id: "pub-done", message: `Exported to ${platform?.name || "local"}`, level: "success" });
    } catch (err: any) {
      dispatch({ type: "RENDER_UPDATE", id: jobId, patch: { status: "failed" } });
      dispatch({ type: "NOTIFY", id: "pub-error", message: `Export failed: ${err.message}`, level: "error" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="panel-container">
      <div className="panel-header">
        <h1 className="panel-title">Publishing</h1>
        <p className="panel-subtitle">Export and publish your content across platforms</p>
      </div>

      <div className="panel-grid">
        {platforms.map((p) => (
          <button
            key={p.id}
            className={`plugin-card ${selectedPlatform === p.id ? "installed" : ""}`}
            style={{ cursor: "pointer", textAlign: "left" }}
            onClick={() => {
              setSelectedPlatform(p.id);
              setSelectedFormat(p.formats[0]);
            }}
          >
            <div className="plugin-card-top">
              <span style={{ fontSize: 28 }}>{p.icon}</span>
            </div>
            <div className="plugin-card-name">{p.name}</div>
            <div className="plugin-card-desc">
              {p.desc}
              <div style={{ marginTop: 4 }}>
                {p.formats.map((f) => (
                  <span key={f} className="badge badge-default" style={{ marginRight: 4, fontSize: 10 }}>{f}</span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      {platform && (
        <div className="settings-section" style={{ marginTop: 24, padding: 20 }}>
          <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>
            Export to {platform.name}
          </h3>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <select
              className="btn"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              style={{ appearance: "auto", cursor: "pointer" }}
            >
              {platform.formats.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={handleExport} disabled={exporting || !hasProject}>
              {exporting ? "⏳ Exporting..." : "▶ Export"}
            </button>
            {!hasProject && (
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                Open a project to enable publishing.
              </span>
            )}
            {hasProject && (
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                Project: {state.currentProject?.name}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}