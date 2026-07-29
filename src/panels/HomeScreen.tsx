import { useStore } from "../store/context";
import { useEffect, useState } from "react";
import { listProjects } from "../ipc/projects";
import { pluginRegistry } from "../plugins/registry";

const featuredApps = [
  { id: "motion-studio", icon: "🎬", name: "Motion Studio", desc: "Animations & motion graphics", color: "rgba(108,92,231,0.2)" },
  { id: "video-editor", icon: "🎥", name: "Video Editor", desc: "Multi-track video editing", color: "rgba(46,204,113,0.2)" },
  { id: "thumbnail-studio", icon: "🖼️", name: "Thumbnail Studio", desc: "Eye-catching thumbnails", color: "rgba(243,156,18,0.2)" },
  { id: "presentation-studio", icon: "📽️", name: "Presentation Studio", desc: "AI-powered slide decks", color: "rgba(52,152,219,0.2)" },
  { id: "image-studio", icon: "🎨", name: "Image Studio", desc: "Photo editing & design", color: "rgba(231,76,60,0.2)" },
  { id: "publishing", icon: "📡", name: "Publishing", desc: "Export & publish across platforms", color: "rgba(155,89,182,0.2)" },
  { id: "analytics", icon: "📊", name: "Analytics", desc: "Usage & performance insights", color: "rgba(26,188,156,0.2)" },
];

export function HomeScreen() {
  const { state, dispatch } = useStore();
  const [projectCount, setProjectCount] = useState(state.projects.length);

  useEffect(() => {
    listProjects()
      .then((projects) => setProjectCount(projects.length))
      .catch(() => {});
  }, []);

  const installedCount = state.plugins.filter((p) => p.installed).length;
  const installedAppIds = new Set(pluginRegistry.extension.apps.keys());
  const runningRenders = state.renderQueue.filter((j) => j.status === "rendering" || j.status === "queued").length;

  return (
    <div className="panel-container">
      {/* Greeting */}
      <div className="panel-header">
        <h1 className="panel-title" style={{ fontSize: 22 }}>Welcome to AI Studio OS</h1>
        <p className="panel-subtitle">
          {installedCount} apps installed · {projectCount} projects · {runningRenders} render{runningRenders !== 1 ? "s" : ""} active
        </p>
      </div>

      {/* App Launcher Grid */}
      <div className="mb-32">
        <h2 className="panel-section-header">Apps</h2>
        <div className="panel-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
          {featuredApps.map((app) => {
            const installed = installedAppIds.has(app.id);
            return (
              <button
                key={app.id}
                className="app-launcher-card"
                onClick={() => {
                  if (installed) {
                    dispatch({ type: "NAVIGATE", panel: app.id });
                  } else {
                    // Navigate to App Store with this app highlighted
                    dispatch({ type: "NAVIGATE", panel: "app-store" });
                  }
                }}
              >
                <div className="app-launcher-icon" style={{ background: app.color }}>
                  {app.icon}
                </div>
                <div className="app-launcher-name">{app.name}</div>
                <div className="app-launcher-desc">{app.desc}</div>
                {!installed && (
                  <span className="badge badge-warning" style={{ marginTop: 6, fontSize: 10 }}>
                    Install
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-32">
        <h2 className="panel-section-header">Quick Actions</h2>
        <div className="flex gap-8 flex-wrap">
          <button className="btn btn-primary" onClick={() => dispatch({ type: "NAVIGATE", panel: "app-store" })}>
            Browse Apps
          </button>
          <button className="btn" onClick={() => dispatch({ type: "NAVIGATE", panel: "projects" })}>
            Open Project
          </button>
          <button className="btn" onClick={() => dispatch({ type: "NAVIGATE", panel: "motion-studio" })}>
            New Animation
          </button>
          <button className="btn" onClick={() => dispatch({ type: "NAVIGATE", panel: "publishing" })}>
            Publish
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="panel-section-header">Recent Activity</h2>
        {state.renderQueue.filter((j) => j.status === "done").length > 0 ? (
          <div className="activity-list">
            {state.renderQueue
              .filter((j) => j.status === "done")
              .slice(0, 3)
              .map((j) => (
                <div className="activity-item" key={j.id}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{j.name}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{j.app}</div>
                  </div>
                  <span className="badge badge-success">Done</span>
                </div>
              ))}
          </div>
        ) : (
          <div className="placeholder-panel" style={{ height: 80 }}>
            <div className="placeholder-text" style={{ fontSize: 13 }}>
              No recent activity. Launch an app to get started.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}