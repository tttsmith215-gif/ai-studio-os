use crate::commands::paths;
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::AppHandle;

#[derive(Debug, Serialize, Deserialize)]
pub struct AssetEntry {
    pub name: String,
    pub path: String, // relative to data root
    pub is_dir: bool,
    pub size: u64,
    pub modified: String,
}

#[tauri::command]
pub fn list_assets(app: AppHandle, subpath: String) -> Result<Vec<AssetEntry>, String> {
    // Safety: strip any path traversal
    let safe_path = sanitize_path(&subpath);
    let dir = paths::resolve(&app, &safe_path);

    let mut entries = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| format!("Cannot read {}: {}", safe_path, e))? {
        let entry = entry.map_err(|e| e.to_string())?;
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        entries.push(AssetEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: format!("{}/{}", safe_path, entry.file_name().to_string_lossy()),
            is_dir: meta.is_dir(),
            size: meta.len(),
            modified: format!("{:?}", meta.modified()),
        });
    }

    entries.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name))
    });

    Ok(entries)
}

#[tauri::command]
pub fn get_asset_path(app: AppHandle, subpath: String) -> Result<String, String> {
    let safe = sanitize_path(&subpath);
    let full = paths::resolve(&app, &safe);
    Ok(full.to_string_lossy().to_string())
}

/// Prevent directory traversal — only allow paths under the data root.
fn sanitize_path(subpath: &str) -> String {
    let clean: String = subpath
        .chars()
        .filter(|&c| c.is_alphanumeric() || c == '/' || c == '_' || c == '-' || c == '.')
        .collect();
    // Strip leading slashes and ".." components
    let clean = clean.trim_start_matches('/');
    let segments: Vec<&str> = clean
        .split('/')
        .filter(|&s| !s.is_empty() && s != ".." && s != ".")
        .collect();
    segments.join("/")
}