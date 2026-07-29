// ─── AI Studio OS: Presentation Studio ───────────────────────────
// Slide-based presentation editor with transitions, speaker notes,
// and export. Single file, no unrequested abstractions.

import { useState, useRef, useCallback, useEffect } from "react";
import type { AppModule } from "../types";

// ─── Types ──────────────────────────────────────────────────────

type SlideElement = TextElement | ImageElement | ShapeElement;

interface TextElement {
  id: string;
  type: "text";
  text: string;
  x: number; y: number;
  width: number; height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  align: "left" | "center" | "right";
  bold: boolean;
  italic: boolean;
}

interface ImageElement {
  id: string;
  type: "image";
  src: string;
  x: number; y: number;
  width: number; height: number;
  opacity: number;
}

interface ShapeElement {
  id: string;
  type: "shape";
  kind: "rectangle" | "ellipse" | "rounded-rect";
  x: number; y: number;
  width: number; height: number;
  fill: string;
  stroke?: string;
  strokeWidth: number;
  opacity: number;
}

interface Slide {
  id: string;
  name: string;
  elements: SlideElement[];
  background: string;
  transition: { type: "none" | "fade" | "slide-left" | "slide-right" | "zoom"; duration: number };
  notes: string;
}

interface Presentation {
  name: string;
  slides: Slide[];
  width: number;
  height: number;
  currentSlide: number;
}

// ─── Theme presets ───────────────────────────────────────────────

const THEMES = [
  { name: "Dark", bg: "#1a1a2e", text: "#ffffff", accent: "#e94560" },
  { name: "Light", bg: "#ffffff", text: "#1a1a1a", accent: "#4361ee" },
  { name: "Minimal", bg: "#f8f9fa", text: "#212529", accent: "#0d6efd" },
  { name: "Nature", bg: "#1b4332", text: "#d8f3dc", accent: "#52b788" },
  { name: "Sunset", bg: "#2d1b69", text: "#fdf0d5", accent: "#f77f00" },
  { name: "Ocean", bg: "#023e8a", text: "#caf0f8", accent: "#00b4d8" },
  { name: "Coral", bg: "#2b2d42", text: "#edf2f4", accent: "#ef233c" },
  { name: "Coffee", bg: "#3e2723", text: "#efebe9", accent: "#a1887f" },
];

const TRANSITIONS = [
  { id: "none", name: "None" },
  { id: "fade", name: "Fade" },
  { id: "slide-left", name: "Slide Left" },
  { id: "slide-right", name: "Slide Right" },
  { id: "zoom", name: "Zoom" },
];

// ─── Helpers ────────────────────────────────────────────────────

let _id = 0;
const uid = () => `ps-${++_id}`;

const SLIDE_W = 1280;
const SLIDE_H = 720;

function makeSlide(name: string, themeBg: string): Slide {
  return {
    id: uid(),
    name,
    elements: [],
    background: themeBg,
    transition: { type: "none", duration: 0.5 },
    notes: "",
  };
}

