import { useRef, useEffect, useCallback } from "react";
import { createAutoRenderer, type Renderer } from "../engine/renderer";

/**
 * Bind a canvas ref to the renderer lifecycle.
 * Automatically selects WebGL2 if available, falls back to Canvas 2D.
 */
export function useEngine(canvasRef: React.RefObject<HTMLCanvasElement | null>, composition: Composition | null) {
  const renderer = useRef<Renderer | null>(null);

  // Create/destroy renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !composition) return;
    renderer.current = createAutoRenderer(canvas);
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