import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildDashboardData, buildRouteProblemBreakdown, buildUnitExplorerSelection } from "@/lib/domain/dashboard";
import { DEMO_DATA_CUTOFF } from "@/lib/domain/demo";
import { getRangeWindow, type TimeRange } from "@/lib/domain/ranges";
import {
  DUPLICATE_WINDOW_MINUTES,
  isDuplicateCandidate,
  NO_UNIT_ORIGIN_WINDOW_MINUTES,
  RATE_LIMIT_MAX_REPORTS,
  reportMatchesProblems,
  type Report,
  type ReportInput,
} from "@/lib/domain/reports";
import { isRoute, type Route } from "@/lib/domain/routes";
import type { Problem } from "@/lib/domain/problems";
import {
  createAbuseKey,
  createUndoToken,
  getRateLimitStart,
  getRequestFingerprint,
  getUndoExpiresAt,
  hashUndoToken,
  shouldRequirePersistentStore,
  verifyUndoToken,
  type RequestFingerprint,
} from "./report-security";
import { seedReports } from "./seed-data";

type CreateResult =
  | { ok: true; report: Report; undoToken: string }
  | { ok: false; reason: "duplicate" | "invalid" | "rate_limited" };

type CreateReportRpcRow = {
  ok: boolean;
  reason: string | null;
  id: string | null;
  route: Route | null;
  unit: string | null;
  problems: ReportInput["problems"] | null;
  created_at: string | null;
  hidden_at: string | null;
};

export type HomeSnapshot = {
  reportsLastDay: number;
  recentReports: Report[];
};

type HomeSnapshotRow = {
  reports_last_day: number;
  recent_reports: Array<{
    id: string;
    route: Route;
    unit: string | null;
    problems: ReportInput["problems"];
    created_at: string;
  }> | null;
};

const globalForReports = globalThis as typeof globalThis & {
  sanPedroReports?: MemoryReport[];
};

type MemoryReport = Report & {
  abuseKey?: string | null;
  undoTokenHash?: string | null;
  undoExpiresAt?: Date | null;
};

function getMemoryReports() {
  if (!globalForReports.sanPedroReports) {
    globalForReports.sanPedroReports = seedReports.map((report) => ({ ...report }));
  }
  return globalForReports.sanPedroReports;
}

// Dedupe and sort so the memory store and the SQL layer compare `problems`
// consistently (see createReportForRequest).
function normalizeProblems(problems: ReportInput["problems"]): ReportInput["problems"] {
  return Array.from(new Set(problems)).sort();
}

let supabaseServiceClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (shouldRequirePersistentStore() && !process.env.TERMO_ABUSE_SECRET) {
    throw new Error("TERMO_ABUSE_SECRET is required in this environment.");
  }

  if (!url || !key) {
    if (shouldRequirePersistentStore()) {
      const missing = [!url ? "NEXT_PUBLIC_SUPABASE_URL" : null, !key ? "SUPABASE_SERVICE_ROLE_KEY" : null].filter(Boolean);
      throw new Error(`Supabase is required in this environment. Missing: ${missing.join(", ")}`);
    }
    return null;
  }

  if (!supabaseServiceClient) {
    supabaseServiceClient = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return supabaseServiceClient;
}

function filterMemoryReportsByRoute(reports: Report[], routes?: Route[]) {
  if (!routes?.length) return reports;
  return reports.filter((report) => routes.includes(report.route));
}

function filterMemoryReportsByProblems(reports: Report[], problems?: Problem[]) {
  if (!problems?.length) return reports;
  return reports.filter((report) => reportMatchesProblems(report, problems));
}

// Mirrors the Supabase-path floor in dashboard-modules.ts's getReportsForSearch:
// the live app never shows anything before the demo cutoff.
function filterLiveReports(reports: Report[], includeDemo?: boolean) {
  if (includeDemo) return reports;
  return reports.filter((report) => report.createdAt >= DEMO_DATA_CUTOFF);
}

function getLatestReportTime(reports: Report[], fallback: Date): Date {
  return reports.reduce((latest, report) => (report.createdAt > latest ? report.createdAt : latest), fallback);
}

function getFilteredMemoryReports(options: { routes?: Route[]; problems?: Problem[]; includeDemo?: boolean }) {
  const byRoute = filterMemoryReportsByRoute(getMemoryReports(), options.routes);
  const byProblems = filterMemoryReportsByProblems(byRoute, options.problems);
  return filterLiveReports(byProblems, options.includeDemo);
}

