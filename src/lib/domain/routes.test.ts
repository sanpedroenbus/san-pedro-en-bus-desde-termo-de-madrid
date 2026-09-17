import { describe, expect, it } from "vitest";
import { isRoute, ROUTE_COLORS, ROUTE_LABELS, ROUTES } from "./routes";

describe("routes", () => {
  it("defines exactly nine distinct routes", () => {
    expect(ROUTES).toHaveLength(9);
    expect(new Set(ROUTES).size).toBe(9);
  });

  it("validates known routes and rejects everything else", () => {
    for (const route of ROUTES) {
      expect(isRoute(route)).toBe(true);
    }
    expect(isRoute("L1")).toBe(false);
    expect(isRoute("la_campina")).toBe(false);
    expect(isRoute("")).toBe(false);
    expect(isRoute(undefined)).toBe(false);
    expect(isRoute(null)).toBe(false);
    expect(isRoute(42)).toBe(false);
  });

  it("gives every route a label with no missing or orphaned entries", () => {
    const labelKeys = Object.keys(ROUTE_LABELS).sort();
    expect(labelKeys).toEqual([...ROUTES].sort());
    for (const route of ROUTES) {
      expect(ROUTE_LABELS[route].length).toBeGreaterThan(0);
    }
  });

  it("gives every route a distinct, well-formed color", () => {
    const colorKeys = Object.keys(ROUTE_COLORS).sort();
    expect(colorKeys).toEqual([...ROUTES].sort());

    const fills = ROUTES.map((route) => ROUTE_COLORS[route].fill);
    expect(new Set(fills).size).toBe(ROUTES.length);

    for (const route of ROUTES) {
      const color = ROUTE_COLORS[route];
      expect(color.fill).toMatch(/^oklch\(/);
      expect(color.ring).toMatch(/^oklch\(/);
      expect(["black", "white"]).toContain(color.textOnFill);
    }
  });
});
