import { useState } from "react";
import { useStore } from "../store/context";
import { builtinComponents, getCategories, getComponentsByCategory, type MotionComponent } from "../motion";

export function AnimationLibrary() {
  const { state, dispatch } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [previewComp, setPreviewComp] = useState<MotionComponent | null>(null);

  const categories = getCategories();

  const handleApply = (comp: MotionComponent) => {
    const layers = comp.createLayers({ fps: 30 });
    dispatch({
      type: "COMPOSITION_ADD_LAYERS",
      pending: {
        id: comp.id,
        name: comp.name,
        layers: layers.map((l) => ({
          ...l,
          keyframes: l.keyframes,
          transform: l.transform,
          content: l.content,
        })),
        applied: false,
      },
    });
    dispatch({
      type: "NOTIFY",
      id: `motion-${comp.id}`,
      message: `"${comp.name}" added — open Motion Studio to see it`,
      level: "info",
    });
  };

  const handlePreview = (comp: MotionComponent) => {
    setPreviewComp(prev => prev?.id === comp.id ? null : comp);
  };

  return (
    <div className="panel-container">
      <div className="panel-header">
        <h1 className="panel-title">Animation Library</h1>
        <p className="panel-subtitle">Reusable motion components — click a card to preview, then Apply to add to your composition</p>
      </div>

      {categories.map((cat) => (
        <div key={cat} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--text-secondary)" }}>
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </h2>
          <div className="panel-grid">
            {getComponentsByCategory(cat).map((comp) => (
              <div
                className={`anim-card ${previewComp?.id === comp.id ? "anim-card-active" : ""}`}
                key={comp.id}
                onClick={() => handlePreview(comp)}
              >
                <div className="anim-card-preview">
                  <span className="anim-card-play">{comp.icon}</span>
                </div>
                <div className="anim-card-info">
                  <div className="anim-card-name">{comp.name}</div>
                  <div className="anim-card-desc">{comp.description}</div>
                  <div className="anim-card-footer">
                    <span className="badge badge-success">{comp.defaultDuration}s</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: 11, padding: "3px 8px" }}
                        onClick={(e) => { e.stopPropagation(); handleApply(comp); }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Preview section */}
          {previewComp && (
            <div style={{ marginTop: 12, padding: 16, background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600 }}>{previewComp.name}</h3>
                <span className="badge badge-default">{previewComp.category}</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>{previewComp.description}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {previewComp.params.map((p) => (
                  <div key={p.key} style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 100 }}>
                    <label style={{ fontSize: 10, color: "var(--text-muted)" }}>{p.label}</label>
                    {p.type === "color" ? (
                      <input type="color" className="layer-prop-color" defaultValue={p.default} />
                    ) : p.type === "select" ? (
                      <select className="layer-prop-input" defaultValue={p.default}>
                        {p.options?.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input type={p.type} className="layer-prop-input" defaultValue={p.default} />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button className="btn btn-primary" onClick={() => handleApply(previewComp)}>
                  Apply to Composition
                </button>
                <button className="btn" onClick={() => setPreviewComp(null)}>
                  Close Preview
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}