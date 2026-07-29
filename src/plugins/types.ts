// ---------------------------------------------------------------------------
// AI Studio OS — Plugin System: Types
// ---------------------------------------------------------------------------
// Re-export everything from the SDK for convenience. The old CreativeApp
// interface is replaced by the SDK's CreativeApp.
// ---------------------------------------------------------------------------

export type {
  PluginManifest,
  PluginContributions,
  PluginMetadata,
  PluginStatus,
  PluginPermission,
} from "../sdk/plugin";

export type {
  CreativeApp,
  AppCategory,
  ToolbarAction,
  AppPanel,
} from "../sdk/app";

export type {
  AnimationProvider,
  AnimationDescriptor,
  AnimationKeyframeGenerator,
  ProceduralAnimation,
} from "../sdk/animations";

export type {
  ThemeProvider,
  Theme,
  DynamicTheme,
} from "../sdk/themes";

export type {
  TemplateProvider,
  ProjectTemplate,
  AssetTemplate,
} from "../sdk/templates";

export type {
  AIProvider,
  AIModel,
  AICapability,
} from "../sdk/ai";

export type {
  VoiceProvider,
  Voice,
  TTSRequest,
  TTSResponse,
} from "../sdk/voice";

export type {
  CaptionEngine,
  CaptionSegment,
  CaptionFormat,
} from "../sdk/captions";

export type {
  TransitionProvider,
  TransitionDescriptor,
  ShaderTransition,
  CanvasTransition,
} from "../sdk/transitions";

export type {
  BackgroundProvider,
  BackgroundDescriptor,
  StaticBackground,
  AnimatedBackground,
} from "../sdk/backgrounds";

export type {
  AssetProvider,
  Asset,
  AssetCollection,
  AssetSearch,
} from "../sdk/assets";

export type {
  RenderEngine,
  RenderJob,
  RenderProgress,
  OutputFormat,
  OutputPreset,
} from "../sdk/rendering";

export type {
  HostAPI,
  HostStore,
  HostPanels,
  HostCommands,
  HostNotifications,
  HostDialogs,
  HostFilesystem,
  HostProjects,
  HostAI,
  HostSettings,
  HostLocale,
  HostEvents,
  HostIPC,
  HostExport,
} from "../sdk/host";

// ---------------------------------------------------------------------------
// Built-in plugin registration helper
// ---------------------------------------------------------------------------
export type { AppModule } from "./types.old";
export { pluginRegistry } from "./registry";
export { dynamicLoader, hotReload } from "./loader";