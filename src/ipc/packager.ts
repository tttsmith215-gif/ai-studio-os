// ─── .aistudio Package Format ──────────────────────────────────
// Plain JSON: { format: "aistudio", version: 1, name, app, data }
// Zero dependencies, works in Tauri's webview.

export interface AiStudioPackage {
  format: "aistudio";
  version: 1;
  name: string;
  app: string;
  data: string; // JSON-serialized project composition
  assets: Record<string, string>; // filename → base64 data URI
}

function isPackage(v: unknown): v is AiStudioPackage {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as any).format === "aistudio" &&
    (v as any).version === 1
  );
}

/** Export current project: download .aistudio file */
export function exportPackage(
  name: string,
  app: string,
  data: string
) {
  const { data: cleanedData, assets } = extractAssets(data);
  const pkg: AiStudioPackage = {
    format: "aistudio",
    version: 1,
    name,
    app,
    data: cleanedData,
    assets,
  };
  const blob = new Blob([JSON.stringify(pkg, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[^a-zA-Z0-9_-]/g, "_")}.aistudio`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Import a .aistudio file: return parsed package or null */
export function importPackage(): Promise<AiStudioPackage | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".aistudio";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        const text = await file.text();
        const pkg = JSON.parse(text);
        if (!isPackage(pkg)) {
          console.error("[Packager] Invalid .aistudio file");
          return resolve(null);
        }
        resolve(pkg);
      } catch (e) {
        console.error("[Packager] Failed to parse", e);
        resolve(null);
      }
    };
    input.click();
  });
}

// ─── Asset embedding ────────────────────────────────────────────

/** Extract data URIs from composition layers, return cleaned data + asset map */
function extractAssets(data: string): {
  data: string;
  assets: Record<string, string>;
} {
  const assets: Record<string, string> = {};
  try {
    const comp = JSON.parse(data);
    const layers: any[] = comp.layers ?? [];
    let changed = false;

    for (const layer of layers) {
      if (layer.content?.kind === "image" && typeof layer.content.src === "string") {
        const src = layer.content.src;
        // only data URIs — skip remote URLs and blob URLs
        if (src.startsWith("data:")) {
          const key = `asset_${layer.id}`;
          assets[key] = src;
          layer.content.src = key;
          changed = true;
        }
      }
    }

    return {
      data: changed ? JSON.stringify(comp) : data,
      assets,
    };
  } catch {
    return { data, assets };
  }
}

/** Restore asset keys back to data URIs in imported composition data */
export function restoreAssets(data: string, assets: Record<string, string>): string {
  const keys = Object.keys(assets);
  if (keys.length === 0) return data;
  try {
    const comp = JSON.parse(data);
    const layers: any[] = comp.layers ?? [];
    for (const layer of layers) {
      if (layer.content?.kind === "image" && typeof layer.content.src === "string") {
        const replacement = assets[layer.content.src];
        if (replacement) {
          layer.content.src = replacement;
        }
      }
    }
    return JSON.stringify(comp);
  } catch {
    return data;
  }
}