// ─── AI Studio OS: Templates Panel ───────────────────────────────
// Browse, preview, and apply composition templates built from
// motion components.

import { useState } from "react";
import { useStore } from "../store/context";
import {
  builtinTemplates,
  getTemplateCategories,
  getTemplatesByCategory,
  categoryLabels,
  templateToComposition,
  type CompositionTemplate,
} from "../templates";

export function Templates() {
  const { state, dispatch } = useStore();
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [preview, setPreview] = useState<CompositionTemplate | null>(null);

  const categories = getTemplateCategories();
  const filtered = filterCat
    ? getTemplatesByCategory(filterCat)
    : builtinTemplates;

  const handleApply = (template: CompositionTemplate) => {
    const comp = templateToComposition(template);

    dispatch({
      type: "COMPOSITION_ADD_LAYERS",
      pending: {
        id: template.id,
        name: template.name,
        layers: comp.layers.map((l) => ({
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
      id: `template-${template.id}`,
      message: `"${template.name}" applied — open Motion Studio to see it`,
      level: "success",
    });
  };

  const handlePreview = (template: CompositionTemplate) => {
    setPreview((prev) => (prev?.id === template.id ? null : template));
  };

  return (
    <div className="panel-container">
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="panel-title">Templates</h1>
          <p className="panel-subtitle">
            Pre-built composition templates — each combines motion components into a full scene
          </p>
        </div>
        <span className="badge badge-default">{builtinTemplates.length} templates</span>
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          className={`btn ${filterCat === null ? "btn-primary" : ""}`}
          onClick={() => setFilterCat(null)}
          style={{ fontSize: 12, padding: "4px 10px" }}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`btn ${filterCat === cat ? "btn-primary" : ""}`}
            onClick={() => setFilterCat(cat)}
            style={{ fontSize: 12, padding: "4px 10px" }}
          >
            {categoryLabels[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Template grid */}
      {filtered.length === 0 ? (
        <div className="placeholder-panel">
          <div className="placeholder-icon">📋</div>
          <div className="placeholder-text">No templates in this category.</div>
        </div>
      ) : (
        <div className="panel-grid">
          {filtered.map((template) => (
            <div
              key={template.id}
              className={`anim-card ${preview?.id === template.id ? "anim-card-active" : ""}`}
              onClick={() => handlePreview(template)}
            >
              <div className="anim-card-preview">
                <span className="anim-card-play" style={{ fontSize: 28 }}>
                  {template.icon}
                </span>
              </div>
              <div className="anim-card-info">
                <div className="anim-card-name">{template.name}</div>
                <div className="anim-card-desc">{template.description}</div>
                <div className="anim-card-footer">
                  <span className="badge badge-success">{template.duration}s</span>
                  <span className="badge badge-default" style={{ fontSize: 10 }}>
                    {categoryLabels[template.category] ?? template.category}
                  </span>
                  <span className="badge badge-info">{template.width}×{template.height}</span>
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: 11, padding: "3px 10px", marginLeft: "auto" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApply(template);
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview panel */}
      {preview && (
        <div
          style={{
            marginTop: 16,
            padding: 20,
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>{preview.icon}</span>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{preview.name}</h3>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0" }}>
                  {preview.description}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" onClick={() => handleApply(preview)}>
                Apply Template
              </button>
              <button className="btn" onClick={() => setPreview(null)}>
                Close
              </button>
            </div>
          </div>

          {/* Template details */}
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <span className="badge badge-default" style={{ fontSize: 11 }}>
              {preview.width} × {preview.height}
            </span>
            <span className="badge badge-default" style={{ fontSize: 11 }}>
              {preview.duration}s
            </span>
            <span className="badge badge-info" style={{ fontSize: 11 }}>
              {categoryLabels[preview.category] ?? preview.category}
            </span>
            {preview.tags?.map((tag) => (
              <span key={tag} className="badge badge-default" style={{ fontSize: 10 }}>
                #{tag}
              </span>
            ))}
          </div>

          {/* Slot breakdown */}
          <h4 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 8px", color: "var(--text-secondary)" }}>
            Composition Slots ({preview.slots.length})
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {preview.slots.map((slot, i) => {
              const label = slot.name ?? slot.componentId;
              const cfg = slot.config;
              const summary = [
                cfg.text && `"${cfg.text.slice(0, 30)}"`,
                cfg.delay != null && `delay ${cfg.delay}s`,
                cfg.duration != null && `${cfg.duration}s`,
                cfg.fill,
                cfg.fontSize && `${cfg.fontSize}px`,
              ]
                .filter(Boolean)
                .join(", ");
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 12px",
                    background: "var(--bg-tertiary)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 600, minWidth: 100, color: "var(--text-primary)" }}>
                    {label}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    {slot.componentId}
                  </span>
                  <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    {summary}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Composition preview */}
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: preview.background ?? "#1a1a1a",
              borderRadius: "var(--radius-sm)",
              aspectRatio: `${preview.width} / ${preview.height}`,
              maxHeight: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.3)",
              fontSize: 14,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}>{preview.icon}</div>
              <div>{preview.name}</div>
              <div style={{ fontSize: 11, opacity: 0.5 }}>{preview.width} × {preview.height}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}