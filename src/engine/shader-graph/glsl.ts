// ─── GLSL Code Generation from Shader Graph ─────────────────────
// Takes a ShaderGraphDef and emits runnable GLSL.
// ponytail: flat scope, no sub-functions. Add function inlining when
// graphs exceed 80 lines of generated code.

import type { ShaderGraphDef, GraphNode, Edge, SocketKind, NodeDef } from "./types";
import { NODE_REGISTRY } from "./nodes";

export interface CompiledShader {
  vertex: string;
  fragment: string;
  errors: string[];
  uniforms: string[];
}

// ─── Topological sort ───────────────────────────────────────────

function topoSort(nodes: GraphNode[], edges: Edge[]): GraphNode[] {
  const adj = new Map<string, string[]>();
  const inDeg = new Map<string, number>();
  for (const n of nodes) { adj.set(n.id, []); inDeg.set(n.id, 0); }
  for (const e of edges) {
    adj.get(e.fromNode)?.push(e.toNode);
    inDeg.set(e.toNode, (inDeg.get(e.toNode) || 0) + 1);
  }
  const q: string[] = [];
  for (const [id, deg] of inDeg) { if (deg === 0) q.push(id); }
  const sorted: GraphNode[] = [];
  while (q.length) {
    const id = q.shift()!;
    const node = nodes.find((n) => n.id === id);
    if (node) sorted.push(node);
    for (const next of adj.get(id) || []) {
      const d = (inDeg.get(next) || 1) - 1;
      inDeg.set(next, d);
      if (d === 0) q.push(next);
    }
  }
  return sorted;
}

// ─── Variable naming ────────────────────────────────────────────

function varName(nodeId: string, socketId: string): string {
  // Produce stable GLSL-safe variable names
  return `v_${nodeId.replace(/-/g, "_")}_${socketId.replace(/-/g, "_")}`;
}

// ─── Detect cycles ──────────────────────────────────────────────

export function detectCycles(nodes: GraphNode[], edges: Edge[]): string[] {
  const sorted = topoSort(nodes, edges);
  if (sorted.length < nodes.length) {
    const sortedIds = new Set(sorted.map((n) => n.id));
    const cycleNodes = nodes.filter((n) => !sortedIds.has(n.id));
    return cycleNodes.map((n) => {
      const def = NODE_REGISTRY[n.type];
      return `Cycle at node "${def?.label || n.type}" (${n.id.slice(0, 8)}…)`;
    });
  }
  return [];
}

// ─── Compile ────────────────────────────────────────────────────

