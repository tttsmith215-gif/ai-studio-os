// ---------------------------------------------------------------------------
// AI Studio OS — Plugin SDK: Theme Provider Extension Point
// ---------------------------------------------------------------------------
// Theme providers define color palettes, typography, spacing, and optional
// CSS custom properties. The host applies themes by setting CSS variables
// on the document root.
// ---------------------------------------------------------------------------

import type { ComponentType } from "react";

// ---------------------------------------------------------------------------
// Theme definition — a complete visual theme for the host UI.
// ---------------------------------------------------------------------------
export interface Theme {
  /** Unique theme ID */
  id: string;
  /** Display name (e.g. "Dark", "Neon", "Pastel") */
  name: string;
  /** Optional parent theme ID to inherit from */
  extends?: string;
  /** Light or dark variant (affects default color scheme) */
  variant: "light" | "dark" | "custom";
  /** Optional preview thumbnail (URL or data URI) */
  preview?: string;

  /** CSS custom property overrides (--bg-primary, --text-primary, etc.) */
  colors: Record<string, string>;
  /** Typography overrides */
  typography?: ThemeTypography;
  /** Spacing scale overrides (--space-1, --space-2, ..., --space-8) */
  spacing?: Record<string, string>;
  /** Border radius overrides */
  radii?: Record<string, string>;
  /** Shadow definitions */
  shadows?: Record<string, string>;
  /** Any additional CSS the theme needs injected */
  additionalCSS?: string;
}

export interface ThemeTypography {
  fontFamily?: string;
  fontFamilyMono?: string;
  fontSize?: Record<string, string>;
  fontWeight?: Record<string, string>;
  lineHeight?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Dynamic theme — a theme that can react to a parameter (time, accent color,
// user preference).
// ---------------------------------------------------------------------------
export interface DynamicTheme extends Theme {
  /** Called every time the host needs to refresh CSS variables */
  compute(params: DynamicThemeParams): Record<string, string>;
}

export interface DynamicThemeParams {
  time?: number; // for time-of-day themes
  accentColor?: string;
  userPreferences?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Theme provider
// ---------------------------------------------------------------------------
export interface ThemeProvider {
  id: string;
  name: string;
  /** Optional config UI shown in the theme library */
  SettingsComponent?: ComponentType;
  /** The themes this provider contributes */
  themes: Theme[];
}