import { useState, useEffect } from "react";
import type { AppModule } from "../types";

// ─── Local Analytics Tracking ────────────────────────────────────

interface AnalyticsEvent {
  type: string;
  label: string;
  timestamp: number;
}

const STORAGE_KEY = "aios-analytics";

function loadEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function trackEvent(type: string, label: string) {
  try {
    const events = loadEvents();
    events.push({ type, label, timestamp: Date.now() });
    // Keep last 500 events
    if (events.length > 500) events.splice(0, events.length - 500);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {}
}

function getMetrics() {
  const events = loadEvents();
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();
  const weekAgo = now - 7 * 86400000;

  const totalProjects = events.filter((e) => e.type === "project").length;
  const totalRenders = events.filter((e) => e.type === "render").length;
  const totalExports = events.filter((e) => e.type === "export").length;
  const projectsToday = events.filter((e) => e.type === "project" && e.timestamp >= todayTs).length;
  const rendersToday = events.filter((e) => e.type === "render" && e.timestamp >= todayTs).length;
  const recentEvents = events.filter((e) => e.timestamp >= weekAgo).sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);

  const appCounts: Record<string, number> = {};
  events.forEach((e) => {
    if (e.type === "app") appCounts[e.label] = (appCounts[e.label] || 0) + 1;
  });
  const topApp = Object.entries(appCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  return { totalProjects, totalRenders, totalExports, projectsToday, rendersToday, recentEvents, topApp };
}

export const Analytics: AppModule = {
  register(r) {
    r.register({
      id: "analytics",
      name: "Analytics",
      description: "Track content performance, usage, and render benchmarks",
      icon: "📊",
      version: "1.0.0",
      category: "manage",
      component: AnalyticsPanel,
    });
  },
};

function AnalyticsPanel() {
  const [metrics, setMetrics] = useState(getMetrics);

  useEffect(() => {
    const interval = setInterval(() => setMetrics(getMetrics()), 5000);
    return () => clearInterval(interval);
  }, []);

  const timeAgo = (ts: number) => {
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    return `${hr}h ago`;
  };

  return (
    <div className="panel-container">
      <div className="panel-header">
        <h1 className="panel-title">Analytics</h1>
        <p className="panel-subtitle">Usage insights, render benchmarks, and content performance</p>
      </div>

      {/* Summary cards */}
      <div className="panel-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: "rgba(108,92,231,0.15)" }}>📁</div>
          <div className="stat-card-value">{metrics.totalProjects}</div>
          <div className="stat-card-title">Total Projects</div>
          <div className="stat-card-desc">+{metrics.projectsToday} today</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: "rgba(46,204,113,0.15)" }}>🎞️</div>
          <div className="stat-card-value">{metrics.totalRenders}</div>
          <div className="stat-card-title">Total Renders</div>
          <div className="stat-card-desc">+{metrics.rendersToday} today</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: "rgba(243,156,18,0.15)" }}>📤</div>
          <div className="stat-card-value">{metrics.totalExports}</div>
          <div className="stat-card-title">Total Exports</div>
          <div className="stat-card-desc">Across all formats</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: "rgba(52,152,219,0.15)" }}>🧩</div>
          <div className="stat-card-value">{metrics.topApp}</div>
          <div className="stat-card-title">Most Used App</div>
          <div className="stat-card-desc">By session count</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ marginTop: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Recent Activity (last 7 days)</h3>
        {metrics.recentEvents.length === 0 ? (
          <div className="placeholder-panel" style={{ height: 100 }}>
            <div className="placeholder-text" style={{ fontSize: 13 }}>No activity recorded yet. Use the app to start tracking.</div>
          </div>
        ) : (
          <div className="activity-list">
            {metrics.recentEvents.map((e, i) => (
              <div className="activity-item" key={i}>
                <span style={{ fontSize: 16, width: 24 }}>
                  {e.type === "project" ? "📁" : e.type === "render" ? "🎞️" : e.type === "export" ? "📤" : e.type === "app" ? "🧩" : "📍"}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{e.label}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{e.type} · {timeAgo(e.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}