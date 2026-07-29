import type { Composition, Layer, Transform } from "./types";
import { interpolateTransform } from "./keyframes";

export interface RenderState {
  composition: Composition;
  currentFrame: number;
  isPlaying: boolean;
  resolution: number; // 0.25-2.0
}

export function createRenderer(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  let state: RenderState | null = null;
  let rafId = 0;
  let lastTime = 0;

  function fitCanvas(comp: Composition) {
    const parent = canvas.parentElement!;
    const maxW = parent.clientWidth;
    const maxH = parent.clientHeight;
    const scale = Math.min(maxW / comp.width, maxH / comp.height, 1);
    canvas.width = comp.width * scale;
    canvas.height = comp.height * scale;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    return scale;
  }

  function drawLayer(layer: Layer, frame: number, scale: number) {
    if (!layer.enabled) return;

    const t = interpolateTransform(layer.transform, layer.keyframes, frame);

    ctx.save();
    ctx.globalAlpha = t.opacity;
    ctx.translate(t.x * scale, t.y * scale);
    ctx.translate(layer.content.kind === "shape" ? ((layer.content as any).width || 0) * layer.transform.anchorX * scale : 0,
                  layer.content.kind === "shape" ? ((layer.content as any).height || 0) * layer.transform.anchorY * scale : 0);
    ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.scale(t.scaleX, t.scaleY);
    ctx.translate(-((layer.content as any).width || 0) * layer.transform.anchorX * scale,
                  -((layer.content as any).height || 0) * layer.transform.anchorY * scale);

    const c = layer.content;
    if (c.kind === "shape") {
      ctx.fillStyle = c.fill;
      if (c.stroke) { ctx.strokeStyle = c.stroke; ctx.lineWidth = (c.strokeWidth || 2) * scale; }

      const w = c.width * scale;
      const h = c.height * scale;
      const r = (c.cornerRadius || 0) * scale;

      if (c.shape === "rectangle") {
        if (r > 0) {
          ctx.beginPath();
          ctx.roundRect(0, 0, w, h, r);
          ctx.closePath();
        } else {
          ctx.beginPath();
          ctx.rect(0, 0, w, h);
        }
        ctx.fill();
        if (c.stroke) ctx.stroke();
      } else if (c.shape === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        if (c.stroke) ctx.stroke();
      } else if (c.shape === "triangle") {
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        if (c.stroke) ctx.stroke();
      } else if (c.shape === "star") {
        drawStar(ctx, w / 2, h / 2, Math.min(w, h) / 2 * scale, 5, 0.5);
        ctx.fill();
        if (c.stroke) ctx.stroke();
      }
    } else if (c.kind === "text") {
      ctx.font = `${c.bold ? "bold " : ""}${c.fontSize * scale}px ${c.fontFamily}`;
      ctx.fillStyle = c.color;
      ctx.textAlign = c.align;
      ctx.textBaseline = "middle";
      const x = c.align === "center" ? 0 : c.align === "right" ? -canvas.width / 2 : 0;
      ctx.fillText(c.text, x, 0);
    } else if (c.kind === "image" && c.bitmap) {
      ctx.drawImage(c.bitmap, 0, 0, c.naturalWidth * scale, c.naturalHeight * scale);
    }

    ctx.restore();
  }

  function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, points: number, innerRatio: number) {
    const innerR = outerR * innerRatio;
    const step = Math.PI / points;
    ctx.beginPath();
    for (let i = 0; i < 2 * points; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = -Math.PI / 2 + i * step;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function render(frame: number) {
    if (!state) return;
    const comp = state.composition;
    const scale = canvas.width / comp.width;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = comp.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw layers bottom to top
    for (const layer of comp.layers) {
      drawLayer(layer, frame, scale);
    }
  }

  function tick(time: number) {
    if (!state) return;
    if (!state.isPlaying) {
      render(state.currentFrame);
      return;
    }

    if (lastTime === 0) lastTime = time;
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    const frameAdvance = delta * state.composition.fps;
    state.currentFrame = Math.min(state.currentFrame + frameAdvance, state.composition.totalFrames - 1);

    render(Math.floor(state.currentFrame));

    if (state.currentFrame >= state.composition.totalFrames - 1) {
      state.isPlaying = false;
    }

    rafId = requestAnimationFrame(tick);
  }

  return {
    load(comp: Composition) {
      const scale = fitCanvas(comp);
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
        fitCanvas(state.composition);
        render(Math.floor(state.currentFrame));
      }
    },

    destroy() {
      cancelAnimationFrame(rafId);
      state = null;
    },
  };
}

export type Renderer = ReturnType<typeof createRenderer>;