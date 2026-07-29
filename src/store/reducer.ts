import type { AppAction, AppState, ThemePreset, AnimationPreset, RenderJob, PluginInfo } from "./types";

export const themePresets: ThemePreset[] = [
  {
    id: "dark",
    name: "Dark",
    colors: {
      "bg-primary": "#0f0f11",
      "bg-secondary": "#1a1a1e",
      "bg-tertiary": "#222226",
      "bg-hover": "#2a2a2e",
      "bg-active": "#333338",
      "border-color": "#2a2a30",
      "border-hover": "#3a3a42",
      "text-primary": "#e8e8ed",
      "text-secondary": "#9b9ba3",
      "text-muted": "#6b6b73",
    },
  },
  {
    id: "light",
    name: "Light",
    colors: {
      "bg-primary": "#f5f5f7",
      "bg-secondary": "#ffffff",
      "bg-tertiary": "#eaeaec",
      "bg-hover": "#e0e0e4",
      "bg-active": "#d4d4d8",
      "border-color": "#d4d4d8",
      "border-hover": "#b0b0b8",
      "text-primary": "#1a1a1e",
      "text-secondary": "#5a5a62",
      "text-muted": "#9a9aa2",
    },
  },
  {
    id: "neon",
    name: "Neon",
    colors: {
      "bg-primary": "#0a0a12",
      "bg-secondary": "#12121e",
      "bg-tertiary": "#1a1a2e",
      "bg-hover": "#22223e",
      "bg-active": "#2a2a4e",
      "border-color": "#2a2a4e",
      "border-hover": "#3a3a6e",
      "text-primary": "#e0e0ff",
      "text-secondary": "#a0a0e0",
      "text-muted": "#6060a0",
    },
  },
  {
    id: "pastel",
    name: "Pastel",
    colors: {
      "bg-primary": "#f0ece8",
      "bg-secondary": "#faf6f0",
      "bg-tertiary": "#e8e4de",
      "bg-hover": "#ddd8d0",
      "bg-active": "#d0ccc4",
      "border-color": "#d0ccc4",
      "border-hover": "#c0bcb4",
      "text-primary": "#3a3530",
      "text-secondary": "#7a7570",
      "text-muted": "#aaa5a0",
    },
  },
  {
    id: "corporate",
    name: "Corporate",
    colors: {
      "bg-primary": "#f0f2f5",
      "bg-secondary": "#ffffff",
      "bg-tertiary": "#e4e7ec",
      "bg-hover": "#d8dce4",
      "bg-active": "#ccd0d8",
      "border-color": "#ccd0d8",
      "border-hover": "#b0b4bc",
      "text-primary": "#1a1d23",
      "text-secondary": "#5a5e66",
      "text-muted": "#9a9ea6",
    },
  },
  {
    id: "vintage",
    name: "Vintage",
    colors: {
      "bg-primary": "#e8ddd0",
      "bg-secondary": "#f5ede2",
      "bg-tertiary": "#ddd4c8",
      "bg-hover": "#d0c8bc",
      "bg-active": "#c4bcb0",
      "border-color": "#c4bcb0",
      "border-hover": "#b0a898",
      "text-primary": "#2a2520",
      "text-secondary": "#6a6560",
      "text-muted": "#9a9590",
    },
  },
];

export const animationPresets: AnimationPreset[] = [
  { id: "fade-in", name: "Fade In", description: "Smooth opacity fade from 0 to 1", category: "Entrance", duration: "0.5s" },
  { id: "slide-up", name: "Slide Up", description: "Element slides upward into position", category: "Entrance", duration: "0.6s" },
  { id: "slide-left", name: "Slide Left", description: "Element slides in from the right", category: "Entrance", duration: "0.6s" },
  { id: "scale-up", name: "Scale Up", description: "Grow from 0 to full size", category: "Entrance", duration: "0.5s" },
  { id: "bounce-in", name: "Bounce In", description: "Elastic bounce entrance effect", category: "Entrance", duration: "0.8s" },
  { id: "fade-out", name: "Fade Out", description: "Smooth opacity fade from 1 to 0", category: "Exit", duration: "0.4s" },
  { id: "slide-down", name: "Slide Down", description: "Element slides downward out of view", category: "Exit", duration: "0.5s" },
  { id: "zoom-out", name: "Zoom Out", description: "Shrink and fade out", category: "Exit", duration: "0.5s" },
  { id: "pulse", name: "Pulse", description: "Gentle scale pulse loop", category: "Attention", duration: "1.0s" },
  { id: "shake", name: "Shake", description: "Horizontal shake effect", category: "Attention", duration: "0.4s" },
  { id: "glow", name: "Glow", description: "Subtle glow brightness pulse", category: "Attention", duration: "1.5s" },
  { id: "spin", name: "Spin", description: "Continuous rotation", category: "Attention", duration: "2.0s" },
  { id: "morph", name: "Morph", description: "Shape morphing transition", category: "Transition", duration: "0.7s" },
  { id: "wipe", name: "Wipe", description: "Directional wipe reveal", category: "Transition", duration: "0.6s" },
  { id: "flip", name: "Flip", description: "3D flip rotation", category: "Transition", duration: "0.7s" },
];

