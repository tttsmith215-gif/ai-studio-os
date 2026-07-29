use crate::commands::paths;
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::AppHandle;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub app: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Get the path to a project's folder: projects/{uuid}/
fn project_folder(app: &AppHandle, id: &str) -> std::path::PathBuf {
    paths::resolve(app, &format!("projects/{}", id))
}

/// Get the path to a project's manifest: projects/{uuid}/project.json
fn project_manifest(app: &AppHandle, id: &str) -> std::path::PathBuf {
    project_folder(app, id).join("project.json")
}

#[tauri::command]
pub fn list_projects(app: AppHandle) -> Vec<Project> {
    let dir = paths::projects_dir(&app);
    let mut projects = Vec::new();
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let manifest = path.join("project.json");
                if let Ok(content) = fs::read_to_string(&manifest) {
                    if let Ok(project) = serde_json::from_str::<Project>(&content) {
                        projects.push(project);
                    }
                }
            }
        }
    }
    projects.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    projects
}

#[tauri::command]
pub fn create_project(app: AppHandle, name: String, app_type: String) -> Result<Project, String> {
    let now = chrono_now();
    let id = Uuid::new_v4().to_string();
    let project = Project {
        id: id.clone(),
        name,
        app: app_type,
        created_at: now.clone(),
        updated_at: now,
    };

    // Create project folder and manifest
    let folder = project_folder(&app, &id);
    fs::create_dir_all(&folder).map_err(|e| format!("Failed to create project dir: {}", e))?;

    let manifest = project_manifest(&app, &id);
    let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(&manifest, json).map_err(|e| e.to_string())?;

    // Create project-local asset subdirectories
    fs::create_dir_all(folder.join("assets/images")).ok();
    fs::create_dir_all(folder.join("assets/videos")).ok();
    fs::create_dir_all(folder.join("assets/audio")).ok();
    fs::create_dir_all(folder.join("assets/models")).ok();
    fs::create_dir_all(folder.join("autosave")).ok();
    fs::create_dir_all(folder.join("versions")).ok();

    // Update project index
    update_project_index(&app, &project);

    Ok(project)
}

#[tauri::command]
pub fn delete_project(app: AppHandle, id: String) -> Result<(), String> {
    // Move project folder to .trash instead of permanent delete
    let folder = project_folder(&app, &id);
    if folder.exists() {
        let trash = paths::trash_dir(&app);
        let today = chrono_now()[..10].to_string(); // YYYY-MM-DD
        let dest = trash.join(&today).join(&format!("project-{}", &id));
        fs::create_dir_all(dest.parent().unwrap()).map_err(|e| e.to_string())?;
        fs::rename(&folder, &dest).map_err(|e| format!("Failed to trash project: {}", e))?;
    }
    Ok(())
}

fn update_project_index(app: &AppHandle, project: &Project) {
    let path = paths::resolve(app, "projects/index.json");
    let mut index: Vec<serde_json::Value> = fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();

    // Remove old entry for this project if it exists
    let id = &project.id;
    index.retain(|e| e.get("id").and_then(|v| v.as_str()) != Some(id));

    // Add new entry
    index.push(serde_json::json!({
        "id": project.id,
        "name": project.name,
        "app": project.app,
        "lastOpened": project.updated_at,
        "thumbnail": format!("projects/{}/preview.png", project.id),
    }));

    if let Ok(json) = serde_json::to_string_pretty(&index) {
        fs::write(&path, json).ok();
    }
}

fn chrono_now() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    let days = secs / 86400;
    let time_secs = secs % 86400;
    let hours = time_secs / 3600;
    let minutes = (time_secs % 3600) / 60;
    let seconds = time_secs % 60;

    let year = 2020 + (days / 365) as u32;
    let month = ((days % 365) / 30 + 1).min(12);
    let day = ((days % 365) % 30 + 1).min(31);

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year, month, day, hours, minutes, seconds
    )
}