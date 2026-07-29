import { useState, useRef, useCallback, useEffect } from "react";
import type { AppModule } from "../types";

// ─── Template presets ────────────────────────────────────────────

interface ThumbnailTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  platform: string;
  textPresets: TextPreset[];
}

interface TextPreset {
  id: string;
  label: string;
  defaultText: string;
  x: number; y: number;        // normalized 0-1
  fontSize: number;             // px at 1280px width
  color: string;
  align: CanvasTextAlign;
  maxWidth: number;             // normalized 0-1
  bold: boolean;
  shadow: boolean;
}

interface TextOverlay {
  id: string;
  text: string;
  x: number; y: number;
  fontSize: number;
  color: string;
  align: CanvasTextAlign;
  maxWidth: number;
  bold: boolean;
  shadow: boolean;
}

const TEMPLATES: ThumbnailTemplate[] = [
  {
    id: "youtube",
    name: "YouTube Thumbnail",
    width: 1280, height: 720,
    platform: "YouTube",
    textPresets: [
      { id: "title", label: "Title", defaultText: "YOU WON'T BELIEVE THIS", x: 0.5, y: 0.25, fontSize: 72, color: "#ffffff", align: "center", maxWidth: 0.85, bold: true, shadow: true },
      { id: "subtitle", label: "Subtitle", defaultText: "The Truth About AI Art", x: 0.5, y: 0.55, fontSize: 36, color: "#ffcc00", align: "center", maxWidth: 0.8, bold: false, shadow: true },
      { id: "label", label: "Label", defaultText: "NEW", x: 0.15, y: 0.78, fontSize: 28, color: "#ff4444", align: "center", maxWidth: 0.3, bold: true, shadow: false },
    ],
  },
  {
    id: "instagram",
    name: "Instagram Story",
    width: 1080, height: 1920,
    platform: "Instagram",
    textPresets: [
      { id: "title", label: "Title", defaultText: "TOP 10 TIPS", x: 0.5, y: 0.2, fontSize: 64, color: "#ffffff", align: "center", maxWidth: 0.85, bold: true, shadow: true },
      { id: "subtitle", label: "Subtitle", defaultText: "For Better Content", x: 0.5, y: 0.35, fontSize: 32, color: "#e0e0e0", align: "center", maxWidth: 0.8, bold: false, shadow: true },
    ],
  },
  {
    id: "twitter",
    name: "Twitter / X Card",
    width: 1200, height: 675,
    platform: "Twitter / X",
    textPresets: [
      { id: "title", label: "Title", defaultText: "New Release v2.0", x: 0.5, y: 0.3, fontSize: 48, color: "#ffffff", align: "center", maxWidth: 0.8, bold: true, shadow: true },
      { id: "subtitle", label: "Subtitle", defaultText: "Check out what's new →", x: 0.5, y: 0.6, fontSize: 24, color: "#1da1f2", align: "center", maxWidth: 0.7, bold: false, shadow: false },
    ],
  },
  {
    id: "facebook",
    name: "Facebook Post",
    width: 1200, height: 630,
    platform: "Facebook",
    textPresets: [
      { id: "title", label: "Title", defaultText: "How To Grow Your Channel", x: 0.5, y: 0.3, fontSize: 52, color: "#ffffff", align: "center", maxWidth: 0.85, bold: true, shadow: true },
      { id: "subtitle", label: "Subtitle", defaultText: "5 strategies that actually work", x: 0.5, y: 0.55, fontSize: 28, color: "#cccccc", align: "center", maxWidth: 0.8, bold: false, shadow: false },
    ],
  },
  {
    id: "linkedin",
    name: "LinkedIn Banner",
    width: 1584, height: 396,
    platform: "LinkedIn",
    textPresets: [
      { id: "title", label: "Title", defaultText: "AI Studio OS", x: 0.5, y: 0.35, fontSize: 48, color: "#ffffff", align: "center", maxWidth: 0.8, bold: true, shadow: true },
      { id: "subtitle", label: "Subtitle", defaultText: "Create content faster", x: 0.5, y: 0.65, fontSize: 24, color: "#0a66c2", align: "center", maxWidth: 0.7, bold: false, shadow: false },
    ],
  },
  {
    id: "tiktok",
    name: "TikTok Thumbnail",
    width: 1080, height: 1920,
    platform: "TikTok",
    textPresets: [
      { id: "title", label: "Title", defaultText: "THIS CHANGES EVERYTHING", x: 0.5, y: 0.25, fontSize: 60, color: "#ffffff", align: "center", maxWidth: 0.85, bold: true, shadow: true },
      { id: "subtitle", label: "Subtitle", defaultText: "Full tutorial in comments", x: 0.5, y: 0.55, fontSize: 28, color: "#ff0050", align: "center", maxWidth: 0.8, bold: false, shadow: true },
    ],
  },
];

// ─── Color palette for quick picks ────────────────────────────────

