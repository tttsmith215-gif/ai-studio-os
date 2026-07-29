import { useState } from "react";
import { useStore } from "../store/context";
import { exportComposition, exportFrames } from "../engine/codecs";
import { makeComposition } from "../engine/types";
import { trackEvent } from "../plugins/apps/Analytics";

export function ExportManager() {
  const { state, dispatch } = useStore();
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<"mp4" | "gif" | "png">("mp4");
  const [resolution, setResolution] = useState(1);

  const handleExport = async () => {
    if (exporting) return;
    if (!state.currentProject) {
      dispatch({ type: "NOTIFY", id: "no-project", message: "Open a project first to export", level: "warning" });
      return;
    }

    // Reconstruct composition from stored data
    let comp;
    try {
      comp = JSON.parse(state.currentProjectData);
      if (!comp.width) throw new Error("Invalid composition");
    } catch {
      dispatch({ type: "NOTIFY", id: "invalid-comp", message: "No valid composition data to export", level: "error" });
      return;
    }

    trackEvent("export", format + ":" + (comp.name || "Untitled"));
    setExporting(true);
    const jobId = `export-${Date.now()}`;
    dispatch({
      type: "RENDER_JOB_ADD",
      job: { id: jobId, name: comp.name || "Export", app: "Motion Studio", progress: 0, status: "queued", eta: "Starting..." },
    });

    try {
      if (format === "png") {
        await exportFrames(comp, {
          resolution,
          onProgress: (frame, total) => {
            const pct = Math.round((frame / total) * 100);
            dispatch({ type: "RENDER_UPDATE", id: jobId, patch: { progress: pct, status: "rendering" } });
          },
        });
      } else {
        await exportComposition(comp, {
          resolution,
          onProgress: (frame, total) => {
            const pct = Math.round((frame / total) * 100);
            dispatch({ type: "RENDER_UPDATE", id: jobId, patch: { progress: pct, status: "rendering" } });
          },
        });
      }

      dispatch({ type: "RENDER_UPDATE", id: jobId, patch: { progress: 100, status: "done", eta: "Done" } });
      dispatch({ type: "NOTIFY", id: "export-done", message: `Export completed: ${comp.name}`, level: "success" });
    } catch (err: any) {
      dispatch({ type: "RENDER_UPDATE", id: jobId, patch: { status: "failed" } });
      dispatch({ type: "NOTIFY", id: "export-error", message: `Export failed: ${err.message}`, level: "error" });
    } finally {
      setExporting(false);
    }
  };

  const hasData = state.currentProject !== null && state.currentProjectData !== "{}";

  return (
    <div className="panel-container">
      <div className="panel-header">
        <h1 className="panel-title">Export Manager</h1>
        <p className="panel-subtitle">Export your projects to various formats</p>
      </div>

      {!hasData ? (
        <div className="placeholder-panel">
          <div className="placeholder-icon">📤</div>
          <div className="placeholder-text">No project data to export. Open a project first, then export from here.</div>
          <button className="btn btn-primary" onClick={() => dispatch({ type: "NAVIGATE", panel: "projects" })}>
            Open Project
          </button>
        </div>
      ) : (
        <div className="settings-sections">
          <div className="settings-section">
            <h2 className="settings-section-title">Export Settings</h2>
            <div className="settings-field">
              <label className="field-label">Format</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["mp4", "gif", "png"] as const).map((f) => (
                  <button
                    key={f}
                    className={`btn ${format === f ? "btn-primary" : ""}`}
                    onClick={() => setFormat(f)}
                  >
                    {f === "mp4" ? "🎬 MP4" : f === "gif" ? "🖼️ GIF" : "📄 PNG Frames"}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-field">
              <label className="field-label">Resolution Scale</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[0.5, 0.75, 1, 1.5, 2].map((r) => (
                  <button
                    key={r}
                    className={`btn ${resolution === r ? "btn-primary" : ""}`}
                    onClick={() => setResolution(r)}
                  >
                    {r}x
                  </button>
                ))}
              </div>
              <span className="field-hint">1x = full resolution. Lower = faster but smaller.</span>
            </div>
            <div className="settings-field">
              <label className="field-label">Project</label>
              <span style={{ color: "var(--text-primary)" }}>{state.currentProject?.name}</span>
              <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>
                ({state.currentProject?.app.replace("-", " ")})
              </span>
            </div>
          </div>

          <div className="settings-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 className="settings-section-title" style={{ border: "none", margin: 0, padding: 0 }}>
                {format === "mp4" ? "MP4 Video" : format === "gif" ? "Animated GIF" : "PNG Image Sequence"}
              </h2>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                {format === "mp4" ? "H.264 encoded, best quality" : format === "gif" ? "Palette-optimized for web" : "Individual PNG frames per frame"}
              </span>
            </div>
            <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
              {exporting ? "⏳ Exporting..." : "▶ Export"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}