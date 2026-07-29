// ---------------------------------------------------------------------------
// AI Studio OS — Plugin SDK: Asset Provider Extension Point
// ---------------------------------------------------------------------------
// Asset providers supply external media: stock footage, music, sound effects,
// fonts, 3D models, LUTs, overlays, etc. The host's asset library shows
// all registered providers.
// ---------------------------------------------------------------------------

import type { ComponentType } from "react";

// ---------------------------------------------------------------------------
// Asset types
// ---------------------------------------------------------------------------
export type AssetType =
  | "video"
  | "audio"
  | "image"
  | "font"
  | "3d-model"
  | "lut"
  | "overlay"
  | "brush"
  | "preset"
  | "custom";

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  /** Full URL or local path to the asset */
  url: string;
  /** Preview thumbnail URL */
  preview?: string;
  /** File size in bytes */
  size?: number;
  /** Duration in seconds (for video/audio) */
  duration?: number;
  /** Resolution (for video/image) */
  resolution?: { width: number; height: number };
  /** License info */
  license?: "royalty-free" | "cc0" | "cc-by" | "custom" | "paid";
  /** Tags for search */
  tags?: string[];
  /** Whether this asset is cached locally */
  cached?: boolean;
}

// ---------------------------------------------------------------------------
// Asset collection — a group of related assets (e.g. "Cinematic Pack")
// ---------------------------------------------------------------------------
export interface AssetCollection {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  /** Number of assets in this collection */
  assetCount: number;
  /** Preview images */
  previews?: string[];
  /** Whether the entire collection is cached */
  cached?: boolean;
}

// ---------------------------------------------------------------------------
// Asset provider
// ---------------------------------------------------------------------------
export interface AssetProvider {
  id: string;
  name: string;
  description?: string;
  /** Asset types this provider offers */
  types: AssetType[];
  /** Whether this provider requires authentication */
  requiresAuth?: boolean;
  /** Collections this provider offers */
  collections?: AssetCollection[];

  /** Optional config UI */
  SettingsComponent?: ComponentType;

  /** Search assets across this provider */
  search(query: AssetSearch): Promise<AssetSearchResult>;

  /** Get a single asset by ID */
  getAsset(id: string): Promise<Asset | null>;

  /** Download/cache an asset locally */
  cacheAsset(id: string): Promise<string>; // returns local path

  /** Get a collection's assets */
  getCollection(collectionId: string): Promise<Asset[]>;

  /** Stream a preview (for audio/video assets) */
  getPreviewUrl?(id: string): Promise<string>;
}

export interface AssetSearch {
  query: string;
  type?: AssetType;
  tags?: string[];
  collections?: string[];
  page?: number;
  pageSize?: number;
  sort?: "relevance" | "date" | "name" | "popularity";
  license?: string;
}

export interface AssetSearchResult {
  assets: Asset[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}