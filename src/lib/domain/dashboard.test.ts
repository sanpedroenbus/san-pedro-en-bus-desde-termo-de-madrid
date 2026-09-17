import { describe, expect, it } from "vitest";
import {
  buildDashboardBuckets,
  buildDashboardData,
  buildRouteProblemBreakdown,
  buildUnitExplorerSelection,
} from "./dashboard";
import { ROUTES } from "./routes";
import type { Report } from "./reports";

const now = new Date("2026-07-05T12:00:00Z");

function report(partial: Partial<Report> & Pick<Report, "id" | "route" | "problems">): Report {
  return {
    unit: null,
    createdAt: now,
    hiddenAt: null,
    ...partial,
  };
}

describe("buildDashboardData", () => {
  it("returns empty, zeroed aggregates for no reports rather than crashing or producing NaN", () => {
    const data = buildDashboardData([], now, "sevenDays");

    expect(data.routeSummaries).toHaveLength(ROUTES.length);
    for (const summary of data.routeSummaries) {
      expect(summary.reports).toBe(0);
      expect(summary.unitsReported).toBe(0);
      expect(summary.latestReportAt).toBeNull();
      expect(Number.isNaN(summary.reports)).toBe(false);
    }

    expect(data.problemSummaries.every((summary) => summary.reports === 0)).toBe(true);
    expect(data.categorySummaries.every((summary) => summary.reports === 0)).toBe(true);
    expect(data.trend.every((point) => point.reports === 0)).toBe(true);
    expect(data.unitExplorer.options).toEqual([]);
    expect(data.recentReports).toEqual([]);
    expect(data.reportsLastDay).toBe(0);
  });

  it("counts one report per problem without any weighting or scoring", () => {
    const data = buildDashboardData(
      [
        report({ id: "1", route: "CEDROS", problems: ["hacinados"] }),
        report({ id: "2", route: "CEDROS", problems: ["hacinados"] }),
        report({ id: "3", route: "CEDROS", problems: ["acoso"] }),
      ],
      now,
      "sevenDays",
    );

    const hacinados = data.problemSummaries.find((summary) => summary.problem === "hacinados");
    const acoso = data.problemSummaries.find((summary) => summary.problem === "acoso");
    expect(hacinados?.reports).toBe(2);
    expect(acoso?.reports).toBe(1);

    const cedros = data.routeSummaries.find((summary) => summary.route === "CEDROS");
    expect(cedros?.reports).toBe(3);
  });

  it("counts a single multi-problem report once per problem, without inflating the route total or reportsLastDay", () => {
    const data = buildDashboardData(
      [report({ id: "1", route: "CEDROS", problems: ["hacinados", "acoso", "cucarachas"], createdAt: now })],
      now,
      "sevenDays",
    );

    const cedros = data.routeSummaries.find((summary) => summary.route === "CEDROS");
    expect(cedros?.reports).toBe(1);
    expect(data.reportsLastDay).toBe(1);

    for (const problem of ["hacinados", "acoso", "cucarachas"]) {
      const summary = data.problemSummaries.find((entry) => entry.problem === problem);
      expect(summary?.reports).toBe(1);
    }
    const totalProblemCount = data.problemSummaries.reduce((total, entry) => total + entry.reports, 0);
    expect(totalProblemCount).toBe(3);
  });

  it("rolls problem summaries up into category summaries consistently, including the multi-problem case", () => {
    const data = buildDashboardData(
      [
        // hacinados + cucarachas are both "condicion"; acoso is "seguridad".
        report({ id: "1", route: "CEDROS", problems: ["hacinados", "acoso", "cucarachas"] }),
        report({ id: "2", route: "SABANILLA", problems: ["olia_mal_sucio"] }),
      ],
      now,
      "sevenDays",
    );

    const totalProblems = data.problemSummaries.reduce((total, entry) => total + entry.reports, 0);
    const totalCategories = data.categorySummaries.reduce((total, entry) => total + entry.reports, 0);
    expect(totalCategories).toBe(totalProblems);

    const condicion = data.categorySummaries.find((entry) => entry.category === "condicion");
    expect(condicion?.reports).toBe(3); // hacinados + cucarachas + olia_mal_sucio
    const seguridad = data.categorySummaries.find((entry) => entry.category === "seguridad");
    expect(seguridad?.reports).toBe(1);
  });

  it("excludes hidden reports from every aggregate", () => {
    const data = buildDashboardData(
      [
        report({ id: "1", route: "CEDROS", problems: ["hacinados"], unit: "51" }),
        report({
          id: "2",
          route: "CEDROS",
          problems: ["acoso"],
          unit: "52",
          hiddenAt: new Date("2026-07-05T09:00:00Z"),
        }),
      ],
      now,
      "sevenDays",
    );

    const cedros = data.routeSummaries.find((summary) => summary.route === "CEDROS");
    expect(cedros?.reports).toBe(1);
    expect(cedros?.unitsReported).toBe(1);
    expect(data.problemSummaries.find((summary) => summary.problem === "acoso")?.reports).toBe(0);
    expect(data.unitExplorer.options.find((option) => option.unit === "52")).toBeUndefined();
    expect(data.recentReports).toHaveLength(1);
    expect(data.reportsLastDay).toBe(1);
  });

  it("excludes reports outside the selected range window", () => {
    const data = buildDashboardData(
      [
        report({ id: "1", route: "CEDROS", problems: ["hacinados"], createdAt: now }),
        report({ id: "2", route: "CEDROS", problems: ["acoso"], createdAt: new Date("2026-01-01T12:00:00Z") }),
      ],
      now,
      "sevenDays",
    );

    const cedros = data.routeSummaries.find((summary) => summary.route === "CEDROS");
    expect(cedros?.reports).toBe(1);
    expect(data.problemSummaries.find((summary) => summary.problem === "acoso")?.reports).toBe(0);
    expect(data.recentReports).toHaveLength(1);
  });

  it("counts no-unit reports toward the route total but keeps them out of the unit explorer", () => {
    const data = buildDashboardData(
      [
        report({ id: "1", route: "CEDROS", problems: ["hacinados"], unit: null }),
        report({ id: "2", route: "CEDROS", problems: ["acoso"], unit: null }),
        report({ id: "3", route: "CEDROS", problems: ["cucarachas"], unit: "51" }),
      ],
      now,
      "sevenDays",
    );

    const cedros = data.routeSummaries.find((summary) => summary.route === "CEDROS");
    expect(cedros?.reports).toBe(3);
    expect(cedros?.unitsReported).toBe(1);
    expect(data.unitExplorer.options).toHaveLength(1);
    expect(data.unitExplorer.options[0].unit).toBe("51");
  });

  it("orders route summaries by report count descending, breaking ties by catalogue order", () => {
    const data = buildDashboardData(
      [
        report({ id: "1", route: "SABANILLA", problems: ["hacinados"] }),
        report({ id: "2", route: "SABANILLA", problems: ["acoso"] }),
        report({ id: "3", route: "LA_EUROPA", problems: ["acoso"] }),
      ],
      now,
      "sevenDays",
    );

    expect(data.routeSummaries[0].route).toBe("SABANILLA");
    expect(data.routeSummaries[0].reports).toBe(2);
    // All zero-report routes keep ROUTES catalogue order (stable sort), so
    // ordering is deterministic and charts don't jitter between renders.
    const zeroReportRoutes = data.routeSummaries.filter((summary) => summary.reports === 0).map((summary) => summary.route);
    const expectedZeroReportOrder = ROUTES.filter((route) => route !== "SABANILLA" && route !== "LA_EUROPA");
    expect(zeroReportRoutes).toEqual(expectedZeroReportOrder);
  });

  it("produces the same ordering across repeated calls given identical input (deterministic, no jitter)", () => {
    const reports = [
      report({ id: "1", route: "CEDROS", problems: ["hacinados"] }),
      report({ id: "2", route: "SABANILLA", problems: ["acoso"] }),
      report({ id: "3", route: "CEDROS", problems: ["acoso"] }),
    ];

    const first = buildDashboardData(reports, now, "sevenDays");
    const second = buildDashboardData(reports, now, "sevenDays");

    expect(first.routeSummaries.map((s) => s.route)).toEqual(second.routeSummaries.map((s) => s.route));
    expect(first.problemSummaries.map((s) => s.problem)).toEqual(second.problemSummaries.map((s) => s.problem));
    expect(first.categorySummaries.map((s) => s.category)).toEqual(second.categorySummaries.map((s) => s.category));
  });

  it("sorts recent reports by most recent first and caps them at the configured limit", () => {
    const reports = Array.from({ length: 30 }, (_, index) =>
      report({
        id: `${index}`,
        route: "CEDROS",
        problems: ["hacinados"],
        createdAt: new Date(now.getTime() - index * 60_000),
      }),
    );

    const data = buildDashboardData(reports, now, "sevenDays");
    expect(data.recentReports).toHaveLength(25);
    expect(data.recentReports[0].id).toBe("0");
    expect(data.recentReports.at(-1)?.id).toBe("24");
  });

  it("keeps unit explorer routes and counts aligned across multiple routes for the same unit", () => {
    const data = buildDashboardData(
      [
        report({ id: "1", route: "CEDROS", problems: ["hacinados"], unit: "51" }),
        report({ id: "2", route: "SABANILLA", problems: ["acoso"], unit: "51" }),
      ],
      now,
      "sevenDays",
    );

    const option = data.unitExplorer.options.find((entry) => entry.unit === "51");
    expect(option?.reports).toBe(2);
    expect(option?.routes).toEqual(["CEDROS", "SABANILLA"]);
  });

  it("breaks unit explorer ties by unit code so ordering stays deterministic", () => {
    const data = buildDashboardData(
      [
        report({ id: "1", route: "CEDROS", problems: ["hacinados"], unit: "99" }),
        report({ id: "2", route: "CEDROS", problems: ["hacinados"], unit: "51" }),
      ],
      now,
      "sevenDays",
    );

    expect(data.unitExplorer.options.map((option) => option.unit)).toEqual(["51", "99"]);
  });
});

