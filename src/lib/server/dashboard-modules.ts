import "server-only";
import {
  buildDashboardData,
  buildRouteProblemBreakdown,
  buildUnitExplorerSelection,
  type RouteProblemBreakdown,
  type UnitExplorerSelection,
  type DashboardData,
} from "@/lib/domain/dashboard";
import { cache } from "react";
import { isRoute, type Route } from "@/lib/domain/routes";
import type { Problem } from "@/lib/domain/problems";
import { getRangeWindow, type TimeRange } from "@/lib/domain/ranges";
import { DEMO_DATA_CUTOFF } from "@/lib/domain/demo";
import type { Report } from "@/lib/domain/reports";
import { getMemoryDashboard, getMemoryRouteDetail, getMemoryUnitDetail, getSupabase } from "./reports-repository";

export type DashboardModuleSearch = {
  range: TimeRange;
  routes: Route[];
  problems: Problem[];
  includeDemo: boolean;
};

export type RouteSummariesModuleData = Pick<DashboardData, "routeSummaries">;
export type ProblemSummariesModuleData = Pick<DashboardData, "problemSummaries" | "categorySummaries">;
export type TrendModuleData = Pick<DashboardData, "trend">;
export type UnitExplorerModuleData = { unitExplorer: DashboardData["unitExplorer"] };

type ReportRow = {
  id: string;
  route: string;
  unit: string | null;
  problems: string[] | null;
  created_at: string;
  hidden_at: string | null;
};

const getReportsForSearch = cache(async function getReportsForSearch(search: DashboardModuleSearch, now: Date): Promise<Report[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const window = getRangeWindow(search.range, now);
  // The live app never shows anything before the demo cutoff, regardless of
  // the selected range -- this is an additional floor, not a replacement for
  // the range window.
  const start = search.includeDemo ? window.start : new Date(Math.max(window.start.getTime(), DEMO_DATA_CUTOFF.getTime()));

  let query = supabase
    .from("reports")
    .select("id,route,unit,problems,created_at,hidden_at")
    .gte("created_at", start.toISOString())
    .lte("created_at", window.end.toISOString());

  if (search.routes.length > 0) {
    query = query.in("route", search.routes);
  }

  if (search.problems.length > 0) {
    // Match reports that carry at least one of the selected problems (an
    // "any overlap" filter, not "contains all selected problems") --
    // mirrors reportMatchesProblems, which the memory-store path uses.
    query = query.overlaps("problems", search.problems);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as ReportRow[])
    .filter((row) => isRoute(row.route))
    .map((row) => ({
      id: row.id,
      route: row.route as Route,
      unit: row.unit,
      problems: (row.problems ?? []) as Report["problems"],
      createdAt: new Date(row.created_at),
      hiddenAt: row.hidden_at ? new Date(row.hidden_at) : null,
    }));
});

async function getDashboardForSearch(search: DashboardModuleSearch, now: Date): Promise<DashboardData> {
  const reports = await getReportsForSearch(search, now);
  if (reports) {
    return buildDashboardData(reports, now, search.range);
  }
  return getMemoryDashboard({ range: search.range, routes: search.routes, problems: search.problems, includeDemo: search.includeDemo, now });
}

export async function getRouteSummariesModule(search: DashboardModuleSearch, now = new Date()): Promise<RouteSummariesModuleData> {
  const dashboard = await getDashboardForSearch(search, now);
  return { routeSummaries: dashboard.routeSummaries };
}

export async function getProblemSummariesModule(search: DashboardModuleSearch, now = new Date()): Promise<ProblemSummariesModuleData> {
  const dashboard = await getDashboardForSearch(search, now);
  return { problemSummaries: dashboard.problemSummaries, categorySummaries: dashboard.categorySummaries };
}

export async function getTrendModule(search: DashboardModuleSearch, now = new Date()): Promise<TrendModuleData> {
  const dashboard = await getDashboardForSearch(search, now);
  return { trend: dashboard.trend };
}

export async function getUnitExplorerModule(search: DashboardModuleSearch, now = new Date()): Promise<UnitExplorerModuleData> {
  const dashboard = await getDashboardForSearch(search, now);
  return { unitExplorer: dashboard.unitExplorer };
}

export async function getUnitDetailModule(search: DashboardModuleSearch, unit: string, now = new Date()): Promise<UnitExplorerSelection | null> {
  const reports = await getReportsForSearch(search, now);
  if (reports) {
    return buildUnitExplorerSelection(unit, reports, now, search.range);
  }
  return getMemoryUnitDetail({ range: search.range, routes: search.routes, problems: search.problems, includeDemo: search.includeDemo, unit, now });
}

// getReportsForSearch already scopes its Supabase query to the range window,
// so it's safe to hand its result straight to buildRouteProblemBreakdown
// (which only strips hidden reports, not the range). The memory fallback has
// no such query-level window, so getMemoryRouteDetail applies it itself.
export async function getRouteDetailModule(search: DashboardModuleSearch, route: Route, now = new Date()): Promise<RouteProblemBreakdown> {
  const reports = await getReportsForSearch(search, now);
  if (reports) {
    return buildRouteProblemBreakdown(route, reports);
  }
  return getMemoryRouteDetail({ range: search.range, routes: search.routes, problems: search.problems, includeDemo: search.includeDemo, route, now });
}
