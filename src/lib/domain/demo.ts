import { fromLocalTime } from "./time";
import type { Report } from "./reports";

// Reports created before this instant are seed/demo data. The live app (no
// /demo prefix) never shows anything before it; /demo shows everything.
export const DEMO_DATA_CUTOFF = fromLocalTime(2026, 8, 16);

export function isLiveReport(report: Pick<Report, "createdAt">): boolean {
  return report.createdAt >= DEMO_DATA_CUTOFF;
}
