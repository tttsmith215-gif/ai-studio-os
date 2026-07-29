// ─── AI Studio OS: Video Editor ──────────────────────────────────
// Multi-track video timeline with trimming, transitions, and preview.
// Single-file app to keep it simple — no unrequested abstractions.

import { useState, useRef, useCallback, useEffect } from "react";
import type { AppModule } from "../types";

// ─── Types ──────────────────────────────────────────────────────

interface VideoClip {
  id: string;
  name: string;
  type: "video" | "audio" | "image";
  src: string;
  /** Duration in frames */
  duration: number;
  /** Start frame on the timeline */
  startFrame: number;
  /** Trim in-point (frames from start of source) */
  trimStart: number;
  /** Trim out-point (frames from start of source) */
  trimEnd: number;
  /** Playback speed multiplier */
  speed: number;
  volume: number;
  transform: { x: number; y: number; scaleX: number; scaleY: number; rotation: number; opacity: number };
}

interface VideoTrack {
  id: string;
  name: string;
  type: "video" | "audio";
  enabled: boolean;
  locked: boolean;
  clips: VideoClip[];
}

interface VideoTimeline {
  fps: number;
  width: number;
  height: number;
  totalFrames: number;
  tracks: VideoTrack[];
  background: string;
}

interface Transition {
  id: string;
  type: "crossfade" | "dip-to-black" | "fade" | "wipe";
  /** Duration in frames */
  duration: number;
  clipAId: string;
  clipBId: string;
  trackId: string;
}

interface MediaItem {
  id: string;
  name: string;
  type: "video" | "audio" | "image";
  src: string;
  duration: number;
  width: number;
  height: number;
  thumbnail: string;
}

// ─── Helpers ────────────────────────────────────────────────────

let _id = 0;
const uid = () => `ve-${++_id}`;

const FPS = 30;
const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

function makeTimeline(): VideoTimeline {
  return {
    fps: FPS,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    totalFrames: FPS * 30, // 30s default
    tracks: [
      { id: uid(), name: "Video 1", type: "video", enabled: true, locked: false, clips: [] },
      { id: uid(), name: "Video 2", type: "video", enabled: true, locked: false, clips: [] },
      { id: uid(), name: "Audio 1", type: "audio", enabled: true, locked: false, clips: [] },
    ],
    background: "#1a1a1a",
  };
}

function clipDuration(clip: VideoClip): number {
  const effective = clip.trimEnd - clip.trimStart;
  return Math.max(1, Math.round(effective / clip.speed));
}

function getClipEndFrame(clip: VideoClip): number {
  return clip.startFrame + clipDuration(clip);
}

// ─── Plugin Registration ────────────────────────────────────────

export const VideoEditor: AppModule = {
  register(r) {
    r.register({
      id: "video-editor",
      name: "Video Editor",
      description: "Multi-track video editing with trimming, transitions, and export",
      icon: "🎥",
      version: "1.0.0",
      category: "video",
      component: VideoEditorWorkspace,
    });
  },
};

// ─── Transition colors ──────────────────────────────────────────

const TRANSITION_COLORS: Record<string, string> = {
  crossfade: "rgba(100,200,255,0.6)",
  "dip-to-black": "rgba(0,0,0,0.5)",
  fade: "rgba(255,200,100,0.5)",
  wipe: "rgba(200,100,255,0.5)",
};

// ─── Main Workspace ─────────────────────────────────────────────

