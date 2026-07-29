// ---------------------------------------------------------------------------
// AI Studio OS — Permission Dialog Manager
// ---------------------------------------------------------------------------
// Listens for permission-dialog-open events and renders the PermissionDialog.
// Place this component once in the app shell.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from "react";
import { PermissionDialog } from "./PermissionDialog";
import type { ManifestPermission } from "../plugins/manifest-schema";

interface PendingDialog {
  dialogId: string;
  pluginId: string;
  pluginName: string;
  permissions: ManifestPermission[];
}

export function PermissionDialogManager() {
  const [dialog, setDialog] = useState<PendingDialog | null>(null);

  const handler = useCallback((event: Event) => {
    const detail = (event as CustomEvent).detail as PendingDialog;
    setDialog(detail);
  }, []);

  useEffect(() => {
    window.addEventListener("permission-dialog-open", handler as EventListener);
    return () =>
      window.removeEventListener("permission-dialog-open", handler as EventListener);
  }, [handler]);

  if (!dialog) return null;

  return (
    <PermissionDialog
      dialogId={dialog.dialogId}
      pluginId={dialog.pluginId}
      pluginName={dialog.pluginName}
      permissions={dialog.permissions}
    />
  );
}