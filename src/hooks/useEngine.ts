import { useRef, useEffect, useCallback } from "react";
import { createRenderer, type Renderer } from "../engine/renderer";
import type { Composition } from "../engine/types";

/**
 * Bind a canvas ref to the renderer lifecycle.
 * Automatically creates/destroys the renderer, handles resize, and
 * provides play/pause/goToFrame controls.
 *
 * ```ts
 * const canvasRef = useRef<HTMLCanvasElement>(null);
 * const { play, pause, goToFrame, load } = useEngine(canvasRef, comp);
 * ```
 */
export function useEngine(canvasRef: React.RefObject<HTMLCanvasElement | null>, composition: Composition | null) {
  const renderer = useRef<Renderer | null>(null);

  // Create/destroy renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !composition) return;
    renderer.current = createRenderer(canvas);
    renderer.current.load(composition);
    return () => {
      renderer.current?.destroy();
      renderer.current = null;
    };
  }, [canvasRef, composition]);

  // Watch for resize
  useEffect(() => {
    if (!composition) return;
    const onResize = () => renderer.current?.resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [composition]);

  const play = useCallback(() => renderer.current?.play(), []);
  const pause = useCallback(() => renderer.current?.pause(), []);
  const goToFrame = useCallback((frame: number) => renderer.current?.goToFrame(frame), []);
  const load = useCallback((comp: Composition) => renderer.current?.load(comp), []);
  const getCurrentFrame = useCallback(() => renderer.current?.getCurrentFrame() ?? 0, []);
  const isPlaying = useCallback(() => renderer.current?.isPlaying() ?? false, []);

  return { play, pause, goToFrame, load, getCurrentFrame, isPlaying };
}