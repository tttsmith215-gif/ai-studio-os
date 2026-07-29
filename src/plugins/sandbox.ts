// ---------------------------------------------------------------------------
// AI Studio OS — Plugin Sandbox (WebView Isolation)
// ---------------------------------------------------------------------------
// Provides iframe-based sandboxing for untrusted plugins.
// Each plugin gets its own isolated iframe with a controlled API surface.
// ---------------------------------------------------------------------------

export interface SandboxOptions {
  pluginId: string;
  pluginName: string;
  permissions: string[];
  html?: string;
  scriptUrl?: string;
  width?: string;
  height?: string;
}

export interface SandboxInstance {
  iframe: HTMLIFrameElement;
  pluginId: string;
  postMessage: (data: unknown) => void;
  destroy: () => void;
}

// ---------------------------------------------------------------------------
// Safe API methods that are injected into sandboxed iframes
// These are whitelisted — plugins cannot access the host API directly.
// ---------------------------------------------------------------------------
const SANDBOX_API_METHODS = [
  "host.getPluginId",
  "host.getPlatform",
  "host.store.get",
  "host.store.set",
  "host.notifications.info",
  "host.notifications.success",
  "host.notifications.warning",
  "host.notifications.error",
  "host.events.on",
  "host.events.emit",
  "host.dialogs.confirm",
  "host.dialogs.prompt",
  "host.locale.t",
  "host.locale.getLanguage",
  "host.settings.get",
  "host.settings.set",
  "host.projects.getCurrent",
  "host.ai.generateText",
  "host.filesystem.readPluginFile",
  "host.filesystem.writePluginFile",
  "host.filesystem.listPluginFiles",
];

// Permission to API method mapping
const PERMISSION_API_MAP: Record<string, string[]> = {
  filesystem: ["host.filesystem.readPluginFile", "host.filesystem.writePluginFile", "host.filesystem.listPluginFiles", "host.filesystem.deletePluginFile", "host.filesystem.readUserFile"],
  network: [],
  ai: ["host.ai.generateText", "host.ai.generateTextStream", "host.ai.generateImage"],
  voice: [],
  clipboard: [],
  "native-shell": [],
};

// ---------------------------------------------------------------------------
// Create a sandboxed iframe for a plugin
// ---------------------------------------------------------------------------
export function createPluginSandbox(options: SandboxOptions): SandboxInstance {
  const iframe = document.createElement("iframe");

  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
  iframe.setAttribute("loading", "lazy");
  iframe.style.border = "none";
  iframe.style.width = options.width || "100%";
  iframe.style.height = options.height || "100%";
  iframe.style.borderRadius = "inherit";

  // Build the sandbox HTML
  const sandboxHtml = buildSandboxHtml(options);

  // Write to iframe
  iframe.srcdoc = sandboxHtml;

  const messageChannel = new MessageChannel();

  // Handle messages from the sandbox
  const messageHandler = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow) return;

    const { method, args, callId } = event.data || {};

    if (!method || !callId) return;

    // Check if method is allowed for this plugin's permissions
    const isAllowed = isMethodAllowed(method, options.permissions);
    if (!isAllowed) {
      postSandboxResponse(iframe, callId, {
        error: `Permission denied: "${method}" is not in the allowed API for this plugin`,
      });
      return;
    }

    // Execute the method (delegate to the host)
    executeSandboxMethod(method, args)
      .then((result) => {
        postSandboxResponse(iframe, callId, { result });
      })
      .catch((error) => {
        postSandboxResponse(iframe, callId, { error: String(error) });
      });
  };

  window.addEventListener("message", messageHandler);

  return {
    iframe,
    pluginId: options.pluginId,
    postMessage: (data: unknown) => {
      iframe.contentWindow?.postMessage(data, "*");
    },
    destroy: () => {
      window.removeEventListener("message", messageHandler);
      iframe.remove();
    },
  };
}

