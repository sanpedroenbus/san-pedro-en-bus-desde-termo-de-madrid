import { getLocalStartOfDay } from "./time";

export const TIME_RANGES = ["today", "sevenDays", "thirtyDays", "all"] as const;

export type TimeRange = (typeof TIME_RANGES)[number];

// "all" has no natural start date. Bound it to a fixed lookback so bucketing
// in dashboard.ts stays finite and cheap instead of walking back to the
// epoch. Revisit once the app has a real multi-year history worth showing.
const ALL_RANGE_LOOKBACK_DAYS = 730;

export function isTimeRange(value: unknown): value is TimeRange {
  return typeof value === "string" && TIME_RANGES.includes(value as TimeRange);
}

export function getRangeStart(range: TimeRange, now = new Date()) {
  if (range === "today") {
    return getLocalStartOfDay(now);
  }
  if (range === "sevenDays") {
    return getLocalStartOfDay(now, -6);
  }
  if (range === "thirtyDays") {
    return getLocalStartOfDay(now, -29);
  }
  return getLocalStartOfDay(now, -ALL_RANGE_LOOKBACK_DAYS);
}

export function getRangeEnd(now = new Date()) {
  return now;
}

export function getRangeWindow(range: TimeRange, now = new Date()) {
  return {
    start: getRangeStart(range, now),
    end: getRangeEnd(now),
  };
}