const COLOR_PRESETS = [
  "#ffffff", "#000000", "#ff4444", "#ff6600", "#ffcc00",
  "#44cc44", "#00aaff", "#6666ff", "#cc44cc", "#ff66aa",
  "#1da1f2", "#ff0050", "#0a66c2", "#e4405f", "#333333",
];

// ─── Plugin registration ─────────────────────────────────────────

export const ThumbnailStudio: AppModule = {
  register(r) {
    r.register({
      id: "thumbnail-studio",
      name: "Thumbnail Studio",
      description: "Design eye-catching thumbnails with templates and smart crop",
      icon: "🖼️",
      version: "1.0.0",
      category: "image",
      component: ThumbnailStudioWorkspace,
    });
  },
};

// ─── Workspace component ─────────────────────────────────────────

function ThumbnailStudioWorkspace() {
  const [template, setTemplate] = useState<ThumbnailTemplate>(TEMPLATES[0]);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [bgFile, setBgFile] = useState<string | null>(null);
  const [overlays, setOverlays] = useState<TextOverlay[]>(() =>
    template.textPresets.map((p) => ({
      id: p.id,
      text: p.defaultText,
      x: p.x, y: p.y,
      fontSize: p.fontSize,
      color: p.color,
      align: p.align,
      maxWidth: p.maxWidth,
      bold: p.bold,
      shadow: p.shadow,
    }))
  );
  const [dragging, setDragging] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset overlays when template changes
  const switchTemplate = useCallback((t: ThumbnailTemplate) => {
    setTemplate(t);
    setOverlays(t.textPresets.map((p) => ({
      id: p.id,
      text: p.defaultText,
      x: p.x, y: p.y,
      fontSize: p.fontSize,
      color: p.color,
      align: p.align,
      maxWidth: p.maxWidth,
      bold: p.bold,
      shadow: p.shadow,
    })));
  }, []);

  // Render the canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = template.width;
    canvas.height = template.height;

    // Background
    ctx.fillStyle = "#1a1a1e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Background image
    if (bgImage) {
      const imgAspect = bgImage.width / bgImage.height;
      const canvasAspect = canvas.width / canvas.height;
      let sx = 0, sy = 0, sw = bgImage.width, sh = bgImage.height;

      if (imgAspect > canvasAspect) {
        sh = bgImage.height;
        sw = sh * canvasAspect;
        sx = (bgImage.width - sw) / 2;
      } else {
        sw = bgImage.width;
        sh = sw / canvasAspect;
        sy = (bgImage.height - sh) / 2;
      }

      ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    }

    // Overlay gradient
    const grad = ctx.createLinearGradient(0, canvas.height * 0.5, 0, canvas.height);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, canvas.height * 0.5, canvas.width, canvas.height * 0.5);

    // Text overlays
    for (const o of overlays) {
      const px = o.x * canvas.width;
      const py = o.y * canvas.height;
      const maxW = o.maxWidth * canvas.width;
      const scale = canvas.width / 1280;
      const fontSize = Math.round(o.fontSize * scale);

      ctx.textAlign = o.align;

      // Shadow
      if (o.shadow) {
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 8 * scale;
        ctx.shadowOffsetX = 3 * scale;
        ctx.shadowOffsetY = 3 * scale;
      } else {
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }

      ctx.font = `${o.bold ? "bold " : ""}${fontSize}px sans-serif`;
      ctx.fillStyle = o.color;

      // Word wrap
      const words = o.text.split(" ");
      let line = "";
      let ly = py;
      const lineHeight = fontSize * 1.2;

      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line, px, ly);
          line = word;
          ly += lineHeight;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, px, ly);

      ctx.shadowColor = "transparent";
    }
  }, [template, bgImage, overlays]);

  // Re-render on any change
  useEffect(() => { render(); }, [render]);

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setBgImage(img);
      setBgFile(url);
    };
    img.src = url;
  }, []);

  // Handle canvas click to select text
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // Check if clicked on a text overlay
    for (let i = overlays.length - 1; i >= 0; i--) {
      const o = overlays[i];
      const px = o.x * canvas.width;
      const py = o.y * canvas.height;
      const fontSize = Math.round(o.fontSize * (canvas.width / 1280));
      if (Math.abs(mx - px) < 200 && Math.abs(my - py) < fontSize * 1.5) {
        setEditingId(o.id);
        setEditValue(o.text);
        return;
      }
    }
    setEditingId(null);
  }, [overlays]);

  // Update text from edit
  const commitEdit = useCallback(() => {
    if (editingId) {
      setOverlays((prev) => prev.map((o) => o.id === editingId ? { ...o, text: editValue || o.text } : o));
      setEditingId(null);
    }
  }, [editingId, editValue]);

  // Update overlay property
  const updateOverlay = useCallback((id: string, patch: Partial<TextOverlay>) => {
    setOverlays((prev) => prev.map((o) => o.id === id ? { ...o, ...patch } : o));
  }, []);

  // Export to PNG
  const handleExport = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setExporting(true);
    try {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${template.name.replace(/\s+/g, "-")}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } finally {
      setExporting(false);
    }
  }, [template]);

  return (
    <div className="panel-container" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-bottom" style={{ background: "var(--bg-secondary)", flexShrink: 0 }}>
        {/* Template selector */}
        <select
          className="input"
          value={template.id}
          onChange={(e) => switchTemplate(TEMPLATES.find((t) => t.id === e.target.value) || TEMPLATES[0])}
          style={{ padding: "6px 10px", borderRadius: "var(--radius-md)", fontSize: 13 }}
        >
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>{t.platform} — {t.width}×{t.height}</option>
          ))}
        </select>

        <div className="flex-1" />

        {/* Image upload */}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
        <button className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()}>
          {bgFile ? "🖼️ Change Image" : "🖼️ Add Image"}
        </button>
        {bgFile && (
          <button className="btn btn-outline btn-sm" onClick={() => { setBgImage(null); setBgFile(null); }}>
            ✕ Remove
          </button>
        )}

        <button className="btn btn-primary btn-sm" onClick={handleExport} disabled={exporting}>
          {exporting ? "Exporting..." : "📥 Download PNG"}
        </button>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Canvas area */}
        <div ref={containerRef} className="flex-1 flex-center" style={{ overflow: "auto", background: "var(--bg-primary)" }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", cursor: "pointer", borderRadius: "var(--radius-md)" }}
          />
        </div>

        {/* Properties panel */}
        <div className="panel-right" style={{ width: 280, flexShrink: 0, overflowY: "auto", borderLeft: "1px solid var(--border-color)" }}>
          <div className="p-3">
            <h3 className="text-sm font-bold mb-2">Text Layers</h3>
            {overlays.map((o) => (
              <div key={o.id} className="mb-3 p-2" style={{ background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)" }}>
                {editingId === o.id ? (
                  <div className="mb-2">
                    <input
                      className="input"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingId(null); }}
                      onBlur={commitEdit}
                      autoFocus
                      style={{ width: "100%", padding: "4px 8px", fontSize: 12 }}
                    />
                  </div>
                ) : (
                  <div className="text-sm font-mono mb-1" style={{ cursor: "pointer", wordBreak: "break-word" }}
                    onClick={() => { setEditingId(o.id); setEditValue(o.text); }}
                  >
                    {o.text.substring(0, 40)}{o.text.length > 40 ? "…" : ""}
                  </div>
                )}

                <div className="flex gap-1 mb-1" style={{ alignItems: "center" }}>
                  <label className="text-xs" style={{ width: 50, color: "var(--text-muted)" }}>Size</label>
                  <input
                    type="range" min={12} max={120} value={o.fontSize}
                    onChange={(e) => updateOverlay(o.id, { fontSize: Number(e.target.value) })}
                    style={{ flex: 1 }}
                  />
                  <span className="text-xs font-mono">{o.fontSize}</span>
                </div>

                <div className="flex gap-1 mb-1" style={{ alignItems: "center" }}>
                  <label className="text-xs" style={{ width: 50, color: "var(--text-muted)" }}>X</label>
                  <input
                    type="range" min={0.05} max={0.95} step={0.01} value={o.x}
                    onChange={(e) => updateOverlay(o.id, { x: Number(e.target.value) })}
                    style={{ flex: 1 }}
                  />
                  <span className="text-xs font-mono">{(o.x * 100).toFixed(0)}%</span>
                </div>

                <div className="flex gap-1 mb-1" style={{ alignItems: "center" }}>
                  <label className="text-xs" style={{ width: 50, color: "var(--text-muted)" }}>Y</label>
                  <input
                    type="range" min={0.05} max={0.95} step={0.01} value={o.y}
                    onChange={(e) => updateOverlay(o.id, { y: Number(e.target.value) })}
                    style={{ flex: 1 }}
                  />
                  <span className="text-xs font-mono">{(o.y * 100).toFixed(0)}%</span>
                </div>

                <div className="flex gap-1" style={{ alignItems: "center" }}>
                  <label className="text-xs" style={{ width: 50, color: "var(--text-muted)" }}>Color</label>
                  <div className="flex gap-1 flex-wrap">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        className="btn"
                        onClick={() => updateOverlay(o.id, { color: c })}
                        style={{
                          width: 18, height: 18, borderRadius: "50%", padding: 0,
                          background: c, border: o.color === c ? "2px solid var(--accent)" : "1px solid var(--border-color)",
                          cursor: "pointer",
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mt-1">
                  <label className="flex items-center gap-1 text-xs" style={{ cursor: "pointer" }}>
                    <input type="checkbox" checked={o.bold} onChange={(e) => updateOverlay(o.id, { bold: e.target.checked })} />
                    Bold
                  </label>
                  <label className="flex items-center gap-1 text-xs" style={{ cursor: "pointer" }}>
                    <input type="checkbox" checked={o.shadow} onChange={(e) => updateOverlay(o.id, { shadow: e.target.checked })} />
                    Shadow
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}