import { useState, useEffect } from "react";

const initialLogs = [
  { level: "info" as const, msg: "AI Studio OS v0.1.0 starting..." },
  { level: "info" as const, msg: "Window manager initialized" },
  { level: "info" as const, msg: "Plugin registry loaded: 1 app registered" },
  { level: "info" as const, msg: "Motion Graphics app ready" },
  { level: "success" as const, msg: "System ready - waiting for user input" },
];

export function ConsoleLogs() {
  const [lines, setLines] = useState(initialLogs);
  const [filter, setFilter] = useState<"all" | "info" | "warn" | "error">("all");

  useEffect(() => {
    const interval = setInterval(() => {
      setLines((prev) => [
        ...prev,
        { level: "info" as const, msg: `[${new Date().toLocaleTimeString()}] System heartbeat` },
      ]);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === "all" ? lines : lines.filter((l) => l.level === filter);

  return (
    <div className="panel-container">
      <div className="panel-header">
        <h1 className="panel-title">Console / Logs</h1>
        <p className="panel-subtitle">System diagnostics and event log</p>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["all", "info", "warn", "error"] as const).map((f) => (
          <button key={f} className={`btn ${filter === f ? "btn-primary" : ""}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <button className="btn" onClick={() => setLines([])} style={{ marginLeft: "auto" }}>Clear</button>
      </div>
      <div className="console-panel">
        {filtered.length === 0 && <div className="console-line" style={{ color: "var(--text-muted)" }}>No logs</div>}
        {filtered.map((l, i) => (
          <div key={i} className={`console-line ${l.level}`}>{l.msg}</div>
        ))}
      </div>
    </div>
  );
}
