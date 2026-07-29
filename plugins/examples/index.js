// AI Studio OS — Sample Plugin
// This demonstrates the basic plugin lifecycle and Host API usage.

/**
 * Called when the plugin is activated by the host.
 * Receives the full HostAPI for interacting with the application.
 */
function activate(host) {
  console.log(`[SamplePlugin] Activated! Host v${host.hostVersion} on ${host.platform}`);

  // Register a custom panel
  host.panels.register({
    id: "sample-panel",
    label: "Sample Plugin",
    icon: "🧪",
    component: SamplePanel,
    position: "sidebar",
  });

  // Register a command with keyboard shortcut
  host.commands.register({
    id: "sample-plugin.greet",
    label: "Sample: Say Hello",
    shortcut: "Ctrl+Shift+H",
    execute: () => {
      host.notifications.info("Hello from Sample Plugin! 👋");
    },
  });

  // Register a store listener
  const unsub = host.store.subscribe("activeTheme", (theme) => {
    console.log(`[SamplePlugin] Theme changed to: ${theme}`);
  });

  // Return extension contributions
  return {
    // No contributions for this basic example
    // In a real plugin, you'd return apps, animations, etc.
  };
}

/**
 * Called when the plugin is deactivated by the host.
 * Clean up any resources here.
 */
function deactivate() {
  console.log("[SamplePlugin] Deactivated!");
}

/**
 * Called after all plugins have finished activating.
 * Good for cross-plugin wiring.
 */
function onReady() {
  console.log("[SamplePlugin] All plugins ready!");
  host.notifications.success("Sample Plugin loaded successfully");
}

/**
 * Called when host settings change.
 */
function onSettingsChanged(diff) {
  console.log("[SamplePlugin] Settings changed:", diff);
}

// Panel component (simple React-like function)
function SamplePanel() {
  const [count, setCount] = useState(0);

  return (
    '<div style="padding: 16px">' +
      '<h3 style="margin-bottom: 12px">🧪 Sample Plugin</h3>' +
      '<p style="color: var(--text-secondary); margin-bottom: 16px">' +
        "This panel is contributed by a sample plugin. It demonstrates the Host API." +
      "</p>" +
      '<div style="display: flex; gap: 8px; margin-bottom: 16px">' +
        `<button onclick="host.dialogs.confirm('Test dialog?').then(r => host.notifications.info('Result: ' + r))">Test Dialog</button>` +
        `<button onclick="host.ai.generateText({prompt: 'Hello!'}).then(r => host.notifications.info(r))">Test AI</button>` +
      "</div>" +
      '<div style="font-size: 12px; color: var(--text-muted)">' +
        "✨ Check the console for event logs" +
      "</div>" +
    "</div>"
  );
}

// Export the plugin manifest lifecycle hooks
export { activate, deactivate, onReady, onSettingsChanged };