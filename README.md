# AI Studio OS (CreativeOS)

**An operating system for AI-powered content creation.**

AI Studio OS is a desktop application for creating motion graphics, animations, and video content with AI assistance. Built with Tauri v2, React 19, and Rust.

## Features

### 🎬 Motion Studio
- Canvas-based composition workspace with timeline, layers, and playback controls
- Keyframe animation with 5 easing functions + cubic bezier
- Shape rendering (rect, ellipse, triangle, star) + text
- MP4, GIF, and PNG sequence export via FFmpeg

### 🧩 16 Built-in Panels
| Panel | What it does |
|-------|-------------|
| Dashboard | Home screen with quick actions |
| Projects | Create, open, delete projects |
| Templates | 8 pre-built templates (YouTube Intro, Instagram Story, etc.) |
| Theme Library | 6 theme presets (dark, light, neon, pastel, corporate, vintage) |
| Animation Library | 15+ reusable motion components with preview |
| Asset Library | Browse images, video, audio, fonts with drag-and-drop |
| Prompt Library | Save and organize AI prompts by category |
| AI Agents | Chat with Motion Assistant, Script Writer, Color Pro |
| Settings | AI provider config, autosave, theme, language |
| Render Queue | Track render progress |
| Export Manager | Export to MP4, GIF, PNG sequence |
| Plugin Manager | Enable/disable installed plugins |
| App Store | Discover and install creative apps |
| Update Manager | Check for updates via GitHub releases |
| Console | View logs and hot-reload events |
| Analytics | Usage insights and render benchmarks |

### 🤖 AI Integration
- OpenAI-compatible API client (works with Ollama, OpenAI, OpenRouter, Anthropic)
- 3 built-in AI agents with system prompts
- Prompt library for reusable generation templates

### 🎨 Plugin System
- SDK with 14 extension points (animation, voice, caption, background, transition providers)
- Plugin registry with hot-reload support
- Hot-reload for plugin development

### ⚡ Performance
- Rust backend for headless rendering and export
- Rust headless renderer (shape-only compositions)
- Canvas 2D renderer for real-time preview
- Auto-save with configurable interval

## Quick Start

```bash
# Install dependencies
bun install

# Run in browser (dev mode)
bun run dev

# Run as Tauri desktop app
bun run tauri:dev

# Build for production
bun run tauri:build
```

### Prerequisites

- **Bun** — JavaScript runtime
- **Rust** — for the Tauri backend
- **FFmpeg** — for video/GIF export (must be in PATH)
- **Tauri CLI** — installed via `bun run tauri`

## Build Output

The production build produces:
- `src-tauri/target/release/bundle/msi/AI Studio OS_0.1.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/AI Studio OS_0.1.0_x64-setup.exe`

## Project Structure

```
ai-studio-os/
├── src/                    # React frontend
│   ├── components/         # UI components (Canvas, Timeline, Sidebar, etc.)
│   ├── panels/             # 16 panel components
│   ├── engine/             # Composition, keyframes, renderer, DnD
│   ├── templates/          # Template engine + built-in templates
│   ├── motion/             # Motion component registry
│   ├── ai/                 # AI client (OpenAI-compatible)
│   ├── plugins/            # Plugin system (registry, loader, hot-reload)
│   ├── shortcuts/          # Keyboard shortcut system
│   ├── store/              # State management (React context + reducer)
│   ├── ipc/                # Tauri IPC wrappers
│   ├── autosave/           # Auto-save manager
│   └── sdk/                # Plugin SDK type definitions
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Tauri app + all IPC commands
│   │   ├── render.rs       # Rendering pipeline (headless + FFmpeg)
│   │   └── commands/       # IPC command modules
│   └── tauri.conf.json     # Tauri configuration
├── templates/              # User template storage
├── projects/               # User project storage
├── plugins/                # User plugin directory
└── themes/                 # User theme directory
```

## Architecture

See [SYSTEM-DESIGN.md](./SYSTEM-DESIGN.md) and [STORAGE-ARCHITECTURE.md](./STORAGE-ARCHITECTURE.md) for detailed design documentation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8 |
| Desktop | Tauri v2 |
| Backend | Rust (serde, image, imageproc, tempfile) |
| Rendering | Canvas 2D API (frontend), image-rs (headless) |
| Export | FFmpeg (MP4, GIF, PNG sequence) |
| AI | OpenAI-compatible API (Ollama, OpenAI, OpenRouter) |
| Package | Bun |

## License

MIT