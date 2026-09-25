import { getLocalStartOfDay } from "./time";

export const TIME_RANGES = ["today", "sevenDays", "thirtyDays", "all"] as const;

export type TimeRange = (typeof TIME_RANGES)[number];

// "all" has no natural start date. Bound it to when the app actually
// launched, so the range doesn't imply years of history the app doesn't
// have. Revisit (e.g. back to a rolling lookback) once the app's real
// history grows past what a fixed date usefully covers.
const ALL_RANGE_START = new Date("2026-08-01T12:00:00Z");

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
  return getLocalStartOfDay(ALL_RANGE_START);
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
