import { afterEach, describe, expect, it, vi } from "vitest";

const repositoryMock = vi.hoisted(() => ({
  createReportForRequest: vi.fn(),
  getUnitSuggestions: vi.fn(),
  undoReport: vi.fn(),
}));
const dashboardCacheMock = vi.hoisted(() => ({
  getCachedUnitDetail: vi.fn(),
  // Mirrors the real (trivial) implementation in dashboard-cache.ts. It's
  // reimplemented here rather than imported for real because that module is
  // marked "server-only" and pulls in "next/cache" cache directives that
  // vitest can't resolve outside of the Next build pipeline.
  normalizeDashboardCacheKey: vi.fn((search: { range: string; routes: string[] }) => ({
    rangeKey: search.range,
    routesKey: [...new Set(search.routes)].sort().join(","),
  })),
}));

vi.mock("@/lib/server/reports-repository", () => repositoryMock);
vi.mock("@/lib/server/dashboard-cache", () => dashboardCacheMock);
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

describe("POST /api/reports", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  function postReports(body: unknown) {
    return new Request("https://sanpedro.test/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("rejects payloads that fail domain validation before ever calling the repository", async () => {
    const { POST } = await import("./reports/route");

    const response = await POST(postReports({ route: "L1", problems: ["hacinados"] }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ ok: false, reason: "invalid" });
    expect(repositoryMock.createReportForRequest).not.toHaveBeenCalled();
  });

  it("rejects a report with zero problems", async () => {
    const { POST } = await import("./reports/route");

    const response = await POST(postReports({ route: "CEDROS", problems: [] }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ ok: false, reason: "invalid" });
    expect(repositoryMock.createReportForRequest).not.toHaveBeenCalled();
  });

  it("passes validated input through to the repository and returns the created report", async () => {
    repositoryMock.createReportForRequest.mockResolvedValue({
      ok: true,
      undoToken: "undo-token-1",
      report: {
        id: "report-1",
        route: "CEDROS",
        unit: "51",
        problems: ["hacinados"],
        createdAt: new Date("2026-07-05T12:00:00Z"),
        hiddenAt: null,
      },
    });
    const { POST } = await import("./reports/route");

    const response = await POST(postReports({ route: "CEDROS", unit: "51", problems: ["hacinados"] }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      undoToken: "undo-token-1",
      report: {
        id: "report-1",
        route: "CEDROS",
        unit: "51",
        problems: ["hacinados"],
        createdAt: "2026-07-05T12:00:00.000Z",
        hiddenAt: null,
      },
    });
    expect(repositoryMock.createReportForRequest).toHaveBeenCalledWith(
      { route: "CEDROS", unit: "51", problems: ["hacinados"] },
      expect.any(Request),
    );
  });

  it("maps each repository rejection reason to its documented HTTP status", async () => {
    const { POST } = await import("./reports/route");

    repositoryMock.createReportForRequest.mockResolvedValueOnce({ ok: false, reason: "duplicate" });
    const duplicateResponse = await POST(postReports({ route: "CEDROS", problems: ["hacinados"] }));
    expect(duplicateResponse.status).toBe(409);

    repositoryMock.createReportForRequest.mockResolvedValueOnce({ ok: false, reason: "rate_limited" });
    const rateLimitedResponse = await POST(postReports({ route: "CEDROS", problems: ["hacinados"] }));
    expect(rateLimitedResponse.status).toBe(429);
  });

  it("keeps unexpected repository failures behind the public server_error reason, without leaking internals", async () => {
    repositoryMock.createReportForRequest.mockRejectedValue(new Error("database unavailable"));
    const { POST } = await import("./reports/route");

    const response = await POST(postReports({ route: "CEDROS", problems: ["hacinados"] }));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({ ok: false, reason: "server_error" });
  });
});

