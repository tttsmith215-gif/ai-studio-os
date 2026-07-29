import { useState, useEffect, useCallback } from "react";
import { listAssets, AssetDir } from "../ipc/assets";
import { setDragData } from "../engine/dnd";

interface AssetItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: string;
}

type DirKey = keyof typeof AssetDir;

const dirInfo: { key: DirKey; label: string; icon: string }[] = [
  { key: "images", label: "Images", icon: "p" },
  { key: "videos", label: "Videos", icon: "m" },
  { key: "music", label: "Music", icon: "n" },
  { key: "voices", label: "Voice Recordings", icon: "m" },
  { key: "sfx", label: "Sound Effects", icon: "s" },
  { key: "fonts", label: "Fonts", icon: "f" },
  { key: "models", label: "3D Models", icon: "3" },
  { key: "hdri", label: "HDRI Maps", icon: "s" },
  { key: "templates", label: "Templates", icon: "l" },
  { key: "themes", label: "Themes", icon: "a" },
  { key: "icons", label: "Icons", icon: "i" },
];

function formatSize(bytes: number): string {
  if (bytes === 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function AssetLibrary() {
  const [currentDir, setCurrentDir] = useState("");
  const [currentLabel, setCurrentLabel] = useState("Asset Library");
  const [entries, setEntries] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; path: string }[]>([{ label: "Asset Library", path: "" }]);

  const loadDir = useCallback(async (subpath: string) => {
    setLoading(true);
    try {
      const list = await listAssets(subpath || ".");
      setEntries(list as AssetItem[]);
    } catch { setEntries([]); }
    setLoading(false);
  }, []);

  useEffect(() => { loadDir(currentDir); }, [currentDir, loadDir]);

  const navigateToCategory = (key: DirKey) => {
    const path = AssetDir[key];
    const label = dirInfo.find((d) => d.key === key)?.label || key;
    setCurrentDir(path);
    setCurrentLabel(label);
    setBreadcrumbs([{ label: "Asset Library", path: "" }, { label, path }]);
  };

  const navigateToDir = (entry: AssetItem) => {
    if (!entry.is_dir) return;
    const newPath = currentDir ? `${currentDir}/${entry.name}` : entry.name;
    setCurrentDir(newPath);
    setBreadcrumbs([...breadcrumbs, { label: entry.name, path: newPath }]);
  };

  const navigateBreadcrumb = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentDir(newBreadcrumbs[newBreadcrumbs.length - 1].path);
    setCurrentLabel(newBreadcrumbs[newBreadcrumbs.length - 1].label);
  };

  const getFileIcon = (entry: AssetItem): string => {
    if (entry.is_dir) return "f";
    const ext = entry.name.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "p";
    if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "m";
    if (["mp3", "wav", "ogg", "flac", "aac"].includes(ext)) return "n";
    if (["ttf", "otf", "woff", "woff2"].includes(ext)) return "f";
    if (["glb", "gltf", "obj", "fbx"].includes(ext)) return "3";
    if (["json", "yaml", "toml"].includes(ext)) return "l";
    return "d";
  };

  if (!currentDir) {
    return (
      <div className="panel-container">
        <div className="panel-header">
          <h1 className="panel-title">Asset Library</h1>
          <p className="panel-subtitle">Browse and manage your creative assets</p>
        </div>
        <div className="panel-grid">
          {dirInfo.map((d) => (
            <div key={d.key} className="panel-card" onClick={() => navigateToCategory(d.key)}>
              <div className="panel-card-icon" style={{ background: "rgba(108,92,231,0.15)" }}>{d.icon}</div>
              <div className="panel-card-title">{d.label}</div>
              <div className="panel-card-desc">Browse {d.label.toLowerCase()}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="panel-container">
      <div className="panel-header">
        <h1 className="panel-title">{currentLabel}</h1>
        <p className="panel-subtitle">Browse and manage assets</p>
      </div>

      <div className="asset-browser">
        <div className="asset-breadcrumbs">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {i > 0 && <span className="asset-breadcrumb-sep">/</span>}
              <span className="asset-breadcrumb" onClick={() => navigateBreadcrumb(i)}>{crumb.label}</span>
            </span>
          ))}
        </div>

        {breadcrumbs.length > 1 && (
          <button className="btn" onClick={() => navigateBreadcrumb(breadcrumbs.length - 2)} style={{ alignSelf: "flex-start" }}>Back</button>
        )}

        {loading ? (
          <div className="placeholder-panel" style={{ height: "30vh" }}><div className="placeholder-text">Loading...</div></div>
        ) : entries.length === 0 ? (
          <div className="placeholder-panel" style={{ height: "30vh" }}>
            <div className="placeholder-icon">d</div>
            <div className="placeholder-text">This folder is empty. Import assets to get started.</div>
          </div>
        ) : (
          <div className="asset-grid">
            {entries.map((entry) => (
              <div
                key={entry.path}
                className="asset-item"
                onClick={() => entry.is_dir ? navigateToDir(entry) : null}
                onDragStart={(e) => setDragData(e, entry)}
                draggable={!entry.is_dir}
                style={entry.is_dir ? { cursor: "pointer" } : { cursor: "grab" }}
              >
                <div className="asset-item-icon">{getFileIcon(entry)}</div>
                <div className="asset-item-name">{entry.name}</div>
                {!entry.is_dir && entry.size > 0 && <div className="asset-item-size">{formatSize(entry.size)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}