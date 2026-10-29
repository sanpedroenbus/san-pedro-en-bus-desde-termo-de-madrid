import { describe, expect, it } from "vitest";
import { ALERT_MILESTONE_EVERY, ALERT_SPIKE_REPORTS, getReportAlerts } from "./alerts";

describe("getReportAlerts", () => {
  it("alerts on every milestone multiple and nowhere in between", () => {
    expect(getReportAlerts("CEDROS", ALERT_MILESTONE_EVERY, 1)).toHaveLength(1);
    expect(getReportAlerts("CEDROS", ALERT_MILESTONE_EVERY * 3, 1)[0].title).toBe(`${ALERT_MILESTONE_EVERY * 3} reportes`);
    expect(getReportAlerts("CEDROS", ALERT_MILESTONE_EVERY + 1, 1)).toEqual([]);
    expect(getReportAlerts("CEDROS", 0, 0)).toEqual([]);
  });

  it("alerts once when a route reaches the spike threshold, not before or after", () => {
    expect(getReportAlerts("CARMIOL", 7, ALERT_SPIKE_REPORTS - 1)).toEqual([]);
    expect(getReportAlerts("CARMIOL", 7, ALERT_SPIKE_REPORTS)[0].title).toBe("Pico de reportes: Carmiol");
    expect(getReportAlerts("CARMIOL", 7, ALERT_SPIKE_REPORTS + 1)).toEqual([]);
  });

  it("sends both when a milestone and a spike land on the same report", () => {
    expect(getReportAlerts("CEDROS", ALERT_MILESTONE_EVERY, ALERT_SPIKE_REPORTS)).toHaveLength(2);
  });
});
