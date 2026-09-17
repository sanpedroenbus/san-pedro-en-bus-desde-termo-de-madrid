import { PROBLEM_CATEGORIES, PROBLEMS, PROBLEM_CATEGORY, type Problem, type ProblemCategory } from "./problems";
import { ROUTES, type Route } from "./routes";
import { getRangeWindow, type TimeRange } from "./ranges";
import type { Report } from "./reports";
import { APP_TIME_ZONE, getLocalStartOfDay } from "./time";

export const DASHBOARD_LIMITS = {
  recentReportCount: 25,
} as const;

export const DASHBOARD_TIME = {
  millisecondsPerHour: 3_600_000,
  hoursPerDay: 24,
} as const;

export type RouteSummary = {
  route: Route;
  reports: number;
  unitsReported: number;
  latestReportAt: Date | null;
};

export type ProblemSummary = {
  problem: Problem;
  reports: number;
};

export type CategorySummary = {
  category: ProblemCategory;
  reports: number;
};

export type TrendPoint = {
  label: string;
  reports: number;
};

export type UnitExplorerOption = {
  unit: string;
  reports: number;
  routes: Route[];
};

export type UnitExplorerSelection = UnitExplorerOption & {
  history: TrendPoint[];
};

// Per-route problem breakdown answers "for this route, which problems
// dominate?" (module 6 of the target dashboard). It is built on demand for a
// single route, the same way UnitExplorerSelection is built on demand for a
// single unit, rather than precomputed for every route inside DashboardData.
export type RouteProblemBreakdown = {
  route: Route;
  reports: number;
  problems: ProblemSummary[];
};

export type DashboardData = {
  routeSummaries: RouteSummary[];
  problemSummaries: ProblemSummary[];
  categorySummaries: CategorySummary[];
  trend: TrendPoint[];
  unitExplorer: {
    options: UnitExplorerOption[];
  };
  recentReports: Report[];
  reportsLastDay: number;
};

export function buildDashboardData(reports: Report[], now = new Date(), range: TimeRange = "sevenDays"): DashboardData {
  const rangeWindow = getRangeWindow(range, now);
  const usableReports = reports.filter((report) => !report.hiddenAt);
  const visibleReports = usableReports.filter((report) => report.createdAt >= rangeWindow.start && report.createdAt <= rangeWindow.end);

  const routeSummaries = buildRouteSummaries(visibleReports);
  const problemSummaries = buildProblemSummaries(visibleReports);
  const categorySummaries = buildCategorySummaries(problemSummaries);
  const unitExplorerOptions = buildUnitExplorerOptions(visibleReports);
  const trend = buildTrend(visibleReports, now, range);

  const dayAgo = new Date(now.getTime() - DASHBOARD_TIME.hoursPerDay * DASHBOARD_TIME.millisecondsPerHour);
  const reportsLastDay = visibleReports.filter((report) => report.createdAt >= dayAgo).length;

  return {
    routeSummaries,
    problemSummaries,
    categorySummaries,
    trend,
    unitExplorer: {
      options: unitExplorerOptions,
    },
    recentReports: visibleReports.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, DASHBOARD_LIMITS.recentReportCount),
    reportsLastDay,
  };
}

function buildRouteSummaries(reports: Report[]): RouteSummary[] {
  return ROUTES.map((route) => {
    const routeReports = reports.filter((report) => report.route === route);
    const reportedUnits = new Set(routeReports.map((report) => report.unit).filter(Boolean));
    const latestReportAt =
      routeReports.length > 0
        ? routeReports.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
        : null;
    return {
      route,
      reports: routeReports.length,
      unitsReported: reportedUnits.size,
      latestReportAt,
    };
  }).sort((a, b) => b.reports - a.reports);
}

function buildProblemSummaries(reports: Report[]): ProblemSummary[] {
  return PROBLEMS.map((problem) => ({
    problem,
    reports: reports.filter((report) => report.problems.includes(problem)).length,
  })).sort((a, b) => b.reports - a.reports);
}

function buildCategorySummaries(problemSummaries: ProblemSummary[]): CategorySummary[] {
  return PROBLEM_CATEGORIES.map((category) => ({
    category,
    reports: problemSummaries.filter((summary) => PROBLEM_CATEGORY[summary.problem] === category).reduce((total, summary) => total + summary.reports, 0),
  })).sort((a, b) => b.reports - a.reports);
}

