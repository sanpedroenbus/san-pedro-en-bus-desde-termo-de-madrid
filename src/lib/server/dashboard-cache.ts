import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { parseSelectedProblems, parseSelectedRoutes } from "@/lib/domain/dashboard-query";
import { isTimeRange, type TimeRange } from "@/lib/domain/ranges";
import type { Route } from "@/lib/domain/routes";
import {
  getRouteSummariesModule,
  getProblemSummariesModule,
  getRouteDetailModule,
  getTrendModule,
  getUnitDetailModule,
  getUnitExplorerModule,
  type DashboardModuleSearch,
} from "./dashboard-modules";
import { getHomeSnapshot } from "./reports-repository";

const REPORTS_CACHE_TAG = "reports";

export async function getCachedHomeSnapshot(includeDemo = false) {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  cacheTag(REPORTS_CACHE_TAG);
  return getHomeSnapshot(new Date(), includeDemo);
}

export async function getCachedExplorePageData(rangeKey: string, routesKey: string, problemsKey: string, includeDemo = false) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });
  cacheTag(REPORTS_CACHE_TAG);

  const search = parseSearch(rangeKey, routesKey, problemsKey, includeDemo);
  const now = new Date();
  const [routeSummaries, problemSummaries, unitExplorer, trend] = await Promise.all([
    getRouteSummariesModule(search, now),
    getProblemSummariesModule(search, now),
    getUnitExplorerModule(search, now),
    getTrendModule(search, now),
  ]);

  return {
    ...routeSummaries,
    ...problemSummaries,
    ...unitExplorer,
    ...trend,
  };
}

export async function getCachedUnitDetail(rangeKey: string, routesKey: string, problemsKey: string, unit: string, includeDemo = false) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });
  cacheTag(REPORTS_CACHE_TAG);
  return getUnitDetailModule(parseSearch(rangeKey, routesKey, problemsKey, includeDemo), unit);
}

export async function getCachedRouteDetail(rangeKey: string, routesKey: string, problemsKey: string, route: Route, includeDemo = false) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });
  cacheTag(REPORTS_CACHE_TAG);
  return getRouteDetailModule(parseSearch(rangeKey, routesKey, problemsKey, includeDemo), route);
}

export function normalizeDashboardCacheKey(search: Pick<DashboardModuleSearch, "range" | "routes" | "problems">) {
  return {
    rangeKey: search.range,
    routesKey: [...new Set(search.routes)].toSorted().join(","),
    problemsKey: [...new Set(search.problems)].toSorted().join(","),
  };
}

function parseSearch(rangeKey: string, routesKey: string, problemsKey: string, includeDemo: boolean): DashboardModuleSearch {
  const range: TimeRange = isTimeRange(rangeKey) ? rangeKey : "thirtyDays";
  const routes = parseSelectedRoutes(routesKey);
  const problems = parseSelectedProblems(problemsKey);
  return { range, routes, problems, includeDemo };
}
