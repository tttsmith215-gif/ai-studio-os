import { describe, test, expect } from "bun:test";
import { parseSimpleComposition, compositionToRust } from "../composition";
import type { SimpleComposition } from "../composition";

describe("parseSimpleComposition", () => {
  test("creates a composition with default dimensions", () => {
    const input: SimpleComposition = { title: "Test", elements: [] };
    const comp = parseSimpleComposition(input);
    expect(comp.name).toBe("Test");
    expect(comp.width).toBe(1920);
    expect(comp.height).toBe(1080);
    expect(comp.fps).toBe(30);
    expect(comp.layers).toHaveLength(0);
  });

  test("parses AnimatedTitle element", () => {
    const input: SimpleComposition = {
      title: "Hello",
      elements: [{ type: "AnimatedTitle", text: "Hello World" }],
    };
    const comp = parseSimpleComposition(input);
    expect(comp.layers).toHaveLength(1);
    expect(comp.layers[0].name).toContain("Hello World");
    expect(comp.layers[0].keyframes.length).toBe(2);
  });

  test("parses AnimatedShape element", () => {
    const input: SimpleComposition = {
      title: "Shape",
      elements: [{ type: "AnimatedShape", shape: "ellipse", fill: "red" }],
    };
    const comp = parseSimpleComposition(input);
    expect(comp.layers).toHaveLength(1);
    expect(comp.layers[0].content.kind).toBe("shape");
  });

  test("parses FadeInText element", () => {
    const input: SimpleComposition = {
      title: "Text",
      elements: [{ type: "FadeInText", text: "fade me" }],
    };
    const comp = parseSimpleComposition(input);
    expect(comp.layers).toHaveLength(1);
    expect(comp.layers[0].content.kind).toBe("text");
  });

  test("parses BounceShape element", () => {
    const input: SimpleComposition = {
      title: "Bounce",
      elements: [{ type: "BounceShape" }],
    };
    const comp = parseSimpleComposition(input);
    expect(comp.layers).toHaveLength(1);
    expect(comp.layers[0].content.kind).toBe("shape");
  });

  test("respects custom background", () => {
    const input: SimpleComposition = {
      title: "Bg",
      background: "#ff0000",
      elements: [],
    };
    const comp = parseSimpleComposition(input);
    expect(comp.background).toBe("#ff0000");
  });

  test("stacks multiple elements", () => {
    const input: SimpleComposition = {
      title: "Multi",
      elements: [
        { type: "AnimatedTitle", text: "Title" },
        { type: "FadeInText", text: "Sub" },
      ],
    };
    const comp = parseSimpleComposition(input);
    expect(comp.layers).toHaveLength(2);
  });
});

describe("compositionToRust", () => {
  test("serializes a composition to Rust format", () => {
    const comp = parseSimpleComposition({ title: "Test", elements: [{ type: "AnimatedTitle", text: "Hi" }] });
    const rust = compositionToRust(comp);
    expect(rust.width).toBe(1920);
    expect(rust.height).toBe(1080);
    expect(rust.fps).toBe(30);
    expect(rust.layers).toHaveLength(1);
    expect(rust.layers[0].content.kind).toBe("text");
    expect(rust.layers[0].keyframes.length).toBe(2);
  });

  test("serializes shape content", () => {
    const comp = parseSimpleComposition({ title: "S", elements: [{ type: "AnimatedShape", shape: "rectangle" }] });
    const rust = compositionToRust(comp);
    const c = rust.layers[0].content;
    expect(c.kind).toBe("shape");
    expect(c.shape).toBe("rectangle");
  });
});