import { describe, expect, it } from "vitest";
import { getConfidence } from "./confidence";

const createdAt = new Date("2026-07-05T12:00:00Z");

function reportsOfLength(count: number) {
  return Array.from({ length: count }, () => ({ createdAt }));
}

describe("getConfidence", () => {
  it("is low below three reports", () => {
    expect(getConfidence(reportsOfLength(0))).toBe("low");
    expect(getConfidence(reportsOfLength(1))).toBe("low");
    expect(getConfidence(reportsOfLength(2))).toBe("low");
  });

  it("stays low for three and four reports, the gap below the medium threshold", () => {
    expect(getConfidence(reportsOfLength(3))).toBe("low");
    expect(getConfidence(reportsOfLength(4))).toBe("low");
  });

  it("is medium from five reports up to nine", () => {
    expect(getConfidence(reportsOfLength(5))).toBe("medium");
    expect(getConfidence(reportsOfLength(9))).toBe("medium");
  });

  it("is high from ten reports and up", () => {
    expect(getConfidence(reportsOfLength(10))).toBe("high");
    expect(getConfidence(reportsOfLength(25))).toBe("high");
  });
});
