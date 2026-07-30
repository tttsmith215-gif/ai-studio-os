import { describe, test, expect } from "bun:test";
import { appReducer, initialState } from "../reducer";
import type { AppState } from "../types";

describe("appReducer", () => {
  test("NAVIGATE sets activePanel", () => {
    const s = appReducer(initialState, { type: "NAVIGATE", panel: "settings" });
    expect(s.activePanel).toBe("settings");
  });

  test("SETTINGS_UPDATE merges partial settings", () => {
    const s = appReducer(initialState, { type: "SETTINGS_UPDATE", settings: { theme: "light" } });
    expect(s.settings.theme).toBe("light");
    expect(s.settings.aiProvider).toBe("ollama"); // unchanged
  });

  test("THEME_SET sets theme in both places", () => {
    const s = appReducer(initialState, { type: "THEME_SET", theme: "neon" });
    expect(s.activeTheme).toBe("neon");
    expect(s.settings.theme).toBe("neon");
  });

  test("PROJECTS_ADD prepends project", () => {
    const p = { id: "p1", name: "Test", app: "motion", createdAt: "", updatedAt: "" };
    const s = appReducer(initialState, { type: "PROJECTS_ADD", project: p });
    expect(s.projects).toHaveLength(1);
    expect(s.projects[0].id).toBe("p1");
  });

  test("PROJECTS_REMOVE removes by id", () => {
    const p1 = { id: "p1", name: "A", app: "motion", createdAt: "", updatedAt: "" };
    const p2 = { id: "p2", name: "B", app: "motion", createdAt: "", updatedAt: "" };
    const withBoth = appReducer(initialState, { type: "PROJECTS_ADD", project: p1 });
    const withBoth2 = appReducer(withBoth, { type: "PROJECTS_ADD", project: p2 });
    const removed = appReducer(withBoth2, { type: "PROJECTS_REMOVE", id: "p1" });
    expect(removed.projects).toHaveLength(1);
    expect(removed.projects[0].id).toBe("p2");
  });

  test("PROJECT_OPEN sets current project", () => {
    const p = { id: "p1", name: "Test", app: "motion", createdAt: "", updatedAt: "" };
    const s = appReducer(initialState, { type: "PROJECT_OPEN", project: p, data: "{}" });
    expect(s.currentProject?.id).toBe("p1");
    expect(s.currentProjectData).toBe("{}");
  });

  test("PROJECT_CLOSE clears current project", () => {
    const p = { id: "p1", name: "Test", app: "motion", createdAt: "", updatedAt: "" };
    const opened = appReducer(initialState, { type: "PROJECT_OPEN", project: p, data: "{}" });
    const closed = appReducer(opened, { type: "PROJECT_CLOSE" });
    expect(closed.currentProject).toBeNull();
    expect(closed.currentProjectData).toBe("{}");
  });

  test("RENDER_UPDATE patches a render job", () => {
    const s = appReducer(initialState, { type: "RENDER_UPDATE", id: "job-2", patch: { progress: 80 } });
    const job = s.renderQueue.find(j => j.id === "job-2");
    expect(job?.progress).toBe(80);
  });

  test("PLUGIN_TOGGLE flips installed", () => {
    const s = appReducer(initialState, { type: "PLUGIN_TOGGLE", id: "video-editor" });
    const plugin = s.plugins.find(p => p.id === "video-editor");
    expect(plugin?.installed).toBe(true);
  });

  test("NOTIFY adds notification", () => {
    const s = appReducer(initialState, { type: "NOTIFY", id: "n1", message: "hi", level: "info" });
    expect(s.notifications).toHaveLength(1);
    expect(s.notifications[0].message).toBe("hi");
  });

  test("NOTIFY_DISMISS removes notification", () => {
    const added = appReducer(initialState, { type: "NOTIFY", id: "n1", message: "hi", level: "info" });
    const dismissed = appReducer(added, { type: "NOTIFY_DISMISS", id: "n1" });
    expect(dismissed.notifications).toHaveLength(0);
  });

  test("HYDRATE merges partial state", () => {
    const s = appReducer(initialState, { type: "HYDRATE", state: { activePanel: "projects" } });
    expect(s.activePanel).toBe("projects");
    expect(s.settings.theme).toBe("dark"); // unchanged
  });

  test("unknown action returns state unchanged", () => {
    const s = appReducer(initialState, { type: "UNKNOWN" as any });
    expect(s).toEqual(initialState);
  });

  test("UNDO restores previous state after NAVIGATE", () => {
    const s1 = appReducer(initialState, { type: "NAVIGATE", panel: "settings" });
    expect(s1.activePanel).toBe("settings");
    expect(s1.pastStates).toHaveLength(1);
    const s2 = appReducer(s1, { type: "UNDO" });
    expect(s2.activePanel).toBe("home");
    expect(s2.pastStates).toHaveLength(0);
    expect(s2.futureStates).toHaveLength(1);
  });

  test("REDO restores state after undo", () => {
    const s1 = appReducer(initialState, { type: "NAVIGATE", panel: "settings" });
    const s2 = appReducer(s1, { type: "UNDO" });
    const s3 = appReducer(s2, { type: "REDO" });
    expect(s3.activePanel).toBe("settings");
    expect(s3.pastStates).toHaveLength(1);
    expect(s3.futureStates).toHaveLength(0);
  });

  test("new action clears futureStates (branch cut)", () => {
    const s1 = appReducer(initialState, { type: "NAVIGATE", panel: "settings" });
    const s2 = appReducer(s1, { type: "UNDO" });
    expect(s2.futureStates).toHaveLength(1);
    const s3 = appReducer(s2, { type: "NAVIGATE", panel: "templates" });
    expect(s3.activePanel).toBe("templates");
    expect(s3.futureStates).toHaveLength(0);
    expect(s3.pastStates).toHaveLength(1); // home is still in past
  });

  test("UNDO with empty stack returns state unchanged", () => {
    const s = appReducer(initialState, { type: "UNDO" });
    expect(s).toEqual(initialState);
  });

  test("REDO with empty future returns state unchanged", () => {
    const s = appReducer(initialState, { type: "REDO" });
    expect(s).toEqual(initialState);
  });

  test("SETTINGS_UPDATE does not create snapshot", () => {
    const s = appReducer(initialState, { type: "SETTINGS_UPDATE", settings: { theme: "light" } });
    expect(s.pastStates).toHaveLength(0);
  });

  test("NOTIFY does not create snapshot", () => {
    const s = appReducer(initialState, { type: "NOTIFY", id: "n1", message: "hi", level: "info" });
    expect(s.pastStates).toHaveLength(0);
  });
});