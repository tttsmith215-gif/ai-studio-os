// ─── WebGL2 GPU Renderer ─────────────────────────────────────────
// Drop-in replacement for Canvas 2D renderer. Same API: createRenderer(canvas).
// Uses GPU for compositing with shader-based blend modes.
// ponytail: shapes/text rasterized to canvas then uploaded as textures.
// GPU geometry path for shapes when shape count > 500.

import type { Composition, Layer, Transform } from "./types";
import { interpolateTransform } from "./keyframes";
import { TextureCache } from "./texture-cache";
import {
  VERTEX_SHADER, getFragmentShader,
  compileShader, createProgram,
} from "./shaders";
import type { RenderState } from "./renderer";

// ─── Quad geometry (shared across all layers) ───────────────────

const QUAD_VERTICES = new Float32Array([
  0, 0, 0, 0,
  1, 0, 1, 0,
  0, 1, 0, 1,
  1, 1, 1, 1,
]);
const QUAD_INDICES = new Uint16Array([0, 1, 2, 2, 1, 3]);

// ─── Layer content → canvas rasterizer (reuses existing draw code) ──

function rasterizeLayer(layer: Layer, compW: number, compH: number): HTMLCanvasElement {
  const c = layer.content;
  const canvas = document.createElement("canvas");
  let w = compW, h = compH;

  if (c.kind === "shape") {
    w = (c.width || 100) * 1.5;
    h = (c.height || 100) * 1.5;
  } else if (c.kind === "text") {
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.font = `${c.bold ? "bold " : ""}${c.fontSize}px ${c.fontFamily}`;
    const metrics = ctx.measureText(c.text);
    w = Math.ceil(metrics.width) + 40;
    h = Math.ceil(c.fontSize * 1.5) + 40;
  } else if (c.kind === "image") {
    w = c.naturalWidth || compW;
    h = c.naturalHeight || compH;
  }

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);

  if (c.kind === "shape") {
    ctx.fillStyle = c.fill;
    if (c.stroke) { ctx.strokeStyle = c.stroke; ctx.lineWidth = c.strokeWidth || 2; }
    const sw = c.width, sh = c.height, r = c.cornerRadius || 0;
    if (c.shape === "rectangle") {
      ctx.beginPath();
      if (r > 0) { ctx.roundRect(0, 0, sw, sh, r); }
      else { ctx.rect(0, 0, sw, sh); }
      ctx.closePath();
      ctx.fill();
      if (c.stroke) ctx.stroke();
    } else if (c.shape === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(sw / 2, sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (c.stroke) ctx.stroke();
    } else if (c.shape === "triangle") {
      ctx.beginPath();
      ctx.moveTo(sw / 2, 0); ctx.lineTo(sw, sh); ctx.lineTo(0, sh);
      ctx.closePath();
      ctx.fill();
      if (c.stroke) ctx.stroke();
    } else if (c.shape === "star") {
      const outer = Math.min(sw, sh) / 2;
      const inner = outer * 0.5;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const x = sw / 2 + r * Math.cos(a);
        const y = sh / 2 + r * Math.sin(a);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      if (c.stroke) ctx.stroke();
    }
  } else if (c.kind === "text") {
    ctx.font = `${c.bold ? "bold " : ""}${c.fontSize}px ${c.fontFamily}`;
    ctx.fillStyle = c.color;
    ctx.textAlign = c.align || "center";
    ctx.textBaseline = "middle";
    const x = c.align === "center" ? w / 2 : c.align === "right" ? w - 20 : 20;
    ctx.fillText(c.text, x, h / 2);
  } else if (c.kind === "image" && c.bitmap) {
    ctx.drawImage(c.bitmap, 0, 0, w, h);
  }

  return canvas;
}

function contentKey(layer: Layer): string {
  return JSON.stringify(layer.content);
}

// ─── WebGL2 Renderer ────────────────────────────────────────────

