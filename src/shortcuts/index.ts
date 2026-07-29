export type ShortcutContext = "global" | "motion-graphics" | "text-editor" | "asset-browser";

export interface ShortcutBinding {
  label: string;
  description: string;
  keys: string;
  context?: ShortcutContext;
  handler: () => void;
  category?: string;
}

interface ShortcutEntry {
  binding: ShortcutBinding;
  id: string;
}

type ShortcutListener = (action: string) => void;

class ShortcutRegistry {
  private bindings = new Map<string, ShortcutEntry>();
  private activeContexts = new Set<ShortcutContext>(["global"]);
  private listeners = new Set<ShortcutListener>();
  private enabled = true;

  register(id: string, binding: ShortcutBinding): void {
    this.bindings.set(id, { binding, id });
  }

  unregister(id: string): void {
    this.bindings.delete(id);
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
  }

  pushContext(ctx: ShortcutContext): void {
    this.activeContexts.add(ctx);
  }

  popContext(ctx: ShortcutContext): void {
    this.activeContexts.delete(ctx);
  }

  hasContext(ctx: ShortcutContext): boolean {
    return this.activeContexts.has(ctx);
  }

  getAll(context?: ShortcutContext): ShortcutBinding[] {
    const entries = Array.from(this.bindings.values());
    if (context) {
      return entries.filter((e) => (e.binding.context || "global") === context).map((e) => e.binding);
    }
    return entries.map((e) => e.binding);
  }

  search(query: string): { binding: ShortcutBinding; id: string }[] {
    const q = query.toLowerCase();
    return Array.from(this.bindings.values())
      .filter((e) => {
        const b = e.binding;
        return b.label.toLowerCase().includes(q) || b.description.toLowerCase().includes(q) || (b.category || "").toLowerCase().includes(q) || b.keys.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const aLabel = a.binding.label.toLowerCase().startsWith(q) ? 0 : 1;
        const bLabel = b.binding.label.toLowerCase().startsWith(q) ? 0 : 1;
        if (aLabel !== bLabel) return aLabel - bLabel;
        return a.binding.label.localeCompare(b.binding.label);
      });
  }

  subscribe(listener: ShortcutListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  handleKeyEvent(e: KeyboardEvent): boolean {
    if (!this.enabled) return false;

    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return false;

    const key = this.eventToKeyString(e);
    if (!key) return false;

    const entries = Array.from(this.bindings.values());

    // Try context-scoped first
    for (const entry of entries) {
      const ctx = entry.binding.context || "global";
      if (ctx !== "global" && this.activeContexts.has(ctx) && entry.binding.keys === key) {
        entry.binding.handler();
        this.notify(entry.id);
        return true;
      }
    }

    // Then global
    for (const entry of entries) {
      const ctx = entry.binding.context || "global";
      if (ctx === "global" && entry.binding.keys === key) {
        entry.binding.handler();
        this.notify(entry.id);
        return true;
      }
    }

    return false;
  }

  private eventToKeyString(e: KeyboardEvent): string {
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");

    const keyMap: Record<string, string> = {
      " ": "Space", Escape: "Escape", Enter: "Enter", Tab: "Tab",
      Backspace: "Backspace", Delete: "Delete", Insert: "Insert",
      Home: "Home", End: "End", PageUp: "PageUp", PageDown: "PageDown",
      ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right",
      ",": "Comma", ".": "Period", "`": "Backtick",
    };

    const key = keyMap[e.key] || e.key;
    parts.push(key.length === 1 ? key.toUpperCase() : key);
    return parts.join("+");
  }

  private notify(id: string): void {
    for (const listener of this.listeners) {
      listener(id);
    }
  }
}

export const shortcuts = new ShortcutRegistry();

export function registerDefaultShortcuts(dispatch: (action: string) => void) {
  const s = (label: string, description: string, keys: string, action: string, category?: string, context?: ShortcutContext) => {
    shortcuts.register(action, { label, description, keys, category, context, handler: () => dispatch(action) });
  };

  s("Save", "Save the current project", "Ctrl+S", "project.save", "Project");
  s("Save As", "Save project with a new name", "Ctrl+Shift+S", "project.saveAs", "Project");
  s("Undo", "Undo last action", "Ctrl+Z", "edit.undo", "Edit");
  s("Redo", "Redo last undone action", "Ctrl+Shift+Z", "edit.redo", "Edit");
  s("Copy", "Copy selection", "Ctrl+C", "edit.copy", "Edit");
  s("Paste", "Paste from clipboard", "Ctrl+V", "edit.paste", "Edit");
  s("Cut", "Cut selection", "Ctrl+X", "edit.cut", "Edit");
  s("Select All", "Select all items", "Ctrl+A", "edit.selectAll", "Edit");
  s("Duplicate", "Duplicate selected items", "Ctrl+D", "edit.duplicate", "Edit");
  s("Delete", "Delete selected items", "Delete", "edit.delete", "Edit");
  s("Open Settings", "Open the settings panel", "Ctrl+,", "settings.open", "System");
  s("Toggle Console", "Toggle the console panel", "Ctrl+`", "console.toggle", "System");
  s("Toggle Sidebar", "Toggle the sidebar visibility", "Ctrl+B", "sidebar.toggle", "System");
  s("New Project", "Create a new project", "Ctrl+Shift+N", "project.create", "Project");
  s("Open Project", "Open an existing project", "Ctrl+O", "project.open", "Project");
  s("Render / Export", "Render the current project", "Ctrl+E", "export.render", "Project");
  s("Command Palette", "Open the command palette", "Ctrl+Shift+P", "palette.commands", "System");
  s("Quick Open", "Quick open files and projects", "Ctrl+P", "palette.quickOpen", "System");
  s("Toggle Fullscreen", "Toggle fullscreen mode", "F11", "fullscreen.toggle", "System");
  s("Theme: Dark", "Switch to dark theme", "Ctrl+Shift+D", "theme.dark", "System");
  s("Theme: Light", "Switch to light theme", "Ctrl+Shift+L", "theme.light", "System");

  s("Play / Pause", "Play or pause the animation", "Space", "transport.playPause", "Transport", "motion-graphics");
  s("Go to Start", "Go to the first frame", "Home", "transport.goToStart", "Transport", "motion-graphics");
  s("Go to End", "Go to the last frame", "End", "transport.goToEnd", "Transport", "motion-graphics");
  s("Frame Back", "Go back one frame", "Left", "transport.frameBack", "Transport", "motion-graphics");
  s("Frame Forward", "Go forward one frame", "Right", "transport.frameForward", "Transport", "motion-graphics");
  s("Select Tool", "Activate the select tool", "V", "tool.select", "Tools", "motion-graphics");
  s("Text Tool", "Activate the text tool", "T", "tool.text", "Tools", "motion-graphics");
  s("Rectangle Tool", "Activate the rectangle tool", "R", "tool.rectangle", "Tools", "motion-graphics");
  s("Ellipse Tool", "Activate the ellipse tool", "E", "tool.ellipse", "Tools", "motion-graphics");
}