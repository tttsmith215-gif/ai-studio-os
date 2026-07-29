// ---------------------------------------------------------------------------
// AI Studio OS — Plugin Manifest Schema & Validation
// ---------------------------------------------------------------------------
// Finalized manifest format with JSON Schema validation.
// Every plugin ships a manifest.json in its root directory.
// ---------------------------------------------------------------------------

export interface PluginManifestFile {
  /** Unique reverse-domain ID, e.g. "com.example.my-plugin" */
  id: string;
  /** Human-readable name */
  name: string;
  /** SemVer */
  version: string;
  /** Minimum host version required */
  minHostVersion: string;
  /** Author / maintainer */
  author?: string;
  /** Short description */
  description?: string;
  /** Optional icon path (relative to plugin root) */
  icon?: string;
  /** Optional license identifier (SPDX) */
  license?: string;
  /** Optional URL for docs/support */
  homepage?: string;
  /** Optional URL where updates are fetched */
  updateUrl?: string;
  /** Repository URL for source code */
  repository?: string;
  /** Keywords for search */
  keywords?: string[];
  /** Entry point JS file (relative to plugin root). Default: "index.js" */
  entry?: string;
  /** Permissions the plugin requests (shown to user at install time) */
  permissions?: ManifestPermission[];
  /** Configuration schema for plugin settings (JSON Schema) */
  settingsSchema?: Record<string, unknown>;
}

export interface ManifestPermission {
  type: "filesystem" | "network" | "ai" | "voice" | "clipboard" | "native-shell" | "custom";
  /** Human-readable description of why this permission is needed */
  description: string;
  /** For filesystem: paths the plugin needs access to */
  paths?: string[];
  /** For network: domains the plugin needs to connect to */
  domains?: string[];
  /** For custom: the custom permission ID */
  id?: string;
}

// ---------------------------------------------------------------------------
// JSON Schema for plugin manifest validation
// ---------------------------------------------------------------------------
export const manifestSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "AI Studio OS Plugin Manifest",
  type: "object",
  required: ["id", "name", "version", "minHostVersion"],
  properties: {
    id: {
      type: "string",
      pattern: "^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$",
      description: "Reverse-domain ID, e.g. com.example.my-plugin",
    },
    name: { type: "string", minLength: 1, maxLength: 64 },
    version: {
      type: "string",
      pattern: "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$",
      description: "SemVer",
    },
    minHostVersion: { type: "string", pattern: "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$" },
    author: { type: "string" },
    description: { type: "string", maxLength: 256 },
    icon: { type: "string" },
    license: { type: "string" },
    homepage: { type: "string", format: "uri" },
    updateUrl: { type: "string", format: "uri" },
    repository: { type: "string" },
    keywords: { type: "array", items: { type: "string" }, maxItems: 20 },
    entry: { type: "string", default: "index.js" },
    permissions: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "description"],
        properties: {
          type: {
            type: "string",
            enum: ["filesystem", "network", "ai", "voice", "clipboard", "native-shell", "custom"],
          },
          description: { type: "string" },
          paths: { type: "array", items: { type: "string" } },
          domains: { type: "array", items: { type: "string" } },
          id: { type: "string" },
        },
      },
    },
    settingsSchema: { type: "object" },
  },
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateManifest(data: unknown): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

  if (!data || typeof data !== "object") {
    result.valid = false;
    result.errors.push("Manifest must be a JSON object");
    return result;
  }

  const m = data as Record<string, unknown>;

  // Required fields
  const required = ["id", "name", "version", "minHostVersion"] as const;
  for (const field of required) {
    if (!m[field] || typeof m[field] !== "string") {
      result.valid = false;
      result.errors.push(`Missing required field: "${field}"`);
    }
  }

  if (result.errors.length > 0) return result;

  // ID: reverse-domain format
  const idRegex = /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/;
  if (typeof m.id === "string" && !idRegex.test(m.id)) {
    result.warnings.push(`"id" should be reverse-domain format (e.g. "com.example.my-plugin")`);
  }

  // Version: SemVer
  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  if (typeof m.version === "string" && !semverRegex.test(m.version)) {
    result.warnings.push(`"version" should be SemVer (e.g. "1.0.0")`);
  }
  if (typeof m.minHostVersion === "string" && !semverRegex.test(m.minHostVersion)) {
    result.warnings.push(`"minHostVersion" should be SemVer (e.g. "0.1.0")`);
  }

  // Description length
  if (typeof m.description === "string" && m.description.length > 256) {
    result.warnings.push("Description should be 256 characters or fewer");
  }

  // Permissions
  if (m.permissions !== undefined) {
    if (!Array.isArray(m.permissions)) {
      result.errors.push('"permissions" must be an array');
      result.valid = false;
    } else {
      for (let i = 0; i < m.permissions.length; i++) {
        const p = m.permissions[i];
        if (!p || typeof p !== "object") {
          result.errors.push(`permissions[${i}]: must be an object`);
          result.valid = false;
          continue;
        }
        const perm = p as Record<string, unknown>;
        if (!perm.type || !perm.description) {
          result.errors.push(`permissions[${i}]: missing "type" or "description"`);
          result.valid = false;
        }
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// SemVer comparison helper
// ---------------------------------------------------------------------------
export function satisfies(version: string, required: string): boolean {
  const vParts = version.split(".").map(Number);
  const rParts = required.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((vParts[i] ?? 0) < (rParts[i] ?? 0)) return false;
    if ((vParts[i] ?? 0) > (rParts[i] ?? 0)) return true;
  }
  return true;
}