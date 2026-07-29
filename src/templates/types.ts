// ─── AI Studio OS: Template Engine Types ─────────────────────────
// Templates wrap motion components into full composition presets.

import type { MotionConfig } from "../motion";

export type TemplateCategory =
  | "social-media"
  | "presentation"
  | "video-intro"
  | "video-outro"
  | "title-card"
  | "lower-third"
  | "thumbnail"
  | "banner"
  | "countdown"
  | "custom";

export interface TemplateSlot {
  /** Motion component ID from the registry */
  componentId: string;
  /** Config passed to the component factory — permissive to allow component-specific params */
  config: Record<string, any>;
  /** Optional label for this slot */
  name?: string;
}

export interface CompositionTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  tags?: string[];
  /** Duration in seconds */
  duration: number;
  width: number;
  height: number;
  /** Component slots — resolved in order, layers merged bottom to top */
  slots: TemplateSlot[];
  /** Background color */
  background?: string;
  /** FPS to render at */
  fps?: number;
}