// ---------------------------------------------------------------------------
// AI Studio OS — Permission Approval Dialog
// ---------------------------------------------------------------------------
// Modal dialog shown when a plugin requests permissions at install time.
// The user can approve or deny each permission individually.
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";
import { permissionManager, type PermissionGrant } from "../plugins/permissions";
import type { ManifestPermission } from "../plugins/manifest-schema";

interface PermissionDialogProps {
  dialogId: string;
  pluginId: string;
  pluginName: string;
  permissions: ManifestPermission[];
}

export function PermissionDialog({ dialogId, pluginId, pluginName, permissions }: PermissionDialogProps) {
  const [grants, setGrants] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    permissions.forEach((_, i) => { initial[i] = true; });
    return initial;
  });
  const [submitted, setSubmitted] = useState(false);

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleToggle = (index: number) => {
    setGrants((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleApprove = () => {
    if (submitted) return;
    setSubmitted(true);

    const result: PermissionGrant[] = permissions.map((p, i) => ({
      pluginId,
      permission: p,
      granted: grants[i] ?? false,
      grantedAt: new Date().toISOString(),
    }));

    const event = new CustomEvent("permission-dialog-response", {
      detail: { dialogId, grants: result },
    });
    window.dispatchEvent(event);
  };

  const handleCancel = () => {
    if (submitted) return;
    setSubmitted(true);

    // Deny all
    const result: PermissionGrant[] = permissions.map((p, i) => ({
      pluginId,
      permission: p,
      granted: false,
      grantedAt: new Date().toISOString(),
    }));

    const event = new CustomEvent("permission-dialog-response", {
      detail: { dialogId, grants: result },
    });
    window.dispatchEvent(event);
  };

  const allGranted = Object.values(grants).every(Boolean);
  const dangerLevel = permissions.some(
    (p) => permissionManager.constructor.prototype.getPermissionDanger(p) === "high",
  );

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ width: 480 }}>
        <div className="modal-header">
          <h2>
            {dangerLevel ? "⚠️ " : ""}Permissions Required
          </h2>
          <button
            className="topbar-btn"
            onClick={handleCancel}
            style={{ fontSize: 16 }}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: 16, lineHeight: 1.5, color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary)" }}>{pluginName}</strong> requests the following permissions:
          </p>

          <div className="flex-col gap-8">
            {permissions.map((perm, i) => {
              const danger = permissionManager.constructor.prototype.getPermissionDanger(perm);
              return (
                <div
                  key={i}
                  className="flex items-center gap-12"
                  style={{
                    padding: "10px 12px",
                    background: "var(--bg-tertiary)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <label
                    className="toggle"
                    style={{
                      position: "relative",
                      display: "inline-block",
                      width: 36,
                      height: 20,
                      flexShrink: 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={grants[i] ?? true}
                      onChange={() => handleToggle(i)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: grants[i] ? "var(--success)" : "var(--bg-active)",
                        borderRadius: 10,
                        transition: "all var(--transition)",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: grants[i] ? 18 : 2,
                          top: 2,
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: "white",
                          transition: "all var(--transition)",
                        }}
                      />
                    </span>
                  </label>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-6">
                      <span>{PermissionDialog.getIcon(perm)}</span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        {PermissionDialog.getLabel(perm)}
                      </span>
                      {danger === "high" && (
                        <span className="badge badge-warning" style={{ fontSize: 10 }}>
                          High Risk
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                      {perm.description}
                    </div>
                    {perm.paths && perm.paths.length > 0 && (
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                        Paths: {perm.paths.join(", ")}
                      </div>
                    )}
                    {perm.domains && perm.domains.length > 0 && (
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                        Domains: {perm.domains.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {dangerLevel && (
            <div
              style={{
                marginTop: 16,
                padding: "10px 12px",
                background: "rgba(231, 76, 60, 0.1)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
                color: "var(--danger)",
                lineHeight: 1.5,
              }}
            >
              ⚠️ This plugin requests high-risk permissions. Only approve if you trust the source.
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={handleCancel}>
            Deny All
          </button>
          <button
            className="btn btn-primary"
            onClick={handleApprove}
            disabled={submitted}
          >
            {allGranted ? "Approve All" : `Approve (${Object.values(grants).filter(Boolean).length}/${permissions.length})`}
          </button>
        </div>
      </div>
    </div>
  );

  // Static methods exposed for use in template
}

// Static helpers — exposed as static on the component
PermissionDialog.getLabel = (perm: ManifestPermission): string => {
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
};

PermissionDialog.getIcon = (perm: ManifestPermission): string => {
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
};

PermissionDialog.getDanger = (perm: ManifestPermission): "low" | "medium" | "high" => {
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
};