export const defaultPlugins: PluginInfo[] = [
  { id: "motion-studio", name: "Motion Studio", description: "Animations and motion graphics with keyframes, timeline, and AI", installed: true, version: "1.0.0", category: "motion" },
  { id: "video-editor", name: "Video Editor", description: "Multi-track video editing with transitions and effects", installed: false, version: "0.5.0", category: "video" },
  { id: "ai-video-gen", name: "AI Video Gen", description: "Generate video from text prompts", installed: false, version: "0.3.0", category: "video" },
  { id: "thumbnail-studio", name: "Thumbnail Studio", description: "Design eye-catching thumbnails with templates", installed: false, version: "0.4.0", category: "image" },
  { id: "image-studio", name: "Image Studio", description: "Photo editing, filters, and design tools", installed: false, version: "0.6.0", category: "image" },
  { id: "presentation-studio", name: "Presentation Studio", description: "AI-powered slide decks with transitions", installed: false, version: "0.2.0", category: "text" },
  { id: "script-writer", name: "Script Writer", description: "AI-assisted script writing", installed: false, version: "0.3.0", category: "text" },
  { id: "voice-gen", name: "Voice Generator", description: "Text-to-speech and voice cloning", installed: false, version: "0.4.0", category: "audio" },
  { id: "music-gen", name: "Music Generator", description: "AI music composition", installed: false, version: "0.2.0", category: "audio" },
  { id: "social-scheduler", name: "Social Scheduler", description: "Schedule and publish content across platforms", installed: false, version: "0.1.0", category: "manage" },
];

export const mockRenderJobs: RenderJob[] = [
  { id: "job-1", name: "Intro Animation v2", app: "Motion Studio", progress: 0, status: "queued", eta: "2 min" },
  { id: "job-2", name: "Product Showcase", app: "Motion Studio", progress: 45, status: "rendering", eta: "1 min" },
  { id: "job-3", name: "Social Cut Final", app: "Motion Studio", progress: 100, status: "done", eta: "Done" },
  { id: "job-4", name: "Logo Animation", app: "Motion Studio", progress: 100, status: "done", eta: "Done" },
];

export const initialState: AppState = {
  activePanel: "home",
  settings: {
    theme: "dark",
    language: "en",
    autosave: true,
    autosaveInterval: 300,
    aiProvider: "ollama",
    aiModel: "llama3",
    aiEndpoint: "http://localhost:11434",
  },
  projects: [],
  currentProject: null,
  currentProjectData: "{}",
  renderQueue: mockRenderJobs,
  themePresets,
  animationPresets,
  plugins: defaultPlugins,
  activeTheme: "dark",
  notifications: [],
  pendingMotion: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "NAVIGATE":
      return { ...state, activePanel: action.panel };

    case "SETTINGS_LOAD":
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case "SETTINGS_UPDATE":
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case "THEME_SET":
      return { ...state, activeTheme: action.theme, settings: { ...state.settings, theme: action.theme } };

    case "PROJECTS_LOAD":
      return { ...state, projects: action.projects };

    case "PROJECTS_ADD":
      return { ...state, projects: [action.project, ...state.projects] };

    case "PROJECTS_REMOVE":
      return { ...state, projects: state.projects.filter((p) => p.id !== action.id) };

    case "PROJECT_OPEN":
      return { ...state, currentProject: action.project, currentProjectData: action.data };

    case "PROJECT_CLOSE":
      return { ...state, currentProject: null, currentProjectData: "{}" };

    case "PROJECT_SAVE":
      return { ...state, currentProjectData: action.data };

    case "RENDER_QUEUE_LOAD":
      return { ...state, renderQueue: action.queue };

    case "RENDER_JOB_ADD":
      return { ...state, renderQueue: [...state.renderQueue, action.job] };

    case "RENDER_UPDATE":
      return {
        ...state,
        renderQueue: state.renderQueue.map((j) =>
          j.id === action.id ? { ...j, ...action.patch } : j
        ),
      };

    case "PLUGINS_LOAD":
      return { ...state, plugins: action.plugins };

    case "PLUGIN_TOGGLE":
      return {
        ...state,
        plugins: state.plugins.map((p) =>
          p.id === action.id ? { ...p, installed: !p.installed } : p
        ),
      };

    case "NOTIFY":
      return {
        ...state,
        notifications: [
          ...state.notifications,
          { id: action.id, message: action.message, type: action.level },
        ],
      };

    case "NOTIFY_DISMISS":
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.id),
      };

    case "HYDRATE":
      return { ...state, ...action.state };

    case "COMPOSITION_ADD_LAYERS":
      return { ...state, pendingMotion: action.pending };

    case "PLUGIN_INSTALL_USER":
      return { ...state, plugins: [...state.plugins, action.plugin] };

    case "PLUGIN_UNINSTALL":
      return { ...state, plugins: state.plugins.filter((p) => p.id !== action.id) };

    default:
      return state;
  }
}