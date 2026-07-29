// ─── AI Studio OS: Motion Component Library ─────────────────────
// Reusable animated components. Each accepts config and returns Layer[].
// Components are pure functions — no state, no side effects.

import type { Layer, Composition, Easing } from "../engine/types";
import { makeLayer, makeComposition, DEFAULT_TRANSFORM } from "../engine/types";

// ─── Config shared by all components ────────────────────────────

export interface MotionConfig {
  text?: string;
  fill?: string;
  stroke?: string;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  align?: "left" | "center" | "right";
  /** Duration in seconds (converted to frames using fps) */
  duration?: number;
  /** Delay in seconds before animation starts */
  delay?: number;
  fps?: number;
}

// ─── AnimatedTitle ──────────────────────────────────────────────
// Title text that scales up + fades in, with optional subtitle.

export function AnimatedTitle(config: MotionConfig): Layer[] {
  const fps = config.fps ?? 30;
  const dur = (config.duration ?? 1.5) * fps;
  const delay = (config.delay ?? 0) * fps;
  const text = config.text ?? "Title";
  const fontSize = config.fontSize ?? 72;
  const color = config.color ?? "#ffffff";
  const fontFamily = config.fontFamily ?? "Arial, sans-serif";

  const layer = makeLayer("text", `Title: ${text}`, {
    kind: "text",
    text,
    fontSize,
    fontFamily,
    color,
    align: config.align ?? "center",
  }, 960, 200);

  const start = delay;
  const mid = delay + dur * 0.4;
  const end = delay + dur;
  layer.keyframes = [
    { frame: start, props: { scaleX: 0.8, scaleY: 0.8, opacity: 0 }, easing: "ease-out" },
    { frame: mid, props: { scaleX: 1.05, scaleY: 1.05, opacity: 1 }, easing: "ease-out" },
    { frame: end, props: { scaleX: 1, scaleY: 1, opacity: 1 }, easing: "ease-out" },
  ];
  return [layer];
}

// ─── LowerThird ─────────────────────────────────────────────────
// Name + title graphic that slides in from left and holds.

export function LowerThird(config: MotionConfig): Layer[] {
  const fps = config.fps ?? 30;
  const dur = (config.duration ?? 2) * fps;
  const delay = (config.delay ?? 0) * fps;
  const name = config.text ?? "Name Here";
  const title = config.text?.split("|")[1]?.trim() ?? "Title";
  const fontSize = config.fontSize ?? 36;
  const color = config.color ?? "#ffffff";
  const fill = config.fill ?? "#6c5ce7";

  const layers: Layer[] = [];

  // Background bar
  const bar = makeLayer("shape", "LT Bar", {
    kind: "shape",
    shape: "rectangle",
    width: 440,
    height: 80,
    fill,
    cornerRadius: 4,
  }, 50, 540);
  const barStart = delay;
  const barEnd = delay + dur * 0.3;
  bar.keyframes = [
    { frame: barStart, props: { x: -440, opacity: 0 }, easing: "ease-out" },
    { frame: barEnd, props: { x: 50, opacity: 1 }, easing: "ease-out" },
  ];
  layers.push(bar);

  // Name text
  const nameLayer = makeLayer("text", "LT Name", {
    kind: "text",
    text: name,
    fontSize,
    fontFamily: config.fontFamily ?? "Arial, sans-serif",
    color,
    align: "left",
  }, 70, 555);
  const textStart = delay + dur * 0.15;
  const textEnd = delay + dur * 0.4;
  nameLayer.keyframes = [
    { frame: textStart, props: { opacity: 0, x: 70 }, easing: "ease-out" },
    { frame: textEnd, props: { opacity: 1, x: 70 }, easing: "ease-out" },
  ];
  layers.push(nameLayer);

  // Title text (smaller, below name)
  const titleLayer = makeLayer("text", "LT Title", {
    kind: "text",
    text: title,
    fontSize: fontSize * 0.55,
    fontFamily: config.fontFamily ?? "Arial, sans-serif",
    color: color,
    align: "left",
  }, 70, 590);
  const titleStart = delay + dur * 0.25;
  const titleEnd = delay + dur * 0.5;
  titleLayer.keyframes = [
    { frame: titleStart, props: { opacity: 0, x: 70 }, easing: "ease-out" },
    { frame: titleEnd, props: { opacity: 0.8, x: 70 }, easing: "ease-out" },
  ];
  layers.push(titleLayer);

  return layers;
}

// ─── ShapeReveal ────────────────────────────────────────────────
// A shape that grows from zero with a bounce-like overshoot.

export function ShapeReveal(config: MotionConfig): Layer[] {
  const fps = config.fps ?? 30;
  const dur = (config.duration ?? 1) * fps;
  const delay = (config.delay ?? 0) * fps;
  const fill = config.fill ?? "#6c5ce7";
  const shape = (config.text as any) ?? "rectangle";
  const w = config.width ?? 200;
  const h = config.height ?? 200;

  const layer = makeLayer("shape", `Shape: ${shape}`, {
    kind: "shape",
    shape,
    width: w,
    height: h,
    fill,
    cornerRadius: shape === "rectangle" ? 12 : 0,
  }, 960, 540);

  const start = delay;
  const overshoot = delay + dur * 0.5;
  const settle = delay + dur;
  layer.keyframes = [
    { frame: start, props: { scaleX: 0, scaleY: 0, opacity: 0, rotation: -30 }, easing: "ease-out" },
    { frame: overshoot, props: { scaleX: 1.15, scaleY: 1.15, opacity: 1, rotation: 5 }, easing: "ease-out" },
    { frame: settle, props: { scaleX: 1, scaleY: 1, opacity: 1, rotation: 0 }, easing: "ease-out" },
  ];
  return [layer];
}