describe("buildRouteProblemBreakdown", () => {
  it("reports only the given route's problems and excludes hidden reports", () => {
    const reports = [
      report({ id: "1", route: "CEDROS", problems: ["hacinados"] }),
      report({ id: "2", route: "CEDROS", problems: ["hacinados"], hiddenAt: new Date("2026-07-05T09:00:00Z") }),
      report({ id: "3", route: "SABANILLA", problems: ["acoso"] }),
    ];

    const breakdown = buildRouteProblemBreakdown("CEDROS", reports);
    expect(breakdown.route).toBe("CEDROS");
    expect(breakdown.reports).toBe(1);
    expect(breakdown.problems.find((p) => p.problem === "hacinados")?.reports).toBe(1);
    expect(breakdown.problems.find((p) => p.problem === "acoso")?.reports).toBe(0);
  });

  it("returns a zeroed breakdown for a route with no reports", () => {
    const breakdown = buildRouteProblemBreakdown("LA_EUROPA", []);
    expect(breakdown.reports).toBe(0);
    expect(breakdown.problems.every((p) => p.reports === 0)).toBe(true);
  });
});

describe("buildDashboardBuckets", () => {
  it("builds 24 hourly buckets for 'today'", () => {
    const buckets = buildDashboardBuckets(now, "today");
    expect(buckets).toHaveLength(24);
    expect(buckets[0].start.toISOString()).toBe("2026-07-05T06:00:00.000Z");
    expect(buckets[0].end.toISOString()).toBe("2026-07-05T07:00:00.000Z");
  });

  it("builds one daily bucket per day for 'sevenDays'", () => {
    const buckets = buildDashboardBuckets(now, "sevenDays");
    expect(buckets).toHaveLength(7);
    expect(buckets[0].start.toISOString()).toBe("2026-06-29T06:00:00.000Z");
    expect(buckets.at(-1)?.end.toISOString()).toBe("2026-07-06T06:00:00.000Z");
  });

  it("builds one daily bucket per day for 'thirtyDays'", () => {
    const buckets = buildDashboardBuckets(now, "thirtyDays");
    expect(buckets).toHaveLength(30);
  });
});

