import { describe, test, expect } from "bun:test";
import { applyEasing, lerp, interpolateTransform } from "../keyframes";

describe("applyEasing", () => {
  test("linear returns t unchanged", () => {
    expect(applyEasing(0, "linear")).toBe(0);
    expect(applyEasing(0.5, "linear")).toBe(0.5);
    expect(applyEasing(1, "linear")).toBe(1);
  });

  test("ease-in is quadratic", () => {
    expect(applyEasing(0, "ease-in")).toBe(0);
    expect(applyEasing(0.5, "ease-in")).toBe(0.25);
    expect(applyEasing(1, "ease-in")).toBe(1);
  });

  test("ease-out is t*(2-t)", () => {
    expect(applyEasing(0, "ease-out")).toBe(0);
    expect(applyEasing(0.5, "ease-out")).toBe(0.75);
    expect(applyEasing(1, "ease-out")).toBe(1);
  });

  test("ease uses symmetric bezier approximation", () => {
    expect(applyEasing(0, "ease")).toBe(0);
    expect(applyEasing(1, "ease")).toBe(1);
    expect(applyEasing(0.5, "ease")).toBeCloseTo(0.5, 1);
  });

  test("bezier easing delegates to cubicBezier", () => {
    const r = applyEasing(0.5, "bezier", [0.42, 0, 0.58, 1]);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(1);
  });

  test("bezier without coords falls back to linear", () => {
    expect(applyEasing(0.5, "bezier")).toBe(0.5);
  });
});

describe("lerp", () => {
  test("t=0 returns a", () => expect(lerp(10, 20, 0)).toBe(10));
  test("t=1 returns b", () => expect(lerp(10, 20, 1)).toBe(20));
  test("t=0.5 returns midpoint", () => expect(lerp(10, 20, 0.5)).toBe(15));
});

describe("interpolateTransform", () => {
  const base = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 };

  test("no keyframes returns base", () => {
    expect(interpolateTransform(base, [], 0)).toEqual(base);
  });

  test("snaps to prev keyframe when before first", () => {
    const kfs = [{ frame: 10, props: { x: 100 }, easing: "linear" as const }];
    const r = interpolateTransform(base, kfs, 5);
    expect(r.x).toBe(100);
  });

  test("interpolates between two keyframes", () => {
    const kfs = [
      { frame: 0, props: { x: 0 }, easing: "linear" as const },
      { frame: 10, props: { x: 100 }, easing: "linear" as const },
    ];
    const r = interpolateTransform(base, kfs, 5);
    expect(r.x).toBeCloseTo(50, 1);
  });

  test("handles partial props (only one keyframe has a value)", () => {
    const kfs = [
      { frame: 0, props: { x: 0 } as any, easing: "linear" as const },
      { frame: 10, props: { opacity: 0.5 } as any, easing: "linear" as const },
    ];
    const r = interpolateTransform(base, kfs, 5);
    expect(r.x).toBe(0);
    expect(r.opacity).toBe(0.5);
  });
});