import { getCurrentWindow } from "@tauri-apps/api/window";

interface TitleBarProps {
  title: string;
  theme: string;
  onThemeToggle: () => void;
  onOpenCommandPalette: () => void;
}

export function TitleBar({ title, theme, onThemeToggle, onOpenCommandPalette }: TitleBarProps) {
  const handleMinimize = () => getCurrentWindow().minimize();
  const handleMaximize = () => getCurrentWindow().toggleMaximize();
  const handleClose = () => getCurrentWindow().close();

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-drag">
        <span className="titlebar-logo">AI</span>
        <span className="titlebar-title">{title}</span>
      </div>
      <div className="flex items-center gap-4" style={{ height: "100%", paddingRight: 4 }}>
        <button className="topbar-btn" onClick={onOpenCommandPalette} title="Command Palette" style={{ width: 28, height: 28, fontSize: 13 }}>cmd</button>
        <button className="topbar-btn" onClick={onThemeToggle} title="Toggle theme" style={{ width: 28, height: 28, fontSize: 13 }}>{theme === "dark" ? "sun" : "moon"}</button>
        <div className="titlebar-controls">
          <button className="titlebar-btn" onClick={handleMinimize} title="Minimize">
            <svg viewBox="0 0 12 12"><rect x="1" y="5.5" width="10" height="1" fill="currentColor"/></svg>
          </button>
          <button className="titlebar-btn" onClick={handleMaximize} title="Maximize">
            <svg viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
          </button>
          <button className="titlebar-btn close" onClick={handleClose} title="Close">
            <svg viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}