function VideoEditorWorkspace() {
  const [timeline, setTimeline] = useState<VideoTimeline>(makeTimeline);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [mediaBin, setMediaBin] = useState<MediaItem[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [dragType, setDragType] = useState<"none" | "move" | "trim-left" | "trim-right">("none");
  const [dragStart, setDragStart] = useState({ x: 0, frame: 0, clipId: "" });
  const [zoom, setZoom] = useState(6); // px per frame
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [snap, setSnap] = useState(true);

  const previewRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playTimerRef = useRef<number>(0);

  // ── Get selected clip ──
  const selectedClip = selectedClipId
    ? timeline.tracks.flatMap((t) => t.clips).find((c) => c.id === selectedClipId)
    : null;

  // ── Playback loop ──
  useEffect(() => {
    if (!isPlaying) {
      clearInterval(playTimerRef.current);
      return;
    }
    playTimerRef.current = window.setInterval(() => {
      setCurrentFrame((f) => {
        const next = f + 1;
        if (next >= timeline.totalFrames) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, 1000 / timeline.fps);
    return () => clearInterval(playTimerRef.current);
  }, [isPlaying, timeline.fps, timeline.totalFrames]);

  // ── Import media files ──
  const handleImportFiles = useCallback(async (files: FileList | File[]) => {
    const items: MediaItem[] = [];
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      let type: "video" | "audio" | "image" = "image";
      if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) type = "video";
      else if (["mp3", "wav", "ogg", "aac", "flac"].includes(ext)) type = "audio";

      // Try to get duration from video metadata
      let duration = FPS * 5; // default 5s
      let width = DEFAULT_WIDTH;
      let height = DEFAULT_HEIGHT;

      if (type === "video" || type === "audio") {
        try {
          duration = await new Promise<number>((resolve) => {
            const el = document.createElement(type === "video" ? "video" : "audio");
            el.preload = "metadata";
            el.onloadedmetadata = () => {
              resolve(Math.round(el.duration * FPS));
              if (type === "video") {
                width = el.videoWidth || DEFAULT_WIDTH;
                height = el.videoHeight || DEFAULT_HEIGHT;
              }
            };
            el.onerror = () => resolve(FPS * 5);
            el.src = url;
          });
        } catch {
          duration = FPS * 5;
        }
      }

      items.push({
        id: uid(),
        name: file.name,
        type,
        src: url,
        duration,
        width,
        height,
        thumbnail: type === "video" ? url : type === "image" ? url : "",
      });
    }
    setMediaBin((prev) => [...prev, ...items]);
  }, []);

  // ── Add clip to track from media bin ──
  const addClipToTrack = useCallback((media: MediaItem, trackId: string, startFrame?: number) => {
    const track = timeline.tracks.find((t) => t.id === trackId);
    if (!track) return;

    const sf = startFrame ?? track.clips.reduce((max, c) => Math.max(max, getClipEndFrame(c)), 0);
    const clip: VideoClip = {
      id: uid(),
      name: media.name,
      type: media.type,
      src: media.src,
      duration: media.duration,
      startFrame: sf,
      trimStart: 0,
      trimEnd: media.duration,
      speed: 1,
      volume: 1,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 },
    };

    setTimeline((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) =>
        t.id === trackId ? { ...t, clips: [...t.clips, clip].sort((a, b) => a.startFrame - b.startFrame) } : t
      ),
    }));
    setSelectedClipId(clip.id);
  }, [timeline.tracks]);

  // ── Update clip ──
  const updateClip = useCallback((clipId: string, patch: Partial<VideoClip>) => {
    setTimeline((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
      })),
    }));
  }, []);

  // ── Delete clip ──
  const deleteClip = useCallback((clipId: string) => {
    setTimeline((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => c.id !== clipId),
      })),
    }));
    if (selectedClipId === clipId) setSelectedClipId(null);
    setTransitions((prev) => prev.filter((tr) => tr.clipAId !== clipId && tr.clipBId !== clipId));
  }, [selectedClipId]);

  // ── Add transition ──
  const addTransition = useCallback((clipAId: string, clipBId: string, trackId: string, type: Transition["type"] = "crossfade") => {
    setTransitions((prev) => [
      ...prev.filter((t) => t.clipAId !== clipAId && t.clipBId !== clipBId),
      { id: uid(), type, duration: FPS * 0.5, clipAId, clipBId, trackId },
    ]);
  }, []);

  // ── Timeline mouse handlers ──
  const handleTimelineMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frame = Math.round(x / zoom);

    // Check if clicking on a clip edge for trim
    for (const track of timeline.tracks) {
      if (!track.enabled) continue;
      for (const clip of track.clips) {
        const left = clip.startFrame * zoom;
        const right = getClipEndFrame(clip) * zoom;
        const effDuration = clipDuration(clip);

        // Trim left edge (within 6px)
        if (Math.abs(x - left) < 6 && clip.trimStart > 0) {
          setDragType("trim-left");
          setDragStart({ x, frame, clipId: clip.id });
          return;
        }
        // Trim right edge (within 6px)
        if (Math.abs(x - right) < 6 && clip.trimEnd < clip.duration) {
          setDragType("trim-right");
          setDragStart({ x, frame, clipId: clip.id });
          return;
        }
        // Move clip
        if (x >= left && x <= right) {
          setDragType("move");
          setDragStart({ x, frame: clip.startFrame, clipId: clip.id });
          setSelectedClipId(clip.id);
          setSelectedTrackId(track.id);
          return;
        }
      }
    }

    // Click on track header area
    if (e.clientY - rect.top < 30) {
      setCurrentFrame(Math.max(0, Math.min(frame, timeline.totalFrames - 1)));
    }
  }, [zoom, timeline.tracks, timeline.totalFrames]);

  // ── Timeline mouse move ──
  const handleTimelineMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragType === "none" || !dragStart.clipId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const deltaFrames = Math.round((x - dragStart.x) / zoom);

    if (dragType === "move") {
      const newStart = Math.max(0, dragStart.frame + deltaFrames);
      updateClip(dragStart.clipId, { startFrame: newStart });
    } else if (dragType === "trim-left") {
      const clip = timeline.tracks.flatMap((t) => t.clips).find((c) => c.id === dragStart.clipId);
      if (clip) {
        const newTrim = clip.trimStart - deltaFrames;
        updateClip(dragStart.clipId, { trimStart: Math.max(0, Math.min(newTrim, clip.trimEnd - 1)) });
      }
    } else if (dragType === "trim-right") {
      const clip = timeline.tracks.flatMap((t) => t.clips).find((c) => c.id === dragStart.clipId);
      if (clip) {
        const newTrim = clip.trimEnd + deltaFrames;
        updateClip(dragStart.clipId, { trimEnd: Math.max(clip.trimStart + 1, Math.min(newTrim, clip.duration)) });
      }
    }

    setDragStart((prev) => ({ ...prev, x }));
  }, [dragType, dragStart, zoom, timeline.tracks, updateClip]);

  const handleTimelineMouseUp = useCallback(() => {
    setDragType("none");
    setDragStart({ x: 0, frame: 0, clipId: "" });
  }, []);

  // ── Render preview frame to video element ──
  // We use a canvas-based preview since we're compositing clips
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const renderPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = timeline.width;
    canvas.height = timeline.height;

    // Background
    ctx.fillStyle = timeline.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render each video track top-to-bottom
    for (const track of timeline.tracks) {
      if (!track.enabled || track.type !== "video") continue;

      for (const clip of track.clips) {
        const start = clip.startFrame;
        const end = getClipEndFrame(clip);
        if (currentFrame < start || currentFrame >= end) continue;

        const localFrame = Math.round((currentFrame - start) * clip.speed) + clip.trimStart;

        ctx.save();
        ctx.globalAlpha = clip.transform.opacity;
        ctx.translate(clip.transform.x, clip.transform.y);
        ctx.scale(clip.transform.scaleX, clip.transform.scaleY);

        if (clip.type === "image") {
          // Draw image from an img element
          const img = new Image();
          img.src = clip.src;
          ctx.drawImage(img, 0, 0, timeline.width, timeline.height);
        } else {
          // For video clips, draw a colored placeholder with title
          ctx.fillStyle = `hsl(${(clip.id.charCodeAt(0) * 40) % 360}, 60%, 40%)`;
          ctx.fillRect(0, 0, timeline.width, timeline.height);
          ctx.fillStyle = "#fff";
          ctx.font = "24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(clip.name.replace(/\.[^.]+$/, ""), timeline.width / 2, timeline.height / 2);
          // Time indicator
          ctx.font = "16px monospace";
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.fillText(`Frame ${localFrame} / ${clip.trimEnd - clip.trimStart}`, timeline.width / 2, timeline.height / 2 + 40);
        }

        ctx.restore();
        break; // Only first visible clip per track
      }
    }

    // Apply transitions
    for (const tr of transitions) {
      const track = timeline.tracks.find((t) => t.id === tr.trackId);
      if (!track) continue;
      const clipA = track.clips.find((c) => c.id === tr.clipAId);
      const clipB = track.clips.find((c) => c.id === tr.clipBId);
      if (!clipA || !clipB) continue;

      const overlapStart = getClipEndFrame(clipA) - tr.duration;
      if (currentFrame < overlapStart || currentFrame >= getClipEndFrame(clipA)) continue;

      const progress = (currentFrame - overlapStart) / tr.duration;

      if (tr.type === "crossfade") {
        ctx.fillStyle = `rgba(0,0,0,${progress * 0.5})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (tr.type === "dip-to-black") {
        const alpha = Math.sin(progress * Math.PI) * 0.7;
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [timeline, currentFrame, transitions]);

  // Re-render preview on frame change
  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // ── Export ──
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const total = timeline.totalFrames;
      const canvas = document.createElement("canvas");
      canvas.width = timeline.width;
      canvas.height = timeline.height;
      const ctx = canvas.getContext("2d")!;

      // We render frames here and could send to Rust/FFmpeg
      // For now, save as PNG sequence using download
      const zip: { name: string; data: string }[] = [];

      for (let f = 0; f < total; f += Math.max(1, Math.round(FPS / 5))) { // every 5th frame
        setCurrentFrame(f);
        await new Promise((r) => setTimeout(r, 0));
        // Re-render
        ctx.fillStyle = timeline.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Simplified: render single frame
        const dataUrl = canvas.toDataURL("image/png");
        zip.push({ name: `frame_${String(f).padStart(6, "0")}.png`, data: dataUrl });
      }

      // Download as individual frames
      for (const frame of zip.slice(0, 10)) { // limit to 10 for demo
        const a = document.createElement("a");
        a.href = frame.data;
        a.download = frame.name;
        a.click();
        await new Promise((r) => setTimeout(r, 100));
      }

      alert(`Exported ${zip.length} frames. Downloaded first 10.`);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [timeline]);

  // ── Snap to nearest clip edge ──
  const snapFrames = useCallback(() => {
    if (!snap) return;
    const allEdges = new Set<number>();
    for (const track of timeline.tracks) {
      for (const clip of track.clips) {
        allEdges.add(clip.startFrame);
        allEdges.add(getClipEndFrame(clip));
      }
    }
    return allEdges;
  }, [timeline.tracks, snap]);

  // ── Add track ──
  const addTrack = useCallback((type: "video" | "audio") => {
    setTimeline((prev) => ({
      ...prev,
      tracks: [
        ...prev.tracks,
        { id: uid(), name: `${type === "video" ? "Video" : "Audio"} ${prev.tracks.filter((t) => t.type === type).length + 1}`, type, enabled: true, locked: false, clips: [] },
      ],
    }));
  }, []);

  // ── Render ──
  return (
    <div className="panel-container" style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-primary)" }}>
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 p-2 border-bottom" style={{ background: "var(--bg-secondary)", flexShrink: 0 }}>
        <button className="btn btn-sm" onClick={() => setIsPlaying(!isPlaying)} title={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? "⏸" : "▶️"}
        </button>
        <button className="btn btn-sm" onClick={() => setCurrentFrame(0)} title="Go to start">⏮</button>
        <span className="text-xs font-mono" style={{ minWidth: 80 }}>
          {Math.floor(currentFrame / FPS / 60)}:{String(Math.floor(currentFrame / FPS) % 60).padStart(2, "0")}:{String(currentFrame % FPS).padStart(2, "0")}
        </span>
        <div className="flex-1" />
        <input
          type="file" ref={fileInputRef} multiple accept="video/*,audio/*,image/*"
          style={{ display: "none" }}
          onChange={(e) => e.target.files && handleImportFiles(e.target.files)}
        />
        <button className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()}>📁 Import Media</button>
        <button className="btn btn-outline btn-sm" onClick={() => addTrack("video")}>+ Video Track</button>
        <button className="btn btn-outline btn-sm" onClick={() => addTrack("audio")}>+ Audio Track</button>
        <label className="text-xs flex items-center gap-1" style={{ cursor: "pointer" }}>
          <input type="checkbox" checked={snap} onChange={() => setSnap(!snap)} />
          Snap
        </label>
        <input
          type="range" min={2} max={20} step={1} value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={{ width: 60 }}
          title="Zoom"
        />
        <button className="btn btn-primary btn-sm" onClick={() => setShowExport(!showExport)} disabled={exporting}>
          {exporting ? "⏳ Exporting..." : "🎞️ Export"}
        </button>
        <button className="btn btn-sm" onClick={() => {
          setTimeline(makeTimeline());
          setMediaBin([]);
          setTransitions([]);
          setCurrentFrame(0);
          setIsPlaying(false);
        }} title="New project">New</button>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── Left: Media Bin ── */}
        <div className="panel-left" style={{ width: 180, flexShrink: 0, overflowY: "auto", borderRight: "1px solid var(--border-color)", background: "var(--bg-secondary)" }}>
          <div className="p-2">
            <h3 className="text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>Media Bin</h3>
            {mediaBin.length === 0 && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Import media to begin</p>
            )}
            {mediaBin.map((m) => (
              <div
                key={m.id}
                className="mb-1 p-1"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", m.id);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                style={{
                  cursor: "grab", borderRadius: "var(--radius-sm)",
                  background: "var(--bg-tertiary)", fontSize: 11,
                }}
                title={`${m.name} (${m.width}×${m.height}, ${Math.round(m.duration / FPS)}s)`}
              >
                <div>{m.type === "video" ? "🎬" : m.type === "audio" ? "🎵" : "🖼️"} <span className="font-mono">{m.name.substring(0, 20)}{m.name.length > 20 ? "…" : ""}</span></div>
                <div style={{ color: "var(--text-muted)", fontSize: 10 }}>
                  {Math.round(m.duration / FPS)}s · {m.width}×{m.height}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Center: Preview + Timeline ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Preview area */}
          <div className="flex-center" style={{ flex: 1, minHeight: 200, background: "var(--bg-primary)", position: "relative" }}>
            <canvas
              ref={previewCanvasRef}
              style={{
                maxWidth: "100%", maxHeight: "100%",
                objectFit: "contain", borderRadius: "var(--radius-md)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
              }}
            />
          </div>

          {/* Timeline */}
          <div
            ref={timelineRef}
            className="border-top"
            style={{
              height: 200, overflow: "auto", position: "relative",
              background: "var(--bg-secondary)",
              cursor: dragType !== "none" ? "ew-resize" : "default",
              userSelect: "none",
            }}
            onMouseDown={handleTimelineMouseDown}
            onMouseMove={handleTimelineMouseMove}
            onMouseUp={handleTimelineMouseUp}
            onMouseLeave={handleTimelineMouseUp}
          >
            {/* Time ruler */}
            <div style={{ height: 24, position: "sticky", top: 0, zIndex: 2, background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
              {Array.from({ length: Math.ceil(timeline.totalFrames / timeline.fps) + 1 }, (_, i) => {
                const frame = i * timeline.fps;
                if (frame > timeline.totalFrames) return null;
                return (
                  <div
                    key={i}
                    className="text-xs"
                    style={{
                      position: "absolute", left: frame * zoom, top: 2,
                      color: "var(--text-muted)", fontSize: 10, whiteSpace: "nowrap",
                    }}
                  >
                    {Math.floor(i / 60)}:{String(i % 60).padStart(2, "0")}
                  </div>
                );
              })}
              {/* Playhead */}
              <div
                style={{
                  position: "absolute", left: currentFrame * zoom - 1, top: 0, width: 2, height: "100%",
                  background: "var(--accent)", zIndex: 3, pointerEvents: "none",
                }}
              />
            </div>

            {/* Tracks */}
            <div style={{ position: "relative" }}>
              {timeline.tracks.map((track, ti) => (
                <div
                  key={track.id}
                  className="flex"
                  style={{
                    height: 36, borderBottom: "1px solid var(--border-color)",
                    background: selectedTrackId === track.id ? "var(--bg-hover)" : "transparent",
                    opacity: track.enabled ? 1 : 0.4,
                    position: "relative",
                  }}
                  onClick={() => setSelectedTrackId(track.id)}
                >
                  {/* Track label */}
                  <div
                    className="flex items-center gap-1 text-xs"
                    style={{
                      width: 100, flexShrink: 0, padding: "0 6px",
                      borderRight: "1px solid var(--border-color)",
                      background: "var(--bg-tertiary)",
                    }}
                  >
                    <button
                      className="btn"
                      style={{ padding: 0, fontSize: 10, width: 16, height: 16 }}
                      onClick={() => setTimeline((prev) => ({
                        ...prev,
                        tracks: prev.tracks.map((t) => t.id === track.id ? { ...t, enabled: !t.enabled } : t),
                      }))}
                    >
                      {track.enabled ? "👁" : "🚫"}
                    </button>
                    <span className="font-mono" style={{ fontSize: 10 }}>{track.name}</span>
                    <button
                      className="btn"
                      style={{ padding: 0, fontSize: 10, width: 14, height: 14, marginLeft: "auto" }}
                      onClick={() => {
                        deleteClip(track.clips[0]?.id || "");
                        setTimeline((prev) => ({ ...prev, tracks: prev.tracks.filter((t) => t.id !== track.id) }));
                      }}
                      title="Delete track"
                    >🗑</button>
                  </div>

                  {/* Track clips area */}
                  <div style={{ flex: 1, position: "relative" }}>
                    {/* Clip rendering */}
                    {track.clips.map((clip) => {
                      const left = clip.startFrame * zoom;
                      const width = clipDuration(clip) * zoom;
                      const isSelected = clip.id === selectedClipId;
                      const color = clip.type === "video" ? "#2a6f97" : clip.type === "audio" ? "#2a9744" : "#97442a";
                      const hasTrans = transitions.find((t) => t.clipAId === clip.id || t.clipBId === clip.id);

                      return (
                        <div
                          key={clip.id}
                          className="flex items-center"
                          style={{
                            position: "absolute", left, top: 2, width: Math.max(width, 4), height: 32,
                            background: `linear-gradient(135deg, ${color}88, ${color}44)`,
                            borderRadius: "var(--radius-sm)",
                            border: isSelected ? "2px solid var(--accent)" : "1px solid rgba(255,255,255,0.15)",
                            cursor: "pointer", overflow: "hidden",
                            zIndex: isSelected ? 1 : 0,
                          }}
                          onClick={() => { setSelectedClipId(clip.id); setSelectedTrackId(track.id); }}
                        >
                          {/* Trim handles */}
                          <div
                            style={{
                              position: "absolute", left: -2, top: 0, width: 6, height: "100%",
                              cursor: "ew-resize", zIndex: 2,
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDragType("trim-left");
                              setDragStart({ x: e.clientX, frame: clip.startFrame, clipId: clip.id });
                            }}
                          />
                          <div
                            style={{
                              position: "absolute", right: -2, top: 0, width: 6, height: "100%",
                              cursor: "ew-resize", zIndex: 2,
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDragType("trim-right");
                              setDragStart({ x: e.clientX, frame: clip.startFrame, clipId: clip.id });
                            }}
                          />

                          <span className="text-xs font-mono" style={{
                            padding: "0 4px", color: "#fff", fontSize: 10,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            width: "100%",
                          }}>
                            {clip.name.replace(/\.[^.]+$/, "")}
                          </span>
                        </div>
                      );
                    })}

                    {/* Transition indicators */}
                    {transitions
                      .filter((t) => t.trackId === track.id)
                      .map((tr) => {
                        const clipA = track.clips.find((c) => c.id === tr.clipAId);
                        if (!clipA) return null;
                        const left = (getClipEndFrame(clipA) - tr.duration) * zoom;
                        const w = tr.duration * zoom;
                        return (
                          <div
                            key={tr.id}
                            style={{
                              position: "absolute", left, top: 0, width: w, height: 36,
                              background: TRANSITION_COLORS[tr.type] || "rgba(255,255,255,0.2)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 9, color: "#fff", fontWeight: "bold",
                              pointerEvents: "none", zIndex: 1,
                            }}
                            title={`${tr.type} (${tr.duration / FPS}s)`}
                          >
                            {tr.type === "crossfade" ? "✕" : tr.type === "dip-to-black" ? "⬛" : tr.type === "fade" ? "◐" : "↔"}
                          </div>
                        );
                      })}

                    {/* Drop zone for media */}
                    <div
                      style={{ position: "absolute", inset: 0, zIndex: 0 }}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const mediaId = e.dataTransfer.getData("text/plain");
                        if (mediaId) {
                          const media = mediaBin.find((m) => m.id === mediaId);
                          if (media) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const frame = Math.max(0, Math.round(x / zoom));
                            addClipToTrack(media, track.id, frame);
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Properties Panel ── */}
        <div className="panel-right" style={{ width: 240, flexShrink: 0, overflowY: "auto", borderLeft: "1px solid var(--border-color)", background: "var(--bg-secondary)" }}>
          <div className="p-2">
            {selectedClip ? (
              <>
                <h3 className="text-xs font-bold mb-2">Clip Properties</h3>
                <div className="text-xs mb-1 font-mono" style={{ color: "var(--text-muted)", wordBreak: "break-all" }}>
                  {selectedClip.name}
                </div>

                <div className="mb-2">
                  <label className="text-xs" style={{ color: "var(--text-muted)" }}>Start Frame</label>
                  <input
                    className="input"
                    type="number" min={0} value={selectedClip.startFrame}
                    onChange={(e) => updateClip(selectedClip.id, { startFrame: Math.max(0, Number(e.target.value)) })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11 }}
                  />
                </div>

                <div className="mb-2">
                  <label className="text-xs" style={{ color: "var(--text-muted)" }}>Trim In (frame)</label>
                  <input
                    className="input"
                    type="range" min={0} max={selectedClip.duration - 1} value={selectedClip.trimStart}
                    onChange={(e) => updateClip(selectedClip.id, { trimStart: Math.min(Number(e.target.value), selectedClip.trimEnd - 1) })}
                    style={{ width: "100%" }}
                  />
                  <span className="text-xs font-mono">{selectedClip.trimStart}</span>
                </div>

                <div className="mb-2">
                  <label className="text-xs" style={{ color: "var(--text-muted)" }}>Trim Out (frame)</label>
                  <input
                    className="input"
                    type="range" min={selectedClip.trimStart + 1} max={selectedClip.duration} value={selectedClip.trimEnd}
                    onChange={(e) => updateClip(selectedClip.id, { trimEnd: Math.max(selectedClip.trimStart + 1, Number(e.target.value)) })}
                    style={{ width: "100%" }}
                  />
                  <span className="text-xs font-mono">{selectedClip.trimEnd}</span>
                </div>

                <div className="mb-2">
                  <label className="text-xs" style={{ color: "var(--text-muted)" }}>Speed: {selectedClip.speed}x</label>
                  <input
                    type="range" min={0.25} max={4} step={0.25} value={selectedClip.speed}
                    onChange={(e) => updateClip(selectedClip.id, { speed: Number(e.target.value) })}
                    style={{ width: "100%" }}
                  />
                </div>

                <div className="mb-2">
                  <label className="text-xs" style={{ color: "var(--text-muted)" }}>Volume: {Math.round(selectedClip.volume * 100)}%</label>
                  <input
                    type="range" min={0} max={1} step={0.05} value={selectedClip.volume}
                    onChange={(e) => updateClip(selectedClip.id, { volume: Number(e.target.value) })}
                    style={{ width: "100%" }}
                  />
                </div>

                <div className="mb-2">
                  <label className="text-xs" style={{ color: "var(--text-muted)" }}>Opacity: {Math.round(selectedClip.transform.opacity * 100)}%</label>
                  <input
                    type="range" min={0} max={1} step={0.05} value={selectedClip.transform.opacity}
                    onChange={(e) => updateClip(selectedClip.id, { transform: { ...selectedClip.transform, opacity: Number(e.target.value) } })}
                    style={{ width: "100%" }}
                  />
                </div>

                <div className="flex gap-1 mb-2">
                  <div className="flex-1">
                    <label className="text-xs" style={{ color: "var(--text-muted)" }}>X</label>
                    <input className="input" type="number" value={selectedClip.transform.x}
                      onChange={(e) => updateClip(selectedClip.id, { transform: { ...selectedClip.transform, x: Number(e.target.value) } })}
                      style={{ width: "100%", padding: "2px 4px", fontSize: 11 }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs" style={{ color: "var(--text-muted)" }}>Y</label>
                    <input className="input" type="number" value={selectedClip.transform.y}
                      onChange={(e) => updateClip(selectedClip.id, { transform: { ...selectedClip.transform, y: Number(e.target.value) } })}
                      style={{ width: "100%", padding: "2px 4px", fontSize: 11 }}
                    />
                  </div>
                </div>

                <div className="flex gap-1 mb-2">
                  <div className="flex-1">
                    <label className="text-xs" style={{ color: "var(--text-muted)" }}>Scale X</label>
                    <input className="input" type="number" min={0.01} step={0.1} value={selectedClip.transform.scaleX}
                      onChange={(e) => updateClip(selectedClip.id, { transform: { ...selectedClip.transform, scaleX: Number(e.target.value) } })}
                      style={{ width: "100%", padding: "2px 4px", fontSize: 11 }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs" style={{ color: "var(--text-muted)" }}>Scale Y</label>
                    <input className="input" type="number" min={0.01} step={0.1} value={selectedClip.transform.scaleY}
                      onChange={(e) => updateClip(selectedClip.id, { transform: { ...selectedClip.transform, scaleY: Number(e.target.value) } })}
                      style={{ width: "100%", padding: "2px 4px", fontSize: 11 }}
                    />
                  </div>
                </div>

                <div className="mb-2">
                  <label className="text-xs" style={{ color: "var(--text-muted)" }}>Rotation: {selectedClip.transform.rotation}°</label>
                  <input
                    type="range" min={-180} max={180} value={selectedClip.transform.rotation}
                    onChange={(e) => updateClip(selectedClip.id, { transform: { ...selectedClip.transform, rotation: Number(e.target.value) } })}
                    style={{ width: "100%" }}
                  />
                </div>

                <div className="flex gap-1 mt-2">
                  <button
                    className="btn btn-sm"
                    style={{ background: "var(--bg-tertiary)", fontSize: 11 }}
                    onClick={() => {
                      // Find adjacent clip for transition
                      const track = timeline.tracks.find((t) => t.clips.some((c) => c.id === selectedClip.id));
                      if (!track) return;
                      const idx = track.clips.findIndex((c) => c.id === selectedClip.id);
                      if (idx < track.clips.length - 1) {
                        const nextClip = track.clips[idx + 1];
                        addTransition(selectedClip.id, nextClip.id, track.id, "crossfade");
                      } else {
                        alert("No adjacent clip to transition to");
                      }
                    }}
                  >
                    + Crossfade
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ background: "var(--danger)", color: "#fff", fontSize: 11 }}
                    onClick={() => deleteClip(selectedClip.id)}
                  >
                    🗑 Delete
                  </button>
                </div>
              </>
            ) : (
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                Select a clip to edit properties
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}