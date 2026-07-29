export type LayerType = "shape" | "text" | "image" | "group";
export type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "add" | "alpha";
export type Easing = "linear" | "ease" | "ease-in" | "ease-out" | "bezier";
export type ShapeKind = "rectangle" | "ellipse" | "triangle" | "star";

export interface Transform {
  x: number; y: number;
  scaleX: number; scaleY: number;
  rotation: number; // degrees
  anchorX: number; anchorY: number; // 0-1 relative
  opacity: number; // 0-1
}

export interface Keyframe {
  frame: number;
  props: Partial<Transform>;
  easing: Easing;
  bezier?: [number, number, number, number];
}

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  enabled: boolean;
  locked: boolean;
  blendMode: BlendMode;
  transform: Transform;
  keyframes: Keyframe[];
  content: ShapeContent | TextContent | ImageContent;
}

export interface ShapeContent {
  kind: "shape";
  shape: ShapeKind;
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

export interface TextContent {
  kind: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  align: "left" | "center" | "right";
  bold?: boolean;
}

export interface ImageContent {
  kind: "image";
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  bitmap?: ImageBitmap;
}

export type LayerContent = ShapeContent | TextContent | ImageContent;

export interface Composition {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  layers: Layer[];
  background: string;
}

export const DEFAULT_TRANSFORM: Transform = {
  x: 0, y: 0,
  scaleX: 1, scaleY: 1,
  rotation: 0,
  anchorX: 0.5, anchorY: 0.5,
  opacity: 1,
};

export function makeLayer(type: LayerType, name: string, content: LayerContent, x = 0, y = 0): Layer {
  return {
    id: crypto.randomUUID(),
    name,
    type,
    enabled: true,
    locked: false,
    blendMode: "normal",
    transform: { ...DEFAULT_TRANSFORM, x, y },
    keyframes: [],
    content,
  };
}

export function makeComposition(name = "New Composition", width = 1920, height = 1080, fps = 30, duration = 5): Composition {
  return {
    id: crypto.randomUUID(),
    name,
    width,
    height,
    fps,
    totalFrames: fps * duration,
    layers: [],
    background: "#1a1a1a",
  };
}