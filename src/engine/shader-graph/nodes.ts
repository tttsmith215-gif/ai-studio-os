// ─── Built-in Shader Graph Node Definitions ──────────────────────
// Each node has a GLSL template that the code generator expands.
// ponytail: 40+ node types, add custom GLSL nodes via the node registry.

import type { NodeDef } from "./types";

export const NODE_REGISTRY: Record<string, NodeDef> = {};

function reg(def: NodeDef) {
  NODE_REGISTRY[def.type] = def;
}

// ── Inputs ──────────────────────────────────────────────────────

reg({
  type: "float",
  label: "Float",
  category: "input",
  inputs: [],
  outputs: [{ id: "out", name: "Value", kind: "float", direction: "output" }],
  glsl: "float {output} = {p_value};",
  params: [{ name: "value", label: "Value", kind: "float", default: 0.5 }],
});

reg({
  type: "vec2",
  label: "Vec2",
  category: "input",
  inputs: [],
  outputs: [{ id: "out", name: "Value", kind: "vec2", direction: "output" }],
  glsl: "vec2 {output} = vec2({p_x}, {p_y});",
  params: [
    { name: "x", label: "X", kind: "float", default: 0.5 },
    { name: "y", label: "Y", kind: "float", default: 0.5 },
  ],
});

reg({
  type: "vec3",
  label: "Vec3",
  category: "input",
  inputs: [],
  outputs: [{ id: "out", name: "Value", kind: "vec3", direction: "output" }],
  glsl: "vec3 {output} = vec3({p_x}, {p_y}, {p_z});",
  params: [
    { name: "x", label: "X", kind: "float", default: 0.5 },
    { name: "y", label: "Y", kind: "float", default: 0.5 },
    { name: "z", label: "Z", kind: "float", default: 0.5 },
  ],
});

reg({
  type: "color",
  label: "Color",
  category: "input",
  inputs: [],
  outputs: [{ id: "out", name: "Color", kind: "color", direction: "output" }],
  glsl: "vec4 {output} = vec4({p_r}, {p_g}, {p_b}, {p_a});",
  params: [
    { name: "r", label: "R", kind: "float", default: 1.0 },
    { name: "g", label: "G", kind: "float", default: 1.0 },
    { name: "b", label: "B", kind: "float", default: 1.0 },
    { name: "a", label: "A", kind: "float", default: 1.0 },
  ],
});

reg({
  type: "uv",
  label: "UV",
  category: "input",
  inputs: [],
  outputs: [{ id: "out", name: "UV", kind: "vec2", direction: "output" }],
  glsl: "vec2 {output} = v_texcoord;",
});

reg({
  type: "time",
  label: "Time",
  category: "input",
  inputs: [],
  outputs: [{ id: "out", name: "Time", kind: "float", direction: "output" }],
  glsl: "float {output} = u_time;",
});

reg({
  type: "resolution",
  label: "Resolution",
  category: "input",
  inputs: [],
  outputs: [{ id: "out", name: "Resolution", kind: "vec2", direction: "output" }],
  glsl: "vec2 {output} = u_resolution;",
});

