# AI Studio OS — Plugin SDK

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Studio OS Host                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Panel UI    │  │  Engine/Render│  │   Plugin Loader      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│  ┌──────┴─────────────────┴──────────────────────┴───────────┐  │
│  │                     HostAPI                               │  │
│  │  store  panels  commands  notifications  dialogs  ai      │  │
│  │  filesystem  projects  settings  locale  events  export   │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           │ injection                           │
│  ┌────────────────────────┴──────────────────────────────────┐  │
│  │                  Plugin Registry                           │  │
│  │  apps  animations  themes  templates  ai  voice  captions │  │
│  │  transitions  backgrounds  assets  renderEngines          │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           │ registration                        │
└─────────────────────────────────────────────────────────────────┘
                            │
             ┌──────────────┼──────────────────┐
             ▼              ▼                   ▼
       ┌──────────┐  ┌──────────┐      ┌──────────────┐
       │ Plugin A │  │ Plugin B │      │ Plugin C     │
       │ (builtin)│  │ (npm)    │      │ (local dir)  │
       └──────────┘  └──────────┘      └──────────────┘
```

## Extension Points

A plugin can contribute to any of these extension points:

| Extension Point   | Interface                           | What it provides                             |
|-------------------|-------------------------------------|----------------------------------------------|
| **Apps**          | `CreativeApp`                      | Full workspace mode (Motion Studio, etc.)    |
| **Animations**    | `AnimationProvider`                | Keyframe presets, procedural animations      |
| **Themes**        | `ThemeProvider`                    | Color palettes, typography, dynamic themes   |
| **Templates**     | `TemplateProvider`                 | Project templates, asset templates           |
| **AI Providers**  | `AIProvider`                       | Text, image, video generation models         |
| **Voice**         | `VoiceProvider`                    | TTS, voice cloning                           |
| **Captions**      | `CaptionEngine`                    | Transcription, translation, styling          |
| **Transitions**   | `TransitionProvider`               | Shader-based + Canvas 2D transitions         |
| **Backgrounds**   | `BackgroundProvider`               | Static, animated, procedural backgrounds     |
| **Assets**        | `AssetProvider`                    | Stock footage, music, fonts, overlays        |
| **Render Engines**| `RenderEngine`                     | Video export, GIF, image sequence            |

## How to Write a Plugin

### 1. Create a package

```json
{
  "name": "aios-plugin-my-plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "dependencies": {
    "@ai-studio-os/plugin-sdk": "^1.0.0"
  }
}
```

### 2. Export a manifest

```ts
// src/index.ts
import type { PluginManifest, HostAPI, PluginContributions } from "@ai-studio-os/plugin-sdk";

const manifest: PluginManifest = {
  id: "com.example.my-plugin",
  name: "My Plugin",
  version: "1.0.0",
  minHostVersion: "1.0.0",
  description: "Adds cool animations",
  permissions: [{ type: "ai", description: "Generate images" }],

  activate(host: HostAPI): PluginContributions {
    return {
      animations: [myAnimationProvider],
      aiProviders: [myAIProvider],
    };
  },

  deactivate() {
    // Cleanup
  },
};

export default manifest;
```

## Design Principles

1. **Everything is replaceable.** Every built-in feature is registered via the same extension point system a third-party plugin uses. The host has no special access.

2. **HostAPI is the only bridge.** Plugins never import host internals. They receive a HostAPI instance in `activate()`. This makes the host replaceable without breaking plugins.

3. **Extension points are additive maps.** Multiple plugins can contribute the same type of thing. The registry is a `Map<string, T>` — IDs are unique, last write wins.

4. **Permissions are explicit.** Plugins declare what they need (filesystem, network, AI). The host shows this at install time and can enforce it at runtime.

5. **Lifecycle is explicit.** `activate` → contributions → `onReady` → `deactivate`. No hidden side effects.

6. **No implementation in the SDK.** The SDK is pure TypeScript interfaces. Plugins provide the implementation.

## File Structure

```
src/sdk/              ← Plugin SDK (pure interfaces)
  plugin.ts           ← Core manifest & lifecycle
  app.ts              ← Creative App extension point
  animations.ts       ← Animation provider
  themes.ts           ← Theme provider
  templates.ts        ← Template provider
  ai.ts               ← AI provider
  voice.ts            ← Voice provider
  captions.ts         ← Caption engine
  transitions.ts      ← Transition provider
  backgrounds.ts      ← Background provider
  assets.ts           ← Asset provider
  rendering.ts        ← Render engine
  host.ts             ← Host API (what plugins call)
  index.ts            ← Barrel export

src/plugins/          ← Plugin system (host-side)
  registry.ts         ← Extension point registries
  loader.ts           ← Plugin discovery & lifecycle
  types.ts            ← Re-exports SDK + helpers
  builtin.ts          ← Built-in app adapter
  types.old.ts        ← Legacy AppModule interface
  apps/               ← Built-in apps
```