export function getMemoryDashboard(options: { range: TimeRange; routes?: Route[]; problems?: Problem[]; includeDemo?: boolean; now?: Date }) {
  const now = options.now ?? new Date();
  return buildDashboardData(getFilteredMemoryReports(options), now, options.range);
}

export function getMemoryUnitDetail(options: { range: TimeRange; routes?: Route[]; problems?: Problem[]; includeDemo?: boolean; unit: string; now?: Date }) {
  const now = options.now ?? new Date();
  return buildUnitExplorerSelection(options.unit, getFilteredMemoryReports(options), now, options.range);
}

// Unlike buildUnitExplorerSelection, buildRouteProblemBreakdown does not take
// a range window itself (it only strips hidden reports) so the range filter
// has to happen here, mirroring how getReportsForSearch already scopes the
// Supabase query to the range window before calling the same domain function.
export function getMemoryRouteDetail(options: { range: TimeRange; routes?: Route[]; problems?: Problem[]; includeDemo?: boolean; route: Route; now?: Date }) {
  const now = options.now ?? new Date();
  const rangeWindow = getRangeWindow(options.range, now);
  const memoryReports = getFilteredMemoryReports(options).filter(
    (report) => report.createdAt >= rangeWindow.start && report.createdAt <= rangeWindow.end,
  );
  return buildRouteProblemBreakdown(options.route, memoryReports);
}

