// ---------------------------------------------------------------------------
// AI Studio OS — Plugin SDK: Creative App Extension Point
// ---------------------------------------------------------------------------
// A "Creative App" is a top-level workspace mode (Motion Studio, Video
// Editor, etc.). Each app owns its own UI, tools, and panels. The host
// provides a sidebar entry and a full-screen viewport.
// ---------------------------------------------------------------------------

import type { ComponentType } from "react";

export interface CreativeApp {
  /** Unique ID matching the app's tool or workspace ID */
  id: string;
  /** Display name in the sidebar and menus */
  name: string;
  /** Short description */
  description: string;
  /** Emoji or icon path */
  icon: string;
  /** SemVer */
  version: string;
  /** Category for grouping in the app store */
  category: AppCategory;

  /** The main workspace component (rendered in the content area) */
  component: ComponentType;

  /** Optional: toolbar actions contributed by this app */
  toolbarActions?: ToolbarAction[];

  /** Optional: custom panels contributed by this app */
  panels?: AppPanel[];
}

export type AppCategory =
  | "motion"
  | "video"
  | "image"
  | "audio"
  | "text"
  | "3d"
  | "manage"
  | "system";

export interface ToolbarAction {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  execute(): void;
}

export interface AppPanel {
  id: string;
  label: string;
  icon?: string;
  component: ComponentType;
  /** Where the panel should dock by default */
  defaultPosition?: "left" | "right" | "bottom" | "float";
}