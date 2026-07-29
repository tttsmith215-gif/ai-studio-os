import { useStore } from "../store/context";
import { pluginRegistry } from "../plugins/registry";

interface NavItem {
  id: string;
  name: string;
  icon: string;
  category: string;
}

const appNav: NavItem[] = [
  { id: "motion-studio", name: "Motion Studio", icon: "🎬", category: "Apps" },
  { id: "publishing", name: "Publishing", icon: "📡", category: "Apps" },
  { id: "analytics", name: "Analytics", icon: "📊", category: "Apps" },
];

const systemNav: NavItem[] = [
  { id: "home", name: "Home", icon: "◉", category: "System" },
  { id: "projects", name: "Projects", icon: "📁", category: "System" },
  { id: "app-store", name: "App Store", icon: "🧩", category: "System" },
  { id: "render-queue", name: "Render Queue", icon: "🎞️", category: "System" },
  { id: "export-manager", name: "Export Manager", icon: "📤", category: "System" },
  { id: "settings", name: "Settings", icon: "⚙️", category: "System" },
  { id: "console", name: "Console / Logs", icon: "⌨️", category: "System" },
];

const libraryNav: NavItem[] = [
  { id: "templates", name: "Templates", icon: "📋", category: "Library" },
  { id: "theme-library", name: "Theme Library", icon: "🎨", category: "Library" },
  { id: "animation-library", name: "Animation Library", icon: "⚡", category: "Library" },
  { id: "asset-library", name: "Asset Library", icon: "🖼️", category: "Library" },
  { id: "prompt-library", name: "Prompt Library", icon: "💬", category: "Library" },
  { id: "ai-agents", name: "AI Agents", icon: "🤖", category: "Library" },
];

const categories = ["Apps", "System", "Library"];

export function Sidebar() {
  const { state, dispatch } = useStore();
  const active = state.activePanel;

  // Merge registered apps into the Apps section
  const registeredApps = Array.from(pluginRegistry.extension.apps.values());
  const extraApps = registeredApps
    .filter((a) => !appNav.some((n) => n.id === a.id))
    .map((a) => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      category: "Apps" as const,
    }));

  const allAppNav = [...appNav, ...extraApps];

  const navSections = [
    { category: "Apps", items: allAppNav },
    { category: "System", items: systemNav },
    { category: "Library", items: libraryNav },
  ];

  const installedCount = state.plugins.filter((p) => p.installed).length;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">AI</div>
        <span>AI Studio OS</span>
      </div>
      <nav className="sidebar-nav">
        {navSections.map(({ category, items }) => (
          items.length > 0 && (
            <div className="sidebar-section" key={category}>
              <div className="sidebar-section-title">{category}</div>
              {items.map((item) => (
                <button
                  key={item.id}
                  className={`sidebar-item ${active === item.id ? "active" : ""}`}
                  onClick={() => dispatch({ type: "NAVIGATE", panel: item.id })}
                >
                  <span className="sidebar-item-icon">{item.icon}</span>
                  {item.name}
                </button>
              ))}
            </div>
          )
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className="sidebar-item sidebar-footer-item" onClick={() => dispatch({ type: "NAVIGATE", panel: "app-store" })}>
          <span className="sidebar-item-icon">🧩</span>
          {installedCount} apps installed
        </button>
      </div>
    </aside>
  );
}