// ---------------------------------------------------------------------------
// Build the sandbox HTML with injected API proxy
// ---------------------------------------------------------------------------
function buildSandboxHtml(options: SandboxOptions): string {
  const allowedMethods = SANDBOX_API_METHODS.filter((m) =>
    isMethodAllowed(m, options.permissions)
  );

  const apiStubs = allowedMethods
    .map((method) => {
      return `"${method}": (...args) => _call("${method}", args)`;
    })
    .join(",\n");

  // Build nested host object
  const hostObject = buildNestedHostObject(allowedMethods);

  const pluginScript = options.scriptUrl
    ? `<script src="${options.scriptUrl}"><\/script>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  ${pluginScript}
  <script>
    let _callId = 0;
    const _pending = new Map();

    window.addEventListener("message", function(event) {
      const { callId, result, error } = event.data || {};
      if (callId && _pending.has(callId)) {
        const { resolve, reject } = _pending.get(callId);
        _pending.delete(callId);
        if (error) reject(new Error(error));
        else resolve(result);
      }
    });

    function _call(method, args) {
      return new Promise((resolve, reject) => {
        const callId = ++_callId;
        _pending.set(callId, { resolve, reject });
        window.parent.postMessage({ method, args, callId }, "*");
      });
    }

    // Host API — only methods the plugin has permission for
    const host = ${hostObject};

    // Plugin entry
    ${options.html ? `(function() { ${options.html} })();` : ''}
  <\/script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Build the nested host API proxy object
// ---------------------------------------------------------------------------
function buildNestedHostObject(methods: string[]): string {
  const tree: Record<string, any> = {};

  for (const method of methods) {
    const parts = method.split(".");
    let current = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    const last = parts[parts.length - 1];
    current[last] = `(...args) => _call("${method}", args)`;
  }

  return JSON.stringify(tree, (key, value) => {
    if (typeof value === "string" && value.startsWith("(")) {
      // This is a function stub in string form
      return value;
    }
    return value;
  }, 2).replace(/"\(\.\.\.args\) => _call\([^)]+\)"/g, (match) => {
    return match.slice(1, -1);
  });
}

// ---------------------------------------------------------------------------
// Check if a method is allowed for the given permissions
// ---------------------------------------------------------------------------
function isMethodAllowed(method: string, permissions: string[]): boolean {
  // Always allow these
  const alwaysAllowed = ["host.getPluginId", "host.getPlatform", "host.notifications.info", "host.notifications.success", "host.notifications.warning", "host.notifications.error", "host.events.on", "host.events.emit", "host.locale.t", "host.locale.getLanguage", "host.dialogs.confirm", "host.dialogs.prompt", "host.store.get", "host.store.set", "host.settings.get", "host.settings.set", "host.projects.getCurrent"];

  if (alwaysAllowed.includes(method)) return true;

  // Check permission-based methods
  for (const [perm, methods] of Object.entries(PERMISSION_API_MAP)) {
    if (permissions.includes(perm) && methods.includes(method)) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Post a response back to the sandbox iframe
// ---------------------------------------------------------------------------
function postSandboxResponse(iframe: HTMLIFrameElement, callId: number, data: { result?: unknown; error?: string }): void {
  iframe.contentWindow?.postMessage({ callId, ...data }, "*");
}

// ---------------------------------------------------------------------------
// Execute a sandbox method call in the host context
// ---------------------------------------------------------------------------
async function executeSandboxMethod(method: string, args: unknown[]): Promise<unknown> {
  // This would normally delegate to the real HostAPI
  // For now, return mock implementations for development
  switch (method) {
    case "host.getPluginId":
      return "sandbox-plugin";
    case "host.getPlatform":
      return navigator.platform;
    case "host.notifications.info":
    case "host.notifications.success":
    case "host.notifications.warning":
    case "host.notifications.error":
      console.log(`[Sandbox Notification] ${method.split(".").pop()}:`, args[0]);
      return "ok";
    case "host.dialogs.confirm":
      return true;
    case "host.dialogs.prompt":
      return args[1] || "";
    case "host.locale.getLanguage":
      return navigator.language;
    case "host.locale.t":
      return args[0] || "";
    case "host.store.get":
      return localStorage.getItem(`sandbox:${args[0]}`);
    case "host.store.set":
      localStorage.setItem(`sandbox:${args[0]}`, String(args[1]));
      return;
    case "host.settings.get":
      return null;
    case "host.projects.getCurrent":
      return null;
    case "host.ai.generateText":
      return "[AI response from sandbox]";
    default:
      throw new Error(`Unknown sandbox method: ${method}`);
  }
}