import { isRoute, type Route } from "./routes";
import { isProblem, type Problem } from "./problems";
import { isTimeRange, type TimeRange } from "./ranges";

export function parseDashboardRange(value: string | null | undefined, fallback: TimeRange = "thirtyDays") {
  return isTimeRange(value) ? value : fallback;
}

export function parseSelectedRoutes(value: string | null | undefined) {
  if (!value) return [];
  return [...new Set(value.split(",").filter(isRoute))] as Route[];
}

export function parseSelectedProblems(value: string | null | undefined) {
  if (!value) return [];
  return [...new Set(value.split(",").filter(isProblem))] as Problem[];
}
