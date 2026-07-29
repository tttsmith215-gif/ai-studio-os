// ─── Shader Graph Data Model ─────────────────────────────────────
// A node-based visual shader editor for generating custom GLSL.
// ponytail: flat node graph, no sub-graphs or metanodes. Add when
// graphs exceed 50+ nodes.

export type SocketKind =
  | "float" | "vec2" | "vec3" | "vec4"
  | "color" | "sampler2D";

export type NodeCategory =
  | "input" | "output" | "math" | "color"
  | "texture" | "vector" | "conditional";

export interface SocketDef {
  id: string;
  name: string;
  kind: SocketKind;
  direction: "input" | "output";
}

export interface NodeDef {
  type: string;
  label: string;
  category: NodeCategory;
  inputs: SocketDef[];
  outputs: SocketDef[];
  glsl: string; // GLSL template: {inputs} {outputs} {params}
  params?: NodeParam[];
}

export interface NodeParam {
  name: string;
  label: string;
  kind: "float" | "int" | "bool" | "color" | "select";
  default: number | boolean | string | number[];
  options?: string[]; // for select
}

export interface GraphNode {
  id: string;
  type: string;
  x: number;
  y: number;
  params: Record<string, number | boolean | string | number[]>;
}

export interface Edge {
  id: string;
  fromNode: string;
  fromSocket: string;
  toNode: string;
  toSocket: string;
}

export interface ShaderGraphDef {
  nodes: GraphNode[];
  edges: Edge[];
  name: string;
  description?: string;
}

// ─── Default empty graph ────────────────────────────────────────

export function emptyGraph(name = "New Shader"): ShaderGraphDef {
  return {
    name,
    nodes: [],
    edges: [],
  };
}