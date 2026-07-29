import { invoke } from "@tauri-apps/api/core";

export async function listProjects(): Promise<any[]> {
  return invoke("list_projects");
}

export async function createProject(name: string, appType: string): Promise<any> {
  return invoke("create_project", { name, appType });
}

export async function deleteProject(id: string): Promise<void> {
  return invoke("delete_project", { id });
}

export async function saveProjectData(id: string, data: string): Promise<void> {
  return invoke("save_project_data", { id, data });
}

export async function loadProjectData(id: string): Promise<string> {
  return invoke("load_project_data", { id });
}