export async function getHomeSnapshot(now = new Date(), includeDemo = false): Promise<HomeSnapshot> {
  const supabase = getSupabase();

  if (!supabase) {
    const scopedReports = filterLiveReports(getMemoryReports(), includeDemo).filter((report) => !report.hiddenAt);
    // A rolling real-world 24h window never reaches demo-era data (it's
    // always older than 24h relative to the real "now"), so demo mode
    // anchors the window to the most recent demo report instead -- showing
    // what the home page looked like right when that data was "current".
    const anchor = includeDemo ? getLatestReportTime(scopedReports, now) : now;
    const start = new Date(anchor.getTime() - 24 * 60 * 60 * 1000);
    const recentReports = scopedReports
      .filter((report) => report.createdAt >= start && report.createdAt <= anchor)
      .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return {
      reportsLastDay: recentReports.length,
      recentReports: recentReports.slice(0, 20),
    };
  }

  let anchor = now;
  if (includeDemo) {
    const { data: latestDemoRow, error: latestError } = await supabase
      .from("reports")
      .select("created_at")
      .lt("created_at", DEMO_DATA_CUTOFF.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) throw latestError;
    if (latestDemoRow?.created_at) anchor = new Date(latestDemoRow.created_at);
  }
  const start = new Date(anchor.getTime() - 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .rpc("dashboard_home_snapshot", {
      input_start: start.toISOString(),
      input_end: anchor.toISOString(),
      input_limit: 20,
    })
    .single();
  if (error) throw error;

  const row = data as HomeSnapshotRow;
  return {
    reportsLastDay: row.reports_last_day,
    recentReports: (row.recent_reports ?? []).map((report) => ({
      id: report.id,
      route: report.route,
      unit: report.unit,
      problems: report.problems,
      createdAt: new Date(report.created_at),
      hiddenAt: null,
    })),
  };
}

export async function createReportForRequest(
  rawInput: ReportInput,
  fingerprint: RequestFingerprint | Request | null,
  now = new Date(),
): Promise<CreateResult> {
  // Dedupe and sort problems here so the memory store and the SQL RPC agree
  // on array equality (the RPC's containment check would otherwise permit
  // duplicate entries, and its `=` comparison on the stored array is
  // order-sensitive while our own duplicate-candidate check is not).
  const input: ReportInput = { ...rawInput, problems: normalizeProblems(rawInput.problems) };
  const requestFingerprint = fingerprint instanceof Request ? getRequestFingerprint(fingerprint) : fingerprint;
  const abuseKey = requestFingerprint ? createAbuseKey(requestFingerprint) : null;
  const undoToken = createUndoToken();
  const undoTokenHash = hashUndoToken(undoToken);
  const undoExpiresAt = getUndoExpiresAt(now);
  const supabase = getSupabase();

  if (!supabase) {
    const memoryReports = getMemoryReports();
    if (abuseKey) {
      const rateLimitStart = getRateLimitStart(now);
      const recentReports = memoryReports.filter((report) => report.abuseKey === abuseKey && report.createdAt >= rateLimitStart);
      if (recentReports.length >= RATE_LIMIT_MAX_REPORTS) return { ok: false, reason: "rate_limited" };

      const noUnitWindowStart = new Date(now.getTime() - NO_UNIT_ORIGIN_WINDOW_MINUTES * 60_000);
      const hasRecentNoUnitReport = memoryReports.some(
        (report) => !report.unit && report.abuseKey === abuseKey && report.createdAt >= noUnitWindowStart && !report.hiddenAt,
      );
      if (!input.unit && hasRecentNoUnitReport) {
        return { ok: false, reason: "duplicate" };
      }
    }

    const recentDuplicate = memoryReports.find((report) => isDuplicateCandidate(input, report, now));
    if (recentDuplicate) return { ok: false, reason: "duplicate" };

    const report: MemoryReport = {
      id: crypto.randomUUID(),
      route: input.route as Route,
      unit: input.unit ?? null,
      problems: input.problems,
      createdAt: now,
      hiddenAt: null,
      abuseKey,
      undoTokenHash,
      undoExpiresAt,
    };
    memoryReports.unshift(report);
    return { ok: true, report, undoToken };
  }

  const duplicateWindowStart = new Date(now.getTime() - DUPLICATE_WINDOW_MINUTES * 60_000);
  const { data: rpcData, error } = await supabase
    .rpc("create_report", {
      input_route: input.route,
      input_unit: input.unit,
      input_problems: input.problems,
      input_abuse_key: abuseKey,
      input_undo_token_hash: undoTokenHash,
      input_undo_expires_at: undoExpiresAt.toISOString(),
      input_now: now.toISOString(),
      input_rate_limit_start: getRateLimitStart(now).toISOString(),
      input_rate_limit_max: RATE_LIMIT_MAX_REPORTS,
      input_duplicate_window_start: duplicateWindowStart.toISOString(),
    })
    .single();

  if (error) throw error;
  const data = rpcData as CreateReportRpcRow;
  if (!data.ok) {
    return { ok: false, reason: data.reason as "duplicate" | "invalid" | "rate_limited" };
  }

  if (!data.id || !data.route || !data.problems || !data.created_at) {
    throw new Error("Report creation returned an incomplete row.");
  }

  return {
    ok: true,
    undoToken,
    report: {
      id: data.id,
      route: data.route,
      unit: data.unit,
      problems: data.problems,
      createdAt: new Date(data.created_at),
      hiddenAt: data.hidden_at ? new Date(data.hidden_at) : null,
    },
  };
}

export async function undoReport(id: string, undoToken: string, now = new Date()) {
  const supabase = getSupabase();
  if (!supabase) {
    const reports = getMemoryReports();
    const index = reports.findIndex((report) => report.id === id);
    const report = reports[index];
    if (!report || report.hiddenAt) return false;
    if (!report.undoExpiresAt || report.undoExpiresAt < now) return false;
    if (!verifyUndoToken(undoToken, report.undoTokenHash)) return false;
    reports.splice(index, 1);
    return true;
  }

  const { data, error } = await supabase
    .from("reports")
    .select("undo_token_hash,undo_expires_at,hidden_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.hidden_at) return false;
  if (!data.undo_expires_at || new Date(data.undo_expires_at) < now) return false;
  if (!verifyUndoToken(undoToken, data.undo_token_hash)) return false;

  const { error: updateError } = await supabase
    .from("reports")
    .update({ hidden_at: now.toISOString(), hidden_reason: "user_undo" })
    .eq("id", id)
    .is("hidden_at", null);

  if (updateError) throw updateError;
  return true;
}

export async function getUnitSuggestions(route: string) {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("units")
      .select("code")
      .eq("route", route)
      .eq("active", true)
      .order("code", { ascending: true })
      .limit(8);

    if (error) throw error;
    return (data ?? []).map((unit) => unit.code);
  }

  const reports = getMemoryReports().filter((report) => report.route === route && report.unit);
  const counts = new Map<string, number>();
  for (const report of reports) {
    counts.set(report.unit!, (counts.get(report.unit!) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .toSorted((a, b) => b[1] - a[1])
    .map(([unit]) => unit)
    .slice(0, 8);
}

export function isRouteValue(value: unknown): value is Route {
  return isRoute(value);
}
