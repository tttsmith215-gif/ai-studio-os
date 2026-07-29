import { useStore } from "../store/context";

export function ThemeLibrary() {
  const { state, dispatch } = useStore();

  return (
    <div className="panel-container">
      <div className="panel-header">
        <h1 className="panel-title">Theme Library</h1>
        <p className="panel-subtitle">Color palettes, typography, and design tokens</p>
      </div>
      <div className="panel-grid">
        {state.themePresets.map((t) => {
          const isActive = state.activeTheme === t.id;
          const colors = Object.values(t.colors).slice(0, 5);
          return (
            <div
              className={`panel-card ${isActive ? "theme-card-active" : ""}`}
              key={t.id}
              onClick={() => dispatch({ type: "THEME_SET", theme: t.id })}
            >
              <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                {colors.map((c, i) => (
                  <div key={i} className="theme-swatch" style={{ background: c }} />
                ))}
              </div>
              <div className="panel-card-title">
                {t.name}
                {isActive && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--accent)" }}>Active</span>}
              </div>
              <div className="panel-card-desc">Click to apply this theme</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}