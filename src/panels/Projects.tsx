import { useState, useEffect } from "react";
import { useStore } from "../store/context";
import { listProjects, createProject, deleteProject, saveProjectData, loadProjectData } from "../ipc/projects";
import { exportPackage, importPackage, restoreAssets } from "../ipc/packager";
import { trackEvent } from "../plugins/apps/Analytics";

export function Projects() {
  const { state, dispatch } = useStore();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [appType, setAppType] = useState("motion-graphics");

  useEffect(() => {
    listProjects()
      .then((projects) => dispatch({ type: "PROJECTS_LOAD", projects }))
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    trackEvent("project", "create:" + name.trim());
    try {
      const project = await createProject(name.trim(), appType);
      dispatch({ type: "PROJECTS_ADD", project });
      setName("");
      setShowNew(false);
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id);
      if (state.currentProject?.id === id) {
        dispatch({ type: "PROJECT_CLOSE" });
      }
      dispatch({ type: "PROJECTS_REMOVE", id });
    } catch {}
  };

  const handleExport = async (project: any) => {
    trackEvent("project", "export:" + project.name);
    try {
      const data = await loadProjectData(project.id);
      exportPackage(project.name, project.app, data);
      dispatch({ type: "NOTIFY", id: "export-pkg", message: `${project.name} exported as .aistudio`, level: "success" });
    } catch {}
  };

  const handleImport = async () => {
    const pkg = await importPackage();
    if (!pkg) return;
    trackEvent("project", "import:" + pkg.name);
    const data = restoreAssets(pkg.data, pkg.assets);
    const project = await createProject(pkg.name, pkg.app);
    await saveProjectData(project.id, data);
    const projects = await listProjects();
    dispatch({ type: "PROJECTS_LOAD", projects });
    dispatch({ type: "NOTIFY", id: "import-pkg", message: `Imported ${pkg.name}`, level: "success" });
  };

  const handleOpen = async (project: any) => {
    try {
      const data = await loadProjectData(project.id);
      dispatch({ type: "PROJECT_OPEN", project, data });
      dispatch({ type: "NAVIGATE", panel: "motion-studio" });
      trackEvent("app", "motion-studio");
    } catch {}
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="panel-container">
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="panel-title">Projects</h1>
          <p className="panel-subtitle">Manage your creative projects</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ New Project</button>
        <button className="btn" onClick={handleImport} style={{ marginLeft: 8 }}>📦 Import</button>
      </div>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Project</h2>
              <button className="btn" onClick={() => setShowNew(false)}>✕</button>
            </div>
            <div className="modal-body">
              <label className="field-label">Project Name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Animation"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <label className="field-label" style={{ marginTop: 12 }}>App Type</label>
              <select className="input" value={appType} onChange={(e) => setAppType(e.target.value)}>
                <option value="motion-graphics">Motion Graphics</option>
                <option value="video-editor">Video Editor</option>
                <option value="image-editor">Image Editor</option>
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Create</button>
            </div>
          </div>
        </div>
      )}

      {state.projects.length === 0 ? (
        <div className="placeholder-panel">
          <div className="placeholder-icon">📁</div>
          <div className="placeholder-text">No projects yet. Create your first project to get started.</div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>New Project</button>
        </div>
      ) : (
        <div className="project-list">
          {state.projects.map((p) => (
            <div className="project-row" key={p.id} onClick={() => handleOpen(p)} style={{ cursor: "pointer" }}>
              <div className="project-row-icon">
                {p.app === "motion-graphics" ? "🎬" : p.app === "video-editor" ? "🎥" : "🖼️"}
              </div>
              <div className="project-row-info">
                <div className="project-row-name">{p.name}</div>
                <div className="project-row-meta">
                  {p.app.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())} · {timeStr}
                </div>
              </div>
              <div className="project-row-status">
                {state.currentProject?.id === p.id ? (
                  <span className="badge" style={{ background: "rgba(108,92,231,0.15)", color: "var(--accent)" }}>Open</span>
                ) : (
                  <span className="badge badge-success">Draft</span>
                )}
              </div>
              <button className="btn project-row-action" onClick={(e) => { e.stopPropagation(); handleExport(p); }} title="Export as .aistudio">📦</button>
              <button className="btn project-row-delete" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} title="Delete project">🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}