use crate::commands::paths;
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::AppHandle;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub theme: String,
    pub language: String,
    pub autosave: bool,
    pub autosave_interval: u32,
    pub ai_provider: String,
    pub ai_model: String,
    pub ai_endpoint: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".into(),
            language: "en".into(),
            autosave: true,
            autosave_interval: 300,
            ai_provider: "ollama".into(),
            ai_model: "llama3".into(),
            ai_endpoint: "http://localhost:11434".into(),
        }
    }
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> AppSettings {
    let path = paths::resolve(&app, "settings/prefs.json");
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    let path = paths::resolve(&app, "settings/prefs.json");
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}