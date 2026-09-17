import { describe, expect, it } from "vitest";
import { APP_TIME_ZONE, fromLocalTime, getLocalDateParts, getLocalStartOfDay } from "./time";

describe("time", () => {
  it("runs on the Costa Rica time zone", () => {
    expect(APP_TIME_ZONE).toBe("America/Costa_Rica");
  });

  it("reads local calendar date parts from a UTC instant (UTC-6, no DST)", () => {
    // 05:59:59Z is still July 4th in Costa Rica; 06:00:00Z has rolled to July 5th.
    expect(getLocalDateParts(new Date("2026-07-05T05:59:59.000Z"))).toEqual({ year: 2026, month: 7, day: 4 });
    expect(getLocalDateParts(new Date("2026-07-05T06:00:00.000Z"))).toEqual({ year: 2026, month: 7, day: 5 });
  });

  it("converts a local wall-clock time into the matching UTC instant", () => {
    expect(fromLocalTime(2026, 0, 1, 0, 0, 0).toISOString()).toBe("2026-01-01T06:00:00.000Z");
    expect(fromLocalTime(2026, 11, 31, 23, 59, 59).toISOString()).toBe("2027-01-01T05:59:59.000Z");
  });

  it("has no daylight saving offset shift across a mid-year boundary", () => {
    // If Costa Rica observed DST like Europe/Madrid, these offsets would differ.
    const januaryMidnight = fromLocalTime(2026, 0, 15, 0, 0, 0);
    const julyMidnight = fromLocalTime(2026, 6, 15, 0, 0, 0);
    expect(januaryMidnight.getUTCHours()).toBe(6);
    expect(julyMidnight.getUTCHours()).toBe(6);
  });

  it("finds the local start of day, with optional day offsets", () => {
    const now = new Date("2026-07-05T12:00:00Z");
    expect(getLocalStartOfDay(now).toISOString()).toBe("2026-07-05T06:00:00.000Z");
    expect(getLocalStartOfDay(now, -1).toISOString()).toBe("2026-07-04T06:00:00.000Z");
    expect(getLocalStartOfDay(now, -6).toISOString()).toBe("2026-06-29T06:00:00.000Z");
  });

  it("rolls month and year boundaries correctly through day offsets", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    expect(getLocalStartOfDay(now, -1).toISOString()).toBe("2025-12-31T06:00:00.000Z");
  });
});
