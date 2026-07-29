import { useState } from "react";
import type { Composition, Layer, ShapeKind } from "../engine/types";
import { makeLayer, DEFAULT_TRANSFORM } from "../engine/types";

interface LayerPanelProps {
  composition: Composition;
  selectedLayer: string | null;
  onUpdateComposition: (comp: Composition) => void;
}

export function LayerPanel({ composition, selectedLayer, onUpdateComposition }: LayerPanelProps) {
  const [showAdd, setShowAdd] = useState(false);

  const layer = composition.layers.find((l) => l.id === selectedLayer);

  const addLayer = (type: "shape" | "text") => {
    const colors = ["#6c5ce7", "#2ecc71", "#3498db", "#e74c3c", "#f39c12", "#1abc9c"];
    const color = colors[composition.layers.length % colors.length];
    let newLayer: Layer;

    if (type === "shape") {
      newLayer = makeLayer("shape", `Shape ${composition.layers.length + 1}`, {
        kind: "shape",
        shape: "rectangle",
        width: 200,
        height: 150,
        fill: color,
        cornerRadius: 8,
      }, 100 + composition.layers.length * 20, 100 + composition.layers.length * 20);
    } else {
      newLayer = makeLayer("text", `Text ${composition.layers.length + 1}`, {
        kind: "text",
        text: "Hello",
        fontSize: 48,
        fontFamily: "Inter, sans-serif",
        color: "#ffffff",
        align: "center",
      }, 200, 200);
    }

    onUpdateComposition({ ...composition, layers: [...composition.layers, newLayer] });
    setShowAdd(false);
  };

  const updateLayer = (id: string, patch: Partial<Layer>) => {
    onUpdateComposition({
      ...composition,
      layers: composition.layers.map((l) => (l.id === id ? { ...l, ...patch } as Layer : l)),
    });
  };

  const updateTransform = (key: string, value: number) => {
    if (!layer) return;
    updateLayer(layer.id, { transform: { ...layer.transform, [key]: value } });
  };

  const updateContent = (patch: Record<string, any>) => {
    if (!layer) return;
    updateLayer(layer.id, { content: { ...layer.content, ...patch } as any });
  };

  const addKeyframe = () => {
    if (!layer) return;
    updateLayer(layer.id, {
      keyframes: [
        ...layer.keyframes,
        { frame: 0, props: { ...layer.transform }, easing: "linear" },
      ],
    });
  };

  return (
    <div className="layer-panel">
      <div className="layer-panel-header">
        <span className="layer-panel-title">Layers</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => addLayer("shape")}>+ Shape</button>
          <button className="btn" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => addLayer("text")}>+ Text</button>
        </div>
      </div>

      {layer && (
        <div className="layer-props">
          <div className="layer-props-section">
            <div className="layer-props-title">Transform</div>
            <div className="layer-props-grid">
              {[
                { key: "x", label: "X" },
                { key: "y", label: "Y" },
                { key: "scaleX", label: "SX" },
                { key: "scaleY", label: "SY" },
                { key: "rotation", label: "Rot" },
                { key: "opacity", label: "Op" },
              ].map(({ key, label }) => (
                <div key={key} className="layer-prop">
                  <span className="layer-prop-label">{label}</span>
                  <input
                    type="number"
                    className="layer-prop-input"
                    value={Math.round((layer.transform as any)[key] * 100) / 100}
                    onChange={(e) => updateTransform(key, Number(e.target.value))}
                    step={key === "opacity" || key === "scaleX" || key === "scaleY" ? 0.1 : 1}
                  />
                </div>
              ))}
            </div>
          </div>

          {layer.content.kind === "shape" && (
            <div className="layer-props-section">
              <div className="layer-props-title">Shape</div>
              <div className="layer-props-grid">
                <div className="layer-prop">
                  <span className="layer-prop-label">Type</span>
                  <select
                    className="layer-prop-input"
                    value={layer.content.shape}
                    onChange={(e) => updateContent({ shape: e.target.value as ShapeKind })}
                  >
                    <option value="rectangle">Rectangle</option>
                    <option value="ellipse">Ellipse</option>
                    <option value="triangle">Triangle</option>
                    <option value="star">Star</option>
                  </select>
                </div>
                <div className="layer-prop">
                  <span className="layer-prop-label">W</span>
                  <input type="number" className="layer-prop-input" value={layer.content.width} onChange={(e) => updateContent({ width: Number(e.target.value) })} />
                </div>
                <div className="layer-prop">
                  <span className="layer-prop-label">H</span>
                  <input type="number" className="layer-prop-input" value={layer.content.height} onChange={(e) => updateContent({ height: Number(e.target.value) })} />
                </div>
                <div className="layer-prop">
                  <span className="layer-prop-label">Fill</span>
                  <input type="color" className="layer-prop-color" value={layer.content.fill} onChange={(e) => updateContent({ fill: e.target.value })} />
                </div>
                <div className="layer-prop" style={{ gridColumn: "span 2" }}>
                  <span className="layer-prop-label">Radius</span>
                  <input type="number" className="layer-prop-input" value={layer.content.cornerRadius || 0} onChange={(e) => updateContent({ cornerRadius: Number(e.target.value) })} />
                </div>
              </div>
            </div>
          )}

          {layer.content.kind === "text" && (
            <div className="layer-props-section">
              <div className="layer-props-title">Text</div>
              <div className="layer-props-grid">
                <div className="layer-prop" style={{ gridColumn: "span 2" }}>
                  <span className="layer-prop-label">Text</span>
                  <input type="text" className="layer-prop-input" value={layer.content.text} onChange={(e) => updateContent({ text: e.target.value })} />
                </div>
                <div className="layer-prop">
                  <span className="layer-prop-label">Size</span>
                  <input type="number" className="layer-prop-input" value={layer.content.fontSize} onChange={(e) => updateContent({ fontSize: Number(e.target.value) })} />
                </div>
                <div className="layer-prop">
                  <span className="layer-prop-label">Color</span>
                  <input type="color" className="layer-prop-color" value={layer.content.color} onChange={(e) => updateContent({ color: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          <div className="layer-props-section">
            <div className="layer-props-title">Keyframes ({layer.keyframes.length})</div>
            <button className="btn" style={{ fontSize: 11, padding: "3px 8px", width: "100%" }} onClick={addKeyframe}>
              + Add Keyframe at Current Position
            </button>
            {layer.keyframes.map((kf, i) => (
              <div key={i} className="keyframe-row">
                <span className="kf-frame">Frame {kf.frame}</span>
                <select
                  className="kf-easing"
                  value={kf.easing}
                  onChange={(e) => {
                    const newKfs = [...layer.keyframes];
                    newKfs[i] = { ...kf, easing: e.target.value as any };
                    updateLayer(layer.id, { keyframes: newKfs });
                  }}
                >
                  <option value="linear">Linear</option>
                  <option value="ease">Ease</option>
                  <option value="ease-in">Ease In</option>
                  <option value="ease-out">Ease Out</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {!layer && (
        <div className="layer-panel-empty">
          Select a layer to edit properties
        </div>
      )}
    </div>
  );
}