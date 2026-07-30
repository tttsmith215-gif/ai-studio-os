export interface AppSettings {
  theme: string;
  language: string;
  autosave: boolean;
  autosaveInterval: number;
  aiProvider: string;
  aiModel: string;
  aiEndpoint: string;
  aiApiKey: string;
}

export interface Project {
  id: string;
  name: string;
  app: string;
  createdAt: string;
  updatedAt: string;
}

export interface RenderJob {
  id: string;
  name: string;
  app: string;
  progress: number;
  status: "queued" | "rendering" | "done" | "failed";
  eta: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  colors: Record<string, string>;
}

export interface PendingMotion {
  id: string;
  name: string;
  layers: any[];
  applied: boolean;
}

export interface AnimationPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: string;
}

export interface PluginInfo {
  id: string;
  name: string;
  description: string;
  installed: boolean;
  version: string;
  category: string;
}

export interface AppState {
  activePanel: string;
  settings: AppSettings;
  projects: Project[];
  currentProject: Project | null;
  currentProjectData: string;
  renderQueue: RenderJob[];
  themePresets: ThemePreset[];
  animationPresets: AnimationPreset[];
  plugins: PluginInfo[];
  activeTheme: string;
  notifications: { id: string; message: string; type: string }[];
  pendingMotion: PendingMotion | null;
}

export type AppAction =
  | { type: "NAVIGATE"; panel: string }
  | { type: "SETTINGS_LOAD"; settings: AppSettings }
  | { type: "SETTINGS_UPDATE"; settings: Partial<AppSettings> }
  | { type: "THEME_SET"; theme: string }
  | { type: "PROJECTS_LOAD"; projects: Project[] }
  | { type: "PROJECTS_ADD"; project: Project }
  | { type: "PROJECTS_REMOVE"; id: string }
  | { type: "PROJECT_OPEN"; project: Project; data: string }
  | { type: "PROJECT_CLOSE" }
  | { type: "PROJECT_SAVE"; data: string }
  | { type: "RENDER_QUEUE_LOAD"; queue: RenderJob[] }
  | { type: "RENDER_UPDATE"; id: string; patch: Partial<RenderJob> }
  | { type: "RENDER_JOB_ADD"; job: RenderJob }
  | { type: "PLUGINS_LOAD"; plugins: PluginInfo[] }
  | { type: "PLUGIN_TOGGLE"; id: string }
  | { type: "NOTIFY"; id: string; message: string; level: string }
  | { type: "NOTIFY_DISMISS"; id: string }
  | { type: "HYDRATE"; state: Partial<AppState> }
  | { type: "COMPOSITION_ADD_LAYERS"; pending: PendingMotion }
  | { type: "PLUGIN_INSTALL_USER"; plugin: PluginInfo }
  | { type: "PLUGIN_UNINSTALL"; id: string };