describe("DELETE /api/reports/[id]", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  function deleteReport(undoToken: unknown) {
    return new Request("https://sanpedro.test/api/reports/report-1", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ undoToken }),
    });
  }

  it("undoes a report when the repository confirms the token", async () => {
    repositoryMock.undoReport.mockResolvedValue(true);
    const { DELETE } = await import("./reports/[id]/route");

    const response = await DELETE(deleteReport("token-1"), { params: Promise.resolve({ id: "report-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });
    expect(repositoryMock.undoReport).toHaveBeenCalledWith("report-1", "token-1");
  });

  it("returns a 403 for an expired or invalid undo token, rather than a generic error", async () => {
    repositoryMock.undoReport.mockResolvedValue(false);
    const { DELETE } = await import("./reports/[id]/route");

    const response = await DELETE(deleteReport("wrong-token"), { params: Promise.resolve({ id: "report-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({ ok: false, reason: "expired_or_invalid" });
  });

  it("tolerates a missing/non-string undo token instead of throwing", async () => {
    repositoryMock.undoReport.mockResolvedValue(false);
    const { DELETE } = await import("./reports/[id]/route");

    const response = await DELETE(deleteReport(undefined), { params: Promise.resolve({ id: "report-1" }) });

    expect(response.status).toBe(403);
    expect(repositoryMock.undoReport).toHaveBeenCalledWith("report-1", "");
  });

  it("returns controlled errors when undo fails server-side", async () => {
    repositoryMock.undoReport.mockRejectedValue(new Error("database unavailable"));
    const { DELETE } = await import("./reports/[id]/route");

    const response = await DELETE(deleteReport("token-1"), { params: Promise.resolve({ id: "report-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({ ok: false, reason: "server_error" });
  });
});

describe("GET /api/units", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("looks up suggestions for a valid requested route", async () => {
    repositoryMock.getUnitSuggestions.mockResolvedValue(["51", "99"]);
    const { GET } = await import("./units/route");

    const response = await GET(new Request("https://sanpedro.test/api/units?route=CEDROS"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ suggestions: ["51", "99"] });
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=300, stale-while-revalidate=600");
    expect(repositoryMock.getUnitSuggestions).toHaveBeenCalledWith("CEDROS");
  });

  it("falls back to the first known route for a missing or invalid route param instead of erroring", async () => {
    repositoryMock.getUnitSuggestions.mockResolvedValue([]);
    const { GET } = await import("./units/route");
    const { ROUTES } = await import("@/lib/domain/routes");

    await GET(new Request("https://sanpedro.test/api/units?route=L1"));

    expect(repositoryMock.getUnitSuggestions).toHaveBeenCalledWith(ROUTES[0]);
  });

  it("returns controlled errors when unit suggestions fail", async () => {
    repositoryMock.getUnitSuggestions.mockRejectedValue(new Error("database unavailable"));
    const { GET } = await import("./units/route");

    const response = await GET(new Request("https://sanpedro.test/api/units?route=CEDROS"));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({ suggestions: [], error: "server_error" });
  });
});

describe("GET /api/dashboard/unit", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("rejects a request with no resolvable unit before querying the cache", async () => {
    const { GET } = await import("./dashboard/unit/route");

    const response = await GET(new Request("https://sanpedro.test/api/dashboard/unit?unidad="));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ selection: null, reason: "invalid" });
    expect(dashboardCacheMock.getCachedUnitDetail).not.toHaveBeenCalled();
  });

  it("normalizes the unit code and returns the cached selection", async () => {
    dashboardCacheMock.getCachedUnitDetail.mockResolvedValue({ unit: "51", reports: 3, routes: ["CEDROS"], history: [] });
    const { GET } = await import("./dashboard/unit/route");

    const response = await GET(
      new Request(`https://sanpedro.test/api/dashboard/unit?unidad=${encodeURIComponent(" 51 ")}&rango=thirtyDays&ruta=CEDROS,SABANILLA`),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.selection).toEqual({ unit: "51", reports: 3, routes: ["CEDROS"], history: [] });
    expect(dashboardCacheMock.getCachedUnitDetail).toHaveBeenCalledWith("thirtyDays", "CEDROS,SABANILLA", "51");
  });

  it("returns 404 when the unit has no reports in range", async () => {
    dashboardCacheMock.getCachedUnitDetail.mockResolvedValue(null);
    const { GET } = await import("./dashboard/unit/route");

    const response = await GET(new Request("https://sanpedro.test/api/dashboard/unit?unidad=999"));
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ selection: null });
  });

  it("returns controlled errors when the cache lookup fails", async () => {
    dashboardCacheMock.getCachedUnitDetail.mockRejectedValue(new Error("database unavailable"));
    const { GET } = await import("./dashboard/unit/route");

    const response = await GET(new Request("https://sanpedro.test/api/dashboard/unit?unidad=51"));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({ selection: null, reason: "server_error" });
  });
});
