import { describe, expect, it } from "vitest";
import { getProblemLabel } from "@/components/report/problem-label";
import { PROBLEM_CATEGORIES, PROBLEMS } from "@/lib/domain/problems";
import { defaultAppCopy } from "./app-copy";
import { DEFAULT_LOCALE, isLocale, LOCALES, localeNames } from "./config";
import { formatNumber, formatRelativeReportAge, formatReportDateTime, formatReportTime, getIntlLocale } from "./format";
import { messages as esMessages } from "./messages/es";

// dictionaries.ts (getDictionary) imports the "server-only" package, which
// is not installed as a real dependency here -- it's normally resolved by
// Next's own build tooling, not plain Vite/vitest -- so it can't be
// exercised from a unit test without changing non-test source. The messages
// module it wraps is tested directly below instead.

describe("i18n configuration", () => {
  it("is Spanish-only: es is the only and default locale", () => {
    expect(DEFAULT_LOCALE).toBe("es");
    expect(LOCALES).toEqual(["es"]);
    expect(isLocale("es")).toBe(true);
    expect(isLocale("en")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(localeNames).toEqual({ es: "Español" });
  });

  it("derives default app metadata copy from the Spanish dictionary", () => {
    expect(defaultAppCopy.title).toBe(esMessages.meta.title);
    expect(defaultAppCopy.description).toBe(esMessages.meta.description);
    expect(defaultAppCopy.shortName).toBe(esMessages.common.shortName);
  });

  it("preserves the non-affiliation disclaimer required by the product rules", () => {
    expect(esMessages.common.disclaimer).toContain("no afiliado");
  });
});

describe("dictionary completeness (problems and categories)", () => {
  it("has a translated label for every problem in the catalogue, and no extras", () => {
    const dictionaryKeys = Object.keys(esMessages.problems);
    expect(dictionaryKeys).toHaveLength(PROBLEMS.length);

    for (const problem of PROBLEMS) {
      const label = getProblemLabel(esMessages, problem);
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("has a translated label for every problem category, and no extras", () => {
    const dictionaryKeys = Object.keys(esMessages.problemCategories);
    expect(new Set(dictionaryKeys)).toEqual(new Set(PROBLEM_CATEGORIES));
    expect(dictionaryKeys).toHaveLength(PROBLEM_CATEGORIES.length);

    for (const category of PROBLEM_CATEGORIES) {
      expect(esMessages.problemCategories[category].length).toBeGreaterThan(0);
    }
  });
});

describe("locale-aware formatting", () => {
  it("always resolves to the Costa Rica Intl locale", () => {
    expect(getIntlLocale("es")).toBe("es-CR");
  });

  it("formats report times in the America/Costa_Rica timezone", () => {
    const date = new Date("2026-07-05T10:30:00Z");
    // Costa Rica is UTC-6 with no daylight saving time: 10:30 UTC -> 04:30 local.
    expect(formatReportTime(date, "es")).toBe(date.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Costa_Rica" }));
    expect(formatReportTime(date, "es")).toContain("04:30");
  });

  it("formats full report date-times in the America/Costa_Rica timezone", () => {
    const date = new Date("2026-07-05T10:30:00Z");
    const formatted = formatReportDateTime(date, "es");
    expect(formatted).toContain("05");
    expect(formatted).toContain("04:30");
  });

  it("formats decimals with the Spanish comma separator", () => {
    expect(formatNumber(12.34, "es")).toBe("12,34");
  });

  it("formats compact relative report ages in minutes below an hour", () => {
    const now = new Date("2026-07-05T12:30:00Z");
    expect(formatRelativeReportAge(new Date("2026-07-05T12:30:00Z"), "es", "Sin reportes", now)).toBe("0m");
    expect(formatRelativeReportAge(new Date("2026-07-05T12:05:00Z"), "es", "Sin reportes", now)).toBe("25m");
    expect(formatRelativeReportAge(new Date("2026-07-05T11:31:00Z"), "es", "Sin reportes", now)).toBe("59m");
  });

  it("switches to compact hours at the one-hour boundary", () => {
    const now = new Date("2026-07-05T12:30:00Z");
    expect(formatRelativeReportAge(new Date("2026-07-05T11:30:00Z"), "es", "Sin reportes", now)).toBe("1h");
    expect(formatRelativeReportAge(new Date("2026-07-05T10:30:00Z"), "es", "Sin reportes", now)).toBe("2h");
  });

  it("falls back to the provided empty label when there is no date", () => {
    const now = new Date("2026-07-05T12:30:00Z");
    expect(formatRelativeReportAge(null, "es", "Sin reportes", now)).toBe("Sin reportes");
  });
});
