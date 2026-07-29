// ---------------------------------------------------------------------------
// AI Studio OS — Plugin SDK: Transition Provider Extension Point
// ---------------------------------------------------------------------------
// Transition providers define visual transitions between scenes/clips
// (cuts, dissolves, wipes, 3D flips, custom shaders, etc.).
// ---------------------------------------------------------------------------

import type { ComponentType } from "react";

// ---------------------------------------------------------------------------
// Transition descriptor
// ---------------------------------------------------------------------------
export interface TransitionDescriptor {
  id: string;
  name: string;
  description?: string;
  category: TransitionCategory;
  /** Default duration in seconds */
  defaultDuration: number;
  /** Icon (emoji or URL) */
  icon?: string;
  /** Whether this transition requires WebGL */
  requiresWebGL?: boolean;
  /** Parameters the user can tweak */
  params?: TransitionParam[];
}

export type TransitionCategory =
  | "dissolve"
  | "wipe"
  | "slide"
  | "zoom"
  | "3d"
  | "glitch"
  | "blur"
  | "light"
  | "particle"
  | "custom";

export interface TransitionParam {
  id: string;
  label: string;
  type: "number" | "boolean" | "color" | "select" | "angle";
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string }[];
}

// ---------------------------------------------------------------------------
// GPU-based transition (shader)
// ---------------------------------------------------------------------------
export interface ShaderTransition {
  descriptor: TransitionDescriptor;
  /** GLSL fragment shader source */
  fragmentShader: string;
  /** How many frames the transition needs to prepare */
  warmupFrames?: number;
}

// ---------------------------------------------------------------------------
// CPU-based transition (Canvas 2D)
// ---------------------------------------------------------------------------
export interface CanvasTransition {
  descriptor: TransitionDescriptor;
  /** Render the transition frame by frame */
  render(
    ctx: CanvasRenderingContext2D,
    fromFrame: HTMLCanvasElement | ImageBitmap,
    toFrame: HTMLCanvasElement | ImageBitmap,
    progress: number, // 0–1
    params: Record<string, unknown>,
  ): void;
}

// ---------------------------------------------------------------------------
// Transition provider
// ---------------------------------------------------------------------------
export interface TransitionProvider {
  id: string;
  name: string;
  SettingsComponent?: ComponentType;
  shaderTransitions?: ShaderTransition[];
  canvasTransitions?: CanvasTransition[];
}