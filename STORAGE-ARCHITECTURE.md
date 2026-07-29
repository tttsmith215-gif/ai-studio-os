# AI Studio OS — Storage Architecture

> **Version:** 1.0.0
> **Status:** Final
> **Design Principle:** *Every asset has one permanent home. No file is orphaned.*

---

## Table of Contents

1. [Root Location](#1-root-location)
2. [Directory Tree](#2-directory-tree)
3. [Asset Type Reference](#3-asset-type-reference)
4. [Project Package Format](#4-project-package-format)
5. [Lifecycle Policies](#5-lifecycle-policies)
6. [Path Resolution (Rust)](#6-path-resolution-rust)
7. [Migration & Compatibility](#7-migration--compatibility)

---

## 1. Root Location

The root data directory is resolved by **Tauri's `app_data_dir()`** — never hardcoded:

| Platform | Path |
|----------|------|
| **Windows** | `%APPDATA%/ai-studio-os/` → `C:\Users\<user>\AppData\Roaming\ai-studio-os\` |
| **macOS** | `~/Library/Application Support/ai-studio-os/` |
| **Linux** | `~/.config/ai-studio-os/` |

> **Environment variable override:** `AI_STUDIO_OS_HOME` forces a custom root.
> **Portable mode:** A `.portable` file next to the binary uses `./ai-studio-data/` relative to the executable.

All paths below are relative to this root unless prefixed with `~/`.

---

## 2. Directory Tree

```
ai-studio-os/
│
├── projects/                          # ← All user projects (one folder per project)
│   ├── 8a3f7c2e-.../                  #   Project UUID folder
│   │   ├── project.json               #     Manifest: name, app, created, thumbnail, settings
│   │   ├── preview.png                #     Thumbnail (256×144, regenerated on save)
│   │   ├── script.aistudio            #     Composition data (layers, keyframes, timeline)
│   │   ├── assets/                    #     Project-local assets (imported files)
│   │   │   ├── images/                #       Raster files used in this project
│   │   │   ├── videos/                #       Video clips used in this project
│   │   │   ├── audio/                 #       Sound files used in this project
│   │   │   └── models/                #       3D/ML models used in this project
│   │   ├── autosave/                  #     Auto-recovery snapshots
│   │   │   ├── 2026-07-29T10-00-00Z.aistudio
│   │   │   └── 2026-07-29T10-05-00Z.aistudio
│   │   └── versions/                  #     Manual version snapshots
│   │       ├── v1/                    #       Version 1
│   │       │   ├── script.aistudio
│   │       │   └── preview.png
│   │       └── v2/
│   │           ├── script.aistudio
│   │           └── preview.png
│   │
│   ├── 9d1e5f3a-.../
│   │   └── ...
│   │
│   └── index.json                     # Project index (name, lastOpened, thumbnail path)
│
├── templates/                         # ← Reusable project templates & presets
│   ├── projects/                      #     Full project templates (like Blender startup files)
│   │   ├── blank-1080p.aistudio       #       1920×1080 empty composition
│   │   ├── blank-4k.aistudio          #       3840×2160 empty composition
│   │   ├── social-instagram.aistudio  #       1080×1080, reel-ready
│   │   ├── social-tiktok.aistudio     #       1080×1920, vertical
│   │   ├── social-youtube.aistudio    #       1920×1080, with intro/outro placeholders
│   │   └── social-twitter.aistudio    #       1200×675, 16:9
│   │
│   ├── animations/                    #     Animation presets (keyframe sets, effects)
│   │   ├── text-fade-in.json
│   │   ├── text-slide-up.json
│   │   ├── scale-bounce.json
│   │   ├── spin-reveal.json
│   │   ├── glitch-effect.json
│   │   └── parallax-scroll.json
│   │
│   ├── themes/                        #     Visual theme presets (color, typography, spacing)
│   │   ├── dark-neon.json             #       Dark + cyan/purple accent
│   │   ├── dark-corporate.json        #       Dark + blue/gray accent
│   │   ├── light-clean.json           #       White + subtle gray
│   │   ├── light-creative.json        #       White + vibrant accent
│   │   ├── retro-vaporwave.json       #       Neon gradients, purple/pink
│   │   └── minimal-mono.json          #       Monochrome, no accent
│   │
│   ├── layouts/                       #     Panel layout presets
│   │   ├── default.json               #       Standard layout
│   │   ├── motion.json                #       Timeline-focused layout
│   │   ├── video.json                 #       Dual-monitor video editing layout
│   │   ├── image.json                 #       Toolbar-heavy image editing layout
│   │   └── minimal.json               #       Fullscreen canvas, no panels
│   │
│   └── icons/                         #     Icon sets (installed or imported)
│       ├── material-icons/            #       Material Design Icons
│       │   ├── manifest.json
│       │   └── icons/
│       ├── lucide-icons/
│       │   ├── manifest.json
│       │   └── icons/
│       └── custom/                    #       User-imported icon packs
│
├── assets/                            # ← Global asset library (shared across projects)
│   ├── images/                        #     Raster and vector images
│   │   ├── imported/                  #       User-imported images
│   │   │   ├── 2026/                  #         Organized by year
│   │   │   │   ├── 07/                #           Organized by month
│   │   │   │   │   ├── photo-001.png
│   │   │   │   │   └── photo-002.jpg
│   │   │   │   └── ...
│   │   │   └── ...
│   │   ├── textures/                  #       Procedural textures, noise, gradients
│   │   │   ├── noise-grain.png
│   │   │   ├── grid-overlay.png
│   │   │   └── vignette.png
│   │   └── references/                #       Reference images (mood boards, storyboards)
│   │
│   ├── videos/                        #     Video footage & clips
│   │   ├── imported/                  #       User-imported videos
│   │   │   ├── 2026/
│   │   │   │   └── 07/
│   │   │   │       ├── clip-001.mp4
│   │   │   │       └── clip-002.mov
│   │   │   └── ...
│   │   ├── stock/                     #       Stock footage (free, bundled)
│   │   │   ├── abstract/
│   │   │   ├── nature/
│   │   │   └── urban/
│   │   └── proxies/                   #       Low-res proxy files for editing
│   │       ├── 480p/
│   │       └── 720p/
│   │
│   ├── audio/                         #     All audio files (music, SFX, voice, recordings)
│   │   ├── music/                     #       Background music tracks
│   │   │   ├── imported/
│   │   │   │   ├── 2026/
│   │   │   │   │   └── track-001.mp3
│   │   │   │   └── ...
│   │   │   ├── stock/                 #       Royalty-free loops
│   │   │   │   ├── cinematic/
│   │   │   │   ├── upbeat/
│   │   │   │   └── ambient/
│   │   │   └── generated/             #       AI-generated music (local or via API)
│   │   │       ├── 2026-07-29_ambient-01.wav
│   │   │       └── ...
│   │   │
│   │   ├── voices/                    #       Voiceovers, narration, AI speech
│   │   │   ├── recordings/            #         User-recorded voiceovers
│   │   │   │   ├── 2026/
│   │   │   │   │   └── voiceover-001.wav
│   │   │   │   └── ...
│   │   │   ├── ai-generated/          #         TTS output from AI agents
│   │   │   │   ├── 2026/
│   │   │   │   │   └── tts-narration-001.wav
│   │   │   │   └── ...
│   │   │   └── cloned/                #         Voice clone data (reference audio, embeddings)
│   │   │       ├── my-voice/          #           One folder per voice profile
│   │   │       │   ├── profile.json   #             Name, gender, sample rate
│   │   │       │   ├── reference.wav  #             Reference recording
│   │   │       │   └── embedding.bin  #             Voice embedding vector
│   │   │       └── ...
│   │   │
│   │   └── sfx/                       #       Sound effects
│   │       ├── imported/
│   │       ├── stock/
│   │       │   ├── whoosh/
│   │       │   ├── click/
│   │       │   ├── impact/
│   │       │   └── transition/
│   │       └── generated/
│   │
│   ├── fonts/                         #     Font files (shared across projects)
│   │   ├── system/                    #       Bundled fonts (Inter, JetBrains Mono)
│   │   │   ├── Inter-Regular.ttf
│   │   │   ├── Inter-Bold.ttf
│   │   │   └── JetBrainsMono-Regular.ttf
│   │   ├── google/                    #       Google Fonts (downloaded on demand)
│   │   └── custom/                    #       User-imported fonts
│   │
│   ├── models/                        #     AI/ML models
│   │   ├── llm/                       #       Large language models
│   │   │   ├── llama-3.2-3b/         #         One folder per model variant
│   │   │   │   ├── model.bin
│   │   │   │   ├── tokenizer.json
│   │   │   │   └── manifest.json
│   │   │   ├── mistral-7b/
│   │   │   └── phi-3-mini/
│   │   ├── diffusion/                 #       Image generation models
│   │   │   ├── sdxl-turbo/
│   │   │   ├── sd3.5-medium/
│   │   │   └── flux-schnell/
│   │   ├── voice/                     #       Voice cloning/synthesis models
│   │   │   ├── xtts-v2/
│   │   │   └── bark/
│   │   ├── vision/                    #       Vision models (OCR, segmentation)
│   │   │   ├── florence-2/
│   │   │   └── sam2/
│   │   └── embedding/                 #       Embedding models (RAG, search)
│   │       ├── nomic-embed-text/
│   │       └── all-minilm/
│   │
│   ├── 3d/                            #     3D models & assets
│   │   ├── imported/
│   │   │   ├── 2026/
│   │   │   │   └── model-001.glb
│   │   │   └── ...
│   │   ├── stock/                     #       Bundled 3D primitives
│   │   │   ├── cube.glb
│   │   │   ├── sphere.glb
│   │   │   ├── cylinder.glb
│   │   │   └── plane.glb
│   │   └── hdri/                      #       Environment maps
│   │       ├── studio.exr
│   │       ├── sunset.exr
│   │       └── park.exr
│   │
│   └── icons/                         #     UI icons (application-wide)
│       ├── built-in/                  #       Core application icons (never deleted)
│       │   ├── 16x16/
│       │   ├── 24x24/
│       │   ├── 32x32/
│       │   └── svg/                   #       Vector source files
│       ├── plugin/                    #       Icons from installed plugins
│       │   └── motion-graphics/
│       │       └── icon.svg
│       └── packs/                     #       Icon packs (swapable)
│           ├── material/
│           └── lucide/
│
├── exports/                           # ← Rendered output files
│   ├── videos/                        #     Video exports
│   │   ├── 2026/                      #       Organized by year
│   │   │   ├── 07/                    #         Organized by month
│   │   │   │   ├── My Project_1080p_H264.mp4
│   │   │   │   ├── My Project_4K_ProRes.mov
│   │   │   │   └── My Project_optimized.gif
│   │   │   └── ...
│   │   └── .export-meta/             #       Export metadata (settings used, duration)
│   │       └── My Project_1080p_H264.mp4.json
│   │
│   ├── images/                        #     Image exports (frames, thumbnails, stills)
│   │   ├── 2026/
│   │   │   └── 07/
│   │   │       ├── frame-001.png
│   │   │       ├── frame-002.png
│   │   │       └── thumbnail.png
│   │   └── .export-meta/
│   │
│   ├── audio/                         #     Audio exports
│   │   ├── 2026/
│   │   │   └── 07/
│   │   │       ├── mixdown.wav
│   │   │       └── mixdown.mp3
│   │   └── .export-meta/
│   │
│   ├── packages/                      #     Shareable project packages (.aistudio)
│   │   ├── 2026/
│   │   │   └── 07/
│   │   │       └── My Project v1.0.aistudio
│   │   └── .export-meta/
│   │
│   └── batch/                         #     Batch export jobs (render queue)
│       ├── 2026-07-29_1700/           #       One folder per batch job
│       │   ├── manifest.json          #         Job config (source, format, preset)
│       │   ├── progress.json          #         Frame-by-frame progress
│       │   ├── output-001.png
│       │   ├── output-002.png
│       │   └── ...
│       └── ...
│
├── plugins/                           # ← Installed plugins & extensions
│   ├── built-in/                      #     First-party plugins (bundled, read-only)
│   │   ├── motion-graphics/
│   │   │   ├── manifest.json
│   │   │   ├── index.js
│   │   │   ├── icon.svg
│   │   │   └── assets/
│   │   └── thumbnail-studio/
│   │
│   ├── user/                          #     User-installed plugins
│   │   ├── video-editor/              #       One folder per plugin
│   │   │   ├── manifest.json          #       id, name, version, permissions, entry
│   │   │   ├── index.js               #       Plugin code
│   │   │   ├── icon.svg
│   │   │   ├── styles/                #       Plugin-specific styles
│   │   │   │   └── main.css
│   │   │   └── assets/                #       Plugin assets (images, fonts, etc.)
│   │   │       ├── toolbar-icons/
│   │   │       └── splash.png
│   │   └── presentation-studio/
│   │
│   └── disabled/                      #     Installed but disabled plugins
│       └── old-plugin/
│           ├── manifest.json
│           └── index.js
│
├── themes/                            # ← UI theme files
│   ├── built-in/                      #     Bundled themes (read-only)
│   │   ├── dark.json
│   │   ├── light.json
│   │   └── high-contrast.json
│   ├── user/                          #     User-created or imported themes
│   │   ├── my-custom-theme.json
│   │   └── community-synthwave.json
│   └── active.lnk                     #     Symlink to the active theme (JSON)
│
├── icons/                             # ← Application icons (all sizes, all platforms)
│   ├── 32x32.png
│   ├── 128x128.png
│   ├── 128x128@2x.png
│   ├── icon.icns                      #     macOS
│   ├── icon.ico                       #     Windows
│   └── icon.svg                       #     Vector source
│
├── settings/                          # ← User configuration
│   ├── user.json                      #     User profile (name, avatar, preferences)
│   ├── prefs.json                     #     Application preferences (theme, language, hotkeys)
│   ├── keybinds.json                  #     Keyboard shortcut overrides
│   ├── workspace.json                 #     Panel layout, dock positions, window size
│   ├── providers.json                 #     AI provider configs (Ollama, OpenAI, etc.)
│   ├── plugins.json                   #     Plugin enable/disable state, per-plugin config
│   ├── export-presets.json            #     Saved export presets (format, codec, bitrate)
│   └── recent-files.json              #     Recently opened projects (max 20, MRU order)
│
├── logs/                              # ← System & application logs
│   ├── app.log                        #     Main application log (rotating, 10MB max)
│   ├── app.log.1                      #     Rotated logs
│   ├── app.log.2
│   ├── engine.log                     #     Rendering engine log
│   ├── plugin.log                     #     Plugin loading & runtime log
│   ├── crash/                         #     Crash reports
│   │   ├── 2026-07-29T10-00-00Z.dmp
│   │   ├── 2026-07-29T10-00-00Z.json
│   │   └── ...
│   └── diagnostics/                   #     System diagnostics (generated on demand)
│       ├── system-info.json           #       OS, GPU, RAM, disk space
│       └── gpu-capabilities.json      #       WebGL/Vulkan support
│
├── cache/                             # ← Temporary/rebuildable data
│   ├── thumbnails/                    #     Project and asset thumbnails
│   │   ├── projects/                  #       Project preview thumbnails
│   │   │   ├── 8a3f7c2e/             #         One folder per project UUID
│   │   │   │   ├── thumb-256.png
│   │   │   │   └── thumb-64.png
│   │   │   └── ...
│   │   ├── assets/                    #       Asset thumbnails
│   │   │   ├── images/
│   │   │   ├── videos/
│   │   │   └── models/
│   │   └── fonts/                     #       Font preview thumbnails
│   │
│   ├── render/                        #     Render cache (frames, precomps, proxies)
│   │   ├── disk-cache/                #       Disk-based frame cache (for scrubbing)
│   │   │   ├── 8a3f7c2e/             #         Per-project cache
│   │   │   │   ├── frame-0001.png
│   │   │   │   ├── frame-0002.png
│   │   │   │   └── ...
│   │   │   └── ...
│   │   └── ram-cache/                 #       In-memory frame cache (configurable limit)
│   │
│   ├── fonts/                         #     Font rendering cache (sdf, atlas)
│   │   ├── atlas/
│   │   └── sdf/
│   │
│   ├── models/                        #     Model cache (quantized, optimized, shader cache)
│   │   ├── llm/
│   │   │   └── llama-3.2-3b/
│   │   │       └── compiled/
│   │   ├── diffusion/
│   │   │   └── sdxl-turbo/
│   │   │       └── vae-encoded/
│   │   └── shaders/
│   │
│   ├── icons/                         #     Icon cache (resized, themed variants)
│   │   ├── 16x16/
│   │   ├── 24x24/
│   │   └── 32x32/
│   │
│   ├── temp/                          #     Temporary files (cleaned on exit)
│   │   ├── downloads/                 #       In-progress downloads
│   │   ├── uploads/                   #       In-progress uploads
│   │   └── processing/                #       Temporary processing files
│   │
│   └── index.json                     #     Cache manifest (sizes, timestamps, TTLs)
│
├── backups/                           # ← User-initiated backups
│   ├── full/                          #     Full application backups
│   │   ├── 2026-07-29/               #       One folder per backup date
│   │   │   ├── backup.manifest        #       Contents list, checksums
│   │   │   ├── settings/
│   │   │   ├── projects/
│   │   │   ├── assets/
│   │   │   ├── plugins/
│   │   │   └── themes/
│   │   └── ...
│   │
│   └── incremental/                   #     Incremental backups (only changed files)
│       ├── 2026-07-28/
│       ├── 2026-07-29/
│       └── index.json                 #     Backup chain (full → incremental mapping)
│
├── versioning/                        # ← Project version history (global index)
│   ├── 8a3f7c2e-.../                  #     Per-project version store
│   │   ├── v1/                        #       Version 1
│   │   │   ├── project.json
│   │   │   ├── script.aistudio
│   │   │   └── preview.png
│   │   ├── v2/
│   │   │   ├── project.json
│   │   │   ├── script.aistudio
│   │   │   └── preview.png
│   │   ├── v3/
│   │   │   └── ...
│   │   └── index.json                 #       Version metadata (timestamp, message, author)
│   │
│   ├── 9d1e5f3a-.../
│   │   └── ...
│   │
│   └── global-index.json              #     All projects' version counts & latest timestamps
│
├── autosaves/                         # ← Auto-recovery saves (global, cross-project)
│   ├── 8a3f7c2e-.../                  #     Per-project autosave history
│   │   ├── 2026-07-29T10-00-00Z.aistudio
│   │   ├── 2026-07-29T10-05-00Z.aistudio
│   │   ├── 2026-07-29T10-10-00Z.aistudio
│   │   └── index.json                 #       Autosave timeline
│   │
│   └── quicksaves/                    #     Unsaved-project recovery (crash recovery)
│       ├── unsaved-001.aistudio
│       └── unsaved-002.aistudio
│
├── user/                              # ← User profiles & identity
│   ├── profiles/                      #     Multi-user support (future)
│   │   ├── default/                   #       Default local profile
│   │   │   ├── profile.json           #         Name, avatar, preferences
│   │   │   ├── avatar.png
│   │   │   └── workspace.json         #         Panel layout, saved workspaces
│   │   └── guest/
│   │
│   ├── keys/                          #     API keys, license files, tokens
│   │   ├── openai.key                 #       Encrypted at rest
│   │   ├── elevenlabs.key
│   │   └── github.token
│   │
│   └── data/                          #     User-generated data (not project-specific)
│       ├── prompts/                   #       Saved AI prompts
│       │   ├── image-generation/
│       │   │   ├── cinematic-portrait.txt
│       │   │   └── product-shot.txt
│       │   ├── video-generation/
│       │   └── music-generation/
│       │
│       ├── presets/                   #       User save presets
│       │   ├── effects/
│       │   ├── transitions/
│       │   └── color-grades/
│       │
│       ├── scripts/                   #       User scripts (Python, JS automation)
│       │   ├── batch-export.js
│       │   └── watermark.py
│       │
│       └── notes/                     #       Project notes, markdown files
│           ├── 8a3f7c2e/              #         Per-project notes
│           │   └── notes.md
│           └── ...
│
├── agents/                            # ← AI agent configurations
│   ├── built-in/                      #     Bundled AI agents
│   │   ├── assistant/                 #       General creative assistant
│   │   │   ├── agent.json             #         System prompt, model, temperature
│   │   │   └── tools.json             #         Tool permissions
│   │   ├── copywriter/                #       Text generation specialist
│   │   └── storyboarder/              #       Visual planning agent
│   │
│   ├── user/                          #     User-created AI agents
│   │   ├── my-brand-agent/
│   │   │   ├── agent.json
│   │   │   ├── knowledge/
│   │   │   │   ├── brand-guide.pdf
│   │   │   │   └── style-guide.md
│   │   │   └── tools.json
│   │   └── thumbnail-expert/
│   │
│   └── marketplace/                   #     Downloaded community agents
│
├── analytics/                         # ← Usage data & metrics
│   ├── usage.json                     #     Feature usage counters
│   ├── performance.json               #     Render time, FPS, memory benchmarks
│   ├── errors.json                    #     Error frequency (anonymized)
│   └── opt-out                        #     File exists = analytics disabled
│
├── .trash/                            # ← Deleted items (recoverable)
│   ├── 2026-07-29/                    #     Organized by deletion date
│   │   ├── project-8a3f7c2e/
│   │   └── asset-photo-001.png
│   └── index.json                     #     Trash manifest (original paths, deletion dates)
│
├── .lock                              # Single-instance lock file
├── .schema-version                    # Storage schema version (for migrations)
└── .portable                          # Present = portable mode active
```

---

## 3. Asset Type Reference

Every asset type has a **canonical storage location**, a **naming convention**, and a **lifecycle policy**.

### 3.1 Projects

| Attribute | Value |
|-----------|-------|
| **Location** | `projects/{uuid}/` |
| **Format** | One folder per project, UUID folder name |
| **Manifest** | `project.json` — name, app, created, thumbnail, settings |
| **Data** | `script.aistudio` — composition data (JSON) |
| **Thumbnail** | `preview.png` — 256×144, auto-generated |
| **Lifecycle** | Created by user, deleted by user (moved to `.trash/`) |
| **Index** | `projects/index.json` — fast lookup without scanning |

### 3.2 Templates

| Attribute | Value |
|-----------|-------|
| **Location** | `templates/` (subdirectories by type) |
| **Types** | `projects/`, `animations/`, `themes/`, `layouts/`, `icons/` |
| **Format** | `.aistudio` for project templates, `.json` for presets |
| **Lifecycle** | Bundled with app, user can add/remove |
| **Origin** | `built-in/` subfolder for bundled, user-created go in root |

### 3.3 Animations

| Attribute | Value |
|-----------|-------|
| **Location** | `templates/animations/` |
| **Format** | JSON — keyframe sets, effect chains, easing curves |
| **Examples** | `text-fade-in.json`, `scale-bounce.json`, `glitch-effect.json` |
| **Lifecycle** | Bundled presets + user-created |

### 3.4 Themes

| Attribute | Value |
|-----------|-------|
| **Location** | `themes/built-in/` and `themes/user/` |
| **Format** | JSON — color tokens, typography, spacing, border radii |
| **Active** | `themes/active.lnk` — symlink to current theme |
| **Lifecycle** | Built-in are read-only, user can add/delete custom |

### 3.5 Icons

| Attribute | Value |
|-----------|-------|
| **Location** | `assets/icons/` (global), `templates/icons/` (packs) |
| **Sizes** | `16x16/`, `24x24/`, `32x32/`, `svg/` |
| **Built-in** | `assets/icons/built-in/` — core icons, never deleted |
| **Plugin** | `assets/icons/plugin/{plugin-id}/` — per-plugin icons |
| **Packs** | `templates/icons/{pack-name}/` — swapable icon sets |

### 3.6 Images

| Attribute | Value |
|-----------|-------|
| **Location** | `assets/images/` |
| **Subdirectories** | `imported/`, `textures/`, `references/` |
| **Organization** | `imported/YYYY/MM/` — date-based to prevent one giant folder |
| **Formats** | PNG, JPEG, WebP, SVG, GIF, BMP, TIFF |
| **Lifecycle** | Imported by user, deleted by user (moved to `.trash/`) |

### 3.7 Videos

| Attribute | Value |
|-----------|-------|
| **Location** | `assets/videos/` |
| **Subdirectories** | `imported/`, `stock/`, `proxies/` |
| **Organization** | Same date-based scheme as images |
| **Proxies** | `proxies/480p/`, `proxies/720p/` — auto-generated on import |
| **Formats** | MP4, MOV, AVI, WebM, MKV, ProRes |
| **Lifecycle** | Imported by user, proxies are cache (rebuilt on demand) |

### 3.8 Audio

| Attribute | Value |
|-----------|-------|
| **Location** | `assets/audio/` |
| **Subdirectories** | `music/`, `voices/`, `sfx/` |
| **Music** | `music/imported/`, `music/stock/`, `music/generated/` |
| **Voices** | `voices/recordings/`, `voices/ai-generated/`, `voices/cloned/` |
| **SFX** | `sfx/imported/`, `sfx/stock/`, `sfx/generated/` |
| **Formats** | WAV, MP3, FLAC, OGG, M4A, AAC |
| **Voice clones** | One folder per voice, with `profile.json`, `reference.wav`, `embedding.bin` |

### 3.9 Models

| Attribute | Value |
|-----------|-------|
| **Location** | `assets/models/` |
| **Subdirectories** | `llm/`, `diffusion/`, `voice/`, `vision/`, `embedding/` |
| **Format** | One folder per model variant, with `model.bin`, `tokenizer.json`, `manifest.json` |
| **Lifecycle** | Downloaded by user, deleted by user |
| **Cache** | `cache/models/` — compiled/optimized variants |

### 3.10 Plugins

| Attribute | Value |
|-----------|-------|
| **Location** | `plugins/` |
| **Subdirectories** | `built-in/`, `user/`, `disabled/` |
| **Manifest** | `manifest.json` — id, name, version, permissions, entry |
| **Entry** | `index.js` — plugin code |
| **Lifecycle** | Installed by user, disabled (moved to `disabled/`), uninstalled (deleted) |

### 3.11 Settings

| Attribute | Value |
|-----------|-------|
| **Location** | `settings/` |
| **Files** | `user.json`, `prefs.json`, `keybinds.json`, `workspace.json`, `providers.json`, `plugins.json`, `export-presets.json`, `recent-files.json` |
| **Format** | JSON, all files are human-readable and hand-editable |
| **Lifecycle** | Written by app, can be edited by user |
| **Migration** | `.schema-version` file triggers migration on upgrade |

### 3.12 Logs

| Attribute | Value |
|-----------|-------|
| **Location** | `logs/` |
| **Files** | `app.log`, `engine.log`, `plugin.log` |
| **Rotation** | 10MB max per file, 3 backups (`app.log.1`, `app.log.2`) |
| **Crash reports** | `logs/crash/` — `.dmp` + `.json` per crash |
| **Diagnostics** | `logs/diagnostics/` — system info, GPU capabilities |

### 3.13 Caches

| Attribute | Value |
|-----------|-------|
| **Location** | `cache/` |
| **Subdirectories** | `thumbnails/`, `render/`, `fonts/`, `models/`, `icons/`, `temp/` |
| **Policy** | All cache is rebuildable. User can purge via Settings → Clear Cache |
| **TTL** | Thumbnails: 30 days since last access. Render cache: 7 days. Temp: deleted on exit |

### 3.14 Exports

| Attribute | Value |
|-----------|-------|
| **Location** | `exports/` |
| **Subdirectories** | `videos/`, `images/`, `audio/`, `packages/`, `batch/` |
| **Organization** | `exports/{type}/YYYY/MM/` — date-based, user can override |
| **Metadata** | `exports/{type}/.export-meta/` — export settings per file |
| **Batch** | `exports/batch/{job-id}/` — render queue outputs |

### 3.15 User Data

| Attribute | Value |
|-----------|-------|
| **Location** | `user/` |
| **Subdirectories** | `profiles/`, `keys/`, `data/` |
| **Data subdirs** | `data/prompts/`, `data/presets/`, `data/scripts/`, `data/notes/` |
| **Keys** | API keys stored encrypted at rest |

### 3.16 Versioning

| Attribute | Value |
|-----------|-------|
| **Location** | `versioning/{project-uuid}/` |
| **Format** | `v1/`, `v2/`, `v3/`... with full project snapshot in each |
| **Index** | `versioning/{project-uuid}/index.json` — version metadata |
| **Global** | `versioning/global-index.json` — all projects' version state |
| **Lifecycle** | User creates versions manually. Auto-cleanup after 100 versions per project. |

### 3.17 Autosaves

| Attribute | Value |
|-----------|-------|
| **Location** | `autosaves/{project-uuid}/` |
| **Format** | `{timestamp}.aistudio` — full composition snapshot |
| **Interval** | Every 5 minutes (configurable in settings) |
| **Retention** | Keep last 20 autosaves per project, delete oldest |
| **Quicksaves** | `autosaves/quicksaves/` — unsaved new projects (crash recovery) |

### 3.18 Backups

| Attribute | Value |
|-----------|-------|
| **Location** | `backups/` |
| **Full** | `backups/full/{date}/` — complete snapshot of everything |
| **Incremental** | `backups/incremental/{date}/` — only changed files since last backup |
| **Manifest** | `backup.manifest` — file list with SHA-256 checksums |
| **Schedule** | User-initiated (manual) or scheduled (future) |

---

## 4. Project Package Format

A shareable `.aistudio` file is a **ZIP archive** with a `.aistudio` extension:

```
My Project.aistudio
├── project.json              # Manifest
├── script.aistudio           # Composition data
├── preview.png               # Thumbnail
├── assets/                   # Embedded project assets
│   ├── images/
│   ├── videos/
│   └── audio/
└── .metadata/                # Export metadata
    ├── created.json          # Date, app version, OS
    └── dependencies.json     # Required plugins, fonts, models
```

This is the **portable exchange format** — drag-and-drop installable, double-click to open.

---

## 5. Lifecycle Policies

### 5.1 Retention & Cleanup

| Directory | Retention Policy | Trigger |
|-----------|-----------------|---------|
| `cache/thumbnails/` | 30 days since last access | Startup scan |
| `cache/render/` | 7 days since last access | On project close |
| `cache/temp/` | Deleted on clean exit | Shutdown |
| `autosaves/{project}/` | Last 20, oldest deleted | On new autosave |
| `logs/` | 10MB per file, 3 rotated | On write |
| `.trash/` | 30 days, then permanently deleted | Daily check |
| `versioning/{project}/` | Max 100 versions | On new version |

### 5.2 File Size Budgets

| Area | Budget | Enforcement |
|------|--------|-------------|
| Templates | 50MB | N/A (bundled + user) |
| Plugins | 500MB | Soft warning |
| Models | Unlimited | User-managed |
| Assets | Unlimited | User-managed |
| Cache | 2GB default | Configurable, auto-purge when exceeded |
| Logs | 30MB | Rotating, hard limit |

### 5.3 Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Project folders | UUID v4 | `8a3f7c2e-...` |
| Project files | kebab-case | `my-first-animation.aistudio` |
| Plugins | kebab-case | `motion-graphics` |
| Templates | kebab-case | `text-fade-in.json` |
| Theme files | kebab-case | `dark-neon.json` |
| Agent files | kebab-case | `my-brand-agent.json` |
| Date folders | `YYYY/MM/` | `2026/07/` |
| Timestamp files | ISO 8601 safe | `2026-07-29T10-00-00Z.aistudio` |
| Asset files | original name | `photo-001.png` |

---

## 6. Path Resolution (Rust)

```rust
// src-tauri/src/commands/paths.rs

use tauri::AppHandle;
use std::path::PathBuf;

/// Get the root data directory, respecting env override and portable mode.
pub fn data_root(app: &AppHandle) -> PathBuf {
    // 1. Environment variable override
    if let Ok(custom) = std::env::var("AI_STUDIO_OS_HOME") {
        return PathBuf::from(custom);
    }

    // 2. Portable mode (check for .portable file next to binary)
    let exe_dir = app.path().resource_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    if exe_dir.join(".portable").exists() {
        return exe_dir.join("ai-studio-data");
    }

    // 3. Standard platform-specific path
    app.path().app_data_dir()
        .expect("Failed to resolve app data directory")
}

/// Resolve any subpath under the data root.
pub fn resolve(app: &AppHandle, subpath: &str) -> PathBuf {
    data_root(app).join(subpath)
}

pub fn projects_dir(app: &AppHandle) -> PathBuf    { resolve(app, "projects") }
pub fn templates_dir(app: &AppHandle) -> PathBuf    { resolve(app, "templates") }
pub fn assets_dir(app: &AppHandle) -> PathBuf       { resolve(app, "assets") }
pub fn exports_dir(app: &AppHandle) -> PathBuf      { resolve(app, "exports") }
pub fn plugins_dir(app: &AppHandle) -> PathBuf      { resolve(app, "plugins") }
pub fn themes_dir(app: &AppHandle) -> PathBuf       { resolve(app, "themes") }
pub fn settings_dir(app: &AppHandle) -> PathBuf     { resolve(app, "settings") }
pub fn logs_dir(app: &AppHandle) -> PathBuf         { resolve(app, "logs") }
pub fn cache_dir(app: &AppHandle) -> PathBuf        { resolve(app, "cache") }
pub fn backups_dir(app: &AppHandle) -> PathBuf      { resolve(app, "backups") }
pub fn autosaves_dir(app: &AppHandle) -> PathBuf    { resolve(app, "autosaves") }
pub fn versioning_dir(app: &AppHandle) -> PathBuf   { resolve(app, "versioning") }
pub fn user_dir(app: &AppHandle) -> PathBuf         { resolve(app, "user") }
pub fn agents_dir(app: &AppHandle) -> PathBuf       { resolve(app, "agents") }
pub fn trash_dir(app: &AppHandle) -> PathBuf        { resolve(app, ".trash") }
```

---

## 7. Migration & Compatibility

### Schema Versioning

The file `.schema-version` at the root contains a single integer:

```
4
```

On startup, the app reads this file and compares it to the current schema version:

| Scenario | Action |
|----------|--------|
| No file | First run → write version, create all directories |
| Version matches | Normal startup |
| Version < current | Run migration script, update version |
| Version > current | Error: "Data from newer version" — abort |

### Migration Path

```
v1 → v2:  projects moved from flat files to UUID folders
v2 → v3:  assets moved from project-local to global library
v3 → v4:  settings split into individual files under settings/
v4 → v5:  (future) ...
```

### Backward Compatibility

- The app never deletes or modifies data it doesn't recognize (graceful ignore).
- Old `.aistudio` project files from v1 are still importable — the migration just copies them into the new structure.
- The `projects/index.json` file is rebuilt on first run if missing.