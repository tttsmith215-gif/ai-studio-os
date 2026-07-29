// ─── AI Studio OS: Render IPC Wrapper ────────────────────────────
// Typed Tauri command wrappers for the Rust rendering backend.

import { invoke } from "@tauri-apps/api/core";

// ─── Types ──────────────────────────────────────────────────────

export interface RenderComposition {
  width: number;
  height: number;
  fps: number;
  total_frames: number;
  background: string;
  layers: RenderLayer[];
}

export interface RenderLayer {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  blend_mode: string;
  transform: RenderTransform;
  keyframes: RenderKeyframe[];
  content: RenderContent;
}

export interface RenderTransform {
  x: number; y: number;
  scale_x: number; scale_y: number;
  rotation: number; opacity: number;
}

export interface RenderKeyframe {
  frame: number;
  props: Record<string, number>;
  easing: string;
  bezier?: [number, number, number, number];
}

export interface RenderContent {
  kind: string;
  shape?: string;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  stroke_width?: number;
  corner_radius?: number;
  text?: string;
  font_size?: number;
  font_family?: string;
  color?: string;
  align?: string;
}

export interface RenderResult {
  path: string;
  frames: number;
  width: number;
  height: number;
  duration_secs: number;
}

export interface RenderProgress {
  frame: number;
  total: number;
  phase: string;
  message: string;
}

// ─── Commands ───────────────────────────────────────────────────

/**
 * Render a shape-only composition headlessly via Rust.
 * Text layers are rendered as empty placeholders — use encodeFrames
 * for text-heavy compositions rendered via the frontend Canvas.
 */
export async function renderComposition(
  composition: RenderComposition,
  outputPath?: string,
): Promise<RenderResult> {
  return invoke("render_composition", {
    composition,
    outputPath: outputPath ?? null,
  });
}

/**
 * Encode a directory of pre-rendered PNG frames to MP4 via FFmpeg.
 * Used by the frontend Canvas renderer for text-rich compositions.
 */
export async function encodeFrames(
  frameDir: string,
  outputPath: string,
  fps: number,
  width: number,
  height: number,
  totalFrames: number,
): Promise<RenderResult> {
  return invoke("encode_frames", {
    frameDir,
    outputPath,
    fps,
    width,
    height,
    totalFrames,
  });
}

/**
 * Encode a directory of pre-rendered PNG frames to animated GIF via FFmpeg.
 */
export async function exportGif(
  frameDir: string,
  outputPath: string,
  fps: number,
  width: number,
  height: number,
  totalFrames: number,
): Promise<RenderResult> {
  return invoke("export_gif", {
    frameDir,
    outputPath,
    fps,
    width,
    height,
    totalFrames,
  });
}

// ─── Event listener ─────────────────────────────────────────────

/**
 * Listen for render progress events from the Rust backend.
 * Returns an unsubscribe function.
 */
export async function onRenderProgress(
  callback: (progress: RenderProgress) => void,
): Promise<() => void> {
  const { listen } = await import("@tauri-apps/api/event");
  const unlisten = await listen<RenderProgress>("render-progress", (event) => {
    callback(event.payload);
  });
  return unlisten;
}