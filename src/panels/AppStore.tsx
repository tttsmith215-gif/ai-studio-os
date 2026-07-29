import { useState } from "react";
import { useStore } from "../store/context";
import { pluginRegistry } from "../plugins/registry";

const appCategories = [
  { id: "motion", label: "Motion", icon: "🎬" },
  { id: "video", label: "Video", icon: "🎥" },
  { id: "image", label: "Image", icon: "🖼️" },
  { id: "audio", label: "Audio", icon: "🎵" },
  { id: "text", label: "Text", icon: "📝" },
  { id: "manage", label: "Management", icon: "📊" },
];

const featuredSection = [
  { id: "motion-studio", name: "Motion Studio", desc: "Animations and motion graphics with keyframes, timeline, and AI assistance", icon: "🎬", category: "motion", recommended: true, installed: true },
  { id: "video-editor", name: "Video Editor", desc: "Multi-track video editing with transitions, effects, and AI tools", icon: "🎥", category: "video", recommended: true, installed: false },
  { id: "thumbnail-studio", name: "Thumbnail Studio", desc: "Design eye-catching thumbnails with templates and smart crop", icon: "🖼️", category: "image", recommended: true, installed: false },
];

export function AppStore() {
  const { state, dispatch } = useStore();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string | null>(null);

  const allApps = [
    ...featuredSection,
    ...state.plugins.map((p) => ({
      id: p.id,
      name: p.name,
      desc: p.description,
      icon: ({ motion: "🎬", video: "🎥", image: "🖼️", audio: "🎵", text: "📝", manage: "📊" } as Record<string, string>)[p.category] || "🧩",
      category: p.category,
      recommended: false,
      installed: p.installed,
    })),
    // Add Publishing and Analytics to the list
    { id: "publishing", name: "Publishing", desc: "Export and publish content across platforms", icon: "📡", category: "manage", recommended: false, installed: true },
    { id: "analytics", name: "Analytics", desc: "Usage insights, render benchmarks, and content performance", icon: "📊", category: "manage", recommended: false, installed: true },
  ];

  // Deduplicate by id
  const seen = new Set<string>();
  const uniqueApps = allApps.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  const filtered = uniqueApps.filter((a) => {
    if (filterCat && a.category !== filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q);
    }
    return true;
  });

  const installedCount = state.plugins.filter((p) => p.installed).length + 2; // +2 for Publishing + Analytics

  return (
    <div className="panel-container">
      <div className="panel-header">
        <h1 className="panel-title">App Store</h1>
        <p className="panel-subtitle">
          Discover and install creative apps · {installedCount} installed
        </p>
      </div>

      {/* Search bar */}
      <div className="topbar mb-16" style={{ padding: "0 0 12px 0", borderBottom: "1px solid var(--border-color)" }}>
        <div className="flex flex-1 items-center gap-8">
          <span>🔍</span>
          <input
            className="mg-comp-name"
            placeholder="Search apps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1" style={{ border: "none", background: "transparent", outline: "none", fontSize: 14 }}
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-6 mb-20 flex-wrap">
        <button
          className={`sidebar-item ${!filterCat ? "active" : ""}`}
          onClick={() => setFilterCat(null)}
          style={{ borderRadius: 6, padding: "4px 12px" }}
        >
          All
        </button>
        {appCategories.map((cat) => (
          <button
            key={cat.id}
            className={`sidebar-item ${filterCat === cat.id ? "active" : ""}`}
            onClick={() => setFilterCat(cat.id === filterCat ? null : cat.id)}
            style={{ borderRadius: 6, padding: "4px 12px" }}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Featured section */}
      {!filterCat && !search && (
        <div className="mb-28">
          <h2 className="panel-section-header">⭐ Featured</h2>
          <div className="panel-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {featuredSection.map((app) => {
              const installed = app.installed;
              return (
                <div className={`plugin-card ${installed ? "installed" : ""} flex-col`} key={app.id}>
                  <div className="plugin-card-top">
                    <span style={{ fontSize: 28 }}>{app.icon}</span>
                    <button
                      className={`btn btn-sm ${installed ? "btn-outline" : "btn-primary      style={{ fontSize: 11, padding: \"4px 10px\" }}", "newText": "                    <span style={{ fontSize: 28 }}>{app.icon}</span>\n                    <button\n                      className={`btn btn-sm ${installed ? \"btn-outline\" : \"btn-primary\"}`}", {"oldText": "                  <div className=\"plugin-card-desc\" style={{ flex: 1 }}>{app.desc}</div>", "newText": "                  <div className=\"plugin-card-desc flex-1\">{app.desc}</div>"}]
                      onClick={() => {
                        if (installed) {
                          dispatch({ type: "NAVIGATE", panel: app.id });
                        } else {
                          dispatch({ type: "NOTIFY", id: "store", message: `${app.name} coming soon`, level: "info" });
                        }
                      }}
                    >
                      {installed ? "Open" : "Install"}
                    </button>
                  </div>
                  <div className="plugin-card-name">{app.name}</div>
                  <div className="plugin-card-desc" style={{ flex: 1 }}>{app.desc}</div>
                  <div className="plugin-card-footer">
                    <span className={`badge ${installed ? "badge-success" : "badge-warning"}`}>
                      {installed ? "Installed" : "Not installed"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All apps grid */}
      {filtered.length > 0 ? (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--text-secondary)" }}>
            {filterCat ? appCategories.find((c) => c.id === filterCat)?.label || "Apps" : "All Apps"}
          </h2>
          <div className="panel-grid">
            {filtered.map((app) => {
              const installed = app.installed;
              return (
                <div className={`plugin-card ${installed ? "installed" : ""}`} key={app.id}>
                  <div className="plugin-card-top">
                    <span style={{ fontSize: 24 }}>{app.icon}</span>
                    <button
                      className={`btn ${installed ? "btn-outline-danger" : "btn-primary"}`}
                      style={{ fontSize: 11, padding: "4px 10px" }}
                      onClick={() => {
                        if (installed) {
                          dispatch({ type: "NAVIGATE", panel: app.id });
                        } else {
                          // Toggle install in the store plugins list
                          dispatch({ type: "PLUGIN_TOGGLE", id: app.id });
                        }
                      }}
                    >
                      {installed ? "Open" : "Install"}
                    </button>
                  </div>
                  <div className="plugin-card-name">{app.name}</div>
                  <div className="plugin-card-desc">{app.desc}</div>
                  <div className="plugin-card-footer">
                    <span className={`badge ${installed ? "badge-success" : "badge-warning"}`}>
                      {installed ? "Installed" : "Available"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="placeholder-panel" style={{ height: 120 }}>
          <div className="placeholder-text" style={{ fontSize: 13 }}>
            No apps match your search. Try a different category or keyword.
          </div>
        </div>
      )}
    </div>
  );
}