import { PROBLEMS, type Problem } from "./heat";
import { METRO_LINES, type MetroLine } from "./lines";
import { getRangeWindow, type DashboardRange } from "./ranges";
import type { Report } from "./reports";

export const DASHBOARD_LIMITS = {
  recentReportCount: 25,
} as const;

export const DASHBOARD_TIME = {
  millisecondsPerHour: 3_600_000,
  hoursPerDay: 24,
} as const;

export type LineSummary = {
  line: MetroLine;
  reports: number;
  carsReported: number;
  latestReportAt: Date | null;
};

export type ProblemSummary = {
  problem: Problem;
  reports: number;
};

export type CarExplorerOption = {
  car: string;
  reports: number;
  lines: MetroLine[];
};

export type CarExplorerSelection = CarExplorerOption & {
  history: TrendPoint[];
};

export type TrendPoint = {
  label: string;
  reports: number;
};

export type DashboardData = {
  lineSummaries: LineSummary[];
  problemSummaries: ProblemSummary[];
  carExplorer: {
    options: CarExplorerOption[];
  };
  trend: TrendPoint[];
  recentReports: Report[];
  reportsLastDay: number;
};

export function buildDashboardData(
  reports: Report[],
  now = new Date(),
  _estimatedCarsByLine: Record<MetroLine, number> = {} as Record<MetroLine, number>,
  range: DashboardRange = "sevenDays",
): DashboardData {
  const rangeWindow = getRangeWindow(range, now);
  const usableReports = reports.filter((report) => !report.hiddenAt);
  const visibleReports = usableReports.filter((report) => report.createdAt >= rangeWindow.start && report.createdAt <= rangeWindow.end);

  const lineSummaries: LineSummary[] = METRO_LINES.map((line) => {
    const lineReports = visibleReports.filter((report) => report.line === line);
    const reportedCars = new Set(lineReports.map((report) => report.car).filter(Boolean));
    const latestReportAt =
      lineReports.length > 0
        ? lineReports.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
        : null;
    return {
      line,
      reports: lineReports.length,
      carsReported: reportedCars.size,
      latestReportAt,
    };
  }).sort((a, b) => b.reports - a.reports);

  const problemSummaries: ProblemSummary[] = PROBLEMS.map((problem) => ({
    problem,
    reports: visibleReports.filter((report) => report.problems?.includes(problem)).length,
  })).sort((a, b) => b.reports - a.reports);

  const carExplorerOptions = buildCarExplorerOptions(visibleReports);
  const trend = buildTrend(visibleReports, now, range);

  const dayAgo = new Date(now.getTime() - DASHBOARD_TIME.hoursPerDay * DASHBOARD_TIME.millisecondsPerHour);
  const reportsLastDay = visibleReports.filter((report) => report.createdAt >= dayAgo).length;

  return {
    lineSummaries,
    problemSummaries,
    carExplorer: {
      options: carExplorerOptions,
    },
    trend,
    recentReports: visibleReports.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, DASHBOARD_LIMITS.recentReportCount),
    reportsLastDay,
  };
}

export function buildCarExplorerSelection(
  car: string,
  reports: Report[],
  now: Date,
  range: DashboardRange,
  options = buildCarExplorerOptions(reports),
): CarExplorerSelection | null {
  const option = options.find((item) => item.car === car);
  if (!option) return null;
  const carReports = reports.filter((report) => report.car === car);
  return {
    ...option,
    history: buildDashboardBuckets(now, range).map((bucket) => ({
      label: bucket.label,
      reports: carReports.filter((report) => report.createdAt >= bucket.start && report.createdAt < bucket.end).length,
    })),
  };
}

function buildCarExplorerOptions(reports: Report[]): CarExplorerOption[] {
  const carGroups = new Map<string, Report[]>();
  for (const report of reports) {
    if (!report.car) continue;
    pushGroupedReport(carGroups, report.car, report);
  }

  return Array.from(carGroups.entries())
    .map(([car, carReports]) => ({
      car,
      reports: carReports.length,
      lines: getReportedLines(carReports),
    }))
    .toSorted((a, b) => b.reports - a.reports || a.car.localeCompare(b.car));
}

function getReportedLines(reports: Report[]) {
  return Array.from(new Set(reports.map((report) => report.line))).sort((a, b) => a.localeCompare(b)) as MetroLine[];
}

function pushGroupedReport(groups: Map<string, Report[]>, key: string, report: Report) {
  const groupedReports = groups.get(key);
  if (groupedReports) {
    groupedReports.push(report);
    return;
  }
  groups.set(key, [report]);
}

function buildTrend(reports: Report[], now: Date, range: DashboardRange): TrendPoint[] {
  return buildDashboardBuckets(now, range).map((bucket) => ({
    label: bucket.label,
    reports: reports.filter((
