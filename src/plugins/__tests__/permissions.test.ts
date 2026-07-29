import { describe, test, expect, beforeAll, afterAll } from "bun:test";

// Mock DOM globals before importing the module
const store = new Map<string, string>();
const listeners = new Map<string, Set<EventListener>>();

const mockLocalStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, val: string) => { store.set(key, val); },
  removeItem: (key: string) => { store.delete(key); },
  clear: () => store.clear(),
  get length() { return store.size; },
  key: (i: number) => [...store.keys()][i] ?? null,
};

const mockWindow = {
  addEventListener: (type: string, handler: EventListener) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type)!.add(handler);
  },
  removeEventListener: (type: string, handler: EventListener) => {
    listeners.get(type)?.delete(handler);
  },
  dispatchEvent: (event: Event) => {
    const handlers = listeners.get(event.type);
    if (handlers) {
      for (const h of handlers) h(event);
    }
    return true;
  },
};

Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage, writable: true });
Object.defineProperty(globalThis, "window", { value: mockWindow, writable: true });
Object.defineProperty(globalThis, "document", {
  value: { getElementById: () => null, removeEventListener: () => {} },
  writable: true,
});

import { permissionManager } from "../permissions";

const TEST_PLUGIN = "test-plugin-perms";

describe("permissionManager", () => {
  beforeAll(() => {
    store.clear();
    listeners.clear();
    permissionManager.revokeAll(TEST_PLUGIN);
  });

  afterAll(() => {
    permissionManager.revokeAll(TEST_PLUGIN);
  });

  test("requestPermissions with empty list returns empty", async () => {
    const grants = await permissionManager.requestPermissions(TEST_PLUGIN, "Test", []);
    expect(grants).toHaveLength(0);
  });

  test("hasPermission returns false before granting", () => {
    expect(permissionManager.hasPermission(TEST_PLUGIN, "filesystem")).toBe(false);
  });

  test("hasPathPermission returns false before granting", () => {
    expect(permissionManager.hasPathPermission(TEST_PLUGIN, "/data/file.txt")).toBe(false);
  });

  test("hasDomainPermission returns false before granting", () => {
    expect(permissionManager.hasDomainPermission(TEST_PLUGIN, "api.example.com")).toBe(false);
  });

  test("requestPermissions auto-grants via fallback timeout", async () => {
    const grants = await permissionManager.requestPermissions(TEST_PLUGIN, "Test", [
      { type: "filesystem", description: "Read files" },
    ]);
    expect(grants).toHaveLength(1);
    expect(grants[0].pluginId).toBe(TEST_PLUGIN);
    expect(grants[0].permission.type).toBe("filesystem");
    expect(grants[0].granted).toBe(true);
  }, 5000);

  test("hasPermission returns true after granting", () => {
    expect(permissionManager.hasPermission(TEST_PLUGIN, "filesystem")).toBe(true);
  });

  test("hasPathPermission returns true for filesystem with no path restrictions", () => {
    expect(permissionManager.hasPathPermission(TEST_PLUGIN, "/any/path")).toBe(true);
  });

  test("requestPermissions with path-restricted filesystem", async () => {
    store.clear();
    listeners.clear();
    const pluginId = "test-plugin-path";
    const grants = await permissionManager.requestPermissions(pluginId, "Path Test", [
      { type: "filesystem", description: "Read /data", paths: ["/data"] },
    ]);
    expect(grants).toHaveLength(1);
    expect(permissionManager.hasPathPermission(pluginId, "/data/file.txt")).toBe(true);
    expect(permissionManager.hasPathPermission(pluginId, "/etc/passwd")).toBe(false);
    permissionManager.revokeAll(pluginId);
  }, 5000);

  test("requestPermissions with domain-restricted network", async () => {
    store.clear();
    listeners.clear();
    const pluginId = "test-plugin-domain";
    await permissionManager.requestPermissions(pluginId, "Domain Test", [
      { type: "network", description: "API access", domains: ["api.example.com"] },
    ]);
    expect(permissionManager.hasDomainPermission(pluginId, "api.example.com")).toBe(true);
    expect(permissionManager.hasDomainPermission(pluginId, "evil.com")).toBe(false);
    permissionManager.revokeAll(pluginId);
  }, 5000);

  test("revokeAll clears permissions", () => {
    permissionManager.revokeAll(TEST_PLUGIN);
    expect(permissionManager.hasPermission(TEST_PLUGIN, "filesystem")).toBe(false);
    expect(permissionManager.getGrants(TEST_PLUGIN)).toHaveLength(0);
  });

  test("getPermissionLabel returns human-readable labels", () => {
    const { permissionManager: pm } = require("../permissions");
    expect(pm.constructor.getPermissionLabel({ type: "filesystem", description: "" })).toBe("File System Access");
    expect(pm.constructor.getPermissionLabel({ type: "network", description: "" })).toBe("Network Access");
    expect(pm.constructor.getPermissionLabel({ type: "ai", description: "" })).toBe("AI Provider Access");
    expect(pm.constructor.getPermissionLabel({ type: "custom", description: "", id: "voice" })).toBe("Custom: voice");
  });
});