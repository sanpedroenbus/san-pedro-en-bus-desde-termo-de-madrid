import { describe, expect, it } from "vitest";
import { getRangeEnd, getRangeStart, getRangeWindow, isTimeRange, TIME_RANGES } from "./ranges";

describe("time ranges", () => {
  it("defines exactly today, sevenDays, thirtyDays and all", () => {
    expect(TIME_RANGES).toEqual(["today", "sevenDays", "thirtyDays", "all"]);
  });

  it("validates range names", () => {
    for (const range of TIME_RANGES) {
      expect(isTimeRange(range)).toBe(true);
    }
    expect(isTimeRange("summer")).toBe(false);
    expect(isTimeRange("quarter")).toBe(false);
    expect(isTimeRange(undefined)).toBe(false);
  });

  it("computes today, seven day, and thirty day starts on local calendar days", () => {
    const now = new Date("2026-07-05T12:00:00Z");
    expect(getRangeStart("today", now).toISOString()).toBe("2026-07-05T06:00:00.000Z");
    expect(getRangeStart("sevenDays", now).toISOString()).toBe("2026-06-29T06:00:00.000Z");
    expect(getRangeStart("thirtyDays", now).toISOString()).toBe("2026-06-06T06:00:00.000Z");
  });

  it("uses Costa Rica calendar days across the UTC date boundary (UTC-6, no DST)", () => {
    // 2026-07-05T05:59:59Z is still 2026-07-04 local time in Costa Rica.
    const justBeforeLocalMidnight = new Date("2026-07-05T05:59:59.000Z");
    expect(getRangeStart("today", justBeforeLocalMidnight).toISOString()).toBe("2026-07-04T06:00:00.000Z");

    const justAfterLocalMidnight = new Date("2026-07-05T06:00:00.000Z");
    expect(getRangeStart("today", justAfterLocalMidnight).toISOString()).toBe("2026-07-05T06:00:00.000Z");
  });

  it("bounds the 'all' range to a documented 730-day lookback rather than the epoch", () => {
    const now = new Date("2026-07-05T12:00:00Z");
    expect(getRangeStart("all", now).toISOString()).toBe("2024-07-05T06:00:00.000Z");
  });

  it("ends every range at the provided instant, not the end of a calendar day", () => {
    const now = new Date("2026-07-05T12:34:56.000Z");
    expect(getRangeEnd(now).toISOString()).toBe(now.toISOString());
  });

  it("returns a start/end pair from getRangeWindow", () => {
    const now = new Date("2026-07-05T12:00:00Z");
    const window = getRangeWindow("sevenDays", now);
    expect(window.start.toISOString()).toBe("2026-06-29T06:00:00.000Z");
    expect(window.end.toISOString()).toBe(now.toISOString());
  });
});
