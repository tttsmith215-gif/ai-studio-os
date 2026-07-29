// ---------------------------------------------------------------------------
// AI Studio OS — Plugin Permission System
// ---------------------------------------------------------------------------
// Manages permission requests from plugins, shows user approval dialogs,
// and enforces permissions at runtime.
// ---------------------------------------------------------------------------

import type { PluginManifestFile, ManifestPermission } from "./manifest-schema";

// ---------------------------------------------------------------------------
// Permission state
// ---------------------------------------------------------------------------
export interface PermissionGrant {
  pluginId: string;
  permission: ManifestPermission;
  granted: boolean;
  grantedAt: string;
}

type PermissionCallback = (grants: PermissionGrant[]) => void;

// ---------------------------------------------------------------------------
// Permission Manager
// ---------------------------------------------------------------------------
class PermissionManager {
  private grants = new Map<string, PermissionGrant[]>();
  private pendingCallbacks = new Map<string, PermissionCallback[]>();

  // -----------------------------------------------------------------------
  // Storage key
  // -----------------------------------------------------------------------
  private storageKey(pluginId: string): string {
    return `aios-permissions-${pluginId}`;
  }

  // -----------------------------------------------------------------------
  // Load stored grants
  // -----------------------------------------------------------------------
  private loadGrants(pluginId: string): PermissionGrant[] {
    try {
      const stored = localStorage.getItem(this.storageKey(pluginId));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // -----------------------------------------------------------------------
  // Save grants
  // -----------------------------------------------------------------------
  private saveGrants(pluginId: string, grants: PermissionGrant[]): void {
    localStorage.setItem(this.storageKey(pluginId), JSON.stringify(grants));
  }

  // -----------------------------------------------------------------------
  // Request permissions for a plugin
  // Returns the grants (user may have been prompted)
  // -----------------------------------------------------------------------
  async requestPermissions(
    pluginId: string,
    pluginName: string,
    permissions: ManifestPermission[],
  ): Promise<PermissionGrant[]> {
    if (!permissions || permissions.length === 0) return [];

    const existing = this.loadGrants(pluginId);
    const existingMap = new Map(existing.map((g) => [g.permission.type + ":" + (g.permission.id || ""), g]));

    const result: PermissionGrant[] = [];
    const needsApproval: ManifestPermission[] = [];

    for (const perm of permissions) {
      const key = perm.type + ":" + (perm.id || "");
      const existingGrant = existingMap.get(key);

      if (existingGrant) {
        // Already granted or denied
        result.push(existingGrant);
        if (!existingGrant.granted) {
          needsApproval.push(perm); // Ask again if previously denied
        }
      } else {
        needsApproval.push(perm);
      }
    }

    if (needsApproval.length > 0) {
      // Show approval dialog to the user
      const grants = await this.showPermissionDialog(pluginId, pluginName, needsApproval);

      // Save the grants
      const allGrants = [...existing, ...grants];
      this.saveGrants(pluginId, allGrants);
      this.grants.set(pluginId, allGrants);

      return allGrants;
    }

    this.grants.set(pluginId, result);
    return result;
  }

  // -----------------------------------------------------------------------
  // Show the permission approval dialog
  // Returns the grants based on user decisions
  // -----------------------------------------------------------------------
  private showPermissionDialog(
    pluginId: string,
    pluginName: string,
    permissions: ManifestPermission[],
  ): Promise<PermissionGrant[]> {
    return new Promise((resolve) => {
      // Dispatch a custom event that the UI layer listens for
      const dialogId = `perm-${pluginId}-${Date.now()}`;

      const handler = (event: CustomEvent) => {
        if (event.detail.dialogId === dialogId) {
          window.removeEventListener("permission-dialog-response", handler as EventListener);
          // Clean up the dialog element
          const dialogEl = document.getElementById(dialogId);
          if (dialogEl) dialogEl.remove();
          resolve(event.detail.grants);
        }
      };

      window.addEventListener("permission-dialog-response", handler as EventListener);

      // Dispatch event to open the dialog
      const openEvent = new CustomEvent("permission-dialog-open", {
        detail: {
          dialogId,
          pluginId,
          pluginName,
          permissions,
        },
      });
      window.dispatchEvent(openEvent);

      // Fallback: auto-grant if no dialog handler within 1 second
      setTimeout(() => {
        window.removeEventListener("permission-dialog-response", handler as EventListener);
        // If dialog was never shown, auto-grant with warning
        console.warn(`[Permissions] No dialog handler for ${pluginId}, auto-granting`);
        const grants = permissions.map((p) => ({
          pluginId,
          permission: p,
          granted: true,
          grantedAt: new Date().toISOString(),
        }));
        resolve(grants);
      }, 1000);
    });
  }

  // -----------------------------------------------------------------------
  // Check if a plugin has a specific permission
  // -----------------------------------------------------------------------
  hasPermission(pluginId: string, permissionType: string, permissionId?: string): boolean {
    const grants = this.grants.get(pluginId) || this.loadGrants(pluginId);
    return grants.some(
      (g) =>
        g.granted &&
        g.permission.type === permissionType &&
        (!permissionId || g.permission.id === permissionId),
    );
  }

  // -----------------------------------------------------------------------
  // Check if a plugin has a specific filesystem path permission
  // -----------------------------------------------------------------------
  hasPathPermission(pluginId: string, path: string): boolean {
    const grants = this.grants.get(pluginId) || this.loadGrants(pluginId);
    return grants.some((g) => {
      if (!g.granted || g.permission.type !== "filesystem") return false;
      if (!g.permission.paths || g.permission.paths.length === 0) return true; // All paths
      return g.permission.paths.some((p) => path.startsWith(p));
    });
  }

  // -----------------------------------------------------------------------
  // Check if a plugin has a specific domain permission
  // -----------------------------------------------------------------------
  hasDomainPermission(pluginId: string, domain: string): boolean {
    const grants = this.grants.get(pluginId) || this.loadGrants(pluginId);
    return grants.some((g) => {
      if (!g.granted || g.permission.type !== "network") return false;
      if (!g.permission.domains || g.permission.domains.length === 0) return true; // All domains
      return g.permission.domains.some((d) => domain.endsWith(d));
    });
  }

  // -----------------------------------------------------------------------
  // Revoke all permissions for a plugin
  // -----------------------------------------------------------------------
  revokeAll(pluginId: string): void {
    this.grants.delete(pluginId);
    localStorage.removeItem(this.storageKey(pluginId));
  }

  // -----------------------------------------------------------------------
  // Get all permissions for a plugin
  // -----------------------------------------------------------------------
  getGrants(pluginId: string): PermissionGrant[] {
    return this.grants.get(pluginId) || this.loadGrants(pluginId);
  }

  // -----------------------------------------------------------------------
  // Get human-readable label for a permission type
  // -----------------------------------------------------------------------
  static getPermissionLabel(perm: ManifestPermission): string {
    const labels: Record<string, string> = {
      filesystem: "File System Access",
      network: "Network Access",
      ai: "AI Provider Access",
      voice: "Voice Engine Access",
      clipboard: "Clipboard Access",
      "native-shell": "Native Shell Access",
      custom: perm.id ? `Custom: ${perm.id}` : "Custom Permission",
    };
    return labels[perm.type] || perm.type;
  }

  // -----------------------------------------------------------------------
  // Get icon for a permission type
  // -----------------------------------------------------------------------
  static getPermissionIcon(perm: ManifestPermission): string {
    const icons: Record<string, string> = {
      filesystem: "📁",
      network: "🌐",
      ai: "🤖",
      voice: "🎤",
      clipboard: "📋",
      "native-shell": "💻",
      custom: "🔧",
    };
    return icons[perm.type] || "🔑";
  }

  // -----------------------------------------------------------------------
  // Get danger level for a permission type
  // -----------------------------------------------------------------------
  static getPermissionDanger(perm: ManifestPermission): "low" | "medium" | "high" {
    const danger: Record<string, "low" | "medium" | "high"> = {
      filesystem: "high",
      network: "medium",
      ai: "low",
      voice: "low",
      clipboard: "medium",
      "native-shell": "high",
      custom: "medium",
    };
    return danger[perm.type] || "medium";
  }
}

// Singleton
export const permissionManager = new PermissionManager();