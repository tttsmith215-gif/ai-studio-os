// ─── AI Studio OS: Composition Engine ───────────────────────────
// Parses simple JSON input → full Composition → renders/export frames.

import type { Composition, Layer, Transform, Keyframe } from "./types";
import { makeComposition, makeLayer } from "./types";

// ─── Simple JSON Schema ─────────────────────────────────────────

export interface SimpleElement {
  type: "AnimatedTitle" | "AnimatedShape" | "FadeInText" | "BounceShape";
  text?: string;
  shape?: string;
  fill?: string;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: string;
  delay?: number; // frames offset
}

export interface SimpleComposition {
  title: string;
  width?: number;
  height?: number;
  fps?: number;
  duration?: number; // seconds
  background?: string;
  elements: SimpleElement[];
}

// ─── Preset animations ──────────────────────────────────────────

const EASE_OUT = "ease-out" as const;
const EASE = "ease" as const;

function animatedTitlePreset(text: string, delay = 0): Layer {
  const layer = makeLayer("text", `Title: ${text}`, {
    kind: "text",
    text,
    fontSize: 72,
    fontFamily: "Arial, sans-serif",
    color: "#ffffff",
    align: "center",
  }, 960, 540);

  const start = delay;
  const end = delay + 30;
  layer.keyframes = [
    { frame: start, props: { scaleX: 0.8, scaleY: 0.8, opacity: 0 }, easing: EASE_OUT },
    { frame: end, props: { scaleX: 1, scaleY: 1, opacity: 1 }, easing: EASE_OUT },
  ];
  return layer;
}

function fadeInTextPreset(text: string, delay = 0): Layer {
  const layer = makeLayer("text", `Text: ${text}`, {
    kind: "text",
    text,
    fontSize: 36,
    fontFamily: "Arial, sans-serif",
    color: "#cccccc",
    align: "center",
  }, 960, 700);

  const start = delay;
  const end = delay + 20;
  layer.keyframes = [
    { frame: start, props: { opacity: 0, y: 700 + 30 }, easing: EASE },
    { frame: end, props: { opacity: 1, y: 700 }, easing: EASE },
  ];
  return layer;
}

function animatedShapePreset(shape: string, fill: string, w: number, h: number, delay = 0): Layer {
  const layer = makeLayer("shape", `Shape: ${shape}`, {
    kind: "shape",
    shape: shape as any,
    width: w,
    height: h,
    fill,
  }, 960, 540);

  const start = delay;
  const mid = delay + 15;
  const end = delay + 30;
  layer.keyframes = [
    { frame: start, props: { scaleX: 0, scaleY: 0, opacity: 0, rotation: -180 }, easing: EASE_OUT },
    { frame: mid, props: { scaleX: 1.2, scaleY: 1.2, opacity: 1, rotation: 0 }, easing: EASE_OUT },
    { frame: end, props: { scaleX: 1, scaleY: 1, opacity: 1, rotation: 0 }, easing: EASE_OUT },
  ];
  return layer;
}

// ─── Parser ─────────────────────────────────────────────────────

export function parseSimpleComposition(input: SimpleComposition): Composition {
  const comp = makeComposition(
    input.title,
    input.width ?? 1920,
    input.height ?? 1080,
    input.fps ?? 30,
    input.duration ?? 5,
  );
  if (input.background) comp.background = input.background;

  const elements = input.elements ?? [];
  let frameOffset = 0;

  for (const el of elements) {
    const delay = el.delay ?? frameOffset;

    switch (el.type) {
      case "AnimatedTitle":
        comp.layers.push(animatedTitlePreset(el.text ?? "Title", delay));
        frameOffset = delay + 30;
        break;
      case "FadeInText":
        comp.layers.push(fadeInTextPreset(el.text ?? "Text", delay));
        frameOffset = delay + 25;
        break;
      case "AnimatedShape":
        comp.layers.push(animatedShapePreset(
          el.shape ?? "rectangle",
          el.fill ?? "#6c5ce7",
          el.width ?? 200,
          el.height ?? 200,
          delay,
        ));
        frameOffset = delay + 30;
        break;
      case "BounceShape":
        comp.layers.push(animatedShapePreset(
          el.shape ?? "ellipse",
          el.fill ?? "#00cec9",
          el.width ?? 150,
          el.height ?? 150,
          delay,
        ));
        frameOffset = delay + 30;
        break;
    }
  }

  // Ensure totalFrames covers all animations
  const maxEndFrame = comp.layers.reduce((max, l) => {
    const lastKf = l.keyframes[l.keyframes.length - 1];
    return lastKf ? Math.max(max, lastKf.frame + 15) : max;
  }, comp.totalFrames);
  comp.totalFrames = Math.max(comp.totalFrames, maxEndFrame);

  return comp;
}

// ─── Serialize Composition for Rust ─────────────────────────────
// Convert our Composition type to the Rust RenderComposition JSON.

export interface RustRenderComposition {
  width: number;
  height: number;
  fps: number;
  total_frames: number;
  background: string;
  layers: RustRenderLayer[];
}

export interface RustRenderLayer {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  blend_mode: string;
  transform: {
    x: number; y: number;
    scale_x: number; scale_y: number;
    rotation: number; opacity: number;
  };
  keyframes: {
    frame: number;
    props: Record<string, number>;
    easing: string;
    bezier?: [number, number, number, number];
  }[];
  content: {
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
  };
}

export function compositionToRust(comp: Composition): RustRenderComposition {
  return {
    width: comp.width,
    height: comp.height,
    fps: comp.fps,
    total_frames: comp.totalFrames,
    background: comp.background,
    layers: comp.layers.map(l => ({
      id: l.id,
      name: l.name,
      type: l.type,
      enabled: l.enabled,
      blend_mode: l.blendMode,
      transform: {
        x: l.transform.x, y: l.transform.y,
        scale_x: l.transform.scaleX, scale_y: l.transform.scaleY,
        rotation: l.transform.rotation,
        opacity: l.transform.opacity,
      },
      keyframes: l.keyframes.map(k => ({
        frame: k.frame,
        props: k.props as Record<string, number>,
        easing: k.easing,
        bezier: k.bezier,
      })),
      content: serializeContent(l.content),
    })),
  };
}

function serializeContent(content: any): any {
  if (content.kind === "shape") {
    return {
      kind: "shape",
      shape: content.shape,
      width: content.width,
      height: content.height,
      fill: content.fill,
      stroke: content.stroke,
      stroke_width: content.strokeWidth,
      corner_radius: content.cornerRadius,
    };
  }
  if (content.kind === "text") {
    return {
      kind: "text",
      text: content.text,
      font_size: content.fontSize,
      font_family: content.fontFamily,
      color: content.color,
      align: content.align,
    };
  }
  return { kind: content.kind };
}