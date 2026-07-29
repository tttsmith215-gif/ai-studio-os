import type { AppModule } from "../types.old";
import { ShaderGraph } from "../../panels/ShaderGraph";

export const ShaderGraphApp: AppModule = {
  register(r) {
    r.register({
      id: "shader-graph",
      name: "Shader Graph",
      description: "Visual node-based shader editor with real-time preview",
      icon: "⚡",
      version: "1.0.0",
      category: "motion",
      component: ShaderGraph,
    });
  },
};