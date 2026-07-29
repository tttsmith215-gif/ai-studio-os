// ---------------------------------------------------------------------------
// AI Studio OS — Legacy AppModule adapter
// ---------------------------------------------------------------------------
// Transitional: the old AppModule.register() pattern is kept for the
// built-in apps until they migrate to the full PluginManifest format.
// ---------------------------------------------------------------------------

import type { CreativeApp } from "../sdk/app";

export interface AppModule {
  register(registry: CreativeAppRegistry): void;
}

export interface CreativeAppRegistry {
  register(app: CreativeApp): void;
  get(id: string): CreativeApp | undefined;
  getAll(): CreativeApp[];
  getByCategory(category: string): CreativeApp[];
}