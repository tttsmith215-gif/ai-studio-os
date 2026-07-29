import { createContext, useContext, useReducer, useEffect, type ReactNode } from "react";
import type { AppState, AppAction } from "./types";
import { initialState, appReducer } from "./reducer";
import { invoke } from "@tauri-apps/api/core";

interface StoreContext {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const Ctx = createContext<StoreContext | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load settings from Tauri backend on mount
  useEffect(() => {
    invoke("get_settings")
      .then((s: any) => {
        if (s) {
          dispatch({
            type: "SETTINGS_LOAD",
            settings: {
              theme: s.theme || "dark",
              language: s.language || "en",
              autosave: s.autosave ?? true,
              autosaveInterval: s.autosave_interval || 300,
              aiProvider: s.ai_provider || "ollama",
              aiModel: s.ai_model || "llama3",
              aiEndpoint: s.ai_endpoint || "http://localhost:11434",
            },
          });
          if (s.theme) dispatch({ type: "THEME_SET", theme: s.theme });
        }
      })
      .catch(() => {});
  }, []);

  // Apply theme CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const preset = state.themePresets.find((t) => t.id === state.activeTheme);
    if (preset) {
      for (const [key, value] of Object.entries(preset.colors)) {
        root.style.setProperty(`--${key}`, value);
      }
      root.setAttribute("data-theme", state.activeTheme);
    }
  }, [state.activeTheme, state.themePresets]);

  // Save settings to Tauri backend on change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      invoke("save_settings", {
        settings: {
          theme: state.settings.theme,
          language: state.settings.language,
          autosave: state.settings.autosave,
          autosave_interval: state.settings.autosaveInterval,
          ai_provider: state.settings.aiProvider,
          ai_model: state.settings.aiModel,
          ai_endpoint: state.settings.aiEndpoint,
        },
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [state.settings]);

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useStore(): StoreContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}