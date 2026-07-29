// ---------------------------------------------------------------------------
// AI Studio OS — Plugin SDK: Render Engine Extension Point
// ---------------------------------------------------------------------------
// Render engines process compositions/outputs into final media files.
// The host dispatches render jobs to the appropriate engine based on
// the output format (MP4, GIF, WebM, image sequence, etc.).
// ---------------------------------------------------------------------------

import type { ComponentType } from "react";

// ---------------------------------------------------------------------------
// Output format
// ---------------------------------------------------------------------------
export interface OutputFormat {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  /** Whether this format supports transparency */
  supportsAlpha: boolean;
  /** Whether this format supports audio */
  supportsAudio: boolean;
  /** Available presets (e.g. "H.264 High", "ProRes 422") */
  presets?: OutputPreset[];
}

export interface OutputPreset {
  id: string;
  name: string;
  description?: string;
  /** Encoding parameters */
  parameters: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Render job
// ---------------------------------------------------------------------------
export interface RenderJob {
  id: string;
  /** The composition data to render */
  composition: Record<string, unknown>;
  /** Output format */
  format: string;
  /** Output preset */
  preset?: string;
  /** Output path (local file path) */
  outputPath: string;
  /** Resolution scale (0.25–2.0) */
  resolutionScale?: number;
  /** Frame range */
  frameRange?: { start: number; end: number };
  /** Additional parameters */
  params?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Render progress
// ---------------------------------------------------------------------------
export interface RenderProgress {
  jobId: string;
  /** 0–100 */
  percent: number;
  /** Current frame being rendered */
  currentFrame: number;
  /** Total frames */
  totalFrames: number;
  /** Elapsed time in seconds */
  elapsed: number;
  /** Estimated remaining time in seconds */
  eta: number;
  /** Current stage */
  stage: string;
  /** Any error message */
  error?: string;
}

// ---------------------------------------------------------------------------
// Render engine
// ---------------------------------------------------------------------------
export interface RenderEngine {
  id: string;
  name: string;
  description?: string;
  /** The output formats this engine supports */
  formats: OutputFormat[];
  /** Whether this engine supports hardware acceleration */
  supportsHardwareAcceleration?: boolean;
  /** Whether this engine can render in background/headless mode */
  supportsHeadless?: boolean;

  /** Optional config UI */
  SettingsComponent?: ComponentType;

  /** Start rendering a job. Returns a cancel function. */
  render(
    job: RenderJob,
    onProgress: (progress: RenderProgress) => void,
    onComplete: (outputPath: string) => void,
    onError: (error: Error) => void,
  ): RenderEngineControl;

  /** Check if the engine is available on this system */
  isAvailable(): boolean | Promise<boolean>;

  /** Get available presets for a given format */
  getPresets?(formatId: string): OutputPreset[];

  /** Cancel a running render */
  cancel?(jobId: string): void;
}

// ---------------------------------------------------------------------------
// Render engine control — returned by `render()`, allows the host to
// cancel or pause the job.
// ---------------------------------------------------------------------------
export interface RenderEngineControl {
  cancel(): void;
  pause?(): void;
  resume?(): void;
}