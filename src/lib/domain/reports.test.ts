import { describe, expect, it } from "vitest";
import { isDuplicateCandidate, normalizeUnitCode, parseReportInput, reportMatchesProblems, type Report, type ReportInput } from "./reports";

describe("reportMatchesProblems", () => {
  it("matches when no problems are selected (no-op filter)", () => {
    expect(reportMatchesProblems({ problems: ["hacinados"] }, [])).toBe(true);
    expect(reportMatchesProblems({ problems: [] }, [])).toBe(true);
  });

  it("matches a report that carries any of the selected problems", () => {
    expect(reportMatchesProblems({ problems: ["hacinados", "cucarachas"] }, ["cucarachas"])).toBe(true);
    expect(reportMatchesProblems({ problems: ["cucarachas"] }, ["hacinados", "cucarachas"])).toBe(true);
  });

  it("does not match a report with none of the selected problems", () => {
    expect(reportMatchesProblems({ problems: ["hacinados"] }, ["cucarachas"])).toBe(false);
  });

  it("does not require the report to carry every selected problem", () => {
    expect(reportMatchesProblems({ problems: ["hacinados"] }, ["hacinados", "cucarachas"])).toBe(true);
  });
});

describe("normalizeUnitCode", () => {
  it("strips whitespace and uppercases", () => {
    expect(normalizeUnitCode("  51  ")).toBe("51");
    expect(normalizeUnitCode("sjb 1234")).toBe("SJB1234");
  });

  it("accepts a short bus unit number", () => {
    expect(normalizeUnitCode("51")).toBe("51");
    expect(normalizeUnitCode("099")).toBe("099");
  });

  it("accepts a full licence plate", () => {
    expect(normalizeUnitCode("sjb1234")).toBe("SJB1234");
  });

  it("returns null for empty input", () => {
    expect(normalizeUnitCode("")).toBeNull();
    expect(normalizeUnitCode("   ")).toBeNull();
  });

  it("returns null for input longer than ten characters", () => {
    expect(normalizeUnitCode("ABCDEFGHIJK")).toBeNull(); // 11 chars
    expect(normalizeUnitCode("ABCDEFGHIJ")).toBe("ABCDEFGHIJ"); // exactly 10 chars
  });

  it("returns null for characters outside A-Z0-9", () => {
    expect(normalizeUnitCode("AB-1234")).toBeNull();
    expect(normalizeUnitCode("unidad#5")).toBeNull();
  });
});

describe("parseReportInput", () => {
  it("accepts a valid report with a single problem and no unit", () => {
    const parsed = parseReportInput({ route: "CEDROS", problems: ["hacinados"] });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.route).toBe("CEDROS");
      expect(parsed.data.problems).toEqual(["hacinados"]);
      expect(parsed.data.unit).toBeNull();
    }
  });

  it("accepts a report with multiple problems", () => {
    const parsed = parseReportInput({ route: "CEDROS", problems: ["hacinados", "acoso", "cucarachas"] });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.problems).toEqual(["hacinados", "acoso", "cucarachas"]);
    }
  });

  it("normalizes a valid unit code", () => {
    const parsed = parseReportInput({ route: "CEDROS", problems: ["hacinados"], unit: " 51 " });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.unit).toBe("51");
    }
  });

  it("silently downgrades an invalid unit to null rather than failing the whole report", () => {
    const parsed = parseReportInput({ route: "CEDROS", problems: ["hacinados"], unit: "not a valid unit!!" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.unit).toBeNull();
    }
  });

  it("accepts an explicit null unit", () => {
    const parsed = parseReportInput({ route: "CEDROS", problems: ["hacinados"], unit: null });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.unit).toBeNull();
    }
  });

  it("rejects an unknown route", () => {
    const parsed = parseReportInput({ route: "L1", problems: ["hacinados"] });
    expect(parsed.success).toBe(false);
  });

  it("rejects a report with zero problems", () => {
    const parsed = parseReportInput({ route: "CEDROS", problems: [] });
    expect(parsed.success).toBe(false);
  });

  it("rejects a report with an unknown problem", () => {
    const parsed = parseReportInput({ route: "CEDROS", problems: ["calor"] });
    expect(parsed.success).toBe(false);
  });

  it("rejects a report missing required fields", () => {
    expect(parseReportInput({}).success).toBe(false);
    expect(parseReportInput({ route: "CEDROS" }).success).toBe(false);
    expect(parseReportInput(null).success).toBe(false);
  });
});