export function compileShaderGraph(graph: ShaderGraphDef): CompiledShader {
  const errors: string[] = [];
  const uniforms: string[] = [];

  // Validate
  if (graph.nodes.length === 0) {
    errors.push("Graph is empty");
    return { vertex: "", fragment: "", errors, uniforms };
  }

  const cycles = detectCycles(graph.nodes, graph.edges);
  if (cycles.length > 0) {
    errors.push(...cycles);
    return { vertex: "", fragment: "", errors, uniforms };
  }

  // Check for output node
  const hasOutput = graph.nodes.some((n) => n.type === "fragmentOutput");
  if (!hasOutput) {
    errors.push("No Fragment Output node in graph");
  }

  if (errors.length > 0) return { vertex: "", fragment: "", errors, uniforms };

  // Topological sort
  const sorted = topoSort(graph.nodes, graph.edges);

  // Build edge lookup: nodeId + socketId → varName
  const outputValues = new Map<string, string>();
  for (const e of graph.edges) {
    outputValues.set(`${e.toNode}_${e.toSocket}`, varName(e.fromNode, e.fromSocket));
  }

  // Generate body lines
  const bodyLines: string[] = [];

  // Collect used uniform names
  const usedUniforms = new Set<string>();

  for (const node of sorted) {
    const def = NODE_REGISTRY[node.type];
    if (!def) {
      errors.push(`Unknown node type "${node.type}"`);
      continue;
    }

    // Skip input/output nodes — they map to uniforms or built-in variables
    if (node.type === "uv") continue;
    if (node.type === "time") { usedUniforms.add("u_time"); continue; }
    if (node.type === "resolution") { usedUniforms.add("u_resolution"); continue; }
    if (node.type === "fragmentOutput") continue; // handled at end
    if (node.type === "sampleTexture") { usedUniforms.add("u_texture"); continue; }

    // Build GLSL line by substituting template
    let line = def.glsl;

    // Substitute output variables
    for (const out of def.outputs) {
      const vn = varName(node.id, out.id);
      // Multi-output nodes have {output_x}, {output_y} etc.
      const key = out.id === "out" ? "{output}" : `{output_${out.id}}`;
      line = line.split(key).join(vn);
    }

    // Substitute input references: {i_name} → connected var or default
    for (const inp of def.inputs) {
      const connected = outputValues.get(`${node.id}_${inp.id}`);
      if (connected) {
        line = line.split(`{i_${inp.id}}`).join(connected);
      } else {
        // Unconnected input → use 0.0 for floats, vec2(0) for vec2, etc.
        line = line.split(`{i_${inp.id}}`).join(glslDefault(inp.kind));
      }
    }

    // Substitute params
    if (def.params) {
      for (const p of def.params) {
        const val = node.params[p.name] ?? p.default;
        const key = `{p_${p.name}}`;
        line = line.split(key).join(paramToGLSL(p.kind, val, p.options));
      }
    }

    bodyLines.push(`  ${line}`);
  }

  // Add uniforms
  if (usedUniforms.has("u_time")) uniforms.push("uniform float u_time;");
  if (usedUniforms.has("u_resolution")) uniforms.push("uniform vec2 u_resolution;");
  if (usedUniforms.has("u_texture")) uniforms.push("uniform sampler2D u_texture;");

  // Vertex shader
  const vertex = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texcoord;
out vec2 v_texcoord;

void main() {
  gl_Position = vec4(a_position * 2.0 - 1.0, 0, 1);
  v_texcoord = a_texcoord;
}
`;

  // Fragment shader
  const uniformsStr = uniforms.length > 0 ? uniforms.join("\n") + "\n" : "";
  const fragment = `#version 300 es
precision highp float;

in vec2 v_texcoord;
out vec4 outColor;

${uniformsStr}void main() {
${bodyLines.join("\n")}
}
`;

  return { vertex, fragment, errors, uniforms };
}

// ─── Helpers ────────────────────────────────────────────────────

function glslDefault(kind: SocketKind): string {
  switch (kind) {
    case "float": return "0.0";
    case "vec2": return "vec2(0.0)";
    case "vec3": return "vec3(0.0)";
    case "vec4":
    case "color": return "vec4(0.0)";
    case "sampler2D": return "vec4(1.0)";
  }
}

function paramToGLSL(kind: string, val: number | boolean | string | number[], options?: string[]): string {
  switch (kind) {
    case "float": return String(val);
    case "int": return String(Math.round(val as number));
    case "bool": return val ? "true" : "false";
    case "select": return String(val || options?.[0] || "rgba");
    case "color":
      if (Array.isArray(val)) return `vec4(${val[0]}, ${val[1]}, ${val[2]}, ${val[3]})`;
      return "vec4(1.0)";
    default: return String(val);
  }
}

// ─── Transpile a graph to runnable HTML/JS preview ──────────────

export function transpileToPreview(graph: ShaderGraphDef, fragShader: string, vertShader: string): string {
  return `
<!DOCTYPE html>
<html><head><style>
body { margin: 0; background: #111; display: flex; align-items: center; justify-content: center; height: 100vh; }
canvas { max-width: 100vw; max-height: 100vh; }
</style></head><body>
<canvas id="c"></canvas>
<script>
const canvas = document.getElementById('c');
canvas.width = 512;
canvas.height = 512;
const gl = canvas.getContext('webgl2');
if (!gl) { document.body.innerHTML = '<p>WebGL2 required</p>'; }

const vert = compile(gl.VERTEX_SHADER, \`${vertShader}\`);
const frag = compile(gl.FRAGMENT_SHADER, \`${fragShader}\`);
const prog = gl.createProgram();
gl.attachShader(prog, vert);
gl.attachShader(prog, frag);
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
  document.body.innerHTML = '<pre>' + gl.getProgramInfoLog(prog) + '</pre>';
}

const quad = new Float32Array([
  -1,-1, 0,0,  1,-1, 1,0,  -1,1,0,1,
  -1,1, 0,1,  1,-1, 1,0,   1,1, 1,1,
]);

const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
const aPos = gl.getAttribLocation(prog, 'a_position');
gl.enableVertexAttribArray(aPos);
gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);

function render(time) {
  gl.uniform1f(gl.getUniformLocation(prog, 'u_time'), time / 1000);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0,0,0,1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(prog);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    document.body.innerHTML = '<pre>' + gl.getShaderInfoLog(s) + '</pre>';
  }
  return s;
}
</script></body></html>`;
}