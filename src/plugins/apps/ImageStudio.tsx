// ─── AI Studio OS: Image Studio ──────────────────────────────────
// Photo editor with filters, adjustments, layers, text, drawing, crop.
// Single file, no unrequested abstractions.

import { useState, useRef, useCallback, useEffect } from "react";
import type { AppModule } from "../types";

// ─── Types ──────────────────────────────────────────────────────

interface ImageLayer {
  id: string;
  name: string;
  src: string;
  img: HTMLImageElement | null;
  opacity: number;
  blendMode: GlobalCompositeOperation;
  visible: boolean;
}

interface TextOverlay {
  id: string;
  text: string;
  x: number; y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  align: CanvasTextAlign;
}

interface CropRegion {
  x: number; y: number;
  width: number; height: number;
}

interface HistoryEntry {
  imageData: ImageData;
  layers: ImageLayerState[];
}

interface ImageLayerState {
  id: string;
  opacity: number;
  blendMode: GlobalCompositeOperation;
  visible: boolean;
}

// ─── Filter presets ──────────────────────────────────────────────

const FILTERS = [
  { id: "none", name: "None", css: "" },
  { id: "grayscale", name: "Grayscale", css: "grayscale(100%)" },
  { id: "sepia", name: "Sepia", css: "sepia(80%)" },
  { id: "invert", name: "Invert", css: "invert(100%)" },
  { id: "warm", name: "Warm", css: "sepia(30%) saturate(140%) hue-rotate(-10deg)" },
  { id: "cool", name: "Cool", css: "saturate(80%) hue-rotate(20deg)" },
  { id: "vintage", name: "Vintage", css: "sepia(50%) contrast(90%) brightness(110%)" },
  { id: "dramatic", name: "Dramatic", css: "contrast(140%) brightness(90%) saturate(130%)" },
  { id: "fade", name: "Fade", css: "brightness(110%) contrast(90%) saturate(70%) opacity(90%)" },
  { id: "noir", name: "Noir", css: "grayscale(100%) contrast(150%) brightness(80%)" },
];

const BLEND_MODES: { id: GlobalCompositeOperation; name: string }[] = [
  { id: "source-over", name: "Normal" },
  { id: "multiply", name: "Multiply" },
  { id: "screen", name: "Screen" },
  { id: "overlay", name: "Overlay" },
  { id: "lighten", name: "Lighten" },
  { id: "darken", name: "Darken" },
  { id: "color-dodge", name: "Dodge" },
  { id: "color-burn", name: "Burn" },
  { id: "hard-light", name: "Hard Light" },
  { id: "soft-light", name: "Soft Light" },
];

const DRAW_SIZES = [2, 4, 8, 16, 24, 48];
const DRAW_COLORS = ["#000000", "#ffffff", "#ff4444", "#ff6600", "#ffcc00", "#44cc44", "#00aaff", "#6666ff", "#cc44cc"];

// ─── Helpers ────────────────────────────────────────────────────

let _id = 0;
const uid = () => `is-${++_id}`;

function applyFilters(ctx: CanvasRenderingContext2D, filter: string) {
  if (filter && filter !== "none") {
    ctx.filter = filter;
  }
}

// ─── Plugin Registration ────────────────────────────────────────

export const ImageStudio: AppModule = {
  register(r) {
    r.register({
      id: "image-studio",
      name: "Image Studio",
      description: "Photo editing with filters, adjustments, layers, and masking",
      icon: "🎨",
      version: "1.0.0",
      category: "image",
      component: ImageStudioWorkspace,
    });
  },
};

// ─── Workspace ──────────────────────────────────────────────────

type Tool = "select" | "crop" | "text" | "brush" | "eyedropper";

