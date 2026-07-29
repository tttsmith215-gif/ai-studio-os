import { invoke } from '@tauri-apps/api/core';

// ─── Types ───────────────────────────────────────────────────────

export interface AssetEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: string;
}

// ─── Asset Browser ───────────────────────────────────────────────

/** List files/dirs under a subpath of the data root (e.g. "assets/images/imported") */
export function listAssets(subpath: string): Promise<AssetEntry[]> {
  return invoke('list_assets', { subpath });
}

/** Get the absolute filesystem path for a data-root subpath */
export function getAssetPath(subpath: string): Promise<string> {
  return invoke('get_asset_path', { subpath });
}

// ─── Convenience: typed asset directories ────────────────────────

export const AssetDir = {
  images: 'assets/images/imported',
  videos: 'assets/videos/imported',
  music: 'assets/audio/music/imported',
  voices: 'assets/audio/voices/recordings',
  sfx: 'assets/audio/sfx/imported',
  fonts: 'assets/fonts/custom',
  models: 'assets/models',
  '3d': 'assets/3d/imported',
  hdri: 'assets/3d/hdri',
  exports: 'exports',
  templates: 'templates',
  plugins: 'plugins/user',
  themes: 'themes/user',
  icons: 'assets/icons',
} as const;