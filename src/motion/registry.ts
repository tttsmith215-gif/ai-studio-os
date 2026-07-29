// ─── AI Studio OS: Motion Component Registry ────────────────────
// Central registry of all built-in motion components.
// Each entry maps a component ID to its factory function and metadata.

import type { Layer, Composition } from "../engine/types";
import type { MotionConfig } from "./components";

// ─── Types ──────────────────────────────────────────────────────

export type LayerFactory = (config: MotionConfig) => Layer[];
export type CompositionFactory = (config: MotionConfig) => Composition;

export interface MotionComponent {
  id: string;
  name: string;
  description: string;
  category: "entrance" | "text" | "transition" | "shape";
  icon: string;
  defaultDuration: number;
  /** Returns layers to add to an existing composition */
  createLayers: LayerFactory;
  /** Optional: returns a full composition (for transitions) */
  createComposition?: CompositionFactory;
  /** Configurable params the user can tweak */
  params: MotionParam[];
}

export interface MotionParam {
  key: string;
  label: string;
  type: "text" | "color" | "number" | "select";
  default: any;
  options?: { value: string; label: string }[];
}

// ─── Built-in components ────────────────────────────────────────

import {
  AnimatedTitle,
  LowerThird,
  ShapeReveal,
  Typewriter,
  CountUp,
  CrossfadeTransition,
} from "./components";

export const builtinComponents: MotionComponent[] = [
  {
    id: "animated-title",
    name: "Animated Title",
    description: "Scale + fade in title text with overshoot",
    category: "entrance",
    icon: "T",
    defaultDuration: 1.5,
    createLayers: (c) => AnimatedTitle(c),
    params: [
      { key: "text", label: "Text", type: "text", default: "Title" },
      { key: "fontSize", label: "Font Size", type: "number", default: 72 },
      { key: "color", label: "Color", type: "color", default: "#ffffff" },
    ],
  },
  {
    id: "lower-third",
    name: "Lower Third",
    description: "Name + title graphic that slides in from left",
    category: "entrance",
    icon: "L",
    defaultDuration: 2,
    createLayers: (c) => LowerThird(c),
    params: [
      { key: "text", label: "Name | Title", type: "text", default: "Name | Title" },
      { key: "fill", label: "Bar Color", type: "color", default: "#6c5ce7" },
      { key: "color", label: "Text Color", type: "color", default: "#ffffff" },
    ],
  },
  {
    id: "shape-reveal",
    name: "Shape Reveal",
    description: "Shape grows from zero with bounce overshoot",
    category: "shape",
    icon: "□",
    defaultDuration: 1,
    createLayers: (c) => ShapeReveal(c),
    params: [
      {
        key: "text", label: "Shape", type: "select", default: "rectangle",
        options: [
          { value: "rectangle", label: "Rectangle" },
          { value: "ellipse", label: "Ellipse" },
          { value: "triangle", label: "Triangle" },
          { value: "star", label: "Star" },
        ],
      },
      { key: "fill", label: "Fill Color", type: "color", default: "#6c5ce7" },
      { key: "width", label: "Width", type: "number", default: 200 },
      { key: "height", label: "Height", type: "number", default: 200 },
    ],
  },
  {
    id: "typewriter",
    name: "Typewriter",
    description: "Text appears character by character",
    category: "text",
    icon: "|",
    defaultDuration: 10,
    createLayers: (c) => Typewriter(c),
    params: [
      { key: "text", label: "Text", type: "text", default: "Typewriter text..." },
      { key: "fontSize", label: "Font Size", type: "number", default: 48 },
      { key: "color", label: "Color", type: "color", default: "#ffffff" },
      { key: "duration", label: "Chars/sec", type: "number", default: 10 },
    ],
  },
  {
    id: "count-up",
    name: "Count Up",
    description: "Number reveals with a scale pop",
    category: "text",
    icon: "123",
    defaultDuration: 2,
    createLayers: (c) => CountUp(c),
    params: [
      { key: "text", label: "Number", type: "text", default: "100" },
      { key: "fontSize", label: "Font Size", type: "number", default: 72 },
      { key: "color", label: "Color", type: "color", default: "#ffffff" },
    ],
  },
  {
    id: "crossfade",
    name: "Crossfade",
    description: "Full-composition crossfade transition",
    category: "transition",
    icon: "⟷",
    defaultDuration: 1,
    createLayers: (c) => CrossfadeTransition(c).layers,
    createComposition: (c) => CrossfadeTransition(c),
    params: [
      { key: "prevColor", label: "From Color", type: "color", default: "#1a1a1a" },
      { key: "nextColor", label: "To Color", type: "color", default: "#2a2a2a" },
      { key: "duration", label: "Duration", type: "number", default: 1 },
    ],
  },
];

// ─── Lookup helpers ─────────────────────────────────────────────

export function getComponent(id: string): MotionComponent | undefined {
  return builtinComponents.find((c) => c.id === id);
}

export function getComponentsByCategory(cat: string): MotionComponent[] {
  return builtinComponents.filter((c) => c.category === cat);
}

export function getCategories(): string[] {
  return [...new Set(builtinComponents.map((c) => c.category))];
}