function ImageStudioWorkspace() {
  const [bgColor, setBgColor] = useState("#1a1a1e");
  const [layers, setLayers] = useState<ImageLayer[]>([]);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedLayerIdx, setSelectedLayerIdx] = useState(-1);
  const [activeFilter, setActiveFilter] = useState("none");
  const [adjustments, setAdjustments] = useState({ brightness: 100, contrast: 100, saturation: 100, exposure: 0 });
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [crop, setCrop] = useState<CropRegion | null>(null);
  const [cropActive, setCropActive] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState("");
  const [textActive, setTextActive] = useState(false);
  const [drawSize, setDrawSize] = useState(8);
  const [drawColor, setDrawColor] = useState("#ffffff");
  const [drawing, setDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [imageInfo, setImageInfo] = useState({ width: 0, height: 0, name: "" });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  // ── Save history snapshot ──
  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const layerStates: ImageLayerState[] = layers.map((l) => ({
      id: l.id, opacity: l.opacity, blendMode: l.blendMode, visible: l.visible,
    }));
    const entry: HistoryEntry = { imageData, layers: layerStates };
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIdx + 1);
      return [...truncated, entry].slice(-50); // max 50 undo steps
    });
    setHistoryIdx((prev) => Math.min(prev + 1, 49));
  }, [layers, historyIdx]);

  // ── Undo / Redo ──
  const undo = useCallback(() => {
    if (historyIdx < 0) return;
    const entry = history[historyIdx];
    if (!entry) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(entry.imageData, 0, 0);
    setHistoryIdx(historyIdx - 1);
  }, [history, historyIdx]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 2) return;
    const entry = history[historyIdx + 2];
    if (!entry) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(entry.imageData, 0, 0);
    setHistoryIdx(historyIdx + 1);
  }, [history, historyIdx]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleExport(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  // ── Render canvas ──
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    // Draw each layer
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (!layer.visible || !layer.img) continue;

      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode;

      // Apply filter + adjustments to the active layer only
      if (i === selectedLayerIdx) {
        const filters: string[] = [];
        if (activeFilter !== "none") filters.push(activeFilter);
        if (adjustments.brightness !== 100) filters.push(`brightness(${adjustments.brightness}%)`);
        if (adjustments.contrast !== 100) filters.push(`contrast(${adjustments.contrast}%)`);
        if (adjustments.saturation !== 100) filters.push(`saturate(${adjustments.saturation}%)`);
        if (adjustments.exposure !== 0) {
          const e = adjustments.exposure;
          filters.push(`brightness(${100 + e}%)`);
        }
        if (filters.length > 0) ctx.filter = filters.join(" ");
      }

      // Fit image to canvas preserving aspect ratio
      const imgW = layer.img.naturalWidth;
      const imgH = layer.img.naturalHeight;
      const scale = Math.min(w / imgW, h / imgH);
      const dx = (w - imgW * scale) / 2;
      const dy = (h - imgH * scale) / 2;
      ctx.drawImage(layer.img, dx, dy, imgW * scale, imgH * scale);

      ctx.restore();
    }

    // Crop overlay
    if (cropActive && crop) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, w, crop.y);
      ctx.fillRect(0, crop.y + crop.height, w, h - crop.y - crop.height);
      ctx.fillRect(0, crop.y, crop.x, crop.height);
      ctx.fillRect(crop.x + crop.width, crop.y, w - crop.x - crop.width, crop.height);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);
      ctx.setLineDash([]);
    }

    // Draw text overlays
    for (const t of textOverlays) {
      ctx.save();
      ctx.font = `${t.italic ? "italic " : ""}${t.bold ? "bold " : ""}${t.fontSize}px ${t.fontFamily}`;
      ctx.fillStyle = t.color;
      ctx.textAlign = t.align;
      ctx.textBaseline = "top";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }

    // Image info overlay
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "11px monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${imageInfo.width}×${imageInfo.height} · ${crop ? `${Math.round(crop.width)}×${Math.round(crop.height)}` : "no crop"}`, w - 8, h - 4);
  }, [layers, textOverlays, selectedLayerIdx, activeFilter, adjustments, crop, cropActive, bgColor, imageInfo]);

  useEffect(() => { render(); }, [render]);

  // ── Import image ──
  const loadImage = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImageInfo({ width: img.naturalWidth, height: img.naturalHeight, name: file.name });
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
      const layer: ImageLayer = {
        id: uid(), name: file.name, src: url, img,
        opacity: 1, blendMode: "source-over", visible: true,
      };
      setLayers([layer]);
      setSelectedLayerIdx(0);
      setCrop(null);
      setCropActive(false);
      setTextOverlays([]);
      setTimeout(saveHistory, 50);
    };
    img.src = url;
  }, [saveHistory]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
  }, [loadImage]);

  // Handle paste
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const file = e.clipboardData?.files?.[0];
      if (file && file.type.startsWith("image/")) loadImage(file);
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [loadImage]);

  // ── Crop: start ──
  const handleCropStart = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    setCropStart({ x, y });
    setCrop({ x, y, width: 0, height: 0 });
  }, [cropActive]);

  const handleCropMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropActive || !crop) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    setCrop({
      x: Math.min(cropStart.x, x),
      y: Math.min(cropStart.y, y),
      width: Math.abs(x - cropStart.x),
      height: Math.abs(y - cropStart.y),
    });
  }, [cropActive, crop, cropStart]);

  const handleCropEnd = useCallback(() => {
    if (!cropActive || !crop || crop.width < 10 || crop.height < 10) {
      setCrop(null);
      return;
    }
    // Apply crop
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cropped = ctx.getImageData(crop.x, crop.y, crop.width, crop.height);
    canvas.width = crop.width;
    canvas.height = crop.height;
    ctx.putImageData(cropped, 0, 0);

    setImageInfo((prev) => ({ ...prev, width: crop.width, height: crop.height }));
    setCrop(null);
    setCropActive(false);
    saveHistory();
  }, [cropActive, crop, saveHistory]);

  // ── Drawing ──
  const handleDrawStart = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "brush") return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    setDrawing(true);
    setLastPoint({ x, y });

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = drawSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  }, [activeTool, drawColor, drawSize]);

  const handleDrawMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || activeTool !== "brush") return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = drawSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    setLastPoint({ x, y });
  }, [drawing, activeTool, drawColor, drawSize, lastPoint]);

  const handleDrawEnd = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    // Merge draw canvas onto main canvas
    const drawCanvas = drawCanvasRef.current;
    const mainCanvas = canvasRef.current;
    if (!drawCanvas || !mainCanvas) return;
    const drawCtx = drawCanvas.getContext("2d");
    const mainCtx = mainCanvas.getContext("2d");
    if (!drawCtx || !mainCtx) return;

    mainCtx.drawImage(drawCanvas, 0, 0);
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    saveHistory();
  }, [drawing, saveHistory]);

  // ── Add text ──
  const addText = useCallback(() => {
    if (!textInput.trim()) return;
    const t: TextOverlay = {
      id: uid(), text: textInput, x: 40, y: 40,
      fontSize: 48, color: "#ffffff", fontFamily: "sans-serif",
      bold: false, italic: false, align: "left",
    };
    setTextOverlays((prev) => [...prev, t]);
    setTextInput("");
    setTextActive(false);
    saveHistory();
  }, [textInput, saveHistory]);

  // ── Export ──
  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = imageInfo.name ? imageInfo.name.replace(/\.[^.]+$/, "") + "-edited.png" : "image-studio-export.png";
    a.click();
  }, [imageInfo.name]);

  // ── Fill canvas with solid color / gradient ──
  const fillCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveHistory();
  }, [bgColor, saveHistory]);

  // ── Render ──
  return (
    <div className="panel-container" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 p-2 border-bottom" style={{ background: "var(--bg-secondary)", flexShrink: 0, flexWrap: "wrap" }}>
        {/* File */}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImport} style={{ display: "none" }} />
        <button className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()}>📁 Open</button>
        <button className="btn btn-outline btn-sm" onClick={fillCanvas}>🎨 Fill</button>
        <button className="btn btn-primary btn-sm" onClick={handleExport}>📥 Export PNG</button>

        <div className="mx-1" style={{ width: 1, height: 20, background: "var(--border-color)" }} />

        {/* Undo/Redo */}
        <button className="btn btn-sm" onClick={undo} disabled={historyIdx < 0} title="Undo (Ctrl+Z)">↩</button>
        <button className="btn btn-sm" onClick={redo} disabled={historyIdx >= history.length - 2} title="Redo (Ctrl+Y)">↪</button>

        <div className="mx-1" style={{ width: 1, height: 20, background: "var(--border-color)" }} />

        {/* Tools */}
        <button className={`btn btn-sm ${activeTool === "select" ? "btn-primary" : ""}`} onClick={() => setActiveTool("select")}>↖ Select</button>
        <button className={`btn btn-sm ${activeTool === "crop" ? "btn-primary" : ""}`} onClick={() => { setActiveTool("crop"); setCropActive(!cropActive); setCrop(null); }}>
          ✂ Crop
        </button>
        <button className={`btn btn-sm ${activeTool === "text" ? "btn-primary" : ""}`} onClick={() => { setActiveTool("text"); setTextActive(!textActive); }}>T Text</button>
        <button className={`btn btn-sm ${activeTool === "brush" ? "btn-primary" : ""}`} onClick={() => setActiveTool("brush")}>✏️ Brush</button>

        {activeTool === "brush" && (
          <>
            <select
              className="input"
              value={drawSize}
              onChange={(e) => setDrawSize(Number(e.target.value))}
              style={{ padding: "2px 4px", fontSize: 11, width: 56 }}
            >
              {DRAW_SIZES.map((s) => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>
            {DRAW_COLORS.map((c) => (
              <button
                key={c}
                className="btn"
                onClick={() => setDrawColor(c)}
                style={{
                  width: 16, height: 16, borderRadius: "50%", padding: 0,
                  background: c, border: drawColor === c ? "2px solid var(--accent)" : "1px solid var(--border-color)",
                }}
              />
            ))}
          </>
        )}

        <div className="flex-1" />

        {/* Zoom */}
        <span className="text-xs font-mono">{Math.round(zoom * 100)}%</span>
        <input
          type="range" min={0.1} max={4} step={0.1} value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={{ width: 60 }}
        />
        <button className="btn btn-sm" onClick={() => setZoom(1)}>1:1</button>
        <button className="btn btn-sm" onClick={() => setZoom(zoom >= 2 ? 0.25 : zoom + 0.5)}>Fit</button>
      </div>

      {/* ── Main area ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── Left: Filters & Adjustments ── */}
        <div className="panel-left" style={{ width: 200, flexShrink: 0, overflowY: "auto", borderRight: "1px solid var(--border-color)", background: "var(--bg-secondary)", padding: 8 }}>
          {/* Filters */}
          <h4 className="text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>Filters</h4>
          <div className="flex flex-wrap gap-1 mb-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={`btn btn-sm ${activeFilter === f.id ? "btn-primary" : ""}`}
                onClick={() => { setActiveFilter(f.id); saveHistory(); }}
                style={{ fontSize: 10, padding: "3px 6px" }}
              >
                {f.name}
              </button>
            ))}
          </div>

          {/* Adjustments */}
          <h4 className="text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>Adjustments</h4>
          {[
            { label: "Brightness", key: "brightness" as const, min: 0, max: 200 },
            { label: "Contrast", key: "contrast" as const, min: 0, max: 200 },
            { label: "Saturation", key: "saturation" as const, min: 0, max: 200 },
            { label: "Exposure", key: "exposure" as const, min: -50, max: 50 },
          ].map((adj) => (
            <div key={adj.key} className="mb-1">
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--text-muted)" }}>{adj.label}</span>
                <span className="font-mono">{adjustments[adj.key]}</span>
              </div>
              <input
                type="range" min={adj.min} max={adj.max} value={adjustments[adj.key]}
                onChange={(e) => {
                  setAdjustments((prev) => ({ ...prev, [adj.key]: Number(e.target.value) }));
                  saveHistory();
                }}
                style={{ width: "100%" }}
              />
            </div>
          ))}

          {/* Text input */}
          {textActive && (
            <div className="mt-2">
              <h4 className="text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>Add Text</h4>
              <input
                className="input"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addText(); }}
                placeholder="Type text and press Enter"
                style={{ width: "100%", padding: "3px 6px", fontSize: 11 }}
                autoFocus
              />
            </div>
          )}

          {/* Background color */}
          <div className="mt-2">
            <h4 className="text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>Background</h4>
            <div className="flex gap-1 flex-wrap">
              {["#1a1a1e", "#ffffff", "#000000", "#222222", "#333333", "#ff0000", "#00ff00", "#0000ff", "#ffcc00", "#ff6600"].map((c) => (
                <button
                  key={c}
                  className="btn"
                  onClick={() => setBgColor(c)}
                  style={{
                    width: 20, height: 20, borderRadius: "var(--radius-sm)", padding: 0,
                    background: c, border: bgColor === c ? "2px solid var(--accent)" : "1px solid var(--border-color)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Center: Canvas ── */}
        <div
          ref={containerRef}
          className="flex-1 flex-center"
          style={{ overflow: "hidden", background: "var(--bg-primary)", position: "relative" }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file && file.type.startsWith("image/")) loadImage(file);
          }}
        >
          <div style={{ position: "relative", transform: `scale(${zoom})`, transformOrigin: "center center" }}>
            <canvas
              ref={canvasRef}
              onMouseDown={activeTool === "crop" ? handleCropStart : activeTool === "brush" ? handleDrawStart : undefined}
              onMouseMove={activeTool === "crop" ? handleCropMove : activeTool === "brush" ? handleDrawMove : undefined}
              onMouseUp={activeTool === "crop" ? handleCropEnd : activeTool === "brush" ? handleDrawEnd : undefined}
              onMouseLeave={activeTool === "brush" ? handleDrawEnd : undefined}
              style={{
                maxWidth: "90vw", maxHeight: "70vh",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 2px 16px rgba(0,0,0,0.3)",
                cursor: activeTool === "crop" ? "crosshair" : activeTool === "brush" ? "crosshair" : "default",
              }}
            />
            {/* Draw overlay canvas */}
            <canvas
              ref={drawCanvasRef}
              width={imageInfo.width || 1920}
              height={imageInfo.height || 1080}
              style={{
                position: "absolute", top: 0, left: 0,
                pointerEvents: activeTool === "brush" ? "auto" : "none",
                opacity: activeTool === "brush" ? 1 : 0,
                borderRadius: "var(--radius-md)",
                cursor: "crosshair",
              }}
            />
          </div>

          {layers.length === 0 && (
            <div
              className="flex-center"
              style={{
                position: "absolute", inset: 0,
                color: "var(--text-muted)", fontSize: 14,
                flexDirection: "column", gap: 8,
                pointerEvents: "none",
              }}
            >
              <span style={{ fontSize: 48 }}>🎨</span>
              <span>Open an image or paste one (Ctrl+V)</span>
              <span style={{ fontSize: 11 }}>Drop files or click Open to start</span>
            </div>
          )}
        </div>

        {/* ── Right: Layers + Text overlays ── */}
        <div className="panel-right" style={{ width: 220, flexShrink: 0, overflowY: "auto", borderLeft: "1px solid var(--border-color)", background: "var(--bg-secondary)" }}>
          <div className="p-2">
            {/* Text overlays */}
            {textOverlays.length > 0 && (
              <div className="mb-2">
                <h4 className="text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>Text Overlays ({textOverlays.length})</h4>
                {textOverlays.map((t, i) => (
                  <div key={t.id} className="mb-1 p-1" style={{ background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)" }}>
                    <div className="text-xs font-mono mb-1" style={{ wordBreak: "break-all" }}>{t.text.substring(0, 30)}</div>
                    <div className="flex gap-1">
                      <input
                        type="range" min={12} max={120} value={t.fontSize}
                        onChange={(e) => {
                          const newSize = Number(e.target.value);
                          setTextOverlays((prev) => prev.map((ot, oi) => oi === i ? { ...ot, fontSize: newSize } : ot));
                        }}
                        style={{ flex: 1, height: 16 }}
                      />
                      <span className="text-xs font-mono">{t.fontSize}</span>
                    </div>
                    <div className="flex gap-1 items-center mt-1">
                      <input
                        type="range" min={0} max={canvasRef.current?.width || 1920} value={t.x}
                        onChange={(e) => setTextOverlays((prev) => prev.map((ot, oi) => oi === i ? { ...ot, x: Number(e.target.value) } : ot))}
                        style={{ flex: 1, height: 16 }}
                      />
                      <span className="text-xs font-mono" style={{ minWidth: 30 }}>X</span>
                    </div>
                    <div className="flex gap-1 items-center mt-1">
                      <input
                        type="range" min={0} max={canvasRef.current?.height || 1080} value={t.y}
                        onChange={(e) => setTextOverlays((prev) => prev.map((ot, oi) => oi === i ? { ...ot, y: Number(e.target.value) } : ot))}
                        style={{ flex: 1, height: 16 }}
                      />
                      <span className="text-xs font-mono" style={{ minWidth: 30 }}>Y</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: 10, padding: "2px 4px" }}
                        onClick={() => setTextOverlays((prev) => prev.map((ot, oi) => oi === i ? { ...ot, bold: !ot.bold } : ot))}
                      >
                        {t.bold ? "🔲 Bold" : "◻️ Bold"}
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: 10, padding: "2px 4px", background: "var(--danger)", color: "#fff" }}
                        onClick={() => setTextOverlays((prev) => prev.filter((_, oi) => oi !== i))}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Layers */}
            <h4 className="text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>Layers</h4>
            {layers.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Open an image to begin</p>
            ) : (
              layers.map((layer, i) => (
                <div
                  key={layer.id}
                  className="flex items-center gap-1 mb-1 p-1"
                  style={{
                    background: selectedLayerIdx === i ? "var(--bg-hover)" : "var(--bg-tertiary)",
                    borderRadius: "var(--radius-sm)", cursor: "pointer",
                  }}
                  onClick={() => setSelectedLayerIdx(i)}
                >
                  <button
                    className="btn"
                    style={{ padding: 0, fontSize: 10, width: 16, height: 16, flexShrink: 0 }}
                    onClick={() => setLayers((prev) => prev.map((l, li) => li === i ? { ...l, visible: !l.visible } : l))}
                  >
                    {layer.visible ? "👁" : "🚫"}
                  </button>
                  <span className="text-xs font-mono" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {layer.name.substring(0, 18)}
                  </span>
                  <select
                    className="input"
                    value={layer.blendMode}
                    onChange={(e) => setLayers((prev) => prev.map((l, li) => li === i ? { ...l, blendMode: e.target.value as GlobalCompositeOperation } : l))}
                    style={{ fontSize: 10, padding: "1px 2px", width: 64 }}
                  >
                    {BLEND_MODES.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
