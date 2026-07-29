use std::path::PathBuf;
use tauri::AppHandle;

/// Get the root data directory, respecting env override and portable mode.
pub fn data_root(app: &AppHandle) -> PathBuf {
    // 1. Environment variable override
    if let Ok(custom) = std::env::var("AI_STUDIO_OS_HOME") {
        return PathBuf::from(custom);
    }

    // 2. Portable mode: check for .portable file next to the binary's resource dir
    if let Ok(exe_dir) = app.path().resource_dir() {
        if exe_dir.join(".portable").exists() {
            return exe_dir.join("ai-studio-data");
        }
    }

    // 3. Standard platform-specific path (Tauri's app_data_dir)
    app.path()
        .app_data_dir()
        .expect("Failed to resolve app data directory")
}

/// Resolve any subpath under the data root.
pub fn resolve(app: &AppHandle, subpath: &str) -> PathBuf {
    data_root(app).join(subpath)
}

pub fn projects_dir(app: &AppHandle) -> PathBuf {
    resolve(app, "projects")
}
pub fn templates_dir(app: &AppHandle) -> PathBuf {
    resolve(app, "templates")
}
pub fn assets_dir(app: &AppHandle) -> PathBuf {
    resolve(app, "assets")
}
pub fn exports_dir(app: &AppHandle) -> PathBuf {
    resolve(app, "exports")
}
pub fn plugins_dir(app: &AppHandle) -> PathBuf {
    resolve(app, "plugins")
}
pub fn themes_dir(app: &AppHandle) -> PathBuf {
    resolve(app, "themes")
}
pub fn settings_dir(app: &AppHandle) -> PathBuf {
    resolve(app, "settings")
}
pub fn logs_dir(app: &AppHandle) -> PathBuf {
    resolve(app, "logs")
}
pub fn cache_dir(app: &AppHandle) -> PathBuf {
    resolve(app, "cache")
}
pub fn backups_dir(app: &AppHandle) -> PathBuf {
    resolve(app, "backups")
}
pub fn autosaves_dir(app: &AppHandle) -> PathBuf {
    resolve(app, "autosaves")
}
pub fn versioning_dir(app: &AppHandle) -> PathBuf {
    resolve(app, "versioning")
}
pub fn user_dir(app: &AppHandle) -> PathBuf {
    resolve(app, "user")
}
pub fn agents_dir(app: &AppHandle) -> PathBuf {
    resolve(app, "agents")
}
pub fn trash_dir(app: &AppHandle) -> PathBuf {
    resolve(app, ".trash")
}