export function buildRouteProblemBreakdown(route: Route, reports: Report[]): RouteProblemBreakdown {
  const routeReports = reports.filter((report) => report.route === route && !report.hiddenAt);
  return {
    route,
    reports: routeReports.length,
    problems: buildProblemSummaries(routeReports),
  };
}

export function buildUnitExplorerSelection(
  unit: string,
  reports: Report[],
  now: Date,
  range: TimeRange,
  options?: UnitExplorerOption[],
): UnitExplorerSelection | null {
  // Callers pass raw report lists, so filter here rather than trusting the input.
  // Without this, an undone or moderated report still shows in the unit detail view.
  const rangeWindow = getRangeWindow(range, now);
  const visibleReports = reports.filter(
    (report) => !report.hiddenAt && report.createdAt >= rangeWindow.start && report.createdAt <= rangeWindow.end,
  );
  const option = (options ?? buildUnitExplorerOptions(visibleReports)).find((item) => item.unit === unit);
  if (!option) return null;
  const unitReports = visibleReports.filter((report) => report.unit === unit);
  return {
    ...option,
    history: buildDashboardBuckets(now, range).map((bucket) => ({
      label: bucket.label,
      reports: unitReports.filter((report) => report.createdAt >= bucket.start && report.createdAt < bucket.end).length,
    })),
  };
}

function buildUnitExplorerOptions(reports: Report[]): UnitExplorerOption[] {
  const unitGroups = new Map<string, Report[]>();
  for (const report of reports) {
    if (!report.unit) continue;
    pushGroupedReport(unitGroups, report.unit, report);
  }

  return Array.from(unitGroups.entries())
    .map(([unit, unitReports]) => ({
      unit,
      reports: unitReports.length,
      routes: getReportedRoutes(unitReports),
    }))
    .toSorted((a, b) => b.reports - a.reports || a.unit.localeCompare(b.unit));
}

function getReportedRoutes(reports: Report[]) {
  return Array.from(new Set(reports.map((report) => report.route))).sort((a, b) => a.localeCompare(b)) as Route[];
}

function pushGroupedReport(groups: Map<string, Report[]>, key: string, report: Report) {
  const groupedReports = groups.get(key);
  if (groupedReports) {
    groupedReports.push(report);
    return;
  }
  groups.set(key, [report]);
}

function buildTrend(reports: Report[], now: Date, range: TimeRange): TrendPoint[] {
  return buildDashboardBuckets(now, range).map((bucket) => ({
    label: bucket.label,
    reports: reports.filter((report) => report.createdAt >= bucket.start && report.createdAt < bucket.end).length,
  }));
}

export function buildDashboardBuckets(now: Date, range: TimeRange) {
  const rangeWindow = getRangeWindow(range, now);
  if (range === "today") {
    const start = rangeWindow.start;
    return Array.from({ length: DASHBOARD_TIME.hoursPerDay }, (_, hour) => {
      const bucketStart = new Date(start.getTime() + hour * DASHBOARD_TIME.millisecondsPerHour);
      const bucketEnd = new Date(bucketStart.getTime() + DASHBOARD_TIME.millisecondsPerHour);
      return {
        start: bucketStart,
        end: bucketEnd,
        label: bucketStart.toLocaleTimeString("es-ES", { hour: "2-digit", timeZone: APP_TIME_ZONE }),
      };
    });
  }

  const buckets = [];
  for (let offset = 0; ; offset += 1) {
    const bucketStart = getLocalStartOfDay(rangeWindow.start, offset);
    if (bucketStart > rangeWindow.end) break;
    const bucketEnd = getLocalStartOfDay(rangeWindow.start, offset + 1);
    buckets.push({
      start: bucketStart,
      end: bucketEnd,
      label: bucketStart.toLocaleDateString("es-ES", {
        ...(range === "sevenDays" ? { weekday: "short" as const } : { day: "2-digit" as const, month: "short" as const }),
        timeZone: APP_TIME_ZONE,
      }),
    });
  }
  return buckets;
}
