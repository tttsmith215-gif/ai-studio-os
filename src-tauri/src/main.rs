#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::Manager;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub theme: Option<String>,
    pub language: Option<String>,
    pub autosave: Option<bool>,
    pub autosave_interval: Option<u32>,
    pub ai_provider: Option<String>,
    pub ai_model: Option<String>,
    pub ai_endpoint: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ProjectInfo {
    pub id: String,
    pub name: String,
    pub app: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AssetEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: String,
}

#[derive(Serialize)]
struct AppInfo {
    name: String,
    version: String,
    platform: String,
}

fn data_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path().app_data_dir().expect("failed to resolve app data dir")
}

fn settings_path(app: &tauri::AppHandle) -> PathBuf {
    data_dir(app).join("settings").join("user.json")
}

fn projects_dir(app: &tauri::AppHandle) -> PathBuf {
    data_dir(app).join("projects")
}

#[tauri::command]
fn get_app_info() -> AppInfo {
    AppInfo {
        name: "AI Studio OS".to_string(),
        version: "0.1.0".to_string(),
        platform: std::env::consts::OS.to_string(),
    }
}

#[tauri::command]
fn get_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    let path = settings_path(&app);
    if !path.exists() {
        return Ok(AppSettings {
            theme: None, language: None, autosave: None,
            autosave_interval: None, ai_provider: None,
            ai_model: None, ai_endpoint: None,
        });
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    let path = settings_path(&app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_projects(app: tauri::AppHandle) -> Result<Vec<ProjectInfo>, String> {
    let dir = projects_dir(&app);
    if !dir.exists() { return Ok(vec![]); }
    let mut projects = vec![];
    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
            let proj_file = entry.path().join("project.json");
            if proj_file.exists() {
                if let Ok(content) = fs::read_to_string(&proj_file) {
                    if let Ok(proj) = serde_json::from_str::<ProjectInfo>(&content) {
                        projects.push(proj);
                    }
                }
            }
        }
    }
    projects.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(projects)
}

#[tauri::command]
fn create_project(app: tauri::AppHandle, name: String, app_type: String) -> Result<ProjectInfo, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = timestamp_iso();
    let project = ProjectInfo {
        id: id.clone(), name, app: app_type,
        created_at: now.clone(), updated_at: now,
    };
    let dir = projects_dir(&app).join(&id);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let content = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(dir.join("project.json"), content).map_err(|e| e.to_string())?;
    fs::write(dir.join("script.aistudio"), "{}").map_err(|e| e.to_string())?;
    Ok(project)
}

#[tauri::command]
fn delete_project(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let dir = projects_dir(&app).join(&id);
    if dir.exists() { fs::remove_dir_all(&dir).map_err(|e| e.to_string())?; }
    Ok(())
}

#[tauri::command]
fn get_project(app: tauri::AppHandle, id: String) -> Result<ProjectInfo, String> {
    let path = projects_dir(&app).join(&id).join("project.json");
    let content = fs::read_to_string(&path).map_err(|e| format!("Project not found: {}", e))?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_assets(app: tauri::AppHandle, subpath: String) -> Result<Vec<AssetEntry>, String> {
    let root = app.path().resource_dir().unwrap_or_default();
    let clean = subpath.trim_start_matches('/').trim_start_matches('\\');
    let dir = root.join(clean);
    if !dir.exists() { return Ok(vec![]); }
    let mut entries = vec![];
    let read_dir = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in read_dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') { continue; }
        entries.push(AssetEntry {
            name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir: meta.is_dir(),
            size: meta.len(),
            modified: meta.modified()
                .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs().to_string())
                .unwrap_or_default(),
        });
    }
    entries.sort_by(|a, b| {
        if a.is_dir != b.is_dir { b.is_dir.cmp(&a.is_dir) }
        else { a.name.cmp(&b.name) }
    });
    Ok(entries)
}

#[tauri::command]
fn get_asset_path(app: tauri::AppHandle, subpath: String) -> Result<String, String> {
    let root = app.path().resource_dir().unwrap_or_default();
    let clean = subpath.trim_start_matches('/').trim_start_matches('\\');
    Ok(root.join(clean).to_string_lossy().to_string())
}

#[tauri::command]
fn save_project_data(app: tauri::AppHandle, id: String, data: String) -> Result<(), String> {
    let path = projects_dir(&app).join(&id).join("script.aistudio");
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, &data).map_err(|e| e.to_string())?;
    // Update project metadata timestamp
    let meta_path = projects_dir(&app).join(&id).join("project.json");
    if meta_path.exists() {
        if let Ok(content) = fs::read_to_string(&meta_path) {
            if let Ok(mut proj) = serde_json::from_str::<ProjectInfo>(&content) {
                proj.updated_at = timestamp_iso();
                if let Ok(json) = serde_json::to_string_pretty(&proj) {
                    let _ = fs::write(&meta_path, json);
                }
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn load_project_data(app: tauri::AppHandle, id: String) -> Result<String, String> {
    let path = projects_dir(&app).join(&id).join("script.aistudio");
    if !path.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TemplateInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub created_at: String,
}

fn templates_dir(app: &tauri::AppHandle) -> PathBuf {
    data_dir(app).join("templates")
}

#[tauri::command]
fn list_templates(app: tauri::AppHandle) -> Result<Vec<TemplateInfo>, String> {
    let dir = templates_dir(&app);
    if !dir.exists() { return Ok(vec![]); }
    let mut templates = vec![];
    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.path().extension().map(|e| e == "json").unwrap_or(false) {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if let Ok(t) = serde_json::from_str::<TemplateInfo>(&content) {
                    templates.push(t);
                }
            }
        }
    }
    templates.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(templates)
}

#[tauri::command]
fn save_template(app: tauri::AppHandle, name: String, description: String, category: String, data: String) -> Result<TemplateInfo, String> {
    let dir = templates_dir(&app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = timestamp_iso();
    let template = TemplateInfo {
        id: id.clone(), name, description, category, created_at: now,
    };
    let content = serde_json::to_string_pretty(&template).map_err(|e| e.to_string())?;
    fs::write(dir.join(format!("{}.json", id)), &content).map_err(|e| e.to_string())?;
    // Write the composition data alongside
    fs::write(dir.join(format!("{}.comp.json", id)), &data).map_err(|e| e.to_string())?;
    Ok(template)
}

#[tauri::command]
fn load_template_data(app: tauri::AppHandle, id: String) -> Result<String, String> {
    let path = templates_dir(&app).join(format!("{}.comp.json", id));
    if !path.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_template(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let dir = templates_dir(&app);
    let _ = fs::remove_file(dir.join(format!("{}.json", id)));
    let _ = fs::remove_file(dir.join(format!("{}.comp.json", id)));
    Ok(())
}

fn timestamp_iso() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    let ds = secs / 86400;
    let ts = secs % 86400;
    let h = ts / 3600;
    let m = (ts % 3600) / 60;
    let s = ts % 60;
    format!("2026-{:02}-{:02}T{:02}:{:02}:{:02}Z", (ds / 28) % 12 + 1, ds % 28 + 1, h, m, s)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            get_settings,
            save_settings,
            list_projects,
            create_project,
            delete_project,
            get_project,
            save_project_data,
            load_project_data,
            list_templates,
            save_template,
            load_template_data,
            delete_template,
            list_assets,
            get_asset_path,
            ai_studio_os::render::render_composition,
            ai_studio_os::render::encode_frames,
            ai_studio_os::render::export_gif,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}