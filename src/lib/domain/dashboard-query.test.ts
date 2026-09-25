import { describe, expect, it } from "vitest";
import { parseDashboardRange, parseSelectedProblems, parseSelectedRoutes } from "./dashboard-query";

describe("dashboard query parsing", () => {
  it("passes through supported range values", () => {
    expect(parseDashboardRange("today")).toBe("today");
    expect(parseDashboardRange("sevenDays")).toBe("sevenDays");
    expect(parseDashboardRange("thirtyDays")).toBe("thirtyDays");
    expect(parseDashboardRange("all")).toBe("all");
  });

  it("falls back to 'thirtyDays' by default for missing or invalid range values", () => {
    expect(parseDashboardRange(null)).toBe("thirtyDays");
    expect(parseDashboardRange(undefined)).toBe("thirtyDays");
    expect(parseDashboardRange("summer")).toBe("thirtyDays");
    expect(parseDashboardRange("last24Hours")).toBe("thirtyDays");
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

  it("parses and deduplicates a comma-separated list of valid problems", () => {
    expect(parseSelectedProblems("hacinados,cucarachas,hacinados")).toEqual(["hacinados", "cucarachas"]);
  });

  it("drops unknown problem ids while keeping the rest", () => {
    expect(parseSelectedProblems("hacinados,not_a_problem,cucarachas")).toEqual(["hacinados", "cucarachas"]);
  });

  it("returns an empty array for missing or empty problem input", () => {
    expect(parseSelectedProblems(null)).toEqual([]);
    expect(parseSelectedProblems(undefined)).toEqual([]);
    expect(parseSelectedProblems("")).toEqual([]);
  });
});
