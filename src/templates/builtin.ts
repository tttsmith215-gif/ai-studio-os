// ─── AI Studio OS: Built-in Composition Templates ────────────────
// Pre-made templates that compose motion components into full scenes.

import type { CompositionTemplate } from "./types";

export const builtinTemplates: CompositionTemplate[] = [
  // ─── Instagram Story ──────────────────────────────────────────
  {
    id: "instagram-story",
    name: "Instagram Story",
    description: "Full-screen vertical story with title and lower-third overlay",
    category: "social-media",
    icon: "📱",
    tags: ["instagram", "story", "social"],
    duration: 5,
    width: 1080,
    height: 1920,
    background: "#0a0a1a",
    slots: [
      {
        componentId: "animated-title",
        config: { text: "New Video!", fontSize: 64, color: "#ffffff", y: -200, duration: 1.5 },
        name: "Headline",
      },
      {
        componentId: "typewriter",
        config: { text: "Link in bio to watch the full video...", fontSize: 32, color: "#d0d0d0", y: 0, duration: 8, delay: 1.5 },
        name: "Caption",
      },
      {
        componentId: "lower-third",
        config: { text: "@yourhandle | Creator", fill: "#e17055", color: "#ffffff", y: 300, delay: 3.5, duration: 1.5 },
        name: "Handle",
      },
    ],
  },

  // ─── Title Card ───────────────────────────────────────────────
  {
    id: "title-card",
    name: "Title Card",
    description: "Clean centered title with subtitle — great for presentations",
    category: "title-card",
    icon: "T",
    tags: ["presentation", "title", "clean"],
    duration: 4,
    width: 1920,
    height: 1080,
    background: "#1a1a2e",
    slots: [
      {
        componentId: "animated-title",
        config: { text: "Presentation Title", fontSize: 80, color: "#ffffff", y: -60, duration: 1.5 },
        name: "Main Title",
      },
      {
        componentId: "typewriter",
        config: { text: "A subtitle or tagline goes here", fontSize: 32, color: "#a0a0b0", y: 60, duration: 8, delay: 1.5 },
        name: "Subtitle",
      },
      {
        componentId: "shape-reveal",
        config: { fill: "#6c5ce7", width: 80, height: 4, text: "rectangle", y: -10, delay: 1, duration: 0.8 },
        name: "Divider",
      },
    ],
  },

  // ─── Lower Third Overlay ──────────────────────────────────────
  {
    id: "lower-third-overlay",
    name: "Lower Third",
    description: "Simple lower-third overlay for interviews and commentary",
    category: "lower-third",
    icon: "L",
    tags: ["interview", "news", "overlay"],
    duration: 6,
    width: 1920,
    height: 1080,
    background: "#00000000",
    slots: [
      {
        componentId: "lower-third",
        config: { text: "John Doe | CEO, Example Inc", fill: "#2d3436", color: "#ffffff", x: 0, y: 0, duration: 2 },
        name: "Name & Title",
      },
    ],
  },

  // ─── Countdown ────────────────────────────────────────────────
  {
    id: "countdown",
    name: "Countdown",
    description: "Number countdown with scale pop — for intros or transitions",
    category: "countdown",
    icon: "3",
    tags: ["countdown", "transition", "intro"],
    duration: 5,
    width: 1920,
    height: 1080,
    background: "#0f0f11",
    slots: [
      {
        componentId: "count-up",
        config: { text: "3", fontSize: 120, color: "#ffffff", y: 0, duration: 1 },
        name: "3",
      },
      {
        componentId: "count-up",
        config: { text: "2", fontSize: 120, color: "#e17055", y: 0, delay: 1, duration: 1 },
        name: "2",
      },
      {
        componentId: "count-up",
        config: { text: "1", fontSize: 120, color: "#00cec9", y: 0, delay: 2, duration: 1 },
        name: "1",
      },
      {
        componentId: "animated-title",
        config: { text: "GO!", fontSize: 96, color: "#6c5ce7", y: 0, delay: 3.5, duration: 1 },
        name: "Go",
      },
    ],
  },

  // ─── Social Banner ────────────────────────────────────────────
  {
    id: "social-banner",
    name: "Social Banner",
    description: "Wide banner with title and shape accent — for channel art or headers",
    category: "banner",
    icon: "⊞",
    tags: ["banner", "channel", "header", "social"],
    duration: 3,
    width: 2560,
    height: 1440,
    background: "#0f0f11",
    slots: [
      {
        componentId: "shape-reveal",
        config: { fill: "#6c5ce7", width: 300, height: 300, text: "ellipse", x: -800, y: -200, duration: 1.5 },
        name: "Accent Shape",
      },
      {
        componentId: "animated-title",
        config: { text: "My Brand", fontSize: 96, color: "#ffffff", y: -60, duration: 1.5 },
        name: "Brand",
      },
      {
        componentId: "typewriter",
        config: { text: "Creator · Educator · Maker", fontSize: 28, color: "#a0a0b0", y: 40, duration: 8, delay: 1.5 },
        name: "Tagline",
      },
    ],
  },
];

// ─── Lookup helpers ─────────────────────────────────────────────

export function getTemplate(id: string): CompositionTemplate | undefined {
  return builtinTemplates.find((t) => t.id === id);
}

export function getTemplatesByCategory(cat: string): CompositionTemplate[] {
  return builtinTemplates.filter((t) => t.category === cat);
}

export function getTemplateCategories(): string[] {
  return [...new Set(builtinTemplates.map((t) => t.category))];
}

// Category display names
export const categoryLabels: Record<string, string> = {
  "social-media": "Social Media",
  "presentation": "Presentations",

  "title-card": "Title Cards",
  "lower-third": "Lower Thirds",
  "thumbnail": "Thumbnails",
  "banner": "Banners",
  "slideshow": "Slideshows",
  "countdown": "Countdowns",
  "custom": "Custom",
};