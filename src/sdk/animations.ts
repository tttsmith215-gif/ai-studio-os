// ---------------------------------------------------------------------------
// AI Studio OS — Plugin SDK: Animation Provider Extension Point
// ---------------------------------------------------------------------------
// Animation providers define named animation presets and/or procedural
// animation generators. The host's animation library shows all registered
// providers, and users can apply them to layers.
// ---------------------------------------------------------------------------

import type { ComponentType } from "react";

// ---------------------------------------------------------------------------
// Animation descriptor — a named, parameterized animation preset.
// ---------------------------------------------------------------------------
export interface AnimationDescriptor {
  /** Unique ID within this provider */
  id: string;
  /** Display name (e.g. "Fade In", "Bounce") */
  name: string;
  /** Category for grouping in the animation picker */
  category: AnimationCategory;
  /** Human-readable description */
  description?: string;
  /** Approximate duration in seconds */
  defaultDuration: number;
  /** Icon (emoji or URL) */
  icon?: string;
  /** Tags for search/filtering */
  tags?: string[];
}

export type AnimationCategory =
  | "entrance"
  | "exit"
  | "attention"
  | "transition"
  | "text"
  | "morph"
  | "custom";

// ---------------------------------------------------------------------------
// Keyframe generator — a function that produces keyframes for a given layer.
// The host calls this when the user applies the animation to a layer.
// ---------------------------------------------------------------------------
export interface AnimationKeyframeGenerator {
  /** Descriptor shown in the UI */
  descriptor: AnimationDescriptor;

  /**
   * Generate keyframes for a layer.
   * @param duration  Duration in frames
   * @param fps       Frames per second (for time-based calculations)
   * @param params    User-adjustable parameters
   * @returns         Array of keyframes to insert into the layer
   */
  generate(
    duration: number,
    fps: number,
    params?: Record<string, unknown>,
  ): GeneratedKeyframe[];
}

export interface GeneratedKeyframe {
  frame: number;
  /** Transform properties to set at this keyframe */
  props: Partial<{
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
    opacity: number;
  }>;
  easing: string; // matches the host's easing type
  bezier?: [number, number, number, number];
}

// ---------------------------------------------------------------------------
// Procedural animation — a function that interpolates values per-frame.
// More powerful than keyframes; used for complex effects (physics, noise,
// path following, etc.).
// ---------------------------------------------------------------------------
export interface ProceduralAnimation {
  descriptor: AnimationDescriptor;

  /**
   * Compute the transform at a given frame.
   * Called every frame during playback.
   */
  sample(
    frame: number,
    totalFrames: number,
    params?: Record<string, unknown>,
  ): {
    x?: number;
    y?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    opacity?: number;
  };
}

// ---------------------------------------------------------------------------
// Animation provider — a plugin can contribute one or both types.
// ---------------------------------------------------------------------------
export interface AnimationProvider {
  /** Provider ID (e.g. "com.example.bouncy-animations") */
  id: string;
  /** Display name */
  name: string;
  /** Optional config UI shown in the animation library panel */
  SettingsComponent?: ComponentType;

  /** Keyframe-based animation presets */
  keyframeGenerators?: AnimationKeyframeGenerator[];
  /** Procedural (per-frame) animations */
  proceduralAnimations?: ProceduralAnimation[];
}