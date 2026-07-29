import type { Easing } from "./types";

export function applyEasing(t: number, easing: Easing, bezier?: [number, number, number, number]): number {
  switch (easing) {
    case "linear":
      return t;
    case "ease":
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case "ease-in":
      return t * t;
    case "ease-out":
      return t * (2 - t);
    case "bezier":
      return bezier ? cubicBezier(t, ...bezier) : t;
    default:
      return t;
  }
}

function cubicBezier(t: number, x1: number, y1: number, x2: number, y2: number): number {
  // Approximate cubic bezier using Newton-Raphson
  let guess = t;
  for (let i = 0; i < 8; i++) {
    const x = 3 * (1 - guess) * (1 - guess) * guess * x1 + 3 * (1 - guess) * guess * guess * x2 + guess * guess * guess - t;
    if (Math.abs(x) < 1e-6) break;
    const dx = 3 * (1 - guess) * (1 - guess) * x1 + 6 * (1 - guess) * guess * (x2 - x1) + 3 * guess * guess * (1 - x2);
    if (Math.abs(dx) < 1e-6) break;
    guess -= x / dx;
  }
  return 3 * (1 - guess) * (1 - guess) * guess * y1 + 3 * (1 - guess) * guess * guess * y2 + guess * guess * guess;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function interpolateTransform(
  base: { x: number; y: number; scaleX: number; scaleY: number; rotation: number; opacity: number },
  keyframes: { frame: number; props: Partial<{ x: number; y: number; scaleX: number; scaleY: number; rotation: number; opacity: number }>; easing: Easing; bezier?: [number, number, number, number] }[],
  currentFrame: number
): { x: number; y: number; scaleX: number; scaleY: number; rotation: number; opacity: number } {
  if (keyframes.length === 0) return { ...base };

  const result = { ...base };

  // Find the two keyframes we're between
  let prev = keyframes[keyframes.length - 1];
  let next = keyframes[0];

  for (let i = 0; i < keyframes.length; i++) {
    if (keyframes[i].frame <= currentFrame) prev = keyframes[i];
    if (keyframes[i].frame > currentFrame) { next = keyframes[i]; break; }
  }

  if (prev.frame === next.frame || currentFrame <= prev.frame || currentFrame >= next.frame) {
    // Snap to the nearest keyframe
    const snap = currentFrame <= prev.frame ? prev : next;
    for (const key of Object.keys(snap.props) as (keyof typeof snap.props)[]) {
      const val = snap.props[key];
      if (val !== undefined) (result as any)[key] = val;
    }
    return result;
  }

  const t = (currentFrame - prev.frame) / (next.frame - prev.frame);
  const eased = applyEasing(t, prev.easing, prev.bezier);

  const allProps = new Set([...Object.keys(prev.props), ...Object.keys(next.props)] as (keyof typeof prev.props)[]);
  for (const key of allProps) {
    const a = prev.props[key];
    const b = next.props[key];
    if (a !== undefined && b !== undefined) {
      (result as any)[key] = lerp(a as number, b as number, eased);
    } else if (a !== undefined) {
      (result as any)[key] = a;
    } else if (b !== undefined) {
      (result as any)[key] = b;
    }
  }

  return result;
}