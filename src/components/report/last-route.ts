import { isRoute, type Route } from "@/lib/domain/routes";

// Riders usually report the same route they always take, so the form opens
// pre-selected on the last one they reported.
const STORAGE_KEY = "sanpedroenbus:lastReportRoute";

export function getLastReportRoute(): Route | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isRoute(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function saveLastReportRoute(route: Route) {
  try {
    localStorage.setItem(STORAGE_KEY, route);
  } catch {
    // localStorage may be unavailable (private mode) -- the preselection is a convenience only.
  }
}
