// ---------------------------------------------------------------------------
// AI Studio OS — Plugin SDK: Template Provider Extension Point
// ---------------------------------------------------------------------------
// Template providers supply project templates and/or asset templates.
// Templates are JSON blobs the host deserializes into projects, compositions,
// or individual layers.
// ---------------------------------------------------------------------------

import type { ComponentType } from "react";

// ---------------------------------------------------------------------------
// Project template — creates a full project with composition(s), layers, etc.
// ---------------------------------------------------------------------------
export interface ProjectTemplate {
  /** Template ID */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Category for browsing */
  category: TemplateCategory;
  /** Preview image URL */
  preview?: string;
  /** Icon emoji */
  icon?: string;
  /** Tags */
  tags?: string[];

  /** The serialized project data the host applies */
  data: Record<string, unknown>;
  /** Required app IDs (e.g. ["motion-studio"]) that must be installed */
  requiresApps?: string[];
}

// ---------------------------------------------------------------------------
// Asset template — a single reusable layer or group (sticker, lower-third,
// title card, etc.).
// ---------------------------------------------------------------------------
export interface AssetTemplate {
  id: string;
  name: string;
  description: string;
  type: "layer" | "composition" | "text-preset" | "shape-preset" | "group";
  icon?: string;
  preview?: string;
  tags?: string[];
  /** The serialized layer(s) or composition data */
  data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Template provider
// ---------------------------------------------------------------------------
export type TemplateCategory =
  | "social-media"
  | "presentation"
  | "video-intro"
  | "video-outro"
  | "lower-third"
  | "title-card"
  | "thumbnail"
  | "banner"
  | "slideshow"
  | "custom";

export interface TemplateProvider {
  id: string;
  name: string;
  SettingsComponent?: ComponentType;
  /** Project-level templates */
  projectTemplates?: ProjectTemplate[];
  /** Individual asset templates */
  assetTemplates?: AssetTemplate[];
}