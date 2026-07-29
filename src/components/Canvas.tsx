import { useEffect, useRef } from "react";
import { createRenderer, type Renderer } from "../engine/renderer";
import type { Composition } from "../engine/types";

interface CanvasProps {
  composition: Composition;
  currentFrame: number;
  onFrameChange?: (frame: number) => void;
  rendererRef?: React.MutableRefObject<Renderer | null>;
}

export function Canvas({ composition, currentFrame, onFrameChange, rendererRef }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalRef = useRef<Renderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = createRenderer(canvas);
    internalRef.current = renderer;
    if (rendererRef) rendererRef.current = renderer;
    renderer.load(composition);

    const onResize = () => renderer.resize();
    window.addEventListener("resize", onResize);
    return () => {
      renderer.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [composition.id]);

  useEffect(() => {
    if (internalRef.current) {
      internalRef.current.goToFrame(currentFrame);
    }
  }, [currentFrame]);

  // Re-render when composition layers change
  useEffect(() => {
    if (internalRef.current) {
      internalRef.current.load(composition);
    }
  }, [composition.layers.length]);

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        className="composition-canvas"
        onMouseDown={(e) => {
          // Click to seek
          if (internalRef.current && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const pct = x / rect.width;
            const frame = Math.floor(pct * internalRef.current.getTotalFrames());
            if (onFrameChange) onFrameChange(frame);
          }
        }}
      />
    </div>
  );
}