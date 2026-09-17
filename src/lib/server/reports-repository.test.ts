import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NO_UNIT_ORIGIN_WINDOW_MINUTES, RATE_LIMIT_MAX_REPORTS, type ReportInput } from "@/lib/domain/reports";
import {
  createReportForRequest,
  getHomeSnapshot,
  getMemoryDashboard,
  getMemoryUnitDetail,
  getUnitSuggestions,
  undoReport,
} from "./reports-repository";

// The memory store lives on `globalThis` so it survives hot reloads in dev,
// lazily seeding itself from `seedReports` the first time it's read. Tests
// replace it with an empty array (rather than deleting the key, which would
// let it reseed from real dev fixture data) so each test starts from a
// known-empty store, independent of both prior tests and seed-data content.
function resetMemoryStore() {
  (globalThis as { sanPedroReports?: unknown }).sanPedroReports = [];
}

function input(partial: Partial<ReportInput> = {}): ReportInput {
  return {
    route: "CEDROS",
    unit: null,
    problems: ["hacinados"],
    ...partial,
  };
}

describe("reports-repository (memory store)", () => {
  beforeEach(() => {
    vi.stubEnv("TERMO_ALLOW_MEMORY_STORE", "1");
    resetMemoryStore();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetMemoryStore();
  });

  describe("runtime safeguards", () => {
    it("fails closed on the abuse secret before ever touching Supabase", async () => {
      vi.stubEnv("TERMO_REQUIRE_SUPABASE", "1");
      vi.stubEnv("TERMO_ALLOW_MEMORY_STORE", "0");

      await expect(createReportForRequest(input(), null, new Date("2026-07-05T12:00:00Z"))).rejects.toThrow(
        "TERMO_ABUSE_SECRET is required",
      );
    });

    it("fails closed when persistent storage is required but Supabase credentials are missing", async () => {
      vi.stubEnv("TERMO_REQUIRE_SUPABASE", "1");
      vi.stubEnv("TERMO_ALLOW_MEMORY_STORE", "0");
      vi.stubEnv("TERMO_ABUSE_SECRET", "test-secret");

      await expect(createReportForRequest(input(), null, new Date("2026-07-05T12:00:00Z"))).rejects.toThrow(
        "Supabase is required in this environment",
      );
    });
  });

  describe("createReportForRequest", () => {
    it("persists a report against the provided clock and returns an undo token", async () => {
      const now = new Date("2026-07-05T12:00:00Z");
      const result = await createReportForRequest(input({ route: "CEDROS", unit: "51", problems: ["hacinados"] }), null, now);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.report.route).toBe("CEDROS");
      expect(result.report.unit).toBe("51");
      expect(result.report.problems).toEqual(["hacinados"]);
      expect(result.report.createdAt).toEqual(now);
      expect(result.report.hiddenAt).toBeNull();
      expect(typeof result.undoToken).toBe("string");
      expect(result.undoToken.length).toBeGreaterThan(0);
    });

    it("dedupes and sorts problems before storing them (normalizeProblems)", async () => {
      const now = new Date("2026-07-05T12:00:00Z");
      const result = await createReportForRequest(
        input({ route: "GRANADILLA", unit: "77", problems: ["hacinados", "cucarachas", "hacinados"] }),
        null,
        now,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // Deduped (only one "hacinados") and sorted alphabetically, regardless
      // of submission order.
      expect(result.report.problems).toEqual(["cucarachas", "hacinados"]);
    });

    describe("no-unit duplicate suppression (route-scoped, no request fingerprint required)", () => {
      it("suppresses a second no-unit report on the same route within the window regardless of which problems were reported", async () => {
        // Deliberate product policy, confirmed with the product owner: a
        // no-unit report is treated as "the same complaint" about a route
        // for a short window, even if the reported problems differ, because
        // there is no unit to distinguish separate buses.
        const first = await createReportForRequest(
          input({ route: "SAN_RAMON", unit: null, problems: ["hacinados"] }),
          null,
          new Date("2026-07-05T12:00:00Z"),
        );
        const second = await createReportForRequest(
          input({ route: "SAN_RAMON", unit: null, problems: ["acoso", "cucarachas"] }),
          null,
          new Date("2026-07-05T12:01:00Z"),
        );

        expect(first.ok).toBe(true);
        expect(second).toEqual({ ok: false, reason: "duplicate" });
      });

      it("does not suppress no-unit reports made on a different route", async () => {
        const now = new Date("2026-07-05T12:00:00Z");
        const first = await createReportForRequest(input({ route: "SAN_RAMON", unit: null }), null, now);
        const second = await createReportForRequest(input({ route: "SABANILLA", unit: null }), null, now);

        expect(first.ok).toBe(true);
        expect(second.ok).toBe(true);
      });
    });

    describe("identified-unit duplicate suppression", () => {
      it("flags a repeat report for the same route, unit, and full problem set", async () => {
        const first = await createReportForRequest(
          input({ route: "VARGAS_ARAYA", unit: "24", problems: ["cucarachas", "acoso"] }),
          null,
          new Date("2026-07-05T12:00:00Z"),
        );
        const second = await createReportForRequest(
          // Same problems, different submission order: the comparison is
          // order-insensitive.
          input({ route: "VARGAS_ARAYA", unit: "24", problems: ["acoso", "cucarachas"] }),
          null,
          new Date("2026-07-05T12:02:00Z"),
        );

        expect(first.ok).toBe(true);
        expect(second).toEqual({ ok: false, reason: "duplicate" });
      });

      it("allows a second report for the same route and unit when the problem set differs", async () => {
        const first = await createReportForRequest(
          input({ route: "VARGAS_ARAYA", unit: "24", problems: ["cucarachas"] }),
          null,
          new Date("2026-07-05T12:00:00Z"),
        );
        const second = await createReportForRequest(
          input({ route: "VARGAS_ARAYA", unit: "24", problems: ["acoso"] }),
          null,
          new Date("2026-07-05T12:02:00Z"),
        );

        expect(first.ok).toBe(true);
        expect(second.ok).toBe(true);
      });
    });

    describe("no-unit-per-origin window (abuse key scoped, cross-route)", () => {
      const fingerprint = { ip: "203.0.113.30", userAgent: "origin-window-browser" };

      it(`allows only one no-unit report per origin across routes every ${NO_UNIT_ORIGIN_WINDOW_MINUTES} minutes`, async () => {
        vi.stubEnv("TERMO_ABUSE_SECRET", "test-abuse-secret");
        const now = new Date("2026-07-05T12:00:00Z");

        const first = await createReportForRequest(input({ route: "SAN_RAMON", unit: null }), fingerprint, now);
        const atBoundary = await createReportForRequest(
          input({ route: "SABANILLA", unit: null }),
          fingerprint,
          new Date(now.getTime() + NO_UNIT_ORIGIN_WINDOW_MINUTES * 60_000),
        );
        const afterWindow = await createReportForRequest(
          input({ route: "CEDROS", unit: null }),
          fingerprint,
          new Date(now.getTime() + NO_UNIT_ORIGIN_WINDOW_MINUTES * 60_000 + 1),
        );

        expect(first.ok).toBe(true);
        expect(atBoundary).toEqual({ ok: false, reason: "duplicate" });
        expect(afterWindow.ok).toBe(true);
      });

      it("does not apply the no-unit origin window to a different origin or to identified-unit reports from the same origin", async () => {
        vi.stubEnv("TERMO_ABUSE_SECRET", "test-abuse-secret");
        const now = new Date("2026-07-05T12:00:00Z");
        const otherFingerprint = { ip: "203.0.113.31", userAgent: "other-origin-browser" };

        const noUnit = await createReportForRequest(input({ route: "SAN_RAMON", unit: null }), fingerprint, now);
        const otherOrigin = await createReportForRequest(
          input({ route: "SABANILLA", unit: null }),
          otherFingerprint,
          now,
        );
        const identifiedUnit = await createReportForRequest(
          input({ route: "CEDROS", unit: "63" }),
          fingerprint,
          new Date(now.getTime() + 60_000),
        );

        expect(noUnit.ok).toBe(true);
        expect(otherOrigin.ok).toBe(true);
        expect(identifiedUnit.ok).toBe(true);
      });
    });

    describe("rate limiting", () => {
      it(`limits a single request fingerprint to ${RATE_LIMIT_MAX_REPORTS} reports within the rate limit window`, async () => {
        vi.stubEnv("TERMO_ABUSE_SECRET", "test-abuse-secret");
        const now = new Date("2026-07-05T12:00:00Z");
        const fingerprint = { ip: "203.0.113.10", userAgent: "rate-limit-browser" };

        const results = await Promise.all(
          Array.from({ length: RATE_LIMIT_MAX_REPORTS }, (_, index) =>
            createReportForRequest(input({ route: "CEDROS", unit: `unit-${index}` }), fingerprint, now),
          ),
        );
        const limited = await createReportForRequest(input({ route: "CEDROS", unit: "unit-overflow" }), fingerprint, now);

        expect(results.every((result) => result.ok)).toBe(true);
        expect(limited).toEqual({ ok: false, reason: "rate_limited" });
      });

      it("does not rate-limit requests made without a request fingerprint", async () => {
        const now = new Date("2026-07-05T12:00:00Z");

        const results = await Promise.all(
          Array.from({ length: RATE_LIMIT_MAX_REPORTS + 1 }, (_, index) =>
            createReportForRequest(input({ route: "CEDROS", unit: `no-fingerprint-${index}` }), null, now),
          ),
        );

        expect(results.every((result) => result.ok)).toBe(true);
      });
    });
  });

  describe("undoReport", () => {
    it("removes a report and rejects a repeated undo with the same token", async () => {
      const now = new Date("2026-07-05T12:00:00Z");
      const created = await createReportForRequest(input({ route: "CEDROS", unit: "51" }), null, now);
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const firstUndo = await undoReport(created.report.id, created.undoToken, new Date(now.getTime() + 1_000));
      const secondUndo = await undoReport(created.report.id, created.undoToken, new Date(now.getTime() + 2_000));

      expect(firstUndo).toBe(true);
      expect(secondUndo).toBe(false);
    });

    it("rejects an incorrect undo token without removing the report", async () => {
      const now = new Date("2026-07-05T12:00:00Z");
      const created = await createReportForRequest(input({ route: "CEDROS", unit: "52" }), null, now);
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const wrongToken = await undoReport(created.report.id, "not-the-real-token", new Date(now.getTime() + 1_000));
      const correctToken = await undoReport(created.report.id, created.undoToken, new Date(now.getTime() + 2_000));

      expect(wrongToken).toBe(false);
      expect(correctToken).toBe(true);
    });

    it("rejects an undo token after the undo window has expired but accepts it at the exact boundary", async () => {
      const now = new Date("2026-07-05T12:00:00Z");
      const created = await createReportForRequest(input({ route: "CEDROS", unit: "53" }), null, now);
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      // UNDO_WINDOW_SECONDS = 90; undoExpiresAt = now + 90s.
      const expiredUndo = await undoReport(created.report.id, created.undoToken, new Date(now.getTime() + 90_000 + 1));
      expect(expiredUndo).toBe(false);

      const secondCreated = await createReportForRequest(input({ route: "SABANILLA", unit: "54" }), null, now);
      expect(secondCreated.ok).toBe(true);
      if (!secondCreated.ok) return;
      const boundaryUndo = await undoReport(secondCreated.report.id, secondCreated.undoToken, new Date(now.getTime() + 90_000));
      expect(boundaryUndo).toBe(true);
    });

    it("returns false for an unknown report id", async () => {
      const result = await undoReport("does-not-exist", "any-token", new Date("2026-07-05T12:00:00Z"));
      expect(result).toBe(false);
    });
  });

  describe("getUnitSuggestions", () => {
    it("ranks units on a route by report count, descending", async () => {
      const now = new Date("2026-07-05T12:00:00Z");
      await createReportForRequest(input({ route: "CEDROS", unit: "A1", problems: ["hacinados"] }), null, now);
      await createReportForRequest(
        input({ route: "CEDROS", unit: "A1", problems: ["cucarachas"] }),
        null,
        new Date(now.getTime() + 60_000),
      );
      await createReportForRequest(input({ route: "CEDROS", unit: "B2", problems: ["acoso"] }), null, now);

      const suggestions = await getUnitSuggestions("CEDROS");

      expect(suggestions).toEqual(["A1", "B2"]);
    });

    it("returns an empty list for a route with no unit-identified reports", async () => {
      const suggestions = await getUnitSuggestions("CEDROS");
      expect(suggestions).toEqual([]);
    });
  });

  describe("getHomeSnapshot", () => {
    it("counts only visible reports from the last 24 hours and excludes undone reports", async () => {
      const now = new Date("2026-07-05T12:00:00Z");
      const outsideWindow = await createReportForRequest(
        input({ route: "CEDROS", unit: "old" }),
        null,
        new Date(now.getTime() - 30 * 3_600_000),
      );
      const withinWindow = await createReportForRequest(
        input({ route: "CEDROS", unit: "recent" }),
        null,
        new Date(now.getTime() - 2 * 3_600_000),
      );
      const undone = await createReportForRequest(
        input({ route: "SABANILLA", unit: "undone" }),
        null,
        new Date(now.getTime() - 1 * 3_600_000),
      );
      expect(outsideWindow.ok).toBe(true);
      expect(withinWindow.ok).toBe(true);
      expect(undone.ok).toBe(true);
      if (!undone.ok) return;
      // Undo must happen inside the 90s undo window, well before `now`.
      const undoResult = await undoReport(
        undone.report.id,
        undone.undoToken,
        new Date(now.getTime() - 1 * 3_600_000 + 1_000),
      );
      expect(undoResult).toBe(true);

      const snapshot = await getHomeSnapshot(now);

      expect(snapshot.reportsLastDay).toBe(1);
      expect(snapshot.recentReports).toHaveLength(1);
      expect(snapshot.recentReports[0].unit).toBe("recent");
    });
  });

  describe("getMemoryDashboard / getMemoryUnitDetail (route-filter wiring)", () => {
    it("filters the dashboard to only the requested routes", async () => {
      const now = new Date("2026-07-05T12:00:00Z");
      await createReportForRequest(input({ route: "CEDROS", unit: "1" }), null, now);
      await createReportForRequest(input({ route: "SABANILLA", unit: "2" }), null, now);

      const filtered = getMemoryDashboard({ range: "all", routes: ["CEDROS"], now });
      const unfiltered = getMemoryDashboard({ range: "all", now });

      const cedrosSummary = filtered.routeSummaries.find((summary) => summary.route === "CEDROS");
      const sabanillaSummary = filtered.routeSummaries.find((summary) => summary.route === "SABANILLA");
      expect(cedrosSummary?.reports).toBe(1);
      expect(sabanillaSummary?.reports).toBe(0);

      const unfilteredSabanilla = unfiltered.routeSummaries.find((summary) => summary.route === "SABANILLA");
      expect(unfilteredSabanilla?.reports).toBe(1);
    });

    it("builds a unit's history scoped to the requested routes and returns null for an unreported unit", async () => {
      const now = new Date("2026-07-05T12:00:00Z");
      await createReportForRequest(input({ route: "CEDROS", unit: "77", problems: ["hacinados"] }), null, now);
      // Same "now" clock as the request below (the "all" range window ends
      // at `now`, so a timestamp after it would be filtered out).
      await createReportForRequest(input({ route: "CEDROS", unit: "77", problems: ["cucarachas"] }), null, now);

      const found = getMemoryUnitDetail({ range: "all", unit: "77", now });
      const missing = getMemoryUnitDetail({ range: "all", unit: "does-not-exist", now });
      const excludedByRoute = getMemoryUnitDetail({ range: "all", routes: ["SABANILLA"], unit: "77", now });

      expect(found?.reports).toBe(2);
      expect(missing).toBeNull();
      expect(excludedByRoute).toBeNull();
    });
  });
});
