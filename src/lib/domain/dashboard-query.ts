import { isRoute, type Route } from "./routes";
import { isTimeRange, type TimeRange } from "./ranges";

export function parseDashboardRange(value: string | null | undefined, fallback: TimeRange = "all") {
  return isTimeRange(value) ? value : fallback;
}

export function parseSelectedRoutes(value: string | null | undefined) {
  if (!value) return [];
  return [...new Set(value.split(",").filter(isRoute))] as Route[];
}
