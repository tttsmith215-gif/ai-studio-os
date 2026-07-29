import { useState, useRef, useCallback, useEffect } from "react";
import type { AppModule } from "../types";
import { makeComposition, makeLayer, type Composition } from "../../engine/types";
import { Canvas } from "../../components/Canvas";
import { PlaybackControls } from "../../components/PlaybackControls";
import { Timeline } from "../../components/Timeline";
import { LayerPanel } from "../../components/LayerPanel";
import type { Renderer } from "../../engine/renderer";
import { useStore } from "../../hooks/useStore";
import { useDebouncedCallback } from "../../hooks/useDebounce";
import { saveProjectData } from "../../ipc/projects";
import { saveTemplate } from "../../ipc/templates";
import { exportComposition } from "../../engine/codecs";
import { DRAG_MIME, type DraggedAsset } from "../../engine/dnd";
import { trackEvent } from "../../plugins/apps/Analytics";

export const MotionStudio: AppModule = {
  register(r) {
    r.register({
      id: "motion-studio",
      name: "Motion Studio",
      description: "Create animations and motion graphics with AI assistance",
      icon: "🎬",
      version: "1.0.0",
      category: "motion",
      component: MotionStudioWorkspace,
    });
  },
};

function MotionStudioWorkspace() {
  const { state, dispatch } = useStore();
  const [comp, setComp] = useState<Composition>(() => {
    // Try to restore from current project data
    if (state.currentProject && state.currentProjectData !== "{}") {
      try {
        const parsed = JSON.parse(state.currentProjectData);
        if (parsed && parsed.width) return parsed as Composition;
      } catch {}
    }
    return makeComposition("Untitled", 960, 540, 30, 5);
  });
  const [currentFrame, setCurrentFrame] = useState(0);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "dirty" | "">("");
  const [exporting, setExporting] = useState(false);
  const rendererRef = useRef<Renderer | null>(null);

  // Watch for pending motion layers from the Animation Library
  useEffect(() => {
    if (state.pendingMotion && !state.pendingMotion.applied) {
      const pending = state.pendingMotion;
      setComp((prev) => ({
        ...prev,
        layers: [...prev.layers, ...pending.layers],
        totalFrames: prev.layers.length === 0 && pending.layers.length > 0
          ? Math.max(prev.totalFrames, 150)
          : prev.totalFrames,
      }));
      // Mark as applied so it doesn't re-add
      dispatch({ type: "COMPOSITION_ADD_LAYERS", pending: { ...pending, applied: true } });
      dispatch({ type: "NOTIFY", id: `applied-${pending.id}`, message: `"${pending.name}" applied`, level: "success" });
    }
  }, [state.pendingMotion]);

  // Load composition when a project is opened
  useEffect(() => {
    if (state.currentProject && state.currentProjectData !== "{}") {
      try {
        const parsed = JSON.parse(state.currentProjectData);
        if (parsed && parsed.width) {
          setComp(parsed as Composition);
          setCurrentFrame(0);
          setSaveStatus("saved");
        }
      } catch {}
    }
  }, [state.currentProject?.id, state.currentProjectData]);

  // Auto-save when composition changes (debounced)
  const debouncedSave = useDebouncedCallback(async () => {
    if (!state.currentProject) return;
    setSaveStatus("saving");
    try {
      await saveProjectData(state.currentProject.id, JSON.stringify(comp));
      setSaveStatus("saved");
    } catch {
      setSaveStatus("dirty");
    }
  }, state.settings.autosaveInterval * 1000);

  useEffect(() => {
    if (!state.currentProject || !state.settings.autosave) return;
    setSaveStatus("dirty");
    debouncedSave();
  }, [comp, state.currentProject?.id, state.settings.autosave]);

  const handleFrameChange = useCallback((frame: number) => {
    setCurrentFrame(frame);
  }, []);

  const handleToggleLayer = (id: string) => {
    setComp((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)),
    }));
  };

  const handleDeleteLayer = (id: string) => {
    setComp((prev) => ({
      ...prev,
      layers: prev.layers.filter((l) => l.id !== id),
    }));
    if (selectedLayer === id) setSelectedLayer(null);
  };

  const handleReorderLayer = (id: string, dir: "up" | "down") => {
    setComp((prev) => {
      const idx = prev.layers.findIndex((l) => l.id === id);
      if (idx === -1) return prev;
      const newIdx = dir === "up" ? Math.max(0, idx - 1) : Math.min(prev.layers.length - 1, idx + 1);
      if (newIdx === idx) return prev;
      const layers = [...prev.layers];
      [layers[idx], layers[newIdx]] = [layers[newIdx], layers[idx]];
      return { ...prev, layers };
    });
  };

  const handleSave = async () => {
    if (!state.currentProject) {
      dispatch({ type: "NAVIGATE", panel: "projects" });
      return;
    }
    trackEvent("project", "save:" + state.currentProject.name);
    setSaveStatus("saving");
    try {
      await saveProjectData(state.currentProject.id, JSON.stringify(comp));
      setSaveStatus("saved");
    } catch {
      setSaveStatus("dirty");
    }
  };

  const handleSaveAsTemplate = async () => {
    const name = prompt("Template name:", comp.name);
    if (!name) return;
    trackEvent("export", "template:" + name);
    try {
      await saveTemplate(name, `Motion template from ${comp.name}`, "motion", JSON.stringify(comp));
      dispatch({ type: "NOTIFY", id: "template-saved", message: `Template "${name}" saved`, level: "success" });
    } catch (err: any) {
      dispatch({ type: "NOTIFY", id: "template-error", message: `Failed to save template: ${err}`, level: "error" });
    }
  };

  const handleExport = async () => {
    if (exporting) return;
    trackEvent("render", comp.name);
    setExporting(true);
    try {
      // Add a render job to the queue
      const jobId = `job-${Date.now()}`;
      dispatch({
        type: "RENDER_JOB_ADD",
        job: { id: jobId, name: comp.name, app: "Motion Studio", progress: 0, status: "queued", eta: "Calculating..." },
      });

      await exportComposition(comp, {
        onProgress: (frame, total) => {
          const pct = Math.round((frame / total) * 100);
          dispatch({ type: "RENDER_UPDATE", id: jobId, patch: { progress: pct, status: "rendering", eta: `${Math.round((total - frame) / 30)}s` } });
        },
      });

      dispatch({ type: "RENDER_UPDATE", id: jobId, patch: { progress: 100, status: "done", eta: "Done" } });
      dispatch({ type: "NOTIFY", id: "export-done", message: `${comp.name} exported successfully`, level: "success" });
    } catch (err: any) {
      dispatch({ type: "NOTIFY", id: "export-error", message: `Export failed: ${err}`, level: "error" });
    } finally {
      setExporting(false);
    }
  };

  const saveLabel = saveStatus === "saving" ? "Saving..." : saveStatus === "dirty" ? "Unsaved" : saveStatus === "saved" ? "Saved" : "";
  const saveBtnLabel = state.currentProject ? "Save" : "Save (no project)";

  return (
    <div className="mg-workspace">
      {/* Toolbar */}
      <div className="mg-toolbar">
        <div className="mg-toolbar-left">
          <input
            className="mg-comp-name"
            value={comp.name}
            onChange={(e) => setComp((prev) => ({ ...prev, name: e.target.value }))}
          />
          <span className="mg-comp-info">{comp.width} × {comp.height} · {comp.fps}fps · {comp.totalFrames / comp.fps}s</span>
          {saveLabel && (
            <span className="mg-comp-info" style={{ color: saveStatus === "saved" ? "var(--success)" : "var(--warning)" }}>
              {saveLabel}
            </span>
          )}
        </div>
        <div className="mg-toolbar-right">
          <button className="btn" onClick={handleSave} title={saveBtnLabel}>💾</button>
          <button className="btn" onClick={handleSaveAsTemplate} title="Save as template">📋</button>
          <button className="btn" onClick={handleExport} disabled={exporting} title="Export to MP4">
            {exporting ? "⏳" : "🎞️"}
          </button>
          <button className="btn" onClick={() => dispatch({ type: "NAVIGATE", panel: "render-queue" })} title="Render Queue">📤</button>
          <button className="btn" onClick={() => setComp(makeComposition("Untitled", 960, 540, 30, 5))}>New</button>
          <button className="btn" onClick={() => setComp((prev) => ({ ...prev, totalFrames: prev.totalFrames + 30 }))}>+ 1s</button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="mg-body">
        {/* Left: Canvas area */}
        <div
          className="mg-canvas-area"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const raw = e.dataTransfer.getData(DRAG_MIME);
            if (!raw) return;
            try {
              const asset: DraggedAsset = JSON.parse(raw);
              if (asset.kind === "image") {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 1920;
                const y = ((e.clientY - rect.top) / rect.height) * 1080;
                const layer = makeLayer("image", asset.name.replace(/\.[^.]+$/, ""), {
                  kind: "image",
                  src: asset.path,
                  naturalWidth: 640,
                  naturalHeight: 480,
                }, x, y);
                setComp((prev) => ({ ...prev, layers: [...prev.layers, layer] }));
              }
            } catch {}
          }}
        >
          <Canvas
            composition={comp}
            currentFrame={currentFrame}
            onFrameChange={handleFrameChange}
            rendererRef={rendererRef}
          />
          <PlaybackControls
            renderer={rendererRef.current}
            currentFrame={currentFrame}
            totalFrames={comp.totalFrames}
            fps={comp.fps}
            onFrameChange={handleFrameChange}
          />
        </div>

        {/* Right: Layer panel */}
        <LayerPanel
          composition={comp}
          selectedLayer={selectedLayer}
          onUpdateComposition={setComp}
        />
      </div>

      {/* Bottom: Timeline */}
      <Timeline
        composition={comp}
        currentFrame={currentFrame}
        onFrameChange={handleFrameChange}
        onSelectLayer={setSelectedLayer}
        selectedLayer={selectedLayer}
        onToggleLayer={handleToggleLayer}
        onDeleteLayer={handleDeleteLayer}
        onReorderLayer={handleReorderLayer}
      />
    </div>
  );
}