describe("buildUnitExplorerSelection", () => {
  it("returns null for a unit with no reports in range", () => {
    const selection = buildUnitExplorerSelection("999", [], now, "sevenDays");
    expect(selection).toBeNull();
  });

  it("builds a per-bucket history for a known unit", () => {
    const reports = [
      report({ id: "1", route: "CEDROS", problems: ["hacinados"], unit: "51", createdAt: now }),
      report({
        id: "2",
        route: "CEDROS",
        problems: ["acoso"],
        unit: "51",
        createdAt: new Date("2026-07-04T18:00:00Z"),
      }),
    ];

    const selection = buildUnitExplorerSelection("51", reports, now, "sevenDays");
    expect(selection?.unit).toBe("51");
    expect(selection?.reports).toBe(2);
    const totalHistoryReports = selection?.history.reduce((total, point) => total + point.reports, 0);
    expect(totalHistoryReports).toBe(2);
  });

  // Regression: buildUnitExplorerSelection used to filter by unit only, applying
  // neither the hiddenAt filter nor the range window, while buildDashboardData
  // applied both. Both real callers hand it raw report lists, so an undone or
  // moderated report stayed visible in the unit detail view.
  it("excludes hidden and out-of-range reports from the unit explorer selection, matching buildDashboardData", () => {
    const inRangeVisible = report({ id: "1", route: "CEDROS", problems: ["hacinados"], unit: "51", createdAt: now });
    const outOfRange = report({
      id: "2",
      route: "CEDROS",
      problems: ["acoso"],
      unit: "51",
      createdAt: new Date("2026-01-01T12:00:00Z"),
    });
    const hidden = report({
      id: "3",
      route: "CEDROS",
      problems: ["cucarachas"],
      unit: "51",
      createdAt: now,
      hiddenAt: new Date("2026-07-05T11:00:00Z"),
    });
    const allReports = [inRangeVisible, outOfRange, hidden];

    // The dashboard's own unit explorer option correctly reflects only the
    // visible, in-range report.
    const dashboard = buildDashboardData(allReports, now, "sevenDays");
    const dashboardOption = dashboard.unitExplorer.options.find((option) => option.unit === "51");
    expect(dashboardOption?.reports).toBe(1);

    // buildUnitExplorerSelection must agree, even when handed a raw unfiltered
    // list the way the repository does: the hidden and out-of-range reports are
    // excluded, and the hidden report's problem never reaches the history.
    const selection = buildUnitExplorerSelection("51", allReports, now, "sevenDays");
    expect(selection?.reports).toBe(1);
    expect(selection?.history.reduce((total, point) => total + point.reports, 0)).toBe(1);
  });
});