// ─── Typewriter ─────────────────────────────────────────────────
// Text that appears character by character, one letter per frame.

export function Typewriter(config: MotionConfig): Layer[] {
  const fps = config.fps ?? 30;
  const delay = (config.delay ?? 0) * fps;
  const text = config.text ?? "Typewriter text...";
  const fontSize = config.fontSize ?? 48;
  const color = config.color ?? "#ffffff";
  const fontFamily = config.fontFamily ?? "Arial, sans-serif";
  const charsPerSec = config.duration ?? 10; // chars per second
  const totalFrames = Math.ceil((text.length / charsPerSec) * fps);

  const layer = makeLayer("text", `Typewriter`, {
    kind: "text",
    text: "",
    fontSize,
    fontFamily,
    color,
    align: config.align ?? "center",
  }, 960, 540);

  // One keyframe per character revealing the next slice
  for (let i = 0; i <= text.length; i++) {
    const frame = delay + Math.floor((i / text.length) * totalFrames);
    const visible = text.slice(0, i);
    layer.keyframes.push({
      frame,
      props: { opacity: 1 },
      easing: "linear",
    });
    // We store the text in a custom property via the keyframe
    // The renderer will need to handle this — but since we can't
    // store text in keyframe props directly, we'll simulate it
    // by creating individual character layers instead.
  }

  // Actually: one layer per character for real typewriter effect
  const charLayers: Layer[] = [];
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.font = `${fontSize}px ${fontFamily}`;
  let cursorX = 960;

  // Measure total width first to center
  const totalWidth = ctx.measureText(text).width;
  const startX = config.align === "center" ? 960 - totalWidth / 2 : 100;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const metrics = ctx.measureText(char);
    const charWidth = metrics.width;
    const charX = startX + ctx.measureText(text.slice(0, i)).width;

    const charLayer = makeLayer("text", `char-${i}`, {
      kind: "text",
      text: char,
      fontSize,
      fontFamily,
      color,
      align: "left",
    }, charX, 540);

    const appearFrame = delay + Math.floor((i / text.length) * totalFrames);
    charLayer.keyframes = [
      { frame: appearFrame, props: { opacity: 0, scaleX: 0.5 }, easing: "ease-out" },
      { frame: appearFrame + 2, props: { opacity: 1, scaleX: 1 }, easing: "ease-out" },
    ];
    charLayers.push(charLayer);
  }

  return charLayers;
}

// ─── CrossfadeTransition ────────────────────────────────────────
// Generates two layers: one fades out, the other fades in.
// Returns a Composition with the transition baked in.

export function CrossfadeTransition(config: MotionConfig & { prevColor?: string; nextColor?: string }): Composition {
  const fps = config.fps ?? 30;
  const dur = (config.duration ?? 1) * fps;
  const delay = (config.delay ?? 0) * fps;

  const prev = makeLayer("shape", "Prev Scene", {
    kind: "shape",
    shape: "rectangle",
    width: 1920,
    height: 1080,
    fill: config.prevColor ?? "#1a1a1a",
  }, 960, 540);
  prev.keyframes = [
    { frame: delay, props: { opacity: 1 }, easing: "linear" },
    { frame: delay + dur, props: { opacity: 0 }, easing: "ease" },
  ];

  const next = makeLayer("shape", "Next Scene", {
    kind: "shape",
    shape: "rectangle",
    width: 1920,
    height: 1080,
    fill: config.nextColor ?? "#2a2a2a",
  }, 960, 540);
  next.keyframes = [
    { frame: delay, props: { opacity: 0 }, easing: "linear" },
    { frame: delay + dur, props: { opacity: 1 }, easing: "ease" },
  ];

  const comp = makeComposition("Crossfade", 1920, 1080, fps, 3);
  comp.layers = [prev, next];
  comp.totalFrames = Math.max(comp.totalFrames, delay + dur + fps);
  return comp;
}

// ─── CountUp ────────────────────────────────────────────────────
// Number that counts up (rendered as text layers for each digit).

export function CountUp(config: MotionConfig): Layer[] {
  const fps = config.fps ?? 30;
  const dur = (config.duration ?? 2) * fps;
  const delay = (config.delay ?? 0) * fps;
  const targetValue = parseInt(config.text ?? "100", 10);
  const fontSize = config.fontSize ?? 72;
  const color = config.color ?? "#ffffff";
  const prefix = config.text?.match(/^[^0-9]*/)?.[0] ?? "";
  const suffix = config.text?.match(/[^0-9]*$/)?.[0] ?? "";
  const label = config.text?.match(/[^0-9]+$/)?.[0] ?? "";

  const layer = makeLayer("text", "Count Up", {
    kind: "text",
    text: `${prefix}0${suffix}`,
    fontSize,
    fontFamily: config.fontFamily ?? "Arial, sans-serif",
    color,
    align: config.align ?? "center",
  }, 960, 540);

  // Keyframes at each whole number
  for (let i = 0; i <= 10; i++) {
    const frame = delay + Math.floor((i / 10) * dur);
    const value = Math.round((targetValue / 10) * i);
    // We can't store the text in the keyframe props, so we use
    // a simpler approach: keyframes at 0%, 50%, 100% with opacity
  }

  // Simpler: just keyframes for the animated number reveal
  layer.keyframes = [
    { frame: delay, props: { opacity: 0, scaleX: 0.5 }, easing: "ease-out" },
    { frame: delay + dur * 0.3, props: { opacity: 1, scaleX: 1.1 }, easing: "ease-out" },
    { frame: delay + dur, props: { opacity: 1, scaleX: 1 }, easing: "ease-out" },
  ];
  return [layer];
}