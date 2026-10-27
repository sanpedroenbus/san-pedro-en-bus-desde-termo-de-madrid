import { describe, expect, it } from "vitest";
import { AUTHORIZED_SERVICE, AUTHORIZED_SERVICE_SOURCE, DAY_TYPES, summarizeFrequencies } from "./authorized-service";
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
  it("returns min, max and the plain mean over hours with service, both directions", () => {
    expect(summarizeFrequencies({ fromSanJose: [10, 20, 10], toSanJose: [30, 30, 0] })).toEqual({
      minMinutes: 10,
      maxMinutes: 30,
      averageMinutes: 20,
      hasGaps: false,
    });
  });

  it("flags hours without service between a direction's first and last departure", () => {
    expect(summarizeFrequencies({ fromSanJose: [60, 0, 60], toSanJose: [60, 60, 0] })?.hasGaps).toBe(true);
    expect(summarizeFrequencies(AUTHORIZED_SERVICE.LA_EUROPA!.schedule.weekday)?.hasGaps).toBe(true);
    expect(summarizeFrequencies(AUTHORIZED_SERVICE.LA_CAMPINA!.schedule.weekday)?.hasGaps).toBe(false);
    expect(summarizeFrequencies(AUTHORIZED_SERVICE.LA_CAMPINA!.schedule.sunday)?.hasGaps).toBe(true);
  });

  it("rounds the mean to whole minutes", () => {
    expect(summarizeFrequencies({ fromSanJose: [10, 15], toSanJose: [15] })?.averageMinutes).toBe(13);
  });

  it("returns null when there is no service or no schedule", () => {
    expect(summarizeFrequencies({ fromSanJose: [0, 0], toSanJose: [0] })).toBeNull();
    expect(summarizeFrequencies(undefined)).toBeNull();
  });

  it("summarizes Granadilla's weekday service as every 6-30 min", () => {
    const summary = summarizeFrequencies(AUTHORIZED_SERVICE.GRANADILLA!.schedule.weekday);
    expect(summary?.minMinutes).toBe(6);
    expect(summary?.maxMinutes).toBe(30);
  });
});
