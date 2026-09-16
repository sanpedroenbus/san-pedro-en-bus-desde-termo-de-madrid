import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { parseSelectedCarSeries, parseSelectedLines } from "@/lib/domain/dashboard-query";
import { isTimeRange, type DashboardRange } from "@/lib/domain/ranges";
import {
  getCarDetailModule,
  getHeatTrendModule,
  getLineSummariesModule,
  getProblemSummariesModule,
  getWorstCarsModule,
  type DashboardModuleSearch,
} from "./dashboard-modules";
import { getHomeSnapshot } from "./reports-repository";

const REPORTS_CACHE_TAG = "reports";

export async function getCachedHomeSnapshot() {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  cacheTag(REPORTS_CACHE_TAG);
  return getHomeSnapshot();
}

export async function getCachedExplorePageData(rangeKey: string, linesKey: string, carSeriesKey: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });
  cacheTag(REPORTS_CACHE_TAG);

  const search = parseSearch(rangeKey, linesKey, carSeriesKey);
  const now = new Date();
  const [lineSummaries, problemSummaries, worstCars, heatTrend] = await Promise.all([
    getLineSummariesModule(search, now),
    getProblemSummariesModule(search, now),
    getWorstCarsModule(search, now),
    getHeatTrendModule(search, now),
  ]);

  return {
    ...lineSummaries,
    ...problemSummaries,
    ...worstCars,
    ...heatTrend,
  };
}

export async function getCachedCarDetail(rangeKey: string, linesKey: string, carSeriesKey: string, car: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });
  cacheTag(REPORTS_CACHE_TAG);
  return getCarDetailModule(parseSearch(rangeKey, linesKey, carSeriesKey), car);
}

export function normalizeDashboardCacheKey(search: DashboardModuleSearch) {
  return {
    rangeKey: search.range,
    linesKey: [...new Set(search.lines)].toSorted().join(","),
    carSeriesKey: [...new Set(search.carSeries ?? [])].toSorted((a, b) => a - b).join(","),
  };
}

function parseSearch(rangeKey: string, linesKey: string, carSeriesKey: string): DashboardModuleSearch {
  const range: DashboardRange = isTimeRange(rangeKey) ? rangeKey : "summer";
  const lines = parseSelectedLines(linesKey);
  const carSeries = parseSelectedCarSeries(carSeriesKey);
  return { range, lines, carSeries };
}
