// ─── Motion Studio: Drag-drop from AssetLibrary ─────────────────
// Native DnD: dragged asset data is carried via text/plain JSON.

export interface DraggedAsset {
  name: string;
  path: string;
  isDir: boolean;
  kind: "image" | "video" | "audio" | "font" | "other";
}

export function detectAssetKind(name: string): DraggedAsset["kind"] {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif"].includes(ext)) return "image";
  if (["mp4", "webm", "mov", "avi", "mkv", "wmv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "flac", "aac", "wma"].includes(ext)) return "audio";
  if (["ttf", "otf", "woff", "woff2"].includes(ext)) return "font";
  return "other";
}

export const DRAG_MIME = "application/x-aios-asset";

export function setDragData(e: React.DragEvent, asset: { name: string; path: string; is_dir: boolean }) {
  const payload: DraggedAsset = {
    name: asset.name,
    path: asset.path,
    isDir: asset.is_dir,
    kind: detectAssetKind(asset.name),
  };
  e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "copy";
}