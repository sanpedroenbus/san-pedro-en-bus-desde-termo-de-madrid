import {
  buildDashboardData,
  buildCarExplorerSelection,
  type CarExplorerSelection,
  type DashboardData,
} from "@/lib/domain/dashboard";
import { cache } from "react";
import { isMetroLine, type MetroLine } from "@/lib/domain/lines";
import { getRangeWindow, type DashboardRange } from "@/lib/domain/ranges";
import type { Report } from "@/lib/domain/reports";
import { getMemoryDashboard, getMemoryCarDetail, getSupabase } from "./reports-repository";

export type DashboardModuleSearch = {
  range: DashboardRange;
  lines: MetroLine[];
  carSeries?: number[];
};

export type LineSummariesModuleData = Pick<DashboardData, "lineSummaries">;
export type ProblemSummariesModuleData = Pick<DashboardData, "problemSummaries">;
export type HeatTrendModuleData = Pick<DashboardData, "trend">;
export type WorstCarsModuleData = { carExplorer: DashboardData["carExplorer"] };

type ReportRow = {
  id: string;
  line: string;
  car: string | null;
  problems: string[] | null;
  created_at: string;
  hidden_at: string | null;
};

const getReportsForSearch = cache(async function getReportsForSearch(search: DashboardModuleSearch, now: Date): Promise<Report[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const summerStart = getRangeWindow("summer", now).start;
  const window = getRangeWindow(search.range, now);
  const queryStart = summerStart < window.start ? summerStart : window.start;

  let query = supabase
    .from("reports")
    .select("id,line,car,problems,created_at,hidden_at")
    .gte("created_at", queryStart.toISOString())
    .lte("created_at", window.end.toISOString());

  if (search.lines.length > 0) {
    query = query.in("line", search.lines);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as ReportRow[])
    .filter((row) => isMetroLine(row.line))
    .map((row) => ({
      id: row.id,
      line: row.line as MetroLine,
      car: row.car,
      problems: (row.problems ?? []) as Report["problems"],
      createdAt: new Date(row.created_at),
      hiddenAt: row.hidden_at ? new Date(row.hidden_at) : null,
    }));
});

async function getDashboardForSearch(search: DashboardModuleSearch, now: Date): Promise<DashboardData> {
  const reports = await getReportsForSearch(search, now);
  if (reports) {
    return buildDashboardData(reports, now, {} as Record<MetroLine, number>, search.range);
  }
  return getMemoryDashboard({ range: search.range, lines: search.lines.length ? search.lines : null, carSeries: search.carSeries, now });
}

export async function getLineSummariesModule(search: DashboardModuleSearch, now = new Date()): Promise<LineSummariesModuleData> {
  const dashboard = await getDashboardForSearch(search, now);
  return { lineSummaries: dashboard.lineSummaries };
}

export async function getProblemSummariesModule(search: DashboardModuleSearch, now = new Date()): Promise<ProblemSummariesModuleData> {
  const dashboard = await getDashboardForSearch(search, now);
  return { problemSummaries: dashboard.problemSummaries };
}

export async function getHeatTrendModule(search: DashboardModuleSearch, now = new Date()): Promise<HeatTrendModuleData> {
  const dashboard = await getDashboardForSearch(search, now);
  return { trend: dashboard.trend };
}

export async function getWorstCarsModule(search: DashboardModuleSearch, now = new Date()): Promise<WorstCarsModuleData> {
  const dashboard = await getDashboardForSearch(search, now);
  return { carExplorer: dashboard.carExplorer };
}

export async function getCarDetailModule(search: DashboardModuleSearch, car: string, now = new Date()): Promise<CarExplorerSelection | null> {
  const reports = await getReportsForSearch(search, now);
  if (reports) {
    return buildCarExplorerSelection(car, reports, now, search.range);
  }
  return getMemoryCarDetail({ range: search.range, lines: search.lines, carSeries: search.carSeries, car, now });
}