function makePresentation(): Presentation {
  const theme = THEMES[0];
  return {
    name: "Untitled Presentation",
    slides: [
      {
        id: uid(), name: "Title Slide",
        elements: [
          { id: uid(), type: "text", text: "Your Title Here", x: 200, y: 200, width: 880, height: 100, fontSize: 64, fontFamily: "sans-serif", color: "#ffffff", align: "center", bold: true, italic: false },
          { id: uid(), type: "text", text: "Subtitle goes here", x: 200, y: 340, width: 880, height: 60, fontSize: 32, fontFamily: "sans-serif", color: theme.accent, align: "center", bold: false, italic: false },
        ],
        background: theme.bg,
        transition: { type: "fade", duration: 0.5 },
        notes: "Welcome everyone! Today we'll be covering...",
      },
      {
        id: uid(), name: "Agenda",
        elements: [
          { id: uid(), type: "text", text: "Agenda", x: 100, y: 60, width: 600, height: 70, fontSize: 48, fontFamily: "sans-serif", color: "#ffffff", align: "left", bold: true, italic: false },
          { id: uid(), type: "text", text: "• Introduction\n• Key Concepts\n• Demo\n• Q&A", x: 100, y: 180, width: 600, height: 300, fontSize: 28, fontFamily: "sans-serif", color: "#cccccc", align: "left", bold: false, italic: false },
        ],
        background: theme.bg,
        transition: { type: "slide-left", duration: 0.5 },
        notes: "Cover the agenda briefly.",
      },
      {
        id: uid(), name: "Content",
        elements: [
          { id: uid(), type: "text", text: "Key Point", x: 100, y: 60, width: 600, height: 70, fontSize: 48, fontFamily: "sans-serif", color: "#ffffff", align: "left", bold: true, italic: false },
          { id: uid(), type: "text", text: "This is where your main content goes.\nAdd text, images, and shapes to build\nyour presentation.", x: 100, y: 180, width: 700, height: 300, fontSize: 24, fontFamily: "sans-serif", color: "#cccccc", align: "left", bold: false, italic: false },
        ],
        background: theme.bg,
        transition: { type: "slide-right", duration: 0.5 },
        notes: "Explain the key point in detail.",
      },
    ],
    width: SLIDE_W,
    height: SLIDE_H,
    currentSlide: 0,
  };
}

// ─── Plugin Registration ────────────────────────────────────────

export const PresentationStudio: AppModule = {
  register(r) {
    r.register({
      id: "presentation-studio",
      name: "Presentation Studio",
      description: "Create slide decks with transitions and speaker notes",
      icon: "📽️",
      version: "1.0.0",
      category: "text",
      component: PresentationStudioWorkspace,
    });
  },
};

// ─── Workspace ──────────────────────────────────────────────────

