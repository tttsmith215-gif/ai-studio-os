// ---------------------------------------------------------------------------
// AI Studio OS — Plugin SDK: Background Provider Extension Point
// ---------------------------------------------------------------------------
// Background providers supply solid colors, gradients, patterns, images,
// video loops, and procedural backgrounds for compositions and layers.
// ---------------------------------------------------------------------------

import type { ComponentType } from "react";

// ---------------------------------------------------------------------------
// Background descriptor
// ---------------------------------------------------------------------------
export interface BackgroundDescriptor {
  id: string;
  name: string;
  description?: string;
  type: BackgroundType;
  /** Preview thumbnail URL */
  preview?: string;
  icon?: string;
  tags?: string[];
  /** Whether this background is animated */
  animated?: boolean;
}

export type BackgroundType =
  | "solid"
  | "gradient-linear"
  | "gradient-radial"
  | "gradient-conic"
  | "pattern"
  | "image"
  | "video"
  | "procedural"
  | "particle"
  | "custom";

// ---------------------------------------------------------------------------
// Static background (solid, gradient, image, pattern)
// ---------------------------------------------------------------------------
export interface StaticBackground {
  descriptor: BackgroundDescriptor;
  /** Render the background onto a canvas */
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    params: Record<string, unknown>,
  ): void;
}

// ---------------------------------------------------------------------------
// Animated / procedural background (rendered per frame)
// ---------------------------------------------------------------------------
export interface AnimatedBackground {
  descriptor: BackgroundDescriptor;
  /** Render a single frame */
  renderFrame(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    frame: number,
    fps: number,
    params: Record<string, unknown>,
  ): void;
  /** Cleanup when the background is removed */
  destroy?(): void;
}

// ---------------------------------------------------------------------------
// Background provider
// ---------------------------------------------------------------------------
export interface BackgroundProvider {
  id: string;
  name: string;
  SettingsComponent?: ComponentType;
  staticBackgrounds?: StaticBackground[];
  animatedBackgrounds?: AnimatedBackground[];
}