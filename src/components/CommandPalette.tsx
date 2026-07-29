import { useState, useEffect, useRef, useCallback } from "react";
import { shortcuts } from "../shortcuts";

interface CommandItem {
  id: string;
  label: string;
  description: string;
  keys: string;
  icon: string;
  category?: string;
  handler: () => void;
}

interface CommandPaletteProps {
  onClose: () => void;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const availableCommands: CommandItem[] = [
    { id: "project.create", label: "New Project", description: "Create a new creative project", keys: "Ctrl+Shift+N", icon: "f", category: "Project", handler: () => {} },
    { id: "project.open", label: "Open Project", description: "Open an existing project", keys: "Ctrl+O", icon: "f", category: "Project", handler: () => {} },
    { id: "project.save", label: "Save", description: "Save the current project", keys: "Ctrl+S", icon: "s", category: "Project", handler: () => {} },
    { id: "theme.switch", label: "Switch Theme", description: "Toggle between light and dark theme", keys: "", icon: "a", category: "System", handler: () => {} },
    { id: "settings.open", label: "Open Settings", description: "Configure AI Studio OS preferences", keys: "Ctrl+,", icon: "g", category: "System", handler: () => {} },
    { id: "export.render", label: "Render / Export", description: "Render the current project", keys: "Ctrl+E", icon: "m", category: "Project", handler: () => {} },
    { id: "console.toggle", label: "Toggle Console", description: "Show or hide the console panel", keys: "Ctrl+`", icon: "k", category: "System", handler: () => {} },
    { id: "fullscreen.toggle", label: "Toggle Fullscreen", description: "Enter or exit fullscreen mode", keys: "F11", icon: "n", category: "System", handler: () => {} },
    { id: "help.about", label: "About AI Studio OS", description: "View version and system information", keys: "", icon: "i", category: "System", handler: () => {} },
    { id: "help.shortcuts", label: "Keyboard Shortcuts", description: "View all available keyboard shortcuts", keys: "", icon: "k", category: "System", handler: () => {} },
    { id: "navigate.dashboard", label: "Go to Dashboard", description: "Navigate to the dashboard panel", keys: "", icon: "o", category: "Navigation", handler: () => {} },
    { id: "navigate.projects", label: "Go to Projects", description: "Navigate to the projects panel", keys: "", icon: "f", category: "Navigation", handler: () => {} },
    { id: "navigate.settings", label: "Go to Settings", description: "Navigate to the settings panel", keys: "", icon: "g", category: "Navigation", handler: () => {} },
    { id: "navigate.templates", label: "Go to Templates", description: "Navigate to the templates panel", keys: "", icon: "l", category: "Navigation", handler: () => {} },
    { id: "navigate.assets", label: "Go to Asset Library", description: "Navigate to the asset library", keys: "", icon: "p", category: "Navigation", handler: () => {} },
    { id: "navigate.themes", label: "Go to Theme Library", description: "Navigate to the theme library", keys: "", icon: "a", category: "Navigation", handler: () => {} },
    { id: "navigate.plugins", label: "Go to Plugin Manager", description: "Navigate to the plugin manager", keys: "", icon: "m", category: "Navigation", handler: () => {} },
    { id: "navigate.queue", label: "Go to Render Queue", description: "Navigate to the render queue", keys: "", icon: "m", category: "Navigation", handler: () => {} },
  ];

  const filtered = query
    ? availableCommands.filter((c) => {
        const q = query.toLowerCase();
        return c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || (c.category || "").toLowerCase().includes(q) || c.keys.toLowerCase().includes(q);
      })
    : availableCommands;

  useEffect(() => { setSelectedIndex(0); }, [query]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const execute = useCallback((item: CommandItem) => {
    item.handler();
    onClose();
  }, [onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); e.preventDefault(); }
    else if (e.key === "ArrowDown") { setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); e.preventDefault(); }
    else if (e.key === "ArrowUp") { setSelectedIndex((i) => Math.max(i - 1, 0)); e.preventDefault(); }
    else if (e.key === "Enter") { if (filtered[selectedIndex]) execute(filtered[selectedIndex]); e.preventDefault(); }
  };

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const grouped = filtered.reduce((acc, item) => {
    const cat = item.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  const flatItems: ({ type: "header"; label: string } | { type: "item"; item: CommandItem; index: number })[] = [];
  let globalIndex = 0;
  for (const [cat, items] of Object.entries(grouped)) {
    flatItems.push({ type: "header", label: cat });
    for (const item of items) {
      flatItems.push({ type: "item", item, index: globalIndex });
      globalIndex++;
    }
  }

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input ref={inputRef} className="command-palette-input" placeholder="Search commands, files, or actions..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} />
        <div className="command-palette-results" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="command-palette-empty">No results for &quot;{query}&quot;</div>
          ) : (
            flatItems.map((entry, i) => {
              if (entry.type === "header") {
                return <div key={entry.label} style={{ padding: "8px 12px 4px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--text-muted)" }}>{entry.label}</div>;
              }
              const { item, index } = entry;
              const isSelected = index === selectedIndex;
              return (
                <div key={item.id} className={`command-item ${isSelected ? "selected" : ""}`} onClick={() => execute(item)} onMouseEnter={() => setSelectedIndex(index)}>
                  <div className="command-item-left">
                    <div className="command-item-icon">{item.icon}</div>
                    <div>
                      <div className="command-item-label">{item.label}</div>
                      <div className="command-item-desc">{item.description}</div>
                    </div>
                  </div>
                  {item.keys && <span className="command-item-shortcut">{item.keys}</span>}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}