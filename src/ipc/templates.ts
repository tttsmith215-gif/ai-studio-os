import { invoke } from "@tauri-apps/api/core";

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  created_at: string;
}

export async function listTemplates(): Promise<TemplateInfo[]> {
  return invoke("list_templates");
}

export async function saveTemplate(
  name: string,
  description: string,
  category: string,
  data: string,
): Promise<TemplateInfo> {
  return invoke("save_template", { name, description, category, data });
}

export async function loadTemplateData(id: string): Promise<string> {
  return invoke("load_template_data", { id });
}

export async function deleteTemplate(id: string): Promise<void> {
  return invoke("delete_template", { id });
}