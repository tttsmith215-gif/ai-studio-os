# AI Studio OS — System Design Document

> **Version:** 0.1.0-draft
> **Status:** Scaffolding complete, engine pending
> **License:** Proprietary

---

## North Star

AI Studio OS should become the **Blender of AI-powered content creation**.

| Principle | Meaning |
|-----------|---------|
| **Free first** | No paywalls for core features. Monetization comes later and only for cloud/enterprise extras. |
| **Open-source friendly** | Permissive license, community contributions, transparent development. |
| **Plugin-driven** | Every creative capability is an installable app. The core is a thin OS. |
| **Local-first** | Everything runs on-device by default. AI inference, rendering, storage — all local. Cloud is optional. |
| **Professional grade** | Production-quality output. No half-baked features. If it ships, it works. |
| **Extensible** | Plugin SDK, scripting API, custom render pipelines. Power users can build on it. |
| **Fast** | Sub-second cold start, 60fps canvas, no jank. Performance is a feature, not an afterthought. |
| **Beautiful** | Every pixel intentional. Polished UI, smooth animations, cohesive design language. |
| **Deterministic** | Same input → same output. Reproducible renders. No black-box surprises. |

**The goal is not to build another AI wrapper.**

The goal is to build a **long-lasting creative platform** where AI is only one component of a robust, high-performance content creation system. Every architectural decision should support this long-term vision.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Package Diagram](#2-package-diagram)
3. [Data Flow](#3-data-flow)
4. [Folder Structure](#4-folder-structure)
5. [Plugin System](#5-plugin-system)
6. [Rendering Pipeline](#6-rendering-pipeline)
7. [Database Schema](#7-database-schema)
8. [State Management](#8-state-management)
9. [UI Architecture](#9-ui-architecture)
10. [Performance Strategy](#10-performance-strategy)
11. [Security Considerations](#11-security-considerations)
12. [Future Roadmap](#12-future-roadmap)

---

## 1. High-Level Architecture

AI Studio OS is a **plugin-based desktop operating system for AI-powered content creation**, built on top of a standard OS kernel (Windows/macOS/Linux) using Tauri v2 as the native shell and React as the UI layer.

### Tier Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    UI LAYER (React + TypeScript)              │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────┐  │
│  │ Sidebar │ │ Topbar   │ │ Panels   │ │ Creative Apps   │  │
│  │ (nav)   │ │ (global) │ │ (system) │ │ (plugins)       │  │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └────────┬────────┘  │
│       └───────────┴────────────┴─────────────────┘           │
│                         │                                     │
│              ┌──────────┴──────────┐                         │
│              │  State Store (Ctx)  │                         │
│              └──────────┬──────────┘                         │
│                         │                                     │
│              ┌──────────┴──────────┐                         │
│              │  IPC Bridge (Tauri) │                         │
│              └──────────┬──────────┘                         │
├─────────────────────────┼────────────────────────────────────┤
│              ┌──────────┴──────────┐   NATIVE LAYER (Rust)   │
│              │  Tauri Core         │                         │
│              │  (window, events,   │                         │
│              │   process, menus)   │                         │
│              └──────────┬──────────┘                         │
├─────────────────────────┼────────────────────────────────────┤
│              ┌──────────┴──────────┐   SERVICE LAYER (Rust)  │
│              │  Backend Commands   │                         │
│              │  ┌────────────────┐ │                         │
│              │  │ File System    │ │                         │
│              │  │ Settings Store │ │                         │
│              │  │ Project CRUD   │ │                         │
│              │  │ Export Queue   │ │                         │
│              │  │ Plugin Loader  │ │                         │
│              │  └────────────────┘ │                         │
│              └─────────────────────┘                         │
├──────────────────────────────────────────────────────────────┤
│                    OS KERNEL (Windows/macOS/Linux)            │
│  File I/O · GPU (WebGL/Vulkan) · Threads · Network · Audio   │
└──────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Desktop shell | Tauri v2 | Smaller binary than Electron, Rust backend, native FS access |
| UI framework | React 19 | Component model suits plugin panels, large ecosystem |
| Build tool | Vite 8 | Fast HMR, native TypeScript, Tauri integration |
| Package manager | Bun | Fast installs, native TS execution, lockfile |
| Rendering | Canvas 2D → WebGL | Start minimal, upgrade when perf demands it |
| Plugin isolation | Webview preload | Sandboxed JS context for third-party code |
| State | React Context + useReducer | Zero deps, sufficient for single-window app |
| Persistence | JSON files on disk | Desktop app, no DB server needed, portable |

### Boundaries

- **Frontend** never touches the filesystem directly — every I/O goes through a Tauri command.
- **Plugins** run in the same JS context by default, or in isolated webviews when marked untrusted.
- **Creative apps** (Motion Graphics, Video Editor, etc.) are plugins with a `component` export — they share the same render thread.

---

## 2. Package Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  ai-studio-os (workspace root)                                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  src-tauri (Rust crate)                                  │   │
│  │  ┌────────────┐ ┌────────────────┐ ┌──────────────────┐  │   │
│  │  │ main.rs    │ │ lib.rs         │ │ commands/        │  │   │
│  │  │ (entry)    │ │ (run, plugins) │ │ ├── settings.rs  │  │   │
│  │  └────────────┘ └────────────────┘ │ ├── projects.rs  │  │   │
│  │                                    │ ├── assets.rs    │  │   │
│  │                                    │ └── export.rs    │  │   │
│  │                                    └──────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  src/ (React + TypeScript)                               │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │  App.tsx — root layout, panel routing            │   │   │
│  │  ├──────────────────────────────────────────────────┤   │   │
│  │  │  components/ — shared UI primitives              │   │   │
│  │  │  ├── Sidebar.tsx      │  ├── Topbar.tsx          │   │   │
│  │  │  ├── PanelCard.tsx    │  ├── Placeholder.tsx     │   │   │
│  │  │  ├── Timeline.tsx     │  ├── Canvas.tsx          │   │   │
│  │  │  └── Modal.tsx        │  └── Button.tsx          │   │   │
│  │  ├──────────────────────────────────────────────────┤   │   │
│  │  │  panels/ — system UI panels (not plugins)        │   │   │
│  │  │  ├── Dashboard.tsx    │  ├── Projects.tsx        │   │   │
│  │  │  ├── Settings.tsx     │  ├── Console.tsx         │   │   │
│  │  │  ├── PluginManager.tsx│  ├── RenderQueue.tsx     │   │   │
│  │  │  ├── ... (14 total)   │                          │   │   │
│  │  ├──────────────────────────────────────────────────┤   │   │
│  │  │  plugins/ — plugin system                        │   │   │
│  │  │  ├── types.ts         │  ├── registry.ts         │   │   │
│  │  │  ├── index.ts         │  ├── loader.ts           │   │   │
│  │  │  └── apps/            │                          │   │   │
│  │  │      ├── MotionGraphics.tsx                      │   │   │
│  │  │      ├── VideoEditor.tsx   (future)              │   │   │
│  │  │      └── ImageEditor.tsx   (future)              │   │   │
│  │  ├──────────────────────────────────────────────────┤   │   │
│  │  │  engine/ — rendering pipeline                    │   │   │
│  │  │  ├── types.ts         │  ├── composition.ts      │   │   │
│  │  │  ├── timeline.ts      │  ├── layers.ts           │   │   │
│  │  │  ├── keyframes.ts     │  ├── renderer.ts         │   │   │
│  │  │  └── codecs.ts        │                          │   │   │
│  │  ├──────────────────────────────────────────────────┤   │   │
│  │  │  store/ — state management                       │   │   │
│  │  │  ├── context.tsx      │  ├── reducer.ts          │   │   │
│  │  │  ├── actions.ts       │  ├── types.ts            │   │   │
│  │  │  └── middleware.ts    │                          │   │   │
│  │  ├──────────────────────────────────────────────────┤   │   │
│  │  │  ipc/ — Tauri command wrappers (typed)           │   │   │
│  │  │  ├── settings.ts     │  ├── projects.ts          │   │   │
│  │  │  ├── assets.ts       │  └── export.ts            │   │   │
│  │  ├──────────────────────────────────────────────────┤   │   │
│  │  │  hooks/ — custom React hooks                     │   │   │
│  │  │  ├── useStore.ts     │  ├── useIpc.ts            │   │   │
│  │  │  ├── useEngine.ts    │  └── useDebounce.ts       │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  config/ — user data (not in repo)                       │   │
│  │  ├── settings.json     │  ├── projects/                  │   │
│  │  ├── plugins/          │  ├── assets/                    │   │
│  │  └── cache/            │                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow

### 3.1 User Action Flow (General)

```
User clicks button
    │
    ▼
React event handler
    │
    ├── Local-only? → dispatch(store action) → reducer updates state → UI re-renders
    │
    └── Needs I/O?  → invoke(Tauri command) → Rust backend → file/network
                            │
                            ▼
                        Response returns
                            │
                            ▼
                        dispatch(store action with payload)
                            │
                            ▼
                        UI re-renders
```

### 3.2 Motion Graphics Composition Flow

```
User presses "New Composition"
    │
    ▼
dispatch({ type: 'COMPOSITION_CREATE', payload: { width, height, fps, duration } })
    │
    ▼
reducer adds composition to store.compositions[]
    │
    ▼
<Canvas /> component reads store.activeComposition
    │
    ▼
Engine initializes: CanvasRenderingContext2D, RAF loop
    │
    ▼
User adds layers / keyframes / modifies properties
    │
    ▼
Each action → dispatch → reducer → RAF picks up new state → render frame
    │
    ▼
On save: invoke('save_project', { composition }) → Rust writes JSON file
```

### 3.3 Plugin Registration Flow

```
App boots
    │
    ▼
plugins/index.ts imports all plugin modules
    │
    ▼
Each plugin calls registry.register({ id, name, component, ... })
    │
    ▼
registry stores in Map<string, CreativeApp>
    │
    ▼
Sidebar queries registry.getAll() to build nav
    │
    ▼
App.tsx builds panelMap from registry entries
    │
    ▼
User clicks sidebar item → Panel renders as <Panel />
```

### 3.4 Settings Save Flow

```
User changes a setting in Settings panel
    │
    ▼
dispatch({ type: 'SETTINGS_UPDATE', payload: { key, value } })
    │
    ├── reducer updates store.settings
    │
    └── useEffect (debounced 500ms) fires invoke('save_settings', store.settings)
            │
            ▼
        Rust writes ~/.ai-studio-os/settings.json
            │
            ▼
        Returns Ok → no UI change needed
```

---

## 4. Folder Structure

> **Full storage architecture** → [`STORAGE-ARCHITECTURE.md`](./STORAGE-ARCHITECTURE.md)
> This section covers the source code layout. The storage architecture covers the runtime data directory (projects, assets, exports, backups, cache, etc.).

```
ai-studio-os/
├── index.html                          # Vite entry HTML
├── package.json                        # Dependencies & scripts
├── tsconfig.json                       # TypeScript config
├── vite.config.ts                      # Vite config (React plugin, Tauri dev)
├── bun.lock                            # Bun lockfile
├── README.md                           # Project overview
├── SYSTEM-DESIGN.md                    # This document
│
├── public/                             # Static assets (favicon, etc.)
│
├── src/                                # Frontend source
│   ├── main.tsx                        # React entry point
│   ├── App.tsx                         # Root component, panel routing
│   ├── vite-env.d.ts                   # Vite type declarations
│   │
│   ├── components/                     # Shared UI primitives
│   │   ├── Sidebar.tsx                 # Navigation sidebar
│   │   ├── Topbar.tsx                  # Global top bar
│   │   ├── Canvas.tsx                  # HTML Canvas wrapper for rendering
│   │   ├── Timeline.tsx                # Timeline controls (playhead, layers)
│   │   ├── PanelCard.tsx               # Grid card component
│   │   ├── Placeholder.tsx             # Empty state component
│   │   ├── Modal.tsx                   # Modal dialog
│   │   ├── Button.tsx                  # Styled button
│   │   └── Badge.tsx                   # Status badge
│   │
│   ├── panels/                         # System panels (built-in, not plugins)
│   │   ├── Dashboard.tsx               # Home / overview
│   │   ├── Projects.tsx                # Project CRUD
│   │   ├── Templates.tsx               # Template browser
│   │   ├── ThemeLibrary.tsx            # Theme presets
│   │   ├── AnimationLibrary.tsx        # Animation presets
│   │   ├── AssetLibrary.tsx            # File browser / asset manager
│   │   ├── PromptLibrary.tsx           # Saved AI prompts
│   │   ├── AIAgents.tsx                # AI assistant management
│   │   ├── Settings.tsx                # App settings
│   │   ├── RenderQueue.tsx             # Active render jobs
│   │   ├── ExportManager.tsx           # Export formats & progress
│   │   ├── PluginManager.tsx           # Plugin install/remove
│   │   ├── UpdateManager.tsx           # App updates
│   │   └── Console.tsx                 # System logs
│   │
│   ├── plugins/                        # Plugin system
│   │   ├── types.ts                    # CreativeApp, AppModule, Registry interfaces
│   │   ├── registry.ts                 # Registry class (Map-based)
│   │   ├── index.ts                    # Entry point, imports all plugins
│   │   ├── loader.ts                   # Dynamic plugin loader (future)
│   │   └── apps/                       # Installed creative apps
│   │       └── MotionGraphics.tsx      # V1 app
│   │
│   ├── engine/                         # Rendering pipeline
│   │   ├── types.ts                    # Composition, Layer, Keyframe, Timeline types
│   │   ├── composition.ts              # Composition creation & management
│   │   ├── timeline.ts                 # Timeline state, playhead, time calculations
│   │   ├── layers.ts                   # Layer operations (add, remove, reorder, blend)
│   │   ├── keyframes.ts                # Keyframe interpolation (linear, bezier, ease)
│   │   ├── renderer.ts                 # Canvas render loop, frame compositing
│   │   └── codecs.ts                   # Export encoding (future: ffmpeg bindings)
│   │
│   ├── store/                          # State management
│   │   ├── types.ts                    # Global state shape
│   │   ├── context.tsx                 # React Context provider
│   │   ├── reducer.ts                  # Root reducer (combined slice reducers)
│   │   ├── actions.ts                  # Action type constants & creators
│   │   └── middleware.ts               # Side-effect handlers (debounced saves, IPC)
│   │
│   ├── ipc/                            # Typed Tauri command wrappers
│   │   ├── settings.ts                 # get_settings, save_settings
│   │   ├── projects.ts                 # list_projects, create_project, delete_project
│   │   ├── assets.ts                   # read_dir, import_asset, delete_asset
│   │   └── export.ts                   # start_export, cancel_export, export_status
│   │
│   ├── hooks/                          # Custom React hooks
│   │   ├── useStore.ts                 # Typed store selector
│   │   ├── useIpc.ts                   # Invoke Tauri command with loading/error state
│   │   ├── useEngine.ts               # RAF loop, composition binding
│   │   └── useDebounce.ts              # Debounce utility
│   │
│   └── styles/                         # CSS
│       └── globals.css                 # Design tokens, layout, components
│
├── src-tauri/                          # Rust backend
│   ├── Cargo.toml                      # Rust dependencies
│   ├── Cargo.lock
│   ├── build.rs                        # Tauri build script
│   ├── tauri.conf.json                 # Window config, security, bundle
│   ├── capabilities/
│   │   └── default.json                # Permission capabilities
│   ├── icons/                          # App icons (all formats)
│   ├── gen/                            # Generated schemas
│   └── src/
│       ├── main.rs                     # Windows entrypoint
│       ├── lib.rs                      # Tauri builder, plugin init, command registration
│       └── commands/                   # Backend command modules
│           ├── mod.rs                  # Module exports
│           ├── settings.rs             # Read/write settings.json
│           ├── projects.rs             # Project CRUD on filesystem
│           ├── assets.rs               # File system browsing & import
│           └── export.rs               # Export queue & encoding
│
├── config/                             # Runtime user data (gitignored, created on first run)
│   ├── settings.json
│   ├── projects/
│   ├── plugins/
│   ├── assets/
│   └── cache/
│
└── dist/                               # Vite build output (gitignored)
```

---

## 5. Plugin System

### 5.1 Core Interfaces

```typescript
// types.ts — the contract every plugin must satisfy

interface CreativeApp {
  id: string;                    // Unique kebab-case id, e.g. "motion-graphics"
  name: string;                  // Human-readable name
  description: string;           // One-line description
  icon: string;                  // Emoji or icon identifier
  version: string;               // semver
  component: ComponentType;      // React component to render in main area
  category: AppCategory;         // Classification for sidebar grouping
  installed: boolean;            // Whether the app is currently installed
  permissions?: string[];        // Required capabilities (future)
}

type AppCategory = "motion" | "video" | "image" | "audio" | "text" | "manage" | "system";

interface AppModule {
  register(registry: CreativeAppRegistry): void;
  // Future lifecycle hooks:
  // onActivate?(): void;
  // onDeactivate?(): void;
  // onUninstall?(): void;
}

interface CreativeAppRegistry {
  register(app: CreativeApp): void;
  get(id: string): CreativeApp | undefined;
  getAll(): CreativeApp[];
  getByCategory(category: AppCategory): CreativeApp[];
}
```

### 5.2 Registration Flow

```
1. Plugin modules are imported statically in plugins/index.ts
2. Each module's register() is called with the global registry singleton
3. Registry stores in a Map<string, CreativeApp>
4. Sidebar queries registry for nav items
5. App.tsx maps each app id to its component for panel routing
6. PluginManager lists all registered apps with install status
```

### 5.3 Plugin Lifecycle (Future)

| Phase | What Happens |
|-------|-------------|
| **Install** | Plugin directory copied to `config/plugins/{id}/`, manifest parsed, app registered |
| **Activate** | `onActivate()` called, component added to panel map, sidebar updated |
| **Deactivate** | `onDeactivate()` called, component removed from panel map (not deleted) |
| **Uninstall** | `onUninstall()` called, directory removed, registry entry deleted |

### 5.4 Plugin Isolation (Future)

- **Trusted plugins** (first-party, signed) → run in the same JS context as the core.
- **Untrusted plugins** (third-party, community) → loaded in a separate webview with a preload script that exposes a limited API (no `window`, no `invoke`, only a `pluginApi` object).
- **Permissions** declared in the plugin manifest (e.g., `"permissions": ["filesystem:read", "network:fetch"]`), checked against user approval at install time.

---

## 6. Rendering Pipeline

### 6.1 Architecture

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│Composition│────▶│ Timeline │────▶│  Layers  │────▶│ Keyframes│────▶│ Renderer │
│ (state)   │     │ (time)   │     │ (stack)  │     │ (animate)│     │ (canvas) │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └─────┬────┘
                                                                          │
                                                                          ▼
                                                                   ┌──────────┐
                                                                   │  Canvas  │
                                                                   │  (pixels) │
                                                                   └──────────┘
```

### 6.2 Core Types

```typescript
interface Composition {
  id: string;
  name: string;
  width: number;         // px, e.g. 1920
  height: number;        // px, e.g. 1080
  fps: number;           // e.g. 30
  duration: number;      // frames
  layers: Layer[];
  background: string;    // color hex
}

interface Layer {
  id: string;
  name: string;
  type: "shape" | "text" | "image" | "video" | "group";
  enabled: boolean;
  locked: boolean;
  blendMode: BlendMode;
  opacity: number;          // 0-1
  transform: Transform;
  keyframes: Keyframe[];
  content: LayerContent;    // type-specific data
}

interface Transform {
  x: number;  y: number;
  scaleX: number;  scaleY: number;
  rotation: number;     // degrees
  anchorX: number;  anchorY: number;
}

interface Keyframe {
  frame: number;              // Position on timeline
  properties: Partial<Transform & { opacity: number }>;
  easing: "linear" | "ease" | "ease-in" | "ease-out" | "bezier";
  bezier?: [number, number, number, number];  // cubic-bezier control points
}

type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "add" | "alpha";
```

### 6.3 Render Loop

```
requestAnimationFrame(timestamp)
    │
    ▼
renderer.ts: tick()
    │
    ├── 1. Calculate current frame from playhead position & fps
    │
    ├── 2. Clear canvas (background color)
    │
    ├── 3. For each layer (bottom to top):
    │       ├── Skip if disabled or locked (for rendering, not editing)
    │       ├── Interpolate keyframes at current frame → get Transform
    │       ├── Apply opacity, blend mode
    │       ├── Save context state
    │       ├── Apply transform (translate, rotate, scale)
    │       ├── Draw layer content (shape, text, image bitmap)
    │       └── Restore context state
    │
    ├── 4. Draw overlay elements (playhead, selection, guides)
    │
    └── 5. Repeat on next RAF
```

### 6.4 Keyframe Interpolation

```typescript
function interpolate(layer: Layer, frame: number): Transform {
  const result = { ...layer.transform };

  for (const kf of layer.keyframes) {
    const next = getNextKeyframe(layer.keyframes, kf);
    if (!next || frame < kf.frame || frame > next.frame) continue;

    const t = (frame - kf.frame) / (next.frame - kf.frame);
    const eased = applyEasing(t, kf.easing, kf.bezier);

    // Interpolate each property that exists in both keyframes
    for (const prop of Object.keys(kf.properties) as (keyof Transform)[]) {
      if (prop in next.properties) {
        (result[prop] as number) = lerp(
          kf.properties[prop]! as number,
          (next.properties[prop]! as number),
          eased
        );
      }
    }
  }

  return result;
}
```

### 6.5 Export Pipeline (Future)

```
Composition state
    │
    ▼
Capture frames: render each frame to an offscreen canvas
    │
    ▼
Encode: pass frame buffers to Rust via IPC
    │
    ▼
Rust: use ffmpeg (or similar) to encode to H.264 / H.265 / ProRes
    │
    ▼
Write to file at user-specified path
```

---

## 7. Database Schema

No SQL database. The application is a desktop creative tool, not a web service. All data is stored as **JSON files on disk** under `config/`. This keeps the app portable, backup-friendly, and git-friendly for project files.

### 7.1 Settings

**File:** `config/settings.json`

```json
{
  "general": {
    "language": "en",
    "autoSave": true,
    "autoSaveInterval": 300,
    "recentProjects": ["path/to/project1.json"]
  },
  "appearance": {
    "theme": "dark",
    "accentColor": "#6c5ce7",
    "fontSize": 13
  },
  "ai": {
    "provider": "ollama",
    "model": "llama3",
    "endpoint": "http://localhost:11434",
    "apiKey": null
  },
  "performance": {
    "canvasResolution": 1.0,
    "maxUndoSteps": 50,
    "throttleFps": 60
  }
}
```

### 7.2 Project

**File:** `config/projects/{project-id}/project.json`

```json
{
  "id": "uuid-v4",
  "name": "My Animation",
  "createdAt": "2026-07-29T08:00:00Z",
  "updatedAt": "2026-07-29T10:30:00Z",
  "thumbnail": "thumb.png",
  "app": "motion-graphics",
  "composition": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "duration": 300,
    "background": "#1a1a1a",
    "layers": [
      {
        "id": "layer-1",
        "name": "Background",
        "type": "shape",
        "enabled": true,
        "locked": false,
        "blendMode": "normal",
        "opacity": 1.0,
        "transform": { "x": 0, "y": 0, "scaleX": 1, "scaleY": 1, "rotation": 0, "anchorX": 0.5, "anchorY": 0.5 },
        "keyframes": [],
        "content": { "shape": "rectangle", "width": 1920, "height": 1080, "color": "#2d2d2d" }
      }
    ]
  }
}
```

### 7.3 Plugin Manifest (in each plugin package)

**File:** `config/plugins/{plugin-id}/manifest.json`

```json
{
  "id": "motion-graphics",
  "name": "Motion Graphics",
  "version": "1.0.0",
  "description": "Create animations and motion graphics with AI assistance",
  "author": "AI Studio OS",
  "icon": "🎬",
  "category": "motion",
  "entry": "index.js",
  "permissions": ["filesystem:read"],
  "checksum": "sha256-..."
}
```

### 7.4 Asset Index

**File:** `config/assets/index.json`

```json
{
  "assets": [
    {
      "id": "asset-uuid",
      "name": "logo.png",
      "path": "config/assets/logo.png",
      "type": "image",
      "mime": "image/png",
      "size": 24576,
      "width": 512,
      "height": 512,
      "importedAt": "2026-07-29T08:00:00Z",
      "tags": ["logo", "brand"]
    }
  ]
}
```

### 7.5 Data Location Strategy

| Platform | Config Path |
|----------|-------------|
| Windows | `%APPDATA%/ai-studio-os/` |
| macOS | `~/Library/Application Support/ai-studio-os/` |
| Linux | `~/.config/ai-studio-os/` |

Tauri's `app_data_dir()` resolves this automatically. No manual path construction.

---

## 8. State Management

### 8.1 Approach

**React Context + useReducer** — no external dependencies. The app is a single-window desktop app with one user. Redux/Zustand/Jotai would add a dependency for no benefit at this scale.

```typescript
// store/types.ts

interface AppState {
  // Navigation
  activePanel: string;

  // Projects
  projects: ProjectSummary[];
  activeProjectId: string | null;

  // Composition (Motion Graphics)
  compositions: Record<string, Composition>;
  activeCompositionId: string | null;

  // Settings
  settings: AppSettings;

  // UI
  modals: ModalStack;
  notifications: Notification[];

  // System
  logs: LogEntry[];
  renderQueue: RenderJob[];
  plugins: CreativeApp[];
}
```

### 8.2 Actions

```typescript
type AppAction =
  // Navigation
  | { type: 'NAVIGATE'; panel: string }

  // Projects
  | { type: 'PROJECTS_LOAD'; projects: ProjectSummary[] }
  | { type: 'PROJECTS_CREATE'; project: ProjectSummary }
  | { type: 'PROJECTS_DELETE'; id: string }
  | { type: 'PROJECTS_SET_ACTIVE'; id: string | null }

  // Composition
  | { type: 'COMPOSITION_CREATE'; payload: Composition }
  | { type: 'COMPOSITION_UPDATE'; id: string; patch: Partial<Composition> }
  | { type: 'COMPOSITION_DELETE'; id: string }
  | { type: 'LAYER_ADD'; compositionId: string; layer: Layer }
  | { type: 'LAYER_UPDATE'; compositionId: string; layerId: string; patch: Partial<Layer> }
  | { type: 'LAYER_DELETE'; compositionId: string; layerId: string }
  | { type: 'LAYER_REORDER'; compositionId: string; fromIndex: number; toIndex: number }
  | { type: 'KEYFRAME_ADD'; compositionId: string; layerId: string; keyframe: Keyframe }
  | { type: 'KEYFRAME_UPDATE'; compositionId: string; layerId: string; keyframe: Keyframe }
  | { type: 'KEYFRAME_DELETE'; compositionId: string; layerId: string; frame: number }

  // Settings
  | { type: 'SETTINGS_LOAD'; settings: AppSettings }
  | { type: 'SETTINGS_UPDATE'; key: string; value: unknown }

  // UI
  | { type: 'MODAL_OPEN'; modal: Modal }
  | { type: 'MODAL_CLOSE' }
  | { type: 'NOTIFICATION_ADD'; notification: Notification }
  | { type: 'NOTIFICATION_DISMISS'; id: string }

  // System
  | { type: 'LOG_ADD'; entry: LogEntry }
  | { type: 'LOG_CLEAR' }
  | { type: 'RENDER_ENQUEUE'; job: RenderJob }
  | { type: 'RENDER_UPDATE'; id: string; status: RenderStatus }
  | { type: 'PLUGINS_REGISTER'; apps: CreativeApp[] };
```

### 8.3 Reducer Slices

The root reducer composes slice reducers:

```typescript
function appReducer(state: AppState, action: AppAction): AppState {
  return {
    navigation: navigationReducer(state, action),
    projects: projectsReducer(state, action),
    composition: compositionReducer(state, action),
    settings: settingsReducer(state, action),
    ui: uiReducer(state, action),
    system: systemReducer(state, action),
  };
}
```

### 8.4 Side Effects (Middleware)

Side effects are handled by React `useEffect` in the provider, not by middleware functions:

```typescript
// In StoreProvider:
useEffect(() => {
  if (state.settings._dirty) {
    const timer = setTimeout(() => {
      invoke('save_settings', { settings: state.settings });
    }, 500);
    return () => clearTimeout(timer);
  }
}, [state.settings]);
```

For IPC calls that need to dispatch results:

```typescript
// Custom hook pattern:
function useProjects() {
  const { state, dispatch } = useStore();

  useEffect(() => {
    invoke('list_projects').then((projects) => {
      dispatch({ type: 'PROJECTS_LOAD', projects });
    });
  }, []);

  return state.projects;
}
```

### 8.5 Why Not a Library

| Library | Why Not |
|---------|---------|
| Redux | Boilerplate for a single-user desktop app, extra deps, middleware setup |
| Zustand | Nice but unnecessary — we have 1 store, 1 context, no selector memoization needs |
| Jotai | Atom granularity adds complexity for no measured win |
| React Context | Built in, sufficient for < 10k state updates/sec, no install |

**Upgrade path:** If Context becomes a bottleneck (unlikely at this scale), swap to Zustand in one file — the reducer pattern is compatible.

---

## 9. UI Architecture

### 9.1 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────────┬──────────────────────────────────────────────┐ │
│  │              │  Topbar (48px)                               │ │
│  │              │  [◉ AI Studio OS  /  Dashboard]      [🔍🔔❓]│ │
│  │   Sidebar    ├──────────────────────────────────────────────┤ │
│  │   (240px)    │                                              │ │
│  │              │  Content Area (flex: 1, scrollable)          │ │
│  │  Overview    │                                              │ │
│  │  ◉ Dashboard │  ┌────────────────────────────────────────┐  │ │
│  │  📁 Projects │  │  Panel Header                          │  │ │
│  │  📋 Templates│  │  Title + Subtitle                      │  │ │
│  │              │  ├────────────────────────────────────────┤  │ │
│  │  Library     │  │  Panel Content                         │  │ │
│  │  🎨 Theme    │  │  (grid, table, canvas, form, etc.)    │  │ │
│  │  ⚡ Animation │  │                                        │  │ │
│  │  🖼️ Assets   │  │                                        │  │ │
│  │              │  └────────────────────────────────────────┘  │ │
│  │  AI          │                                              │ │
│  │  🤖 Agents   │                                              │ │
│  │              │                                              │ │
│  │  Creative    │                                              │ │
│  │  🎬 Motion   │                                              │ │
│  │              │                                              │ │
│  │  Output      │                                              │ │
│  │  🎞️ Queue    │                                              │ │
│  │  📤 Export   │                                              │ │
│  │              │                                              │ │
│  │  System      │                                              │ │
│  │  🧩 Plugins  │                                              │ │
│  │  🔄 Updates  │                                              │ │
│  │  ⚙️ Settings │                                              │ │
│  │  ⌨️ Console  │                                              │ │
│  │              │                                              │ │
│  │  ────────────│                                              │ │
│  │  👤 Free Tier│                                              │ │
│  └──────────────┴──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Component Hierarchy

```
<App>
  ├── <StoreProvider>                    // Context provider wrapping the whole app
  │   ├── <Sidebar>                      // Navigation, reads registry for creative apps
  │   │   ├── sidebar-header
  │   │   ├── sidebar-nav
  │   │   │   ├── sidebar-section (Overview)
  │   │   │   │   ├── sidebar-item (Dashboard)
  │   │   │   │   ├── sidebar-item (Projects)
  │   │   │   │   └── sidebar-item (Templates)
  │   │   │   ├── sidebar-section (Library)
  │   │   │   ├── sidebar-section (AI)
  │   │   │   ├── sidebar-section (Creative Apps)
  │   │   │   ├── sidebar-section (Output)
  │   │   │   └── sidebar-section (System)
  │   │   └── sidebar-footer
  │   │
  │   ├── <main.main-area>
  │   │   ├── <Topbar>                   // Breadcrumb, search, notifications
  │   │   └── <div.content-area>
  │   │       └── <Panel />              // Dynamically rendered based on activePanel
  │   │           ├── <Dashboard />
  │   │           ├── <Projects />
  │   │           ├── <MotionGraphics />  // Plugin app
  │   │           └── ... (all panels)
  │   │
  │   └── <Modal />                      // Global modal overlay (portal)
  │
  └── </StoreProvider>
```

### 9.3 Panel Contract

Every panel (system or plugin) receives no props. It reads from the store via `useStore()` and dispatches actions. This keeps the panel interface zero-friction:

```typescript
// System panel
export function Settings() {
  const { state, dispatch } = useStore();
  // ... read state.settings, dispatch SETTINGS_UPDATE
}

// Plugin app (same contract)
function MotionGraphicsPanel() {
  const { state, dispatch } = useStore();
  // ... read state.compositions, dispatch COMPOSITION_CREATE
}
```

### 9.4 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0f0f11` | Main background |
| `--bg-secondary` | `#1a1a1e` | Sidebar, cards |
| `--bg-tertiary` | `#222226` | Button, input background |
| `--text-primary` | `#e8e8ed` | Primary text |
| `--text-secondary` | `#9b9ba3` | Secondary text |
| `--text-muted` | `#6b6b73` | Labels, hints |
| `--accent` | `#6c5ce7` | Primary actions, active state |
| `--border-color` | `#2a2a30` | Card, panel borders |
| `--radius-md` | `8px` | Card border radius |
| `--sidebar-width` | `240px` | Sidebar width |
| `--topbar-height` | `48px` | Top bar height |

---

## 10. Performance Strategy

### 10.1 Rendering

| Technique | When |
|-----------|------|
| **Canvas 2D** | Default renderer — sufficient for 2D layers, shapes, text |
| **OffscreenCanvas** | Render layers in parallel web workers (future) |
| **Dirty rects** | Only re-paint layers that changed since last frame |
| **Resolution scaling** | `canvasResolution` setting (0.5–2.0) for performance/quality tradeoff |
| **RAF throttling** | Match display refresh rate, skip frames when tab is backgrounded |

### 10.2 State

| Technique | When |
|-----------|------|
| **Immer-style updates** | Use spread operators, not mutation — React relies on reference equality |
| **Debounced saves** | 500ms debounce on settings and project autosave |
| **Lazy reducers** | Composition reducer only runs when Motion Graphics panel is active |
| **Memoized selectors** | `useMemo` for derived data (e.g., filtered keyframes at current frame) |

### 10.3 Plugins

| Technique | When |
|-----------|------|
| **Lazy loading** | Plugin components are `React.lazy()` — only loaded when navigated to |
| **Code splitting** | Vite automatically splits each plugin into its own chunk |
| **Webview isolation** | Untrusted plugins run in separate webview (no UI thread blocking) |

### 10.4 File System

| Technique | When |
|-----------|------|
| **Thumbnail cache** | Generate thumbnails on import, cache in `config/cache/` |
| **Virtual scrolling** | Asset library with 1000+ files — only render visible rows |
| **Streaming reads** | Large video files read in chunks, not loaded entirely into memory |

### 10.5 Startup

| Phase | Target | Strategy |
|-------|--------|----------|
| Cold start | < 1s to interactive | Vite code splitting, lazy panels, deferred IPC |
| Plugin load | < 100ms | Static imports are fast; dynamic imports use preload hints |
| First render | < 500ms | Dashboard is lightweight, no heavy computation |

---

## 11. Security Considerations

### 11.1 Threat Model

| Threat | Severity | Mitigation |
|--------|----------|------------|
| Malicious plugin exfiltrates files | High | Webview isolation, permission system |
| XSS via imported asset metadata | Medium | Sanitize metadata on import, CSP headers |
| Arbitrary file read via IPC | Medium | Validate all paths in Rust commands, no directory traversal |
| Renderer crash from malformed composition | Low | Input validation on composition load, try/catch in render loop |
| Network exfiltration by plugin | Medium | CSP restricts fetch targets; user approves network access per plugin |

### 11.2 Plugin Isolation

```
┌──────────────────────────────────────────────────┐
│  Main Webview (core)                             │
│  ┌────────────────┐  ┌────────────────────────┐  │
│  │ Sidebar        │  │ Plugin Panel (canvas)  │  │
│  │ Topbar         │  │ (trusted, same context) │  │
│  │ System Panels  │  └────────────────────────┘  │
│  └────────────────┘                               │
│         │ IPC (invoke)                            │
│         ▼                                         │
│  ┌────────────────┐                               │
│  │ Tauri Backend  │                               │
│  │ (Rust)         │                               │
│  └────────────────┘                               │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  Plugin Webview (isolated, future)               │
│  ┌──────────────────────────────────────────────┐│
│  │ preload.js (limited API surface)             ││
│  │  - pluginApi.render(composition)             ││
│  │  - pluginApi.onFrame(callback)               ││
│  │  - pluginApi.emit(event, data)               ││
│  │  - NO window.fetch, NO invoke, NO localStorage││
│  └──────────────────────────────────────────────┘│
│         │ postMessage (serialized, validated)     │
│         ▼                                         │
│  ┌────────────────┐                               │
│  │ Core Webview   │  (validates, forwards)        │
│  └────────────────┘                               │
└──────────────────────────────────────────────────┘
```

### 11.3 IPC Security

- **All file paths** are canonicalized in Rust before any I/O — strip `..`, reject absolute paths that escape `config/`.
- **No `shell` commands** pass user-controlled strings — use typed arguments.
- **Plugin installs** verify checksum against a manifest signature (future).
- **Capabilities** are declared in `tauri.conf.json` — only what the app needs.

### 11.4 CSP (Content Security Policy)

```json
{
  "security": {
    "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' http://localhost:*;"
  }
}
```

- `'unsafe-inline'` for styles — required by styled components and CSS-in-JS.
- `connect-src` allows localhost for AI provider connections (Ollama, etc.).
- No `eval()` — TypeScript compiles away any eval usage.

---

## 12. Future Roadmap

### Phase 1: Core Platform & App Store
- [x] Plugin system with CreativeApp interface
- [x] Registry, types, app scaffold
- [x] OS Home Screen (app launcher, recent activity)
- [x] App Store (discover, install, manage creative apps)
- [x] Publishing pipeline (cross-app export)
- [x] Analytics (cross-app usage & performance data)
- [ ] Canvas rendering engine with composition/timeline/layers
- [ ] Keyframe interpolation (linear, ease, bezier)
- [ ] Playhead scrubbing and transport controls
- [ ] Layer CRUD (add, delete, reorder, properties panel)
- [ ] Simple shape layers (rectangle, ellipse, text)
- [ ] Project save/load via Tauri IPC

### Phase 2: IPC Backend & State
- [ ] Settings persistence (read/write settings.json)
- [ ] Project CRUD (list, create, delete, open)
- [ ] File system commands (browse, import, delete assets)
- [ ] Asset index with metadata tagging
- [ ] Debounced autosave
- [ ] Store context with typed reducer

### Phase 3: Creative Apps
- [ ] **Motion Studio** — animations, motion graphics, keyframes (V1)
- [ ] **Video Editor** — multi-track timeline, trimming, transitions
- [ ] **Thumbnail Studio** — templates, smart crop, text overlays
- [ ] **Presentation Studio** — slide decks, transitions, speaker notes
- [ ] **Image Studio** — photo editing, filters, layers, masking
- [ ] **Publishing** — cross-app export pipeline (social, web, video)
- [ ] **Analytics** — content performance, usage insights, render benchmarks

### Phase 4: Plugin SDK & Marketplace
- [ ] Plugin manifest format finalized
- [ ] Dynamic plugin loader (drag-and-drop install)
- [ ] Plugin webview isolation for untrusted plugins
- [ ] Permission system (user-approves at install)
- [ ] Plugin API documentation
- [ ] App Store marketplace with featured/community sections

### Phase 5: Advanced Rendering & Export
- [ ] WebGL renderer for GPU-accelerated compositing
- [ ] OffscreenCanvas + worker for parallel layer rendering
- [ ] ffmpeg integration for video export (H.264, ProRes, GIF)
- [ ] Image sequence export (PNG, JPEG, WebP)
- [ ] Hardware encoding via GPU (NVENC, VideoToolbox)

### Phase 6: Collaboration & Cloud
- [ ] Project sharing (export project as .aistudio file)
- [ ] Cloud sync for settings and assets
- [ ] Team workspace (shared projects, templates)
- [ ] AI agent marketplace (community prompts, models)

---

## Appendix A: Technology Stack Summary

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| Desktop shell | Tauri | 2.x | Small binary, Rust backend, native APIs |
| UI framework | React | 19.x | Component model, ecosystem, panel-friendly |
| Language (frontend) | TypeScript | 7.x | Type safety, IDE support |
| Language (backend) | Rust | 2024 edition | Performance, safety, Tauri native |
| Build tool | Vite | 8.x | Fast HMR, code splitting, Tauri integration |
| Package manager | Bun | latest | Fast installs, native TS |
| Styling | CSS custom properties | — | Zero runtime, design tokens, themeable |
| State management | React Context + useReducer | — | Built-in, zero deps, sufficient |
| Rendering | Canvas 2D → WebGL | — | Progressive enhancement, no framework dep |
| Persistence | JSON files | — | Portable, no DB server, git-friendly |

## Appendix B: Key Metrics & Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cold start time | < 1s | Tauri window open → React interactive |
| FPS (empty composition) | 60 | requestAnimationFrame callback rate |
| FPS (50 layers, no keyframes) | 30 | Layer count stress test |
| FPS (10 layers, 100 keyframes each) | 30 | Keyframe interpolation stress test |
| Project save | < 100ms | JSON serialization + file write |
| Plugin install | < 500ms | Copy files + register in registry |
| Binary size | < 15 MB | Tauri release build |
| Memory (idle) | < 100 MB | Chrome DevTools memory snapshot |
| Memory (editing, 10 layers) | < 200 MB | Composition state + canvas buffers |