describe("isDuplicateCandidate", () => {
  const now = new Date("2026-07-05T12:00:00Z");

  function previousReport(partial: Partial<Report>): Report {
    return {
      id: "prev",
      route: "CEDROS",
      unit: null,
      problems: ["hacinados"],
      createdAt: new Date("2026-07-05T11:55:00Z"),
      hiddenAt: null,
      ...partial,
    };
  }

  function currentInput(partial: Partial<ReportInput>): ReportInput {
    return {
      route: "CEDROS",
      problems: ["hacinados"],
      unit: null,
      ...partial,
    };
  }

  it("flags a same-unit, same-route, same-problems report inside the window", () => {
    const previous = previousReport({ unit: "51", problems: ["hacinados"] });
    const current = currentInput({ unit: "51", problems: ["hacinados"] });
    expect(isDuplicateCandidate(current, previous, now)).toBe(true);
  });

  it("treats problem sets as unordered when comparing same-unit reports", () => {
    const previous = previousReport({ unit: "51", problems: ["hacinados", "acoso"] });
    const current = currentInput({ unit: "51", problems: ["acoso", "hacinados"] });
    expect(isDuplicateCandidate(current, previous, now)).toBe(true);
  });

  it("does not flag same-unit reports with a different set of problems", () => {
    const previous = previousReport({ unit: "51", problems: ["hacinados"] });
    const current = currentInput({ unit: "51", problems: ["acoso"] });
    expect(isDuplicateCandidate(current, previous, now)).toBe(false);
  });

  it("does not flag different units on the same route", () => {
    const previous = previousReport({ unit: "51", problems: ["hacinados"] });
    const current = currentInput({ unit: "52", problems: ["hacinados"] });
    expect(isDuplicateCandidate(current, previous, now)).toBe(false);
  });

  it("suppresses same-route no-unit reports regardless of which problems were reported", () => {
    const previous = previousReport({ unit: null, problems: ["hacinados"] });
    const current = currentInput({ unit: null, problems: ["acoso", "cucarachas"] });
    expect(isDuplicateCandidate(current, previous, now)).toBe(true);
  });

  it("does not suppress no-unit reports on a different route", () => {
    const previous = previousReport({ route: "CEDROS", unit: null });
    const current = currentInput({ route: "SABANILLA", unit: null });
    expect(isDuplicateCandidate(current, previous, now)).toBe(false);
  });

  it("does not flag a no-unit report against a previous report that had a unit", () => {
    const previous = previousReport({ unit: "51" });
    const current = currentInput({ unit: null });
    expect(isDuplicateCandidate(current, previous, now)).toBe(false);
  });

  it("is inclusive of the exact window boundary", () => {
    const previous = previousReport({ unit: "51", createdAt: new Date(now.getTime() - 12 * 60_000) });
    const current = currentInput({ unit: "51" });
    expect(isDuplicateCandidate(current, previous, now, 12)).toBe(true);
  });

  it("excludes reports one millisecond past the window", () => {
    const previous = previousReport({ unit: "51", createdAt: new Date(now.getTime() - 12 * 60_000 - 1) });
    const current = currentInput({ unit: "51" });
    expect(isDuplicateCandidate(current, previous, now, 12)).toBe(false);
  });

  it("treats a previous report timestamped after 'now' as outside the window", () => {
    const previous = previousReport({ unit: "51", createdAt: new Date(now.getTime() + 1000) });
    const current = currentInput({ unit: "51" });
    expect(isDuplicateCandidate(current, previous, now)).toBe(false);
  });
});
