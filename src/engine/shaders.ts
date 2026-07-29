// ─── WebGL2 Shaders for GPU Compositing ─────────────────────────
// Minimal vertex shader + per-blend-mode fragment shaders.
// ponytail: 9 blend modes in shader, add custom ones when users request

export const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texcoord;
out vec2 v_texcoord;

uniform vec2 u_resolution;
uniform vec2 u_offset;
uniform vec2 u_scale;
uniform float u_rotation;
uniform vec2 u_origin;

void main() {
  vec2 pos = a_position - u_origin;
  float s = sin(u_rotation);
  float c = cos(u_rotation);
  pos = vec2(pos.x * c - pos.y * s, pos.x * s + pos.y * c);
  pos *= u_scale;
  pos += u_origin + u_offset;
  vec2 zeroToOne = pos / u_resolution;
  vec2 clipSpace = zeroToOne * 2.0 - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  v_texcoord = a_texcoord;
}
`;

function fragBlend(blendBody: string): string {
  return `#version 300 es
precision highp float;

in vec2 v_texcoord;
out vec4 outColor;

uniform sampler2D u_texture;
uniform sampler2D u_backdrop;
uniform float u_opacity;

vec3 blend(vec3 base, vec3 layer) {
  ${blendBody}
}

void main() {
  vec4 layerColor = texture(u_texture, v_texcoord);
  vec4 baseColor = texture(u_backdrop, v_texcoord);
  layerColor.a *= u_opacity;

  if (layerColor.a == 0.0) {
    outColor = baseColor;
  } else if (baseColor.a == 0.0) {
    outColor = layerColor;
  } else {
    vec3 mixed = blend(baseColor.rgb / baseColor.a, layerColor.rgb / layerColor.a);
    float outA = layerColor.a + baseColor.a * (1.0 - layerColor.a);
    outColor = vec4(mixed * outA, outA);
  }
}`;
}

export const FRAG_NORMAL = fragBlend(`return layer;`);

export const FRAG_MULTIPLY = fragBlend(`return base * layer;`);

export const FRAG_SCREEN = fragBlend(`return 1.0 - (1.0 - base) * (1.0 - layer);`);

export const FRAG_OVERLAY = fragBlend(`
  float r = base.r < 0.5 ? 2.0 * base.r * layer.r : 1.0 - 2.0 * (1.0 - base.r) * (1.0 - layer.r);
  float g = base.g < 0.5 ? 2.0 * base.g * layer.g : 1.0 - 2.0 * (1.0 - base.g) * (1.0 - layer.g);
  float b = base.b < 0.5 ? 2.0 * base.b * layer.b : 1.0 - 2.0 * (1.0 - base.b) * (1.0 - layer.b);
  return vec3(r, g, b);
`);

export const FRAG_ADD = fragBlend(`return base + layer;`);

export const FRAG_ALPHA = fragBlend(`return base;`);

export const FRAG_LIGHTEN = fragBlend(`return max(base, layer);`);

export const FRAG_DARKEN = fragBlend(`return min(base, layer);`);

export const FRAG_COLOR_DODGE = fragBlend(`
  return clamp(base / (1.0 - layer + 0.0001), 0.0, 1.0);
`);

export const FRAG_COLOR_BURN = fragBlend(`
  return clamp(1.0 - (1.0 - base) / (layer + 0.0001), 0.0, 1.0);
`);

export const FRAG_HARD_LIGHT = fragBlend(`
  vec3 r;
  r.r = layer.r < 0.5 ? 2.0 * base.r * layer.r : 1.0 - 2.0 * (1.0 - base.r) * (1.0 - layer.r);
  r.g = layer.g < 0.5 ? 2.0 * base.g * layer.g : 1.0 - 2.0 * (1.0 - base.g) * (1.0 - layer.g);
  r.b = layer.b < 0.5 ? 2.0 * base.b * layer.b : 1.0 - 2.0 * (1.0 - base.b) * (1.0 - layer.b);
  return r;
`);

export const FRAG_SOFT_LIGHT = fragBlend(`
  float r = layer.r < 0.5
    ? base.r - (1.0 - 2.0 * layer.r) * base.r * (1.0 - base.r)
    : base.r + (2.0 * layer.r - 1.0) * (sqrt(base.r) - base.r);
  float g = layer.g < 0.5
    ? base.g - (1.0 - 2.0 * layer.g) * base.g * (1.0 - base.g)
    : base.g + (2.0 * layer.g - 1.0) * (sqrt(base.g) - base.g);
  float b = layer.b < 0.5
    ? base.b - (1.0 - 2.0 * layer.b) * base.b * (1.0 - base.b)
    : base.b + (2.0 * layer.b - 1.0) * (sqrt(base.b) - base.b);
  return vec3(r, g, b);
`);

const SHADER_MAP: Record<string, string> = {
  normal: FRAG_NORMAL,
  multiply: FRAG_MULTIPLY,
  screen: FRAG_SCREEN,
  overlay: FRAG_OVERLAY,
  add: FRAG_ADD,
  alpha: FRAG_ALPHA,
  lighten: FRAG_LIGHTEN,
  darken: FRAG_DARKEN,
  "color-dodge": FRAG_COLOR_DODGE,
  "color-burn": FRAG_COLOR_BURN,
  "hard-light": FRAG_HARD_LIGHT,
  "soft-light": FRAG_SOFT_LIGHT,
};

export function getFragmentShader(blendMode: string): string {
  return SHADER_MAP[blendMode] || FRAG_NORMAL;
}

// ─── Utility: compile shader ────────────────────────────────────

export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) || "unknown";
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string,
): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const program = gl.createProgram()!;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) || "unknown";
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${info}`);
  }
  return program;
}