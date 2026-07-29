import { invoke } from "@tauri-apps/api/core";

export async function getSettings(): Promise<any> {
  return invoke("get_settings");
}

export async function saveSettings(settings: any): Promise<void> {
  return invoke("save_settings", { settings });
}