export function createWebGL2Renderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: false,
    antialias: true,
  });
  if (!gl) throw new Error("WebGL2 not available");

  let state: RenderState | null = null;
  let rafId = 0;
  let lastTime = 0;

  // Composition resolution
  let compW = 960;
  let compH = 540;

  // Program cache: blendMode → WebGLProgram
  const programs = new Map<string, WebGLProgram>();

  // Texture cache
  const texCache = new TextureCache();

  // Last content keys for dirty detection
  const lastContentKeys = new Map<string, string>();

  // Framebuffer for compositing
  let fb: WebGLFramebuffer | null = null;
  let fbTexture: WebGLTexture | null = null;

  // Quad geometry
  let vao: WebGLVertexArrayObject | null = null;
  let posBuf: WebGLBuffer | null = null;
  let idxBuf: WebGLBuffer | null = null;

  // ── Init GL state ──
  function initGL() {
    // Create VAO
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Position + texcoord buffer
    posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);

    // Index buffer
    idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, QUAD_INDICES, gl.STATIC_DRAW);

    // Attributes (size = 4 floats per vertex: position.xy, texcoord.xy)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    gl.enableVertexAttribArray(1);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    // Blend off — we do blend modes in shader
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
  }

  // ── Create/recreate framebuffer at composition size ──
  function createFramebuffer(w: number, h: number) {
    if (fbTexture) gl.deleteTexture(fbTexture);
    if (fb) gl.deleteFramebuffer(fb);

    fbTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fbTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // ── Get or compile shader program for blend mode ──
  function getProgram(blendMode: string): WebGLProgram {
    let prog = programs.get(blendMode);
    if (!prog) {
      const fragSrc = getFragmentShader(blendMode);
      prog = createProgram(gl, VERTEX_SHADER, fragSrc);
      programs.set(blendMode, prog);
    }
    return prog;
  }

  // ── Upload layer content to texture ──
  function uploadLayer(layer: Layer, texUnit: number): WebGLTexture | null {
    const key = `${layer.id}_${contentKey(layer)}`;
    const cached = texCache.get(key);
    if (cached) return cached.texture;

    const canvas = rasterizeLayer(layer, compW, compH);
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    texCache.set(key, texture, canvas.width, canvas.height);
    return texture;
  }

  // ── Fit canvas to parent ──
  function fitCanvas() {
    const parent = canvas.parentElement;
    if (!parent) return;
    const maxW = parent.clientWidth;
    const maxH = parent.clientHeight;
    const scale = Math.min(maxW / compW, maxH / compH, 1);
    canvas.width = compW * scale;
    canvas.height = compH * scale;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  // ── Render a single frame ──
  function render(frame: number) {
    if (!state) return;
    const comp = state.composition;

    // Ensure framebuffer matches comp size
    if (!fbTexture || !fb) {
      createFramebuffer(compW, compH);
    }

    // Bind framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.viewport(0, 0, compW, compH);

    // Clear with background
    const bg = hexToRGBA(comp.background);
    gl.clearColor(bg[0], bg[1], bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Draw layers bottom-to-top
    gl.bindVertexArray(vao);

    for (const layer of comp.layers) {
      if (!layer.enabled) continue;

      const t = interpolateTransform(layer.transform, layer.keyframes, frame);
      if (t.opacity <= 0.01) continue;

      // Get layer texture
      const tex = uploadLayer(layer, 0);
      if (!tex) continue;

      // Get shader program
      const prog = getProgram(layer.blendMode || "normal");
      gl.useProgram(prog);

      // Set uniforms
      gl.uniform2f(gl.getUniformLocation(prog, "u_resolution"), compW, compH);

      // Offset: center of content in comp space
      const c = layer.content;
      let contentW = compW, contentH = compH;
      if (c.kind === "shape") { contentW = (c.width || 100) * 1.5; contentH = (c.height || 100) * 1.5; }
      else if (c.kind === "text") { contentW = compW; contentH = compH; }
      else if (c.kind === "image") { contentW = c.naturalWidth || compW; contentH = c.naturalHeight || compH; }

      const ox = t.x + t.anchorX * contentW;
      const oy = t.y + t.anchorY * contentH;
      gl.uniform2f(gl.getUniformLocation(prog, "u_offset"), ox, oy);
      gl.uniform2f(gl.getUniformLocation(prog, "u_scale"), t.scaleX, t.scaleY);
      gl.uniform1f(gl.getUniformLocation(prog, "u_rotation"), (t.rotation * Math.PI) / 180);
      gl.uniform2f(gl.getUniformLocation(prog, "u_origin"), t.anchorX * contentW, t.anchorY * contentH);
      gl.uniform1f(gl.getUniformLocation(prog, "u_opacity"), t.opacity);

      // Bind backdrop texture (the fb we're reading from)
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, fbTexture);
      gl.uniform1i(gl.getUniformLocation(prog, "u_backdrop"), 1);

      // Bind layer texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(gl.getUniformLocation(prog, "u_texture"), 0);

      // Draw quad
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    texCache.markFrame();

    // Blit to canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fb);
    gl.blitFramebuffer(0, 0, compW, compH, 0, 0, canvas.width, canvas.height, gl.COLOR_BUFFER_BIT, gl.LINEAR);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  }

  // ── RAF loop ──
  function tick(time: number) {
    if (!state) return;
    if (!state.isPlaying) {
      render(state.currentFrame);
      return;
    }
    if (lastTime === 0) lastTime = time;
    const delta = (time - lastTime) / 1000;
    lastTime = time;
    const advance = delta * state.composition.fps;
    state.currentFrame = Math.min(state.currentFrame + advance, state.composition.totalFrames - 1);
    render(Math.floor(state.currentFrame));
    if (state.currentFrame >= state.composition.totalFrames - 1) state.isPlaying = false;
    rafId = requestAnimationFrame(tick);
  }

  // ── Init ──
  initGL();

  // ── Public API ──
  return {
    load(comp: Composition) {
      compW = comp.width;
      compH = comp.height;
      createFramebuffer(compW, compH);
      fitCanvas();
      state = { composition: comp, currentFrame: 0, isPlaying: false, resolution: 1 };
      render(0);
    },

    play() {
      if (!state) return;
      state.isPlaying = true;
      lastTime = 0;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    },

    pause() {
      if (!state) return;
      state.isPlaying = false;
      cancelAnimationFrame(rafId);
    },

    goToFrame(frame: number) {
      if (!state) return;
      state.currentFrame = Math.max(0, Math.min(frame, state.composition.totalFrames - 1));
      render(Math.floor(state.currentFrame));
    },

    getCurrentFrame(): number {
      return state ? Math.floor(state.currentFrame) : 0;
    },

    isPlaying(): boolean {
      return state?.isPlaying ?? false;
    },

    getTotalFrames(): number {
      return state?.composition.totalFrames ?? 0;
    },

    getFps(): number {
      return state?.composition.fps ?? 30;
    },

    resize() {
      if (state) {
        fitCanvas();
        render(Math.floor(state.currentFrame));
      }
    },

    destroy() {
      cancelAnimationFrame(rafId);
      state = null;
      programs.forEach((p) => gl.deleteProgram(p));
      programs.clear();
      texCache.clear();
      if (fbTexture) gl.deleteTexture(fbTexture);
      if (fb) gl.deleteFramebuffer(fb);
      if (vao) gl.deleteVertexArray(vao);
      if (posBuf) gl.deleteBuffer(posBuf);
      if (idxBuf) gl.deleteBuffer(idxBuf);
    },
  };
}

// ─── Color helper ───────────────────────────────────────────────

function hexToRGBA(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const num = parseInt(h, 16);
  return [
    ((num >> 16) & 0xff) / 255,
    ((num >> 8) & 0xff) / 255,
    (num & 0xff) / 255,
  ];
}

export type WebGL2Renderer = ReturnType<typeof createWebGL2Renderer>;