function PresentationStudioWorkspace() {
  const [pres, setPres] = useState<Presentation>(makePresentation);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<{ id: string; text: string } | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [slideShow, setSlideShow] = useState(false);
  const [slideShowIdx, setSlideShowIdx] = useState(0);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; elX: number; elY: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; dir: string; startX: number; startY: number; elW: number; elH: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slideShowRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slideShowTimer = useRef<number>(0);

  const currentSlide = pres.slides[pres.currentSlide] || pres.slides[0];
  const theme = THEMES.find((t) => t.bg === currentSlide.background) || THEMES[0];

  // ── Render slide ──
  const renderSlide = useCallback((canvas: HTMLCanvasElement | null, slide: Slide, showSelection: boolean) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = pres.width;
    canvas.height = pres.height;

    // Background
    ctx.fillStyle = slide.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Elements
    for (const el of slide.elements) {
      ctx.save();

      if (el.type === "text") {
        const t = el as TextElement;
        ctx.font = `${t.italic ? "italic " : ""}${t.bold ? "bold " : ""}${t.fontSize}px ${t.fontFamily}`;
        ctx.fillStyle = t.color;
        ctx.textAlign = t.align === "center" ? "center" : t.align === "right" ? "right" : "left";
        ctx.textBaseline = "top";

        // Word wrap
        const maxW = t.width;
        const words = t.text.split(" ");
        let line = "";
        let ly = t.y;
        const lh = t.fontSize * 1.3;

        for (const word of words) {
          if (word === "\n") {
            if (line) ctx.fillText(line, t.align === "center" ? t.x + t.width / 2 : t.x, ly);
            line = "";
            ly += lh;
            continue;
          }
          const test = line ? `${line} ${word}` : word;
          const metrics = ctx.measureText(test);
          if (metrics.width > maxW && line) {
            ctx.fillText(line, t.align === "center" ? t.x + t.width / 2 : t.x, ly);
            line = word;
            ly += lh;
          } else {
            line = test;
          }
        }
        if (line) ctx.fillText(line, t.align === "center" ? t.x + t.width / 2 : t.x, ly);

      } else if (el.type === "shape") {
        const s = el as ShapeElement;
        ctx.globalAlpha = s.opacity;
        if (s.fill) { ctx.fillStyle = s.fill; }
        if (s.stroke) { ctx.strokeStyle = s.stroke; ctx.lineWidth = s.strokeWidth; }

        if (s.kind === "rectangle") {
          ctx.fillRect(s.x, s.y, s.width, s.height);
          if (s.stroke) ctx.strokeRect(s.x, s.y, s.width, s.height);
        } else if (s.kind === "ellipse") {
          ctx.beginPath();
          ctx.ellipse(s.x + s.width / 2, s.y + s.height / 2, s.width / 2, s.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          if (s.stroke) ctx.stroke();
        } else if (s.kind === "rounded-rect") {
          const r = Math.min(20, s.width / 4, s.height / 4);
          ctx.beginPath();
          ctx.roundRect(s.x, s.y, s.width, s.height, r);
          ctx.fill();
          if (s.stroke) ctx.stroke();
        }

      } else if (el.type === "image") {
        const img = el as ImageElement;
        ctx.globalAlpha = img.opacity;
        // Draw placeholder colored rect for image
        ctx.fillStyle = `hsl(${(img.id.charCodeAt(0) * 40) % 360}, 50%, 50%)`;
        ctx.fillRect(img.x, img.y, img.width, img.height);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🖼️", img.x + img.width / 2, img.y + img.height / 2);
      }

      ctx.restore();

      // Selection outline
      if (showSelection && selectedElement === el.id) {
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        if (el.type === "text") {
          const t = el as TextElement;
          ctx.strokeRect(t.x, t.y, t.width, t.height);
        } else {
          ctx.strokeRect(
            (el as any).x, (el as any).y,
            (el as any).width, (el as any).height,
          );
        }
        // Resize handles
        ctx.setLineDash([]);
        const handles = [
          { x: (el as any).x, y: (el as any).y },
          { x: (el as any).x + (el as any).width, y: (el as any).y },
          { x: (el as any).x, y: (el as any).y + (el as any).height },
          { x: (el as any).x + (el as any).width, y: (el as any).y + (el as any).height },
        ];
        for (const h of handles) {
          ctx.fillStyle = "#fff";
          ctx.strokeStyle = theme.accent;
          ctx.lineWidth = 1.5;
          ctx.fillRect(h.x - 4, h.y - 4, 8, 8);
          ctx.strokeRect(h.x - 4, h.y - 4, 8, 8);
        }
      }
    }
  }, [pres.width, pres.height, selectedElement, theme]);

  // Re-render on change
  useEffect(() => {
    renderSlide(canvasRef.current, currentSlide, true);
  }, [renderSlide, currentSlide]);

  // ── Slide navigation ──
  const goToSlide = useCallback((idx: number) => {
    setPres((prev) => ({ ...prev, currentSlide: Math.max(0, Math.min(idx, prev.slides.length - 1)) }));
    setSelectedElement(null);
    setEditingText(null);
  }, []);

  // ── Add slide ──
  const addSlide = useCallback(() => {
    setPres((prev) => {
      const idx = prev.currentSlide;
      const newSlide = makeSlide(`Slide ${prev.slides.length + 1}`, currentSlide.background);
      const slides = [...prev.slides];
      slides.splice(idx + 1, 0, newSlide);
      return { ...prev, slides, currentSlide: idx + 1 };
    });
    setSelectedElement(null);
  }, [currentSlide]);

  // ── Delete slide ──
  const deleteSlide = useCallback(() => {
    if (pres.slides.length <= 1) return;
    setPres((prev) => {
      const idx = prev.currentSlide;
      const slides = prev.slides.filter((_, i) => i !== idx);
      return { ...prev, slides, currentSlide: Math.min(idx, slides.length - 1) };
    });
    setSelectedElement(null);
  }, [pres.slides.length]);

  // ── Duplicate slide ──
  const duplicateSlide = useCallback(() => {
    setPres((prev) => {
      const idx = prev.currentSlide;
      const dup = { ...prev.slides[idx], id: uid(), name: prev.slides[idx].name + " (copy)", elements: prev.slides[idx].elements.map((e) => ({ ...e, id: uid() })) };
      const slides = [...prev.slides];
      slides.splice(idx + 1, 0, dup);
      return { ...prev, slides, currentSlide: idx + 1 };
    });
  }, []);

  // ── Add element ──
  const addElement = useCallback((type: "text" | "shape" | "image") => {
    setPres((prev) => {
      const slide = prev.slides[prev.currentSlide];
      let el: SlideElement;
      const cx = prev.width / 2 - 150;
      const cy = prev.height / 2 - 50;

      if (type === "text") {
        el = { id: uid(), type: "text", text: "New Text", x: cx, y: cy, width: 300, height: 50, fontSize: 28, fontFamily: "sans-serif", color: "#ffffff", align: "left", bold: false, italic: false };
      } else if (type === "shape") {
        el = { id: uid(), type: "shape", kind: "rectangle", x: cx, y: cy, width: 200, height: 150, fill: theme.accent, stroke: undefined, strokeWidth: 0, opacity: 0.8 };
      } else {
        el = { id: uid(), type: "image", src: "", x: cx, y: cy, width: 300, height: 200, opacity: 1 };
      }

      const slides = prev.slides.map((s, i) => i === prev.currentSlide ? { ...s, elements: [...s.elements, el] } : s);
      return { ...prev, slides };
    });
    setSelectedElement(null);
  }, [theme]);

  // ── Update element ──
  const updateElement = useCallback((id: string, patch: Partial<SlideElement>) => {
    setPres((prev) => ({
      ...prev,
      slides: prev.slides.map((s, i) => i === prev.currentSlide ? {
        ...s,
        elements: s.elements.map((e) => e.id === id ? { ...e, ...patch } as SlideElement : e),
      } : s),
    }));
  }, []);

  // ── Delete element ──
  const deleteElement = useCallback((id: string) => {
    setPres((prev) => ({
      ...prev,
      slides: prev.slides.map((s, i) => i === prev.currentSlide ? {
        ...s,
        elements: s.elements.filter((e) => e.id !== id),
      } : s),
    }));
    if (selectedElement === id) setSelectedElement(null);
  }, [selectedElement]);

  // ── Canvas click / drag ──
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (slideShow) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = pres.width / rect.width;
    const scaleY = pres.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // Check if clicking on element
    for (let i = currentSlide.elements.length - 1; i >= 0; i--) {
      const el = currentSlide.elements[i];
      const ex = (el as any).x;
      const ey = (el as any).y;
      const ew = (el as any).width;
      const eh = (el as any).height;

      if (mx >= ex && mx <= ex + ew && my >= ey && my <= ey + eh) {
        setSelectedElement(el.id);
        setDragging({ id: el.id, startX: e.clientX, startY: e.clientY, elX: ex, elY: ey });
        return;
      }
    }

    // Double-click text to edit
    if (selectedElement) {
      const el = currentSlide.elements.find((e) => e.id === selectedElement);
      if (el && el.type === "text") {
        setEditingText({ id: el.id, text: (el as TextElement).text });
      }
    }

    setSelectedElement(null);
  }, [slideShow, currentSlide, pres.width, pres.height, selectedElement]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (slideShow) return;
    if (dragging) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = pres.width / rect.width;
      const scaleY = pres.height / rect.height;
      const dx = (e.clientX - dragging.startX) * scaleX;
      const dy = (e.clientY - dragging.startY) * scaleY;
      updateElement(dragging.id, { x: dragging.elX + dx, y: dragging.elY + dy } as any);
    }
  }, [slideShow, dragging, pres.width, pres.height, updateElement]);

  const handleCanvasMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
  }, []);

  // ── Apply theme ──
  const applyTheme = useCallback((t: typeof THEMES[0]) => {
    setPres((prev) => ({
      ...prev,
      slides: prev.slides.map((s) => ({
        ...s,
        background: t.bg,
        elements: s.elements.map((e) => {
          if (e.type === "text" && (e as TextElement).color === "#ffffff" || (e as TextElement).color === "#cccccc") {
            return { ...e, color: t.text } as SlideElement;
          }
          if (e.type === "text") return e;
          return e;
        }),
      }) as Slide),
    }));
  }, []);

  // ── Slideshow ──
  const startSlideshow = useCallback(() => {
    setSlideShow(true);
    setSlideShowIdx(pres.currentSlide);
  }, [pres.currentSlide]);

  const stopSlideshow = useCallback(() => {
    setSlideShow(false);
    clearInterval(slideShowTimer.current);
  }, []);

  // Slideshow keyboard nav
  useEffect(() => {
    if (!slideShow) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setSlideShowIdx((prev) => Math.min(prev + 1, pres.slides.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setSlideShowIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Escape") {
        stopSlideshow();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [slideShow, pres.slides.length, stopSlideshow]);

  // Render slideshow frame
  useEffect(() => {
    if (!slideShow) return;
    renderSlide(slideShowRef.current, pres.slides[slideShowIdx], false);
  }, [slideShow, slideShowIdx, pres.slides, renderSlide]);

  // ── Export to PDF (via HTML print) ──
  const handleExport = useCallback(() => {
    // Generate an HTML document that shows all slides, then use print
    let html = `<!DOCTYPE html><html><head>
      <style>
        @page { size: ${pres.width}px ${pres.height}px; margin: 0; }
        body { margin: 0; padding: 0; }
        .slide { width: ${pres.width}px; height: ${pres.height}px; page-break-after: always; overflow: hidden; position: relative; }
      </style>
    </head><body>`;

    for (const slide of pres.slides) {
      html += `<div class="slide" style="background: ${slide.background}">`;
      for (const el of slide.elements) {
        if (el.type === "text") {
          const t = el as TextElement;
          html += `<div style="position:absolute; left:${t.x}px; top:${t.y}px; width:${t.width}px; font-size:${t.fontSize}px; font-family:${t.fontFamily}; color:${t.color}; text-align:${t.align}; font-weight:${t.bold ? 'bold' : 'normal'}; font-style:${t.italic ? 'italic' : 'normal'}">${t.text.replace(/\n/g, '<br>')}</div>`;
        } else if (el.type === "shape") {
          const s = el as ShapeElement;
          html += `<div style="position:absolute; left:${s.x}px; top:${s.y}px; width:${s.width}px; height:${s.height}px; background:${s.fill}; opacity:${s.opacity}; border-radius:${s.kind === 'ellipse' ? '50%' : s.kind === 'rounded-rect' ? '20px' : '0px'}"></div>`;
        }
      }
      html += `</div>`;
    }

    html += `</body></html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  }, [pres]);

  // ── Render ──
  return (
    <div className="panel-container" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 p-2 border-bottom" style={{ background: "var(--bg-secondary)", flexShrink: 0, flexWrap: "wrap" }}>
        <input
          className="input"
          value={pres.name}
          onChange={(e) => setPres((prev) => ({ ...prev, name: e.target.value }))}
          style={{ padding: "4px 8px", fontSize: 13, width: 200, border: "none", background: "transparent", fontWeight: "bold" }}
        />
        <div className="flex-1" />
        <button className="btn btn-outline btn-sm" onClick={() => addElement("text")}>T Text</button>
        <button className="btn btn-outline btn-sm" onClick={() => addElement("shape")}>⬜ Shape</button>
        <button className="btn btn-outline btn-sm" onClick={() => {
          fileInputRef.current?.click();
        }}>🖼️ Image</button>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            addElement("image");
            // Set the src on the most recently added element
            setTimeout(() => {
              setPres((prev) => {
                const slide = prev.slides[prev.currentSlide];
                const lastEl = slide.elements[slide.elements.length - 1];
                if (lastEl && lastEl.type === "image") {
                  return {
                    ...prev,
                    slides: prev.slides.map((s, i) => i === prev.currentSlide ? {
                      ...s,
                      elements: s.elements.map((e) => e.id === lastEl.id ? { ...e, src: url } as SlideElement : e),
                    } : s),
                  };
                }
                return prev;
              });
            }, 50);
          }}
        />
        <div className="mx-1" style={{ width: 1, height: 20, background: "var(--border-color)" }} />
        <button className="btn btn-sm" onClick={addSlide}>+ Slide</button>
        <button className="btn btn-sm" onClick={duplicateSlide}>📋 Dup</button>
        <button className="btn btn-sm" onClick={deleteSlide} disabled={pres.slides.length <= 1}>🗑 Delete</button>
        <div className="mx-1" style={{ width: 1, height: 20, background: "var(--border-color)" }} />
        <button className="btn btn-primary btn-sm" onClick={startSlideshow}>▶️ Present</button>
        <button className="btn btn-outline btn-sm" onClick={handleExport}>📥 Export PDF</button>
        <button className="btn btn-sm" onClick={() => setShowNotes(!showNotes)} title="Speaker notes">
          {showNotes ? "📝 Notes" : "📝"}
        </button>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── Left: Slide Thumbnails ── */}
        <div className="panel-left" style={{ width: 160, flexShrink: 0, overflowY: "auto", borderRight: "1px solid var(--border-color)", background: "var(--bg-secondary)", padding: 6 }}>
          {pres.slides.map((slide, i) => (
            <div
              key={slide.id}
              className="flex items-center gap-1 mb-1 p-1"
              style={{
                background: pres.currentSlide === i ? "var(--bg-hover)" : "transparent",
                borderRadius: "var(--radius-sm)", cursor: "pointer",
                border: pres.currentSlide === i ? "1px solid var(--accent)" : "1px solid transparent",
              }}
              onClick={() => goToSlide(i)}
            >
              {/* Mini thumbnail */}
              <div
                style={{
                  width: 40, height: 22.5, borderRadius: 2, flexShrink: 0,
                  background: slide.background,
                  border: "1px solid var(--border-color)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 8, color: "rgba(255,255,255,0.5)",
                  overflow: "hidden",
                }}
              >
                {slide.elements.length > 0 && slide.elements[0].type === "text" ? (
                  <span style={{ fontSize: 6, color: (slide.elements[0] as TextElement).color, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 36, whiteSpace: "nowrap" }}>
                    {(slide.elements[0] as TextElement).text.substring(0, 8)}
                  </span>
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <div className="text-xs" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10 }}>
                {slide.name}
              </div>
            </div>
          ))}
        </div>

        {/* ── Center: Canvas ── */}
        <div className="flex-1 flex-center" style={{ overflow: "auto", background: "var(--bg-primary)", position: "relative" }}>
          {!slideShow ? (
            <>
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onDoubleClick={() => {
                  if (selectedElement) {
                    const el = currentSlide.elements.find((e) => e.id === selectedElement);
                    if (el && el.type === "text") {
                      setEditingText({ id: el.id, text: (el as TextElement).text });
                    }
                  }
                }}
                style={{
                  maxWidth: "100%", maxHeight: "100%",
                  objectFit: "contain", borderRadius: "var(--radius-md)",
                  boxShadow: "0 2px 16px rgba(0,0,0,0.3)",
                  cursor: dragging ? "grabbing" : "default",
                }}
              />

              {/* Text editing overlay */}
              {editingText && (
                <div
                  style={{
                    position: "absolute", inset: 0, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.5)", zIndex: 10,
                  }}
                  onClick={() => {
                    // Save text
                    if (editingText) {
                      updateElement(editingText.id, { text: editingText.text } as any);
                      setEditingText(null);
                    }
                  }}
                >
                  <textarea
                    value={editingText.text}
                    onChange={(e) => setEditingText({ ...editingText, text: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        updateElement(editingText.id, { text: editingText.text } as any);
                        setEditingText(null);
                      }
                      if (e.ctrlKey && e.key === "Enter") {
                        updateElement(editingText.id, { text: editingText.text } as any);
                        setEditingText(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    style={{
                      width: 500, height: 300, padding: 12, fontSize: 16,
                      background: "var(--bg-primary)", color: "var(--text-primary)",
                      border: "2px solid var(--accent)", borderRadius: "var(--radius-md)",
                      outline: "none", resize: "both", fontFamily: "monospace",
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            /* Slideshow fullscreen */
            <div
              className="flex-center"
              style={{
                position: "fixed", inset: 0, zIndex: 1000,
                background: "#000", cursor: "none",
              }}
              onClick={() => setSlideShowIdx((prev) => Math.min(prev + 1, pres.slides.length - 1))}
              onContextMenu={(e) => e.preventDefault()}
            >
              <canvas
                ref={slideShowRef}
                style={{ maxWidth: "100vw", maxHeight: "100vh", objectFit: "contain" }}
              />
              <div style={{ position: "absolute", bottom: 30, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                {slideShowIdx + 1} / {pres.slides.length} · Press Esc to exit
              </div>
              <button
                className="btn"
                onClick={(e) => { e.stopPropagation(); stopSlideshow(); }}
                style={{ position: "absolute", top: 16, right: 16, opacity: 0.5, fontSize: 20 }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* ── Right: Properties + Notes ── */}
        <div className="panel-right" style={{ width: 260, flexShrink: 0, overflowY: "auto", borderLeft: "1px solid var(--border-color)", background: "var(--bg-secondary)" }}>
          <div className="p-2">
            {/* Slide settings */}
            <h4 className="text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>Slide Settings</h4>
            <div className="mb-2">
              <label className="text-xs" style={{ color: "var(--text-muted)" }}>Slide Name</label>
              <input
                className="input"
                value={currentSlide.name}
                onChange={(e) => setPres((prev) => ({
                  ...prev,
                  slides: prev.slides.map((s, i) => i === prev.currentSlide ? { ...s, name: e.target.value } : s),
                }))}
                style={{ width: "100%", padding: "3px 6px", fontSize: 11 }}
              />
            </div>

            {/* Theme */}
            <h4 className="text-xs font-bold mb-1 mt-2" style={{ color: "var(--text-muted)" }}>Theme</h4>
            <div className="flex flex-wrap gap-1 mb-2">
              {THEMES.map((t) => (
                <button
                  key={t.name}
                  className="btn"
                  onClick={() => applyTheme(t)}
                  title={t.name}
                  style={{
                    width: 24, height: 24, borderRadius: "var(--radius-sm)", padding: 0,
                    background: `linear-gradient(135deg, ${t.bg} 50%, ${t.accent} 50%)`,
                    border: theme.bg === t.bg ? "2px solid var(--accent)" : "1px solid var(--border-color)",
                  }}
                />
              ))}
            </div>

            {/* Transition */}
            <h4 className="text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>Transition</h4>
            <div className="flex gap-1 mb-2 flex-wrap">
              {TRANSITIONS.map((tr) => (
                <button
                  key={tr.id}
                  className={`btn btn-sm ${currentSlide.transition.type === tr.id ? "btn-primary" : ""}`}
                  onClick={() => setPres((prev) => ({
                    ...prev,
                    slides: prev.slides.map((s, i) => i === prev.currentSlide ? { ...s, transition: { ...s.transition, type: tr.id as Slide["transition"]["type"] } } : s),
                  }))}
                  style={{ fontSize: 10, padding: "2px 6px" }}
                >
                  {tr.name}
                </button>
              ))}
            </div>

            {/* Speaker notes */}
            <h4 className="text-xs font-bold mb-1 mt-2" style={{ color: "var(--text-muted)" }}>
              {showNotes ? "📝 Speaker Notes" : "Speaker Notes"}
            </h4>
            {showNotes && (
              <textarea
                value={currentSlide.notes}
                onChange={(e) => setPres((prev) => ({
                  ...prev,
                  slides: prev.slides.map((s, i) => i === prev.currentSlide ? { ...s, notes: e.target.value } : s),
                }))}
                className="input"
                placeholder="Speaker notes for this slide..."
                style={{ width: "100%", height: 120, padding: "4px 6px", fontSize: 11, resize: "vertical" }}
              />
            )}

            {/* Selected element properties */}
            {selectedElement && (() => {
              const el = currentSlide.elements.find((e) => e.id === selectedElement);
              if (!el) return null;

              return (
                <div className="mt-2">
                  <h4 className="text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>Element Properties</h4>

                  {el.type === "text" && (
                    <>
                      <div className="mb-1">
                        <label className="text-xs" style={{ color: "var(--text-muted)" }}>Font Size</label>
                        <input
                          type="range" min={12} max={120} value={(el as TextElement).fontSize}
                          onChange={(e) => updateElement(el.id, { fontSize: Number(e.target.value) })}
                          style={{ width: "100%" }}
                        />
                        <span className="text-xs font-mono">{(el as TextElement).fontSize}px</span>
                      </div>
                      <div className="flex gap-1 mb-1">
                        <button
                          className={`btn btn-sm ${(el as TextElement).bold ? "btn-primary" : ""}`}
                          onClick={() => updateElement(el.id, { bold: !(el as TextElement).bold })}
                          style={{ fontSize: 10 }}
                        >
                          B
                        </button>
                        <button
                          className={`btn btn-sm ${(el as TextElement).italic ? "btn-primary" : ""}`}
                          onClick={() => updateElement(el.id, { italic: !(el as TextElement).italic })}
                          style={{ fontSize: 10, fontStyle: "italic" }}
                        >
                          I
                        </button>
                        <select
                          className="input"
                          value={(el as TextElement).align}
                          onChange={(e) => updateElement(el.id, { align: e.target.value as TextElement["align"] })}
                          style={{ fontSize: 10, padding: "2px 4px", flex: 1 }}
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </>
                  )}

                  {el.type === "shape" && (
                    <div className="mb-1">
                      <label className="text-xs" style={{ color: "var(--text-muted)" }}>Shape</label>
                      <select
                        className="input"
                        value={(el as ShapeElement).kind}
                        onChange={(e) => updateElement(el.id, { kind: e.target.value as ShapeElement["kind"] })}
                        style={{ width: "100%", fontSize: 11, padding: "2px 4px" }}
                      >
                        <option value="rectangle">Rectangle</option>
                        <option value="rounded-rect">Rounded Rect</option>
                        <option value="ellipse">Ellipse</option>
                      </select>
                    </div>
                  )}

                  <div className="mb-1">
                    <label className="text-xs" style={{ color: "var(--text-muted)" }}>Width: {(el as any).width}</label>
                    <input
                      type="range" min={20} max={800} value={(el as any).width}
                      onChange={(e) => updateElement(el.id, { width: Number(e.target.value) })}
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div className="mb-1">
                    <label className="text-xs" style={{ color: "var(--text-muted)" }}>Height: {(el as any).height}</label>
                    <input
                      type="range" min={20} max={600} value={(el as any).height}
                      onChange={(e) => updateElement(el.id, { height: Number(e.target.value) })}
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div className="flex gap-1 mb-1">
                    <div className="flex-1">
                      <label className="text-xs" style={{ color: "var(--text-muted)" }}>X</label>
                      <input className="input" type="number" value={(el as any).x}
                        onChange={(e) => updateElement(el.id, { x: Number(e.target.value) })}
                        style={{ width: "100%", padding: "2px 4px", fontSize: 11 }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs" style={{ color: "var(--text-muted)" }}>Y</label>
                      <input className="input" type="number" value={(el as any).y}
                        onChange={(e) => updateElement(el.id, { y: Number(e.target.value) })}
                        style={{ width: "100%", padding: "2px 4px", fontSize: 11 }}
                      />
                    </div>
                  </div>

                  <button
                    className="btn btn-sm"
                    style={{ background: "var(--danger)", color: "#fff", fontSize: 11, width: "100%", marginTop: 6 }}
                    onClick={() => deleteElement(el.id)}
                  >
                    🗑 Delete Element
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}