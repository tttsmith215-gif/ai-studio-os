// ─── Shader Graph Engine ─────────────────────────────────────────
// Re-exports for the shader graph panel.

export { NODE_REGISTRY } from "./nodes";
export { compileShaderGraph, detectCycles, transpileToPreview } from "./glsl";
export type { CompiledShader } from "./glsl";
export type {
  ShaderGraphDef, GraphNode, Edge, SocketDef,
  NodeDef, NodeParam, NodeCategory, SocketKind,
} from "./types";
export { emptyGraph } from "./types";