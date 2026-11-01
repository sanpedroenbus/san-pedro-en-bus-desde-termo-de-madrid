import { describe, expect, it } from "vitest";
import { AUTHORIZED_SERVICE, AUTHORIZED_SERVICE_SOURCE, DAY_TYPES, MOOVIT_FREQUENCIES, summarizeFrequencies } from "./authorized-service";
import { ROUTES } from "./routes";

describe("AUTHORIZED_SERVICE", () => {
  it("has one frequency per hour from 04:00 to 22:00 for every route, day and direction", () => {
    for (const service of Object.values(AUTHORIZED_SERVICE)) {
      for (const day of DAY_TYPES) {
        const schedule = service?.schedule[day];
        if (!schedule) continue;
        expect(schedule.fromSanJose).toHaveLength(19);
        expect(schedule.toSanJose).toHaveLength(19);
      }
    }
  });

  it("only covers app routes, and its fleet plus the two routes the app leaves out (Cipreses, Curridabat: 1 bus each) adds up to the authorized 46", () => {
    for (const route of Object.keys(AUTHORIZED_SERVICE)) {
      expect(ROUTES).toContain(route);
    }
    const listedFleet = Object.values(AUTHORIZED_SERVICE).reduce((sum, service) => sum + (service?.fleet ?? 0), 0);
    expect(listedFleet + 2).toBe(AUTHORIZED_SERVICE_SOURCE.authorizedFleet);
  });

  it("encodes La Campiña's hourly weekday service (05:00-22:00 out, 04:00-21:00 back)", () => {
    const weekday = AUTHORIZED_SERVICE.LA_CAMPINA!.schedule.weekday!;
    expect(weekday.fromSanJose[0]).toBe(0);
    expect(weekday.fromSanJose.slice(1).every((minutes) => minutes === 60)).toBe(true);
    expect(weekday.toSanJose.slice(0, 18).every((minutes) => minutes === 60)).toBe(true);
    expect(weekday.toSanJose[18]).toBe(0);
  });

  it("has no weekend service for La Europa", () => {
    expect(AUTHORIZED_SERVICE.LA_EUROPA!.schedule.saturday).toBeUndefined();
    expect(AUTHORIZED_SERVICE.LA_EUROPA!.schedule.sunday).toBeUndefined();
  });
});

describe("summarizeFrequencies", () => {
  // Index 0 = 04:00, 8 = 12:00 (afternoon starts), 14 = 18:00 (night starts).
  const hours = (values: Record<number, number>) => Array.from({ length: 19 }, (_, index) => values[index] ?? 0);

  it("returns the plain mean per time of day over hours with service, both directions", () => {
    expect(
      summarizeFrequencies({ fromSanJose: hours({ 0: 10, 7: 20, 8: 15, 14: 30 }), toSanJose: hours({ 1: 30, 13: 15, 18: 60 }) }),
    ).toEqual({ averageMinutes: { morning: 20, afternoon: 15, night: 45 }, hasGaps: true });
  });

  it("splits Granadilla's weekday service into morning, afternoon and night", () => {
    expect(summarizeFrequencies(AUTHORIZED_SERVICE.GRANADILLA!.schedule.weekday)).toEqual({
      averageMinutes: { morning: 10, afternoon: 9, night: 15 },
      hasGaps: false,
    });
  });

  it("returns null for a time of day without service", () => {
    expect(summarizeFrequencies({ fromSanJose: hours({ 0: 60 }), toSanJose: hours({}) })?.averageMinutes).toEqual({
      morning: 60,
      afternoon: null,
      night: null,
    });
  });

  it("flags hours without service between a direction's first and last departure", () => {
    expect(summarizeFrequencies({ fromSanJose: [60, 0, 60], toSanJose: [60, 60, 0] })?.hasGaps).toBe(true);
    expect(summarizeFrequencies(AUTHORIZED_SERVICE.LA_EUROPA!.schedule.weekday)?.hasGaps).toBe(true);
    expect(summarizeFrequencies(AUTHORIZED_SERVICE.LA_CAMPINA!.schedule.weekday)?.hasGaps).toBe(false);
    expect(summarizeFrequencies(AUTHORIZED_SERVICE.LA_CAMPINA!.schedule.sunday)?.hasGaps).toBe(true);
  });

  it("rounds the mean to whole minutes", () => {
    expect(summarizeFrequencies({ fromSanJose: [10, 15], toSanJose: [15] })?.averageMinutes.morning).toBe(13);
  });

  it("returns null when there is no service or no schedule", () => {
    expect(summarizeFrequencies({ fromSanJose: [0, 0], toSanJose: [0] })).toBeNull();
    expect(summarizeFrequencies(undefined)).toBeNull();
  });
});

describe("MOOVIT_FREQUENCIES", () => {
  it("only fills routes the CTP document leaves out, with min <= max", () => {
    for (const [route, { url, frequencies: days }] of Object.entries(MOOVIT_FREQUENCIES)) {
      expect(url).toMatch(/^https:\/\/moovitapp\.com\//);
      expect(ROUTES).toContain(route);
      expect(AUTHORIZED_SERVICE[route as keyof typeof AUTHORIZED_SERVICE]).toBeUndefined();
      for (const [min, max] of Object.values(days)) expect(min).toBeLessThanOrEqual(max);
    }
  });
});
