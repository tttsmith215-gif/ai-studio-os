import type { Composition, Layer } from "../engine/types";

interface TimelineProps {
  composition: Composition;
  currentFrame: number;
  onFrameChange: (frame: number) => void;
  onSelectLayer: (id: string | null) => void;
  selectedLayer: string | null;
  onToggleLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onReorderLayer: (id: string, dir: "up" | "down") => void;
}

export function Timeline({
  composition,
  currentFrame,
  onFrameChange,
  onSelectLayer,
  selectedLayer,
  onToggleLayer,
  onDeleteLayer,
  onReorderLayer,
}: TimelineProps) {
  const totalFrames = composition.totalFrames;
  const pxPerFrame = 6;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frame = Math.round(x / pxPerFrame);
    onFrameChange(Math.max(0, Math.min(frame, totalFrames - 1)));
  };

  return (
    <div className="timeline-panel">
      <div className="timeline-header">
        <div className="timeline-ruler" style={{ paddingLeft: 160 }}>
          <div className="timeline-ruler-inner" style={{ width: totalFrames * pxPerFrame }} onClick={handleTimelineClick}>
            {/* Time markers every second */}
            {Array.from({ length: Math.ceil(totalFrames / composition.fps) + 1 }, (_, i) => {
              const frame = i * composition.fps;
              if (frame > totalFrames) return null;
              return (
                <div key={i} className="timeline-marker" style={{ left: frame * pxPerFrame }}>
                  <span className="timeline-marker-label">{i}s</span>
                </div>
              );
            })}
            {/* Playhead */}
            <div className="timeline-playhead" style={{ left: currentFrame * pxPerFrame }} />
          </div>
        </div>
      </div>

      <div className="timeline-tracks">
        {composition.layers.length === 0 ? (
          <div className="timeline-empty">No layers</div>
        ) : (
          composition.layers.map((layer, idx) => (
            <div
              key={layer.id}
              className={`timeline-track ${selectedLayer === layer.id ? "selected" : ""}`}
              onClick={() => onSelectLayer(layer.id)}
            >
              <div className="timeline-track-label">
                <button
                  className="timeline-vis-btn"
                  onClick={(e) => { e.stopPropagation(); onToggleLayer(layer.id); }}
                  title={layer.enabled ? "Disable" : "Enable"}
                >
                  {layer.enabled ? "👁" : "👁‍🗨"}
                </button>
                <span className="timeline-track-name">{layer.name}</span>
                <div className="timeline-track-actions">
                  <button
                    className="timeline-trash"
                    onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}
                    title="Delete layer"
                  >🗑</button>
                </div>
              </div>
              <div className="timeline-track-bar" style={{ width: totalFrames * pxPerFrame }}>
                {/* Layer duration bar */}
                <div className="timeline-layer-bar" style={{ width: totalFrames * pxPerFrame }}>
                  {/* Keyframe markers */}
                  {layer.keyframes.map((kf, i) => (
                    <div key={i} className="timeline-keyframe" style={{ left: kf.frame * pxPerFrame - 4, top: 4 }} />
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}