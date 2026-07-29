// ─── AI Studio OS: Frame Codec / Export Pipeline ────────────────
// Renders composition frames to OffscreenCanvas, writes PNGs to temp dir,
// then calls Rust to encode to MP4 via FFmpeg.

import type { Composition } from "./types";
import { interpolateTransform } from "./keyframes";
import { invoke } from "@tauri-apps/api/core";
import { writeFile, mkdir } from "@tauri-apps/plugin-fs";

// ─── Types ──────────────────────────────────────────────────────

export interface ExportOptions {
  outputPath?: string;
  onProgress?: (frame: number, total: number) => void;
  resolution?: number; // 0.25–2.0 scale factor
}

export interface ExportResult {
  path: string;
  frames: number;
  width: number;
  height: number;
  durationSecs: number;
}

// ─── Canvas Frame Renderer ──────────────────────────────────────

function renderFrameToCanvas(
  comp: Composition,
  frame: number,
  canvas: OffscreenCanvas,
  ctx: OffscreenCanvasRenderingContext2D,
) {
  const w = comp.width;
  const h = comp.height;
  canvas.width = w;
  canvas.height = h;

  // Background
  ctx.fillStyle = comp.background;
  ctx.fillRect(0, 0, w, h);

  // Layers bottom-to-top
  for (const layer of comp.layers) {
    if (!layer.enabled) continue;

    const t = interpolateTransform(layer.transform, layer.keyframes, frame);
    if (t.opacity <= 0) continue;

    ctx.save();
    ctx.globalAlpha = t.opacity;
    ctx.translate(t.x, t.y);
    ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.scale(t.scaleX, t.scaleY);

    const c = layer.content;

    if (c.kind === "shape") {
      ctx.fillStyle = c.fill;
      if (c.stroke) {
        ctx.strokeStyle = c.stroke;
        ctx.lineWidth = c.strokeWidth ?? 2;
      }

      const sw = c.width ?? 100;
      const sh = c.height ?? 100;
      const r = c.cornerRadius ?? 0;

      if (c.shape === "rectangle") {
        if (r > 0) {
          ctx.beginPath();
          ctx.roundRect(-sw / 2, -sh / 2, sw, sh, r);
          ctx.closePath();
        } else {
          ctx.beginPath();
          ctx.rect(-sw / 2, -sh / 2, sw, sh);
        }
        ctx.fill();
        if (c.stroke) ctx.stroke();
      } else if (c.shape === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(0, 0, sw / 2, sh / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        if (c.stroke) ctx.stroke();
      } else if (c.shape === "triangle") {
        ctx.beginPath();
        ctx.moveTo(0, -sh / 2);
        ctx.lineTo(sw / 2, sh / 2);
        ctx.lineTo(-sw / 2, sh / 2);
        ctx.closePath();
        ctx.fill();
        if (c.stroke) ctx.stroke();
      } else if (c.shape === "star") {
        const outer = Math.min(sw, sh) / 2;
        const inner = outer * 0.5;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? outer : inner;
          const angle = -Math.PI / 2 + (i * Math.PI) / 5;
          const x = r * Math.cos(angle);
          const y = r * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        if (c.stroke) ctx.stroke();
      }
    } else if (c.kind === "text") {
      ctx.font = `${c.bold ? "bold " : ""}${c.fontSize}px ${c.fontFamily}`;
      ctx.fillStyle = c.color;
      ctx.textAlign = c.align ?? "center";
      ctx.textBaseline = "middle";
      ctx.fillText(c.text, 0, 0);
    } else if (c.kind === "image" && c.bitmap) {
      ctx.drawImage(c.bitmap, -c.naturalWidth / 2, -c.naturalHeight / 2);
    }

    ctx.restore();
  }
}

// ─── Export Pipeline ────────────────────────────────────────────

/**
 * Export a composition to MP4 by rendering frames to OffscreenCanvas,
 * writing PNGs to a temp directory, and encoding with FFmpeg via Rust.
 */
export async function exportComposition(
  comp: Composition,
  options: ExportOptions = {},
): Promise<ExportResult> {
  const total = comp.totalFrames;
  const fps = comp.fps;
  const res = options.resolution ?? 1;

  // Create offscreen canvas
  const canvas = new OffscreenCanvas(comp.width * res, comp.height * res);
  const ctx = canvas.getContext("2d")!;

  // Create temp directory for frames
  const tmpDir = await createTempDir("ai-studio-render-");
  const frameDir = `${tmpDir}/frames`;
  await mkdir(frameDir, { recursive: true });

  // Render each frame to PNG
  for (let f = 0; f < total; f++) {
    renderFrameToCanvas(comp, f, canvas, ctx);

    // Capture as PNG blob → ArrayBuffer
    const blob = await canvas.convertToBlob({ type: "image/png" });
    const buf = await blob.arrayBuffer();
    const uint8 = new Uint8Array(buf);

    // Write to temp directory
    const framePath = `${frameDir}/frame_${String(f).padStart(6, "0")}.png`;
    await writeFile(framePath, uint8);

    options.onProgress?.(f + 1, total);
  }

  // Encode to MP4 via Rust
  const outputPath = options.outputPath ?? `${tmpDir}/output.mp4`;
  const result = await invoke<ExportResult>("encode_frames", {
    frameDir,
    outputPath,
    fps,
    width: comp.width,
    height: comp.height,
    totalFrames: total,
  });

  return result;
}

/**
 * Export a composition to a sequence of PNG frames (no encoding).
 * Returns the directory path containing the frames.
 */
export async function exportFrames(
  comp: Composition,
  options: ExportOptions & { outputDir?: string } = {},
): Promise<string> {
  const total = comp.totalFrames;
  const res = options.resolution ?? 1;

  const canvas = new OffscreenCanvas(comp.width * res, comp.height * res);
  const ctx = canvas.getContext("2d")!;

  const outDir = options.outputDir ?? (await createTempDir("ai-studio-frames-"));
  const frameDir = `${outDir}/frames`;
  await mkdir(frameDir, { recursive: true });

  for (let f = 0; f < total; f++) {
    renderFrameToCanvas(comp, f, canvas, ctx);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    const buf = await blob.arrayBuffer();
    const framePath = `${frameDir}/frame_${String(f).padStart(6, "0")}.png`;
    await writeFile(framePath, new Uint8Array(buf));
    options.onProgress?.(f + 1, total);
  }

  return frameDir;
}

// ─── Temp directory helper ──────────────────────────────────────

let tempCounter = 0;

async function createTempDir(prefix: string): Promise<string> {
  // Use Tauri's app data dir for temp renders
  const { join } = await import("@tauri-apps/api/path");
  const appData = await join(await import("@tauri-apps/api/path").then(m => m.appDataDir()), "temp-renders");
  await mkdir(appData, { recursive: true });
  const id = `${prefix}${Date.now()}-${tempCounter++}`;
  const dir = `${appData}/${id}`;
  await mkdir(dir, { recursive: true });
  return dir;
}