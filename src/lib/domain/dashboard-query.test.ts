import { describe, expect, it } from "vitest";
import { parseDashboardRange, parseSelectedRoutes } from "./dashboard-query";

describe("dashboard query parsing", () => {
  it("passes through supported range values", () => {
    expect(parseDashboardRange("today")).toBe("today");
    expect(parseDashboardRange("sevenDays")).toBe("sevenDays");
    expect(parseDashboardRange("thirtyDays")).toBe("thirtyDays");
    expect(parseDashboardRange("all")).toBe("all");
  });

  it("falls back to 'all' by default for missing or invalid range values", () => {
    expect(parseDashboardRange(null)).toBe("all");
    expect(parseDashboardRange(undefined)).toBe("all");
    expect(parseDashboardRange("summer")).toBe("all");
    expect(parseDashboardRange("last24Hours")).toBe("all");
  });

  it("accepts a caller-supplied fallback range", () => {
    expect(parseDashboardRange("invalid", "sevenDays")).toBe("sevenDays");
  });

  it("parses and deduplicates a comma-separated list of valid routes", () => {
    expect(parseSelectedRoutes("CEDROS,SABANILLA,CEDROS")).toEqual(["CEDROS", "SABANILLA"]);
  });

  it("drops unknown route ids while keeping the rest", () => {
    expect(parseSelectedRoutes("CEDROS,L1,SABANILLA,invalid")).toEqual(["CEDROS", "SABANILLA"]);
  });

  it("returns an empty array for missing or empty input", () => {
    expect(parseSelectedRoutes(null)).toEqual([]);
    expect(parseSelectedRoutes(undefined)).toEqual([]);
    expect(parseSelectedRoutes("")).toEqual([]);
  });
});
