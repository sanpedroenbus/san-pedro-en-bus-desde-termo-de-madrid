import { describe, expect, it } from "vitest";
import { getCooldownMinutesLeft, REPORT_COOLDOWN_MS } from "./report-cooldown";

describe("getCooldownMinutesLeft", () => {
  it("rounds up so the hint never reads 0 while still on cooldown", () => {
    expect(getCooldownMinutesLeft(REPORT_COOLDOWN_MS)).toBe(5);
    expect(getCooldownMinutesLeft(4 * 60_000 + 1)).toBe(5);
    expect(getCooldownMinutesLeft(60_000)).toBe(1);
    expect(getCooldownMinutesLeft(1)).toBe(1);
  });

  it("is 0 once the cooldown is over", () => {
    expect(getCooldownMinutesLeft(0)).toBe(0);
    expect(getCooldownMinutesLeft(-500)).toBe(0);
  });
});
