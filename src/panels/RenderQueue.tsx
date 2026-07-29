import { useStore } from "../store/context";

export function RenderQueue() {
  const { state } = useStore();

  const progressColor = (pct: number) => {
    if (pct === 100) return "var(--success)";
    if (pct > 0) return "var(--accent)";
    return "var(--text-muted)";
  };

  return (
    <div className="panel-container">
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="panel-title">Render Queue</h1>
          <p className="panel-subtitle">Monitor and manage render jobs</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn">Clear Completed</button>
          <button className="btn btn-primary">Render All</button>
        </div>
      </div>

      {state.renderQueue.length === 0 ? (
        <div className="placeholder-panel">
          <div className="placeholder-icon">🎞️</div>
          <div className="placeholder-text">No render jobs. Add projects to the queue to start rendering.</div>
        </div>
      ) : (
        <div className="render-list">
          {state.renderQueue.map((job) => (
            <div className="render-job" key={job.id}>
              <div className="render-job-left">
                <span className="render-job-icon">
                  {job.status === "done" ? "✅" : job.status === "failed" ? "❌" : job.status === "rendering" ? "🔄" : "⏳"}
                </span>
                <div>
                  <div className="render-job-name">{job.name}</div>
                  <div className="render-job-meta">{job.app} · {job.eta}</div>
                </div>
              </div>
              <div className="render-job-right">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${job.progress}%`, background: progressColor(job.progress) }}
                  />
                </div>
                <span className="render-job-pct">{job.progress}%</span>
                <span className={`badge ${job.status === "done" ? "badge-success" : job.status === "failed" ? "" : "badge-warning"}`}
                  style={job.status === "failed" ? { background: "rgba(231,76,60,0.15)", color: "var(--danger)" } : {}}
                >
                  {job.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}