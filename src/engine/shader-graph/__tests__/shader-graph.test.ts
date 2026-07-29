import { describe, test, expect } from "bun:test";
import { emptyGraph } from "../types";
import { detectCycles, compileShaderGraph } from "../glsl";
import type { GraphNode, Edge, ShaderGraphDef } from "../types";

describe("emptyGraph", () => {
  test("creates empty graph with default name", () => {
    const g = emptyGraph();
    expect(g.name).toBe("New Shader");
    expect(g.nodes).toHaveLength(0);
    expect(g.edges).toHaveLength(0);
  });

  test("creates empty graph with custom name", () => {
    const g = emptyGraph("My Shader");
    expect(g.name).toBe("My Shader");
  });
});

describe("detectCycles", () => {
  test("returns empty for no cycles", () => {
    const nodes: GraphNode[] = [
      { id: "a", type: "uv", x: 0, y: 0, params: {} },
      { id: "b", type: "colorCorrection", x: 100, y: 0, params: {} },
      { id: "c", type: "fragmentOutput", x: 200, y: 0, params: {} },
    ];
    const edges: Edge[] = [
      { id: "e1", fromNode: "a", fromSocket: "out", toNode: "b", toSocket: "in" },
      { id: "e2", fromNode: "b", fromSocket: "out", toNode: "c", toSocket: "in" },
    ];
    expect(detectCycles(nodes, edges)).toHaveLength(0);
  });

  test("detects simple cycle", () => {
    const nodes: GraphNode[] = [
      { id: "a", type: "uv", x: 0, y: 0, params: {} },
      { id: "b", type: "colorCorrection", x: 100, y: 0, params: {} },
    ];
    const edges: Edge[] = [
      { id: "e1", fromNode: "a", fromSocket: "out", toNode: "b", toSocket: "in" },
      { id: "e2", fromNode: "b", fromSocket: "out", toNode: "a", toSocket: "in" },
    ];
    const cycles = detectCycles(nodes, edges);
    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0]).toContain("Cycle");
  });

  test("detects self-loop", () => {
    const nodes: GraphNode[] = [
      { id: "a", type: "blend", x: 0, y: 0, params: {} },
    ];
    const edges: Edge[] = [
      { id: "e1", fromNode: "a", fromSocket: "out", toNode: "a", toSocket: "in" },
    ];
    expect(detectCycles(nodes, edges).length).toBeGreaterThan(0);
  });
});