reg({
  type: "sampleTexture",
  label: "Sample Texture",
  category: "texture",
  inputs: [
    { id: "uv", name: "UV", kind: "vec2", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Color", kind: "color", direction: "output" }],
  glsl: "vec4 {output} = texture(u_texture, {i_uv});",
});

// ── Output ──────────────────────────────────────────────────────

reg({
  type: "fragmentOutput",
  label: "Fragment Output",
  category: "output",
  inputs: [
    { id: "color", name: "Color", kind: "color", direction: "input" },
    { id: "alpha", name: "Alpha", kind: "float", direction: "input" },
  ],
  outputs: [],
  glsl: "outColor = vec4({i_color}.rgb, {i_alpha});",
  params: [
    { name: "useAlpha", label: "Use Alpha Input", kind: "bool", default: true },
  ],
});

// ── Math ────────────────────────────────────────────────────────

reg({
  type: "add",
  label: "Add",
  category: "math",
  inputs: [
    { id: "a", name: "A", kind: "float", direction: "input" },
    { id: "b", name: "B", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = {i_a} + {i_b};",
});

reg({
  type: "subtract",
  label: "Subtract",
  category: "math",
  inputs: [
    { id: "a", name: "A", kind: "float", direction: "input" },
    { id: "b", name: "B", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = {i_a} - {i_b};",
});

reg({
  type: "multiply",
  label: "Multiply",
  category: "math",
  inputs: [
    { id: "a", name: "A", kind: "float", direction: "input" },
    { id: "b", name: "B", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = {i_a} * {i_b};",
});

reg({
  type: "divide",
  label: "Divide",
  category: "math",
  inputs: [
    { id: "a", name: "A", kind: "float", direction: "input" },
    { id: "b", name: "B", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = {i_a} / ({i_b} + 0.0001);",
});

reg({
  type: "power",
  label: "Power",
  category: "math",
  inputs: [
    { id: "a", name: "A", kind: "float", direction: "input" },
    { id: "b", name: "B", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = pow({i_a}, {i_b});",
});

reg({
  type: "modulo",
  label: "Modulo",
  category: "math",
  inputs: [
    { id: "a", name: "A", kind: "float", direction: "input" },
    { id: "b", name: "B", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = mod({i_a}, {i_b});",
});

reg({
  type: "min",
  label: "Min",
  category: "math",
  inputs: [
    { id: "a", name: "A", kind: "float", direction: "input" },
    { id: "b", name: "B", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = min({i_a}, {i_b});",
});

reg({
  type: "max",
  label: "Max",
  category: "math",
  inputs: [
    { id: "a", name: "A", kind: "float", direction: "input" },
    { id: "b", name: "B", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = max({i_a}, {i_b});",
});

reg({
  type: "clamp",
  label: "Clamp",
  category: "math",
  inputs: [
    { id: "v", name: "Value", kind: "float", direction: "input" },
    { id: "lo", name: "Min", kind: "float", direction: "input" },
    { id: "hi", name: "Max", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = clamp({i_v}, {i_lo}, {i_hi});",
});

reg({
  type: "lerp",
  label: "Lerp",
  category: "math",
  inputs: [
    { id: "a", name: "A", kind: "float", direction: "input" },
    { id: "b", name: "B", kind: "float", direction: "input" },
    { id: "t", name: "T", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = mix({i_a}, {i_b}, {i_t});",
});

reg({
  type: "length",
  label: "Length",
  category: "math",
  inputs: [
    { id: "v", name: "Vector", kind: "vec2", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = length({i_v});",
});

reg({
  type: "distance",
  label: "Distance",
  category: "math",
  inputs: [
    { id: "a", name: "A", kind: "vec2", direction: "input" },
    { id: "b", name: "B", kind: "vec2", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = distance({i_a}, {i_b});",
});

reg({
  type: "dot",
  label: "Dot Product",
  category: "math",
  inputs: [
    { id: "a", name: "A", kind: "vec2", direction: "input" },
    { id: "b", name: "B", kind: "vec2", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = dot({i_a}, {i_b});",
});

reg({
  type: "normalize",
  label: "Normalize",
  category: "math",
  inputs: [
    { id: "v", name: "Vector", kind: "vec2", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "vec2", direction: "output" }],
  glsl: "vec2 {output} = normalize({i_v});",
});

reg({
  type: "abs",
  label: "Absolute",
  category: "math",
  inputs: [
    { id: "v", name: "Value", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = abs({i_v});",
});

reg({
  type: "sin",
  label: "Sine",
  category: "math",
  inputs: [
    { id: "v", name: "Value", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = sin({i_v});",
});

reg({
  type: "cos",
  label: "Cosine",
  category: "math",
  inputs: [
    { id: "v", name: "Value", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = cos({i_v});",
});

reg({
  type: "fract",
  label: "Fract",
  category: "math",
  inputs: [
    { id: "v", name: "Value", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = fract({i_v});",
});

reg({
  type: "floor",
  label: "Floor",
  category: "math",
  inputs: [
    { id: "v", name: "Value", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = floor({i_v});",
});

reg({
  type: "ceil",
  label: "Ceil",
  category: "math",
  inputs: [
    { id: "v", name: "Value", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = ceil({i_v});",
});

reg({
  type: "step",
  label: "Step",
  category: "conditional",
  inputs: [
    { id: "edge", name: "Edge", kind: "float", direction: "input" },
    { id: "v", name: "Value", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = step({i_edge}, {i_v});",
});

reg({
  type: "smoothstep",
  label: "Smoothstep",
  category: "conditional",
  inputs: [
    { id: "lo", name: "Edge0", kind: "float", direction: "input" },
    { id: "hi", name: "Edge1", kind: "float", direction: "input" },
    { id: "v", name: "Value", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "float", direction: "output" }],
  glsl: "float {output} = smoothstep({i_lo}, {i_hi}, {i_v});",
});

// ── Color ───────────────────────────────────────────────────────

reg({
  type: "hsvToRgb",
  label: "HSV → RGB",
  category: "color",
  inputs: [
    { id: "hsv", name: "HSV", kind: "vec3", direction: "input" },
  ],
  outputs: [{ id: "out", name: "RGB", kind: "vec3", direction: "output" }],
  glsl: `vec3 {output} = clamp(abs(mod({i_hsv}.x*6.0+vec3(0.0,4.0,2.0), 6.0)-3.0)-1.0, 0.0, 1.0);
  {output} = {i_hsv}.z * mix(vec3(1.0), {output}, {i_hsv}.y);`,
});

reg({
  type: "luminance",
  label: "Luminance",
  category: "color",
  inputs: [
    { id: "color", name: "Color", kind: "color", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Luma", kind: "float", direction: "output" }],
  glsl: "float {output} = dot({i_color}.rgb, vec3(0.299, 0.587, 0.114));",
});

// ── Vector ──────────────────────────────────────────────────────

reg({
  type: "combineVec2",
  label: "Combine Vec2",
  category: "vector",
  inputs: [
    { id: "x", name: "X", kind: "float", direction: "input" },
    { id: "y", name: "Y", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "vec2", direction: "output" }],
  glsl: "vec2 {output} = vec2({i_x}, {i_y});",
});

reg({
  type: "combineVec3",
  label: "Combine Vec3",
  category: "vector",
  inputs: [
    { id: "x", name: "X", kind: "float", direction: "input" },
    { id: "y", name: "Y", kind: "float", direction: "input" },
    { id: "z", name: "Z", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "vec3", direction: "output" }],
  glsl: "vec3 {output} = vec3({i_x}, {i_y}, {i_z});",
});

reg({
  type: "combineVec4",
  label: "Combine Vec4",
  category: "vector",
  inputs: [
    { id: "x", name: "X", kind: "float", direction: "input" },
    { id: "y", name: "Y", kind: "float", direction: "input" },
    { id: "z", name: "Z", kind: "float", direction: "input" },
    { id: "w", name: "W", kind: "float", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "vec4", direction: "output" }],
  glsl: "vec4 {output} = vec4({i_x}, {i_y}, {i_z}, {i_w});",
});

reg({
  type: "splitVec2",
  label: "Split Vec2",
  category: "vector",
  inputs: [
    { id: "v", name: "Vector", kind: "vec2", direction: "input" },
  ],
  outputs: [
    { id: "x", name: "X", kind: "float", direction: "output" },
    { id: "y", name: "Y", kind: "float", direction: "output" },
  ],
  glsl: "float {output_x} = {i_v}.x;\n  float {output_y} = {i_v}.y;",
});

reg({
  type: "splitVec3",
  label: "Split Vec3",
  category: "vector",
  inputs: [
    { id: "v", name: "Vector", kind: "vec3", direction: "input" },
  ],
  outputs: [
    { id: "x", name: "X", kind: "float", direction: "output" },
    { id: "y", name: "Y", kind: "float", direction: "output" },
    { id: "z", name: "Z", kind: "float", direction: "output" },
  ],
  glsl: "float {output_x} = {i_v}.x;\n  float {output_y} = {i_v}.y;\n  float {output_z} = {i_v}.z;",
});

reg({
  type: "swizzle",
  label: "Swizzle",
  category: "vector",
  inputs: [
    { id: "v", name: "Vector", kind: "vec4", direction: "input" },
  ],
  outputs: [{ id: "out", name: "Result", kind: "vec4", direction: "output" }],
  glsl: "vec4 {output} = {i_v}.{p_swizzle};",
  params: [
    { name: "swizzle", label: "Swizzle", kind: "select", default: "rgba", options: ["rgba", "rgb", "rrr", "ggg", "bbb", "aaa", "r", "g", "b", "a", "gr", "ba", "gba", "rrr", "ggg", "bbb", "aaa", "rrrr", "gggg", "bbbb", "aaaa", "rgb", "rg", "rb", "gb", "rbg", "grb", "gbr", "brg", "bgr"] },
  ],
});