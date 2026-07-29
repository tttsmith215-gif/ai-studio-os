import { describe, test, expect } from "bun:test";
import { validateManifest, satisfies } from "../manifest-schema";

describe("validateManifest", () => {
  test("accepts a valid manifest", () => {
    const result = validateManifest({
      id: "com.example.my-plugin",
      name: "My Plugin",
      version: "1.0.0",
      minHostVersion: "0.1.0",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("rejects non-object", () => {
    const result = validateManifest("not an object");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Manifest must be a JSON object");
  });

  test("requires id, name, version, minHostVersion", () => {
    const result = validateManifest({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors.some((e) => e.includes("id"))).toBe(true);
    expect(result.errors.some((e) => e.includes("name"))).toBe(true);
    expect(result.errors.some((e) => e.includes("version"))).toBe(true);
    expect(result.errors.some((e) => e.includes("minHostVersion"))).toBe(true);
  });

  test("warns on non-reverse-domain id", () => {
    const result = validateManifest({
      id: "bad-id",
      name: "Test",
      version: "1.0.0",
      minHostVersion: "0.1.0",
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("reverse-domain"))).toBe(true);
  });

  test("warns on non-SemVer version", () => {
    const result = validateManifest({
      id: "com.example.p",
      name: "Test",
      version: "not-semver",
      minHostVersion: "0.1.0",
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("SemVer"))).toBe(true);
  });

  test("warns on long description", () => {
    const result = validateManifest({
      id: "com.example.p",
      name: "Test",
      version: "1.0.0",
      minHostVersion: "0.1.0",
      description: "x".repeat(300),
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("256"))).toBe(true);
  });

  test("validates permissions array", () => {
    const result = validateManifest({
      id: "com.example.p",
      name: "Test",
      version: "1.0.0",
      minHostVersion: "0.1.0",
      permissions: [
        { type: "filesystem", description: "Read files" },
        { type: "network", description: "Access network" },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("rejects permissions with missing type/description", () => {
    const result = validateManifest({
      id: "com.example.p",
      name: "Test",
      version: "1.0.0",
      minHostVersion: "0.1.0",
      permissions: [{ notype: true }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("type") || e.includes("description"))).toBe(true);
  });

  test("rejects non-array permissions", () => {
    const result = validateManifest({
      id: "com.example.p",
      name: "Test",
      version: "1.0.0",
      minHostVersion: "0.1.0",
      permissions: "grant-all",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("array"))).toBe(true);
  });

  test("accepts full manifest with all fields", () => {
    const result = validateManifest({
      id: "com.example.full",
      name: "Full Plugin",
      version: "2.1.0-beta",
      minHostVersion: "0.5.0",
      author: "Test Author",
      description: "A fully featured plugin",
      icon: "icon.png",
      license: "MIT",
      homepage: "https://example.com",
      updateUrl: "https://updates.example.com",
      repository: "https://github.com/example/plugin",
      keywords: ["test", "plugin"],
      entry: "main.js",
      permissions: [
        { type: "filesystem", description: "Read files", paths: ["/data"] },
        { type: "network", description: "API access", domains: ["api.example.com"] },
        { type: "custom", description: "Custom", id: "my-feature" },
      ],
      settingsSchema: { type: "object", properties: { theme: { type: "string" } } },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("satisfies", () => {
  test("exact match returns true", () => {
    expect(satisfies("0.1.0", "0.1.0")).toBe(true);
  });

  test("greater version returns true", () => {
    expect(satisfies("1.0.0", "0.5.0")).toBe(true);
  });

  test("lesser version returns false", () => {
    expect(satisfies("0.1.0", "1.0.0")).toBe(false);
  });

  test("patch version comparison", () => {
    expect(satisfies("1.0.1", "1.0.0")).toBe(true);
    expect(satisfies("1.0.0", "1.0.1")).toBe(false);
  });

  test("minor version comparison", () => {
    expect(satisfies("1.2.0", "1.1.9")).toBe(true);
    expect(satisfies("1.1.0", "1.2.0")).toBe(false);
  });
});