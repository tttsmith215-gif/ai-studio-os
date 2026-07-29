import { useState } from "react";
import type { Composition } from "../engine/types";
import { makeComposition } from "../engine/types";

interface TimelinePlaceholderProps {
  composition?: Composition;
}

export function TimelinePlaceholder({ composition }: TimelinePlaceholderProps) {
  const [comp] = useState(() => composition || makeComposition("Untitled", 960, 540, 30, 5));

  const totalFrames = comp.totalFrames;
  const fps = comp.fps;
  const pxPerFrame = 6;

  return (
    <div className="timeline-panel">
      <div className="timeline-header">
        <div className="timeline-ruler" style={{ paddingLeft: 160 }}>
          <div className="timeline-ruler-inner" style={{ width: totalFrames * pxPerFrame }}>
            {Array.from({ length: Math.ceil(totalFrames / fps) + 1 }, (_, i) => {
              const frame = i * fps;
              if (frame > totalFrames) return null;
              return (
                <div key={i} className="timeline-marker" style={{ left: frame * pxPerFrame }}>
                  <span className="timeline-marker-label">{i}s</span>
                </div>
              );
            })}
            <div className="timeline-playhead" style={{ left: 0 }} />
          </div>
        </div>
      </div>

      <div className="timeline-tracks">
        <div className="timeline-placeholder">
          <div className="timeline-placeholder-icon">t</div>
          <div className="timeline-placeholder-text">
            {comp.layers.length === 0
              ? "Add layers to the composition to see the timeline"
              : `${comp.layers.length} layer(s) - ${comp.name} - ${comp.width}x${comp.height} @ ${fps}fps`}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <span className="badge badge-success">{totalFrames} frames</span>
            <span className="badge badge-warning">{(totalFrames / fps).toFixed(1)}s</span>
          </div>
        </div>
      </div>
    </div>
  );
}