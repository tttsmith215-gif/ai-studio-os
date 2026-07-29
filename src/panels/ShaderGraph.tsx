// ─── Shader Graph Editor Panel ───────────────────────────────────
// Visual node-based shader editor with live WebGL2 preview.
// ponytail: flat node graph, no sub-graphs. Add when >50 nodes.

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  NODE_REGISTRY, compileShaderGraph,
  ShaderGraphDef, GraphNode, Edge, NodeDef, NodeCategory,
} from "../engine/shader-graph";

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  input: "#2ecc71",
  output: "#e74c3c",
  math: "#3498db",
  color: "#9b59b6",
  texture: "#1abc9c",
  vector: "#f39c12",
  conditional: "#e67e22",
};

const CATEGORY_ICONS: Record<NodeCategory, string> = {
  input: "I",
  output: "O",
  math: "∑",
  color: "🎨",
  texture: "◻",
  vector: "↗",
  conditional: "?",
};

// ─── Helpers ────────────────────────────────────────────────────

let _nodeId = 0;
function genId() { return `n_${++_nodeId}_${Date.now().toString(36)}`; }
let _edgeId = 0;
function genEdgeId() { return `e_${++_edgeId}`; }

function socketKey(nodeId: string, socketId: string) {
  return `${nodeId}:${socketId}`;
}

const SOCKET_COLORS: Record<string, string> = {
  float: "#74b9ff",
  vec2: "#55efc4",
  vec3: "#fdcb6e",
  vec4: "#e17055",
  color: "#fd79a8",
  sampler2D: "#00b894",
};

// ─── Component ──────────────────────────────────────────────────

export function ShaderGraph() {
  const [graph, setGraph] = useState<ShaderGraphDef>(() => ({
    name: "Custom Shader",
    nodes: [],
    edges: [],
  }));

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ nodeId: string; startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);
  const [connecting, setConnecting] = useState<{ fromNode: string; fromSocket: string } | null>(null);
  const [connectPos, setConnectPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showPalette, setShowPalette] = useState(false);
  const [palettePos, setPalettePos] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [graphName, setGraphName] = useState("Custom Shader");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  // Compile shader on graph change
  const compiled = useMemo(() => compileShaderGraph(graph), [graph]);

  // WebGL2 preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || compiled.errors.length > 0) return;

    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    const render = () => {
      if (!gl || compiled.errors.length > 0) return;
      const t = performance.now() / 1000;

      try {
        // Compile and link
        const vertShader = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vertShader, compiled.vertex);
        gl.compileShader(vertShader);
        if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
          setError("Vertex shader error: " + gl.getShaderInfoLog(vertShader));
          return;
        }

        const fragShader = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fragShader, compiled.fragment);
        gl.compileShader(fragShader);
        if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
          setError("Fragment shader error: " + gl.getShaderInfoLog(fragShader));
          return;
        }

        const program = gl.createProgram()!;
        gl.attachShader(program, vertShader);
        gl.attachShader(program, fragShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          setError("Link error: " + gl.getProgramInfoLog(program));
          return;
        }

        gl.useProgram(program);

        // Set uniforms
        const uTime = gl.getUniformLocation(program, "u_time");
        if (uTime) gl.uniform1f(uTime, t);

        const uRes = gl.getUniformLocation(program, "u_resolution");
        if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);

        // Fullscreen quad
        const quad = new Float32Array([
          -1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1,
          -1, 1, 0, 1, 1, -1, 1, 0, 1, 1, 1, 1,
        ]);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

        const aPos = gl.getAttribLocation(program, "a_position");
        const aTex = gl.getAttribLocation(program, "a_texcoord");
        if (aPos >= 0) {
          gl.enableVertexAttribArray(aPos);
          gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
        }
        if (aTex >= 0) {
          gl.enableVertexAttribArray(aTex);
          gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 16, 8);
        }

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.deleteShader(vertShader);
        gl.deleteShader(fragShader);
        gl.deleteProgram(program);
        gl.deleteBuffer(buf);

        setError(null);
      } catch (e) {
        setError(String(e));
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [compiled]);

  // ── Node operations ──

  const addNode = useCallback((type: string, x: number, y: number) => {
    const def = NODE_REGISTRY[type];
    if (!def) return;
    const id = genId();
    const defaults: Record<string, number | boolean | string | number[]> = {};
    if (def.params) {
      for (const p of def.params) {
        defaults[p.name] = p.default;
      }
    }
    setGraph((g) => ({
      ...g,
      nodes: [...g.nodes, { id, type, x, y, params: defaults }],
    }));
    setSelectedNode(id);
    setShowPalette(false);
  }, []);

  const removeNode = useCallback((id: string) => {
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.filter((n) => n.id !== id),
      edges: g.edges.filter((e) => e.fromNode !== id && e.toNode !== id),
    }));
    setSelectedNode((s) => s === id ? null : s);
  }, []);

  const removeEdge = useCallback((id: string) => {
    setGraph((g) => ({ ...g, edges: g.edges.filter((e) => e.id !== id) }));
  }, []);

  const updateNodeParam = useCallback((nodeId: string, paramName: string, value: number | boolean | string | number[]) => {
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, params: { ...n.params, [paramName]: value } }
          : n
      ),
    }));
  }, []);

  // ── Mouse handlers ──

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setDragging({
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      nodeX: node.x,
      nodeY: node.y,
    });
    setSelectedNode(nodeId);
  }, [graph.nodes]);

  const handleSocketMouseDown = useCallback((e: React.MouseEvent, nodeId: string, socketId: string, direction: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (direction === "output") {
      setConnecting({ fromNode: nodeId, fromSocket: socketId });
      setConnectPos({ x: e.clientX, y: e.clientY });
    } else {
      // Input click: try to find an edge to remove
      const edge = graph.edges.find((ed) => ed.toNode === nodeId && ed.toSocket === socketId);
      if (edge) removeEdge(edge.id);
    }
  }, [graph.edges, removeEdge]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      const dx = (e.clientX - dragging.startX) / zoom;
      const dy = (e.clientY - dragging.startY) / zoom;
      setGraph((g) => ({
        ...g,
        nodes: g.nodes.map((n) =>
          n.id === dragging.nodeId
            ? { ...n, x: dragging.nodeX + dx, y: dragging.nodeY + dy }
            : n
        ),
      }));
    }
    if (connecting) {
      setConnectPos({ x: e.clientX, y: e.clientY });
    }
  }, [dragging, connecting, zoom]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    if (connecting) {
      // Check if we're over an input socket
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el) {
        const socketData = (el as HTMLElement).dataset?.socket;
        if (socketData) {
          const [toNode, toSocket] = socketData.split(":");
          if (toNode && toSocket && toNode !== connecting.fromNode) {
            // Check no duplicate edge
            const exists = graph.edges.some(
              (ed) => ed.toNode === toNode && ed.toSocket === toSocket
            );
            if (!exists) {
              setGraph((g) => ({
                ...g,
                edges: [...g.edges, {
                  id: genEdgeId(),
                  fromNode: connecting.fromNode,
                  fromSocket: connecting.fromSocket,
                  toNode,
                  toSocket,
                }],
              }));
            }
          }
        }
      }
      setConnecting(null);
    }
    setDragging(null);
  }, [connecting, graph.edges]);

  const handleCanvasWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const dz = -e.deltaY * 0.001;
    setZoom((z) => Math.max(0.2, Math.min(3, z + dz)));
  }, []);

  const handleCanvasContext = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPalettePos({
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    });
    setShowPalette(true);
  }, [pan, zoom]);

  // ── Get socket position for edge rendering ──

  const getSocketPos = useCallback((nodeId: string, socketId: string, direction: "input" | "output") => {
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const def = NODE_REGISTRY[node.type];
    if (!def) return { x: 0, y: 0 };
    const sockets = direction === "input" ? def.inputs : def.outputs;
    const idx = sockets.findIndex((s) => s.id === socketId);
    const nodeW = 180;
    const sockH = 24;
    const headerH = 28;
    const inputCount = def.inputs.length;
    if (direction === "input") {
      return {
        x: node.x + pan.x,
        y: node.y + pan.y + headerH + 8 + idx * sockH + sockH / 2,
      };
    } else {
      return {
        x: node.x + pan.x + nodeW,
        y: node.y + pan.y + headerH + 8 + (inputCount + idx) * sockH + sockH / 2,
      };
    }
  }, [graph.nodes, pan]);

  // ── Render edges as SVG curves ──

  const edgePath = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = Math.abs(to.x - from.x) * 0.5;
    return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
  }, []);

  // ── Selected node info ──

  const selectedNodeData = useMemo(() => {
    if (!selectedNode) return null;
    const node = graph.nodes.find((n) => n.id === selectedNode);
    if (!node) return null;
    const def = NODE_REGISTRY[node.type];
    return { node, def };
  }, [selectedNode, graph.nodes]);

  // ── Render ──

  return (
    <div className="shader-graph-container">
      {/* Toolbar */}
      <div className="shader-graph-toolbar">
        <input
          className="shader-graph-name"
          value={graphName}
          onChange={(e) => setGraphName(e.target.value)}
          placeholder="Shader Name"
        />
        <div className="shader-graph-toolbar-actions">
          <span className="shader-graph-status" style={{ color: compiled.errors.length > 0 ? "var(--danger)" : "var(--success)" }}>
            {compiled.errors.length > 0 ? `${compiled.errors.length} error(s)` : "✓ Compiles"}
          </span>
          <button
            className="btn btn-sm"
            onClick={() => setShowCode(!showCode)}
          >
            {showCode ? "Hide Code" : "Show Code"}
          </button>
          <button
            className="btn btn-sm"
            onClick={() => {
              setGraph({ name: graphName, nodes: [], edges: [] });
              setSelectedNode(null);
            }}
          >
            Clear
          </button>
          <span className="shader-graph-zoom">{(zoom * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="shader-graph-body">
        {/* Graph canvas */}
        <div
          ref={graphRef}
          className="shader-graph-canvas"
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={handleCanvasWheel}
          onContextMenu={handleCanvasContext}
          onClick={() => { setSelectedNode(null); }}
          style={{ cursor: dragging ? "grabbing" : "grab" }}
        >
          {/* SVG edges layer */}
          <svg className="shader-graph-edges" style={{ pointerEvents: "none" }}>
            {graph.edges.map((edge) => {
              const from = getSocketPos(edge.fromNode, edge.fromSocket, "output");
              const to = getSocketPos(edge.toNode, edge.toSocket, "input");
              return (
                <path
                  key={edge.id}
                  d={edgePath(from, to)}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  strokeOpacity={0.8}
                  style={{ pointerEvents: "stroke", cursor: "pointer" }}
                  onClick={(e) => { e.stopPropagation(); removeEdge(edge.id); }}
                />
              );
            })}
            {/* Active connection line */}
            {connecting && (
              <path
                d={edgePath(
                  getSocketPos(connecting.fromNode, connecting.fromSocket, "output"),
                  { x: (connectPos.x - (graphRef.current?.getBoundingClientRect()?.left ?? 0)), y: (connectPos.y - (graphRef.current?.getBoundingClientRect()?.top ?? 0)) }
                )}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2}
                strokeDasharray="5,3"
                strokeOpacity={0.5}
              />
            )}
          </svg>

          {/* Nodes */}
          <div className="shader-graph-nodes" style={{ transform: `scale(${zoom})` }}>
            {graph.nodes.map((node) => {
              const def = NODE_REGISTRY[node.type];
              if (!def) return null;
              const catColor = CATEGORY_COLORS[def.category] || "var(--accent)";
              const isSelected = selectedNode === node.id;

              return (
                <div
                  key={node.id}
                  className={`shader-graph-node ${isSelected ? "selected" : ""}`}
                  style={{
                    left: node.x + pan.x / zoom,
                    top: node.y + pan.y / zoom,
                    width: 180,
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="shader-graph-node-header" style={{ background: catColor }}>
                    <span className="shader-graph-node-cat">{CATEGORY_ICONS[def.category]}</span>
                    <span className="shader-graph-node-label">{def.label}</span>
                    <button
                      className="shader-graph-node-close"
                      onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Input sockets */}
                  <div className="shader-graph-node-sockets">
                    {def.inputs.map((sock) => {
                      const connected = graph.edges.some((e) => e.toNode === node.id && e.toSocket === sock.id);
                      return (
                        <div
                          key={sock.id}
                          className="shader-graph-socket"
                          onMouseDown={(e) => handleSocketMouseDown(e, node.id, sock.id, "input")}
                        >
                          <span
                            className="shader-graph-socket-dot"
                            data-socket={`${node.id}:${sock.id}`}
                            style={{
                              background: connected ? SOCKET_COLORS[sock.kind] : "var(--text-muted)",
                              borderColor: SOCKET_COLORS[sock.kind],
                            }}
                          />
                          <span className="shader-graph-socket-name">{sock.name}</span>
                          <span className="shader-graph-socket-kind">{sock.kind}</span>
                        </div>
                      );
                    })}
                    {/* Output sockets */}
                    {def.outputs.map((sock) => (
                      <div
                        key={sock.id}
                        className="shader-graph-socket shader-graph-socket-output"
                        onMouseDown={(e) => handleSocketMouseDown(e, node.id, sock.id, "output")}
                      >
                        <span className="shader-graph-socket-kind">{sock.kind}</span>
                        <span className="shader-graph-socket-name">{sock.name}</span>
                        <span
                          className="shader-graph-socket-dot"
                          data-socket={`${node.id}:${sock.id}`}
                          style={{
                            background: SOCKET_COLORS[sock.kind],
                            borderColor: SOCKET_COLORS[sock.kind],
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {graph.nodes.length === 0 && (
            <div className="shader-graph-empty">
              <p>Right-click on canvas to add nodes</p>
              <p className="text-muted" style={{ fontSize: 11 }}>Build a shader graph with math, color, and texture nodes</p>
            </div>
          )}
        </div>

        {/* Right panel: properties + preview */}
        <div className="shader-graph-sidebar">
          {/* Preview */}
          <div className="shader-graph-preview-section">
            <div className="shader-graph-section-title">Preview</div>
            <div className="shader-graph-preview">
              <canvas
                ref={canvasRef}
                width={256}
                height={256}
                className="shader-graph-preview-canvas"
              />
              {error && <div className="shader-graph-preview-error">{error}</div>}
            </div>
          </div>

          {/* Properties */}
          <div className="shader-graph-properties-section">
            <div className="shader-graph-section-title">
              Properties
              {selectedNode && (
                <button
                  className="btn btn-sm btn-danger"
                  style={{ marginLeft: "auto", padding: "2px 8px", fontSize: 10 }}
                  onClick={() => removeNode(selectedNode)}
                >
                  Delete
                </button>
              )}
            </div>
            {selectedNodeData ? (
              <div className="shader-graph-properties">
                <div className="shader-graph-prop-row">
                  <span className="shader-graph-prop-label">Type</span>
                  <span className="shader-graph-prop-value">{selectedNodeData.def.label}</span>
                </div>
                <div className="shader-graph-prop-row">
                  <span className="shader-graph-prop-label">ID</span>
                  <span className="shader-graph-prop-value" style={{ fontSize: 10, fontFamily: "monospace" }}>{selectedNodeData.node.id.slice(0, 12)}</span>
                </div>
                {selectedNodeData.def.params?.map((param) => (
                  <div key={param.name} className="shader-graph-prop-row">
                    <span className="shader-graph-prop-label">{param.label}</span>
                    <ParamEditor
                      param={param}
                      value={selectedNodeData.node.params[param.name] ?? param.default}
                      onChange={(v) => updateNodeParam(selectedNodeData.node.id, param.name, v)}
                    />
                  </div>
                ))}
                {selectedNodeData.def.params?.length === 0 && (
                  <div className="shader-graph-prop-empty">No parameters</div>
                )}
              </div>
            ) : (
              <div className="shader-graph-prop-empty">Select a node to edit properties</div>
            )}
          </div>

          {/* Errors */}
          {compiled.errors.length > 0 && (
            <div className="shader-graph-errors-section">
              <div className="shader-graph-section-title">Errors</div>
              {compiled.errors.map((err, i) => (
                <div key={i} className="shader-graph-error">{err}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Code view (collapsible bottom panel) */}
      {showCode && (
        <div className="shader-graph-code">
          <div className="shader-graph-section-title">
            Generated GLSL Fragment Shader
            <button
              className="btn btn-sm"
              style={{ marginLeft: "auto" }}
              onClick={() => {
                navigator.clipboard.writeText(compiled.fragment);
              }}
            >
              Copy
            </button>
          </div>
          <pre className="shader-graph-code-block"><code>{compiled.fragment || "// No shader generated"}</code></pre>
        </div>
      )}

      {/* Node palette (context menu) */}
      {showPalette && (
        <NodePalette
          x={palettePos.x}
          y={palettePos.y}
          onSelect={(type) => addNode(type, palettePos.x, palettePos.y)}
          onClose={() => setShowPalette(false)}
        />
      )}

      {/* Connecting tooltip */}
      {connecting && (
        <div className="shader-graph-connecting-tip">
          Drop on an input socket to connect
        </div>
      )}
    </div>
  );
}

// ─── Node Palette ───────────────────────────────────────────────

function NodePalette({
  x, y, onSelect, onClose,
}: {
  x: number; y: number;
  onSelect: (type: string) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<NodeCategory | "all">("all");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid immediate close
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  const categories = ["all", "input", "output", "math", "color", "texture", "vector", "conditional"] as const;

  const filtered = Object.entries(NODE_REGISTRY).filter(([type, def]) => {
    if (selectedCategory !== "all" && def.category !== selectedCategory) return false;
    if (filter && !def.label.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  return (
    <div
      ref={ref}
      className="shader-graph-palette"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        className="shader-graph-palette-search"
        placeholder="Search nodes..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        autoFocus
      />
      <div className="shader-graph-palette-categories">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`shader-graph-palette-cat ${selectedCategory === cat ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === "all" ? "All" : `${CATEGORY_ICONS[cat as NodeCategory]} ${cat}`}
          </button>
        ))}
      </div>
      <div className="shader-graph-palette-list">
        {filtered.map(([type, def]) => (
          <button
            key={type}
            className="shader-graph-palette-item"
            onClick={() => onSelect(type)}
          >
            <span className="shader-graph-palette-item-color" style={{ background: CATEGORY_COLORS[def.category] }} />
            <span className="shader-graph-palette-item-label">{def.label}</span>
            <span className="shader-graph-palette-item-cat">{def.category}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="shader-graph-palette-empty">No matching nodes</div>
        )}
      </div>
    </div>
  );
}

// ─── Param Editor ───────────────────────────────────────────────

function ParamEditor({
  param, value, onChange,
}: {
  param: import("../engine/shader-graph").NodeParam;
  value: number | boolean | string | number[];
  onChange: (v: number | boolean | string | number[]) => void;
}) {
  switch (param.kind) {
    case "float":
      return (
        <input
          type="range"
          className="shader-graph-param-slider"
          min={0}
          max={1}
          step={0.01}
          value={value as number}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      );
    case "int":
      return (
        <input
          type="number"
          className="shader-graph-param-input"
          value={value as number}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        />
      );
    case "bool":
      return (
        <input
          type="checkbox"
          checked={value as boolean}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case "select":
      return (
        <select
          className="shader-graph-param-select"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
        >
          {param.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    default:
      return <span className="shader-graph-prop-value">{String(value)}</span>;
  }
}