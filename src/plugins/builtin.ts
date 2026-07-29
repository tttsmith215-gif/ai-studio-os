// ---------------------------------------------------------------------------
// AI Studio OS — Built-in Plugin Adapter
// ---------------------------------------------------------------------------
// Bridges the old AppModule pattern to the new SDK extension registry.
// Built-in apps register through this adapter, which places them into
// the new pluginRegistry.extension.apps map.
// ---------------------------------------------------------------------------

import type { CreativeApp } from "../sdk/app";
import type { CreativeAppRegistry } from "./types.old";
import { pluginRegistry } from "./registry";

class BuiltinRegistryAdapter implements CreativeAppRegistry {
  register(app: CreativeApp): void {
    pluginRegistry.extension.apps.set(app.id, { ...app, pluginId: "builtin" });
  }

  get(id: string): CreativeApp | undefined {
    return pluginRegistry.extension.apps.get(id);
  }

  getAll(): CreativeApp[] {
    return Array.from(pluginRegistry.extension.apps.values());
  }

  getByCategory(category: string): CreativeApp[] {
    return this.getAll().filter((a) => a.category === category);
  }
}

export const builtinRegistry = new BuiltinRegistryAdapter();

// Register all built-in apps
import { MotionStudio } from "./apps/MotionStudio";
import { Publishing } from "./apps/Publishing";
import { Analytics } from "./apps/Analytics";

MotionStudio.register(builtinRegistry);
Publishing.register(builtinRegistry);
Analytics.register(builtinRegistry);