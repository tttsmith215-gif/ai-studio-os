// ---------------------------------------------------------------------------
// AI Studio OS — Plugin SDK: Barrel Export
// ---------------------------------------------------------------------------
// Plugins import from "@ai-studio-os/sdk" to get all types.
// ---------------------------------------------------------------------------

export type { PluginManifest, PluginContributions, PluginPermission, PluginStatus, PluginMetadata } from "./plugin";
export type { CreativeApp, AppCategory, ToolbarAction, AppPanel } from "./app";
export type { AnimationProvider, AnimationDescriptor, AnimationKeyframeGenerator, ProceduralAnimation, AnimationCategory, GeneratedKeyframe } from "./animations";
export type { ThemeProvider, Theme, DynamicTheme, DynamicThemeParams, ThemeTypography } from "./themes";
export type { TemplateProvider, ProjectTemplate, AssetTemplate, TemplateCategory } from "./templates";
export type { AIProvider, AIModel, AICapability, AITextRequest, AITextResponse, AIImageRequest, AIImageResponse, AIVideoRequest, AIVideoResponse, AIStreamCallbacks } from "./ai";
export type { VoiceProvider, Voice, TTSRequest, TTSResponse, VoiceCloneRequest, VoiceCloneResponse } from "./voice";
export type { CaptionEngine, CaptionSegment, CaptionWord, CaptionFormat, CaptionStyle } from "./captions";
export type { TransitionProvider, TransitionDescriptor, TransitionParam, ShaderTransition, CanvasTransition, TransitionCategory } from "./transitions";
export type { BackgroundProvider, BackgroundDescriptor, StaticBackground, AnimatedBackground, BackgroundType } from "./backgrounds";
export type { AssetProvider, Asset, AssetCollection, AssetSearch, AssetSearchResult, AssetType } from "./assets";
export type { RenderEngine, RenderJob, RenderProgress, RenderEngineControl, OutputFormat, OutputPreset } from "./rendering";
export type { HostAPI, HostStore, HostPanels, HostCommands, HostNotifications, HostDialogs, HostFilesystem, HostProjects, HostAI, HostSettings, HostLocale, HostEvents, HostIPC, HostExport } from "./host";