describe("compileShaderGraph", () => {
  test("returns error for empty graph", () => {
    const result = compileShaderGraph(emptyGraph());
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes("empty"))).toBe(true);
    expect(result.fragment).toBe("");
  });

  test("returns error when no output node", () => {
    const graph: ShaderGraphDef = {
      name: "test",
      nodes: [{ id: "n1", type: "uv", x: 0, y: 0, params: {} }],
      edges: [],
    };
    const result = compileShaderGraph(graph);
    expect(result.errors.some((e) => e.includes("Fragment Output"))).toBe(true);
  });

  test("returns error on cycles", () => {
    const graph: ShaderGraphDef = {
      name: "cycle",
      nodes: [
        { id: "a", type: "blend", x: 0, y: 0, params: {} },
        { id: "b", type: "fragmentOutput", x: 100, y: 0, params: {} },
      ],
      edges: [
        { id: "e1", fromNode: "b", fromSocket: "in", toNode: "a", toSocket: "in" },
        { id: "e2", fromNode: "a", fromSocket: "out", toNode: "b", toSocket: "in" },
      ],
    };
    const result = compileShaderGraph(graph);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.fragment).toBe("");
  });

  test("compiles simple UV → output graph", () => {
    const graph: ShaderGraphDef = {
      name: "simple",
      nodes: [
        { id: "uv1", type: "uv", x: 0, y: 0, params: {} },
        { id: "out1", type: "fragmentOutput", x: 200, y: 0, params: {} },
      ],
      edges: [
        { id: "e1", fromNode: "uv1", fromSocket: "out", toNode: "out1", toSocket: "in" },
      ],
    };
    const result = compileShaderGraph(graph);
    expect(result.errors).toHaveLength(0);
    expect(result.vertex).toContain("gl_Position");
    expect(result.fragment).toContain("outColor");
    expect(result.uniforms).toHaveLength(0);
  });

  test("includes time uniform when time node is used", () => {
    const graph: ShaderGraphDef = {
      name: "time",
      nodes: [
        { id: "t1", type: "time", x: 0, y: 0, params: {} },
        { id: "out1", type: "fragmentOutput", x: 200, y: 0, params: {} },
      ],
      edges: [
        { id: "e1", fromNode: "t1", fromSocket: "out", toNode: "out1", toSocket: "in" },
      ],
    };
    const result = compileShaderGraph(graph);
    expect(result.errors).toHaveLength(0);
    expect(result.uniforms).toContain("uniform float u_time;");
  });

  test("includes resolution uniform when resolution node is used", () => {
    const graph: ShaderGraphDef = {
      name: "res",
      nodes: [
        { id: "r1", type: "resolution", x: 0, y: 0, params: {} },
        { id: "out1", type: "fragmentOutput", x: 200, y: 0, params: {} },
      ],
      edges: [
        { id: "e1", fromNode: "r1", fromSocket: "out", toNode: "out1", toSocket: "in" },
      ],
    };
    const result = compileShaderGraph(graph);
    expect(result.uniforms).toContain("uniform vec2 u_resolution;");
  });

  test("compiles with float param node", () => {
    const graph: ShaderGraphDef = {
      name: "param-test",
      nodes: [
        { id: "f1", type: "float", x: 0, y: 0, params: { value: 0.42 } },
        { id: "out1", type: "fragmentOutput", x: 200, y: 0, params: {} },
      ],
      edges: [
        { id: "e1", fromNode: "f1", fromSocket: "out", toNode: "out1", toSocket: "color" },
      ],
    };
    const result = compileShaderGraph(graph);
    expect(result.errors).toHaveLength(0);
    expect(result.fragment).toContain("0.42");
  });

  test("compiles math nodes graph", () => {
    const graph: ShaderGraphDef = {
      name: "math",
      nodes: [
        { id: "t1", type: "time", x: 0, y: 0, params: {} },
        { id: "m1", type: "multiply", x: 100, y: 0, params: {} },
        { id: "f1", type: "float", x: 0, y: 100, params: { value: 0.5 } },
        { id: "out1", type: "fragmentOutput", x: 250, y: 0, params: {} },
      ],
      edges: [
        { id: "e1", fromNode: "t1", fromSocket: "out", toNode: "m1", toSocket: "a" },
        { id: "e2", fromNode: "f1", fromSocket: "out", toNode: "m1", toSocket: "b" },
        { id: "e3", fromNode: "m1", fromSocket: "out", toNode: "out1", toSocket: "color" },
      ],
    };
    const result = compileShaderGraph(graph);
    expect(result.errors).toHaveLength(0);
    expect(result.fragment).toContain("u_time");
    expect(result.fragment).toContain("0.5");
  });

  test("generates vertex shader with proper structure", () => {
    const graph: ShaderGraphDef = {
      name: "vtest",
      nodes: [
        { id: "uv1", type: "uv", x: 0, y: 0, params: {} },
        { id: "out1", type: "fragmentOutput", x: 200, y: 0, params: {} },
      ],
      edges: [
        { id: "e1", fromNode: "uv1", fromSocket: "out", toNode: "out1", toSocket: "in" },
      ],
    };
    const result = compileShaderGraph(graph);
    expect(result.vertex).toContain("#version 300 es");
    expect(result.vertex).toContain("a_position");
    expect(result.vertex).toContain("a_texcoord");
    expect(result.vertex).toContain("v_texcoord");
  });
});