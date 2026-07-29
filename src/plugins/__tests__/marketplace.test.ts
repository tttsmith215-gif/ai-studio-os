import { describe, test, expect } from "bun:test";
import { marketplace } from "../marketplace";

describe("marketplace", () => {
  test("getAll returns seed plugins", () => {
    const all = marketplace.getAll();
    expect(all.length).toBeGreaterThan(0);
    expect(all.some((p) => p.id === "com.aios.motion-studio")).toBe(true);
  });

  test("get by id", () => {
    const plugin = marketplace.get("com.aios.motion-studio");
    expect(plugin).toBeDefined();
    expect(plugin?.name).toBe("Motion Studio");
  });

  test("get returns undefined for unknown id", () => {
    expect(marketplace.get("does.not.exist")).toBeUndefined();
  });

  test("getFeatured returns only featured plugins", () => {
    const featured = marketplace.getFeatured();
    expect(featured.length).toBeGreaterThan(0);
    expect(featured.every((p) => p.isFeatured)).toBe(true);
  });

  test("getCommunity returns only community plugins", () => {
    const community = marketplace.getCommunity();
    expect(community.length).toBeGreaterThan(0);
    expect(community.every((p) => p.isCommunity)).toBe(true);
  });

  test("getVerified returns only verified plugins", () => {
    const verified = marketplace.getVerified();
    expect(verified.length).toBeGreaterThan(0);
    expect(verified.every((p) => p.isVerified)).toBe(true);
  });

  test("search by name", () => {
    const results = marketplace.search("motion");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((p) => p.name.toLowerCase().includes("motion"))).toBe(true);
  });

  test("search by description", () => {
    const results = marketplace.search("keyframe");
    expect(results.length).toBeGreaterThan(0);
  });

  test("search by author", () => {
    const results = marketplace.search("BeatLab");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.author.toLowerCase().includes("beatlab"))).toBe(true);
  });

  test("search by tag", () => {
    const results = marketplace.search("animation");
    expect(results.length).toBeGreaterThan(0);
  });

  test("search with category filter", () => {
    const results = marketplace.search("", "audio");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.category === "audio")).toBe(true);
  });

  test("search with category and query", () => {
    const results = marketplace.search("music", "audio");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.category === "audio")).toBe(true);
  });

  test("search returns all when query is empty", () => {
    const all = marketplace.getAll();
    const results = marketplace.search("");
    expect(results).toHaveLength(all.length);
  });

  test("getByCategory returns correct category", () => {
    const image = marketplace.getByCategory("image");
    expect(image.length).toBeGreaterThan(0);
    expect(image.every((p) => p.category === "image")).toBe(true);
  });

  test("subscribe and unsubscribe", () => {
    const calls: string[] = [];
    const unsub = marketplace.subscribe((listings) => {
      calls.push("called");
    });
    expect(calls).toHaveLength(0);
    unsub();
    // Should not throw after unsubscribe
  });
});