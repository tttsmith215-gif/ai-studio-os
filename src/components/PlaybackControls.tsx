import { useState, useCallback } from "react";
import type { Renderer } from "../engine/renderer";

interface PlaybackControlsProps {
  renderer: Renderer | null;
  currentFrame: number;
  totalFrames: number;
  fps: number;
  onFrameChange: (frame: number) => void;
}

export function PlaybackControls({ renderer, currentFrame, totalFrames, fps, onFrameChange }: PlaybackControlsProps) {
  const [playing, setPlaying] = useState(false);

  const togglePlay = useCallback(() => {
    if (!renderer) return;
    if (playing) {
      renderer.pause();
      setPlaying(false);
    } else {
      renderer.play();
      setPlaying(true);
      // Poll frame updates
      const interval = setInterval(() => {
        if (renderer.isPlaying()) {
          onFrameChange(renderer.getCurrentFrame());
        } else {
          clearInterval(interval);
          setPlaying(false);
        }
      }, 1000 / 30);
    }
  }, [renderer, playing, onFrameChange]);

  const seek = useCallback((frame: number) => {
    onFrameChange(frame);
    if (renderer) renderer.goToFrame(frame);
  }, [renderer, onFrameChange]);

  const timeStr = (frame: number) => {
    const sec = Math.floor(frame / fps);
    const cs = Math.floor((frame % fps) / fps * 100);
    return `${sec}:${String(cs).padStart(2, "0")}`;
  };

  return (
    <div className="playback-controls">
      <button className="btn" onClick={() => seek(0)} title="Start">⏮</button>
      <button className="btn btn-primary" onClick={togglePlay} title={playing ? "Pause" : "Play"}>
        {playing ? "⏸" : "▶"}
      </button>
      <button className="btn" onClick={() => seek(totalFrames - 1)} title="End">⏭</button>

      <div className="playback-slider">
        <input
          type="range"
          min={0}
          max={totalFrames - 1}
          value={currentFrame}
          onChange={(e) => seek(Number(e.target.value))}
          className="slider"
        />
      </div>

      <span className="playback-time">{timeStr(currentFrame)} / {timeStr(totalFrames - 1)}</span>
      <span className="playback-fps">{fps} fps</span>
    </div>
  );
}