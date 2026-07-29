// ---------------------------------------------------------------------------
// AI Studio OS — App Store Marketplace
// ---------------------------------------------------------------------------
// Connects to the marketplace registry, supports featured/community
// sections, search, category filtering, and drag-and-drop install.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, useCallback } from "react";
import { useStore } from "../store/context";
import { pluginRegistry } from "../plugins/registry";
import { marketplace, type MarketplaceListing } from "../plugins/marketplace";
import { dynamicLoader } from "../plugins/dynamic-loader";
import { permissionManager } from "../plugins/permissions";

const appCategories = [
  { id: "motion", label: "Motion", icon: "🎬" },
  { id: "video", label: "Video", icon: "🎥" },
  { id: "image", label: "Image", icon: "🖼️" },
  { id: "audio", label: "Audio", icon: "🎵" },
  { id: "text", label: "Text", icon: "📝" },
  { id: "manage", label: "Management", icon: "📊" },
  { id: "3d", label: "3D", icon: "🧊" },
  { id: "system", label: "System", icon: "⚙️" },
];

export function AppStore() {
  const { state, dispatch } = useStore();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [installStatus, setInstallStatus] = useState<{ id: string; status: "installing" | "done" | "error"; message: string } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Load marketplace listings
  useEffect(() => {
    setLoading(true);
    marketplace.fetchListings().then((all) => {
      setListings(all);
      setLoading(false);
    });
  }, []);

  // Check if a plugin is installed (by matching the SDK id or the marketplace id)
  const isInstalled = useCallback(
    (listingId: string): boolean => {
      // Check the dynamic loader first
      const installed = dynamicLoader.getInstalled().some((p) => p.id === listingId);
      if (installed) return true;
      // Check the plugin registry
      const registered = pluginRegistry.get(listingId);
      if (registered) return true;
      // Check the store plugins
      return state.plugins.some((p) => p.id === listingId || p.id === listingId.split(".").pop());
    },
    [state.plugins],
  );

  // Get the store plugin id for a listing
  const getStoreId = (listing: MarketplaceListing): string => {
    // Try to match by short id (last segment of reverse-domain)
    const shortId = listing.id.split(".").pop() || listing.id;
    const storePlugin = state.plugins.find((p) => p.id === shortId || p.id === listing.id);
    return storePlugin?.id || shortId || listing.id;
  };

  // Handle install click
  const handleInstall = async (listing: MarketplaceListing) => {
    const storeId = getStoreId(listing);

    if (isInstalled(listing.id)) {
      // Open the app
      dispatch({ type: "NAVIGATE", panel: storeId });
      return;
    }

    // Request permissions if the listing has a manifest with permissions
    if (listing.manifest?.permissions && listing.manifest.permissions.length > 0) {
      const grants = await permissionManager.requestPermissions(
        listing.id,
        listing.name,
        listing.manifest.permissions,
      );
      const denied = grants.filter((g) => !g.granted);
      if (denied.length > 0) {
        dispatch({ type: "NOTIFY", id: `perm-${listing.id}`, message: `"${listing.name}" install cancelled — permissions denied`, level: "warning" });
        return;
      }
    }

    setInstallStatus({ id: listing.id, status: "installing", message: `Installing ${listing.name}...` });

    // Simulate install (in production, this downloads from the marketplace)
    setTimeout(() => {
      // Toggle the plugin in the store
      dispatch({ type: "PLUGIN_TOGGLE", id: storeId });
      setInstallStatus({ id: listing.id, status: "done", message: `"${listing.name}" installed` });
      dispatch({ type: "NOTIFY", id: `install-${listing.id}`, message: `"${listing.name}" installed successfully`, level: "success" });

      setTimeout(() => setInstallStatus(null), 3000);
    }, 1500);
  };

  // Handle drag-and-drop install
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const zipFiles = files.filter((f) => f.name.endsWith(".zip") || f.name.endsWith(".aios-plugin"));

    if (zipFiles.length === 0) {
      dispatch({ type: "NOTIFY", id: "drop-error", message: "Drop a .zip or .aios-plugin file to install", level: "warning" });
      return;
    }

    for (const file of zipFiles) {
      dispatch({ type: "NOTIFY", id: `drop-${file.name}`, message: `Installing ${file.name}...`, level: "info" });

      try {
        const buffer = await file.arrayBuffer();
        const plugin = await dynamicLoader.installFromZip(buffer);

        if (plugin) {
          dispatch({ type: "NOTIFY", id: `install-${plugin.id}`, message: `"${plugin.manifest.name}" installed from ${file.name}`, level: "success" });
        } else {
          dispatch({ type: "NOTIFY", id: `fail-${file.name}`, message: `Failed to install ${file.name} — invalid plugin`, level: "error" });
        }
      } catch (err: any) {
        dispatch({ type: "NOTIFY", id: `fail-${file.name}`, message: `Install failed: ${err.message}`, level: "error" });
      }
    }
  };

  // Filter logic
  const featured = listings.filter((l) => l.isFeatured);
  const community = listings.filter((l) => l.isCommunity);

  const filtered = listings.filter((l) => {
    if (filterCat && l.category !== filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.author.toLowerCase().includes(q) ||
        l.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const installedCount = state.plugins.filter((p) => p.installed).length;

  return (
    <div
      className="panel-container"
      ref={dropRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ position: "relative" }}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(108, 92, 231, 0.15)",
            border: "3px dashed var(--accent)",
            borderRadius: "var(--radius-lg)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            fontWeight: 700,
            color: "var(--accent)",
            pointerEvents: "none",
          }}
        >
          📦 Drop Plugin Here
        </div>
      )}

      <div className="panel-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="panel-title">🧩 App Store</h1>
            <p className="panel-subtitle">
              Discover, install, and manage creative apps · {installedCount} installed
            </p>
          </div>
          <div className="flex items-center gap-8">
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              📦 Drop .zip to install
            </span>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div
        className="flex items-center gap-8 mb-16"
        style={{
          padding: "8px 14px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <span>🔍</span>
        <input
          placeholder="Search apps, authors, tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
          style={{
            border: "none",
            background: "transparent",
            outline: "none",
            fontSize: 14,
            color: "var(--text-primary)",
          }}
        />
        {loading && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading...</span>}
      </div>

      {/* Category filter */}
      <div className="flex gap-6 mb-20 flex-wrap">
        <button
          className={`sidebar-item ${!filterCat ? "active" : ""}`}
          onClick={() => setFilterCat(null)}
          style={{ borderRadius: 6, padding: "4px 12px", fontSize: 12 }}
        >
          All
        </button>
        {appCategories.map((cat) => (
          <button
            key={cat.id}
            className={`sidebar-item ${filterCat === cat.id ? "active" : ""}`}
            onClick={() => setFilterCat(cat.id === filterCat ? null : cat.id)}
            style={{ borderRadius: 6, padding: "4px 12px", fontSize: 12 }}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Install status banner */}
      {installStatus && (
        <div
          className="flex items-center gap-8 mb-16"
          style={{
            padding: "8px 14px",
            background:
              installStatus.status === "done"
                ? "rgba(46, 204, 113, 0.15)"
                : installStatus.status === "error"
                  ? "rgba(231, 76, 60, 0.15)"
                  : "rgba(108, 92, 231, 0.15)",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            color:
              installStatus.status === "done"
                ? "var(--success)"
                : installStatus.status === "error"
                  ? "var(--danger)"
                  : "var(--accent)",
          }}
        >
          {installStatus.status === "installing" ? "⏳" : installStatus.status === "done" ? "✅" : "❌"}
          {installStatus.message}
        </div>
      )}

      {/* Featured section */}
      {!filterCat && !search && featured.length > 0 && (
        <div className="mb-28">
          <h2 className="panel-section-header">⭐ Featured</h2>
          <div
            className="panel-grid"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
          >
            {featured.map((app) => (
              <MarketplaceCard
                key={app.id}
                listing={app}
                installed={isInstalled(app.id)}
                onInstall={() => handleInstall(app)}
                installStatus={installStatus?.id === app.id ? installStatus.status : null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Community section */}
      {!filterCat && !search && community.length > 0 && (
        <div className="mb-28">
          <h2 className="panel-section-header">🌍 Community</h2>
          <div
            className="panel-grid"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
          >
            {community.map((app) => (
              <MarketplaceCard
                key={app.id}
                listing={app}
                installed={isInstalled(app.id)}
                onInstall={() => handleInstall(app)}
                installStatus={installStatus?.id === app.id ? installStatus.status : null}
              />
            ))}
          </div>
        </div>
      )}

      {/* All / search results */}
      {filtered.length > 0 && (search || filterCat) ? (
        <div>
          <h2
            style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 12,
              color: "var(--text-secondary)",
            }}
          >
            {search
              ? `Search results for "${search}"`
              : filterCat
                ? appCategories.find((c) => c.id === filterCat)?.label || "Apps"
                : "All Apps"}
          </h2>
          <div
            className="panel-grid"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
          >
            {filtered.map((app) => (
              <MarketplaceCard
                key={app.id}
                listing={app}
                installed={isInstalled(app.id)}
                onInstall={() => handleInstall(app)}
                installStatus={installStatus?.id === app.id ? installStatus.status : null}
              />
            ))}
          </div>
        </div>
      ) : search || filterCat ? (
        <div className="placeholder-panel" style={{ height: 120 }}>
          <div className="placeholder-text" style={{ fontSize: 13 }}>
            No apps match your search. Try a different category or keyword.
          </div>
        </div>
      ) : null}

      {/* Drag-and-drop hint */}
      {!search && !filterCat && (
        <div
          className="flex items-center justify-center gap-12 mt-16"
          style={{
            padding: 24,
            border: "1px dashed var(--border-color)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-muted)",
            fontSize: 12,
          }}
        >
          📦 Drop a <code style={{ fontSize: 12, color: "var(--text-secondary)" }}>.zip</code> or{" "}
          <code style={{ fontSize: 12, color: "var(--text-secondary)" }}>.aios-plugin</code> file here to install
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Marketplace Card
// ---------------------------------------------------------------------------
function MarketplaceCard({
  listing,
  installed,
  onInstall,
  installStatus,
}: {
  listing: MarketplaceListing;
  installed: boolean;
  onInstall: () => void;
  installStatus: "installing" | "done" | "error" | null;
}) {
  return (
    <div
      className={`plugin-card ${installed ? "installed" : ""}`}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <div className="plugin-card-top">
        <div className="flex items-center gap-8">
          <span style={{ fontSize: 28 }}>{listing.icon}</span>
          <div>
            <div className="flex items-center gap-4">
              {listing.isVerified && (
                <span style={{ fontSize: 12 }} title="Verified by AI Studio OS">✅</span>
              )}
              {listing.isFeatured && (
                <span className="badge badge-success" style={{ fontSize: 10 }}>Featured</span>
              )}
              {listing.isCommunity && (
                <span className="badge badge-default" style={{ fontSize: 10 }}>Community</span>
              )}
            </div>
          </div>
        </div>
        <button
          className={`btn btn-sm ${installed ? "btn-outline" : "btn-primary"}`}
          style={{ fontSize: 11, padding: "4px 10px" }}
          onClick={onInstall}
          disabled={installStatus === "installing"}
        >
          {installStatus === "installing" ? "⏳..." : installed ? "Open" : "Install"}
        </button>
      </div>
      <div className="plugin-card-name">{listing.name}</div>
      <div className="plugin-card-desc" style={{ flex: 1 }}>
        {listing.description}
      </div>
      <div
        className="flex items-center gap-8 mt-8"
        style={{ fontSize: 11, color: "var(--text-muted)" }}
      >
        <span>👤 {listing.author}</span>
        <span>⬇️ {listing.downloads.toLocaleString()}</span>
        {listing.rating > 0 && <span>⭐ {listing.rating.toFixed(1)}</span>}
      </div>
      <div className="plugin-card-footer" style={{ marginTop: 8 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          v{listing.version}
        </span>
        <span className={`badge ${installed ? "badge-success" : "badge-warning"}`}>
          {installed ? "Installed" : "Available"}
        </span>
      </div>
    </div>
  );
}