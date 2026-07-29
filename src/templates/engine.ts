// ─── AI Studio OS: Template Engine ───────────────────────────────
// Resolves CompositionTemplate → full Composition by calling
// motion component factories and merging their layers.

import type { Composition } from "../engine/types";
import { makeComposition } from "../engine/types";
import { getComponent } from "../motion";
import type { CompositionTemplate, TemplateSlot } from "./types";

// ─── Resolve a single slot into layers ──────────────────────────

export function slotToLayers(slot: TemplateSlot): ReturnType<typeof import("../motion").AnimatedTitle> {
  const comp = getComponent(slot.componentId);
  if (!comp) {
    console.warn(`[TemplateEngine] Unknown component: ${slot.componentId}`);
    return [];
  }

  const { x, y, ...config } = slot.config;
  const layers = comp.createLayers({ fps: 30, ...config });

  // Apply positional offset to every layer in the slot
  if (x !== undefined || y !== undefined) {
    for (const layer of layers) {
      if (x !== undefined) layer.transform.x += x;
      if (y !== undefined) layer.transform.y += y;
    }
  }

  return layers;
}

// ─── Resolve a full template into a Composition ─────────────────

export function templateToComposition(template: CompositionTemplate): Composition {
  const fps = template.fps ?? 30;
  const comp = makeComposition(
    template.name,
    template.width,
    template.height,
    fps,
    template.duration,
  );
  if (template.background) comp.background = template.background;

  for (const slot of template.slots) {
    const layers = slotToLayers(slot);
    comp.layers.push(...layers);
  }

  // Compute total frames from the longest layer
  const maxEnd = comp.layers.reduce((max, l) => {
    const lastKf = l.keyframes[l.keyframes.length - 1];
    return lastKf ? Math.max(max, lastKf.frame + fps * 0.5) : max;
  }, comp.totalFrames);
  comp.totalFrames = Math.max(comp.totalFrames, Math.ceil(maxEnd));

  return comp;
}

// ─── Batch resolve all templates (for listing) ──────────────────

export function resolveAllTemplates(templates: CompositionTemplate[]): Composition[] {
  return templates.map(templateToComposition);
}

// ─── Get template duration in frames ────────────────────────────

export function templateDurationFrames(template: CompositionTemplate): number {
  return (template.duration ?? 5) * (template.fps ?? 30);
}