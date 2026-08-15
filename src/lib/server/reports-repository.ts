import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRangeWindow, type DashboardRange } from "@/lib/domain/ranges";
import {
  DUPLICATE_WINDOW_MINUTES,
  isDuplicateCandidate,
  NO_CAR_ORIGIN_WINDOW_MINUTES,
  RATE_LIMIT_MAX_REPORTS,
  type Report,
  type ReportInput,
} from "@/lib/domain/reports";
import { isMetroLine, type MetroLine } from "@/lib/domain/lines";
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
  line: MetroLine | null;
  car: string | null;
  problems: ReportInput["problems"] | null;
  created_at: string | null;
  hidden_at: string | null;
};

type DashboardOptions = {
  range: DashboardRange;
  line?: string | null;
  lines?: MetroLine[] | null;
  carSeries?: number[] | null;
  now?: Date;
};

export type HomeSnapshot = {
  reportsLastDay: number;
  recentReports: Report[];
};

type HomeSnapshotRow = {
  reports_last_day: number;
  recent_reports: Array<{
    id: string;
    line: MetroLine;
    car: string | null;
    problems: ReportInput["problems"];
    created_at: string;
  }> | null;
};

const globalForReports = globalThis as typeof globalThis & {
  termoReports?: MemoryReport[];
};

type MemoryReport = Report & {
  abuseKey?: string | null;
  undoTokenHash?: string | null;
  undoExpiresAt?: Date | null;
};

function getMemoryReports() {
  if (!globalForReports.termoReports) {
    globalForReports.termoReports = seedReports.map((report) => ({ ...report }));
  }
  return globalForReports.termoReports;
}

let supabaseServiceClient: SupabaseClient | null = null;

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (shouldRequirePersistentStore() && !process.env.TERMO_ABUSE_SECRET) {
    throw new Error("TERMO_ABUSE_SECRET is required in this environment.");
  }

  if (!url || !key) {
    if (shouldRequirePersistentStore()) {
      const missing = [
        !url ? "NEXT_PUBLIC_SUPABASE_URL" : null,
        !key ? "SUPABASE_SERVICE_ROLE_KEY" : null,
      ].filter(Boolean);
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

function normalizeCarSeries(series: number[] | null | undefined) {
  if (!series?.length) return null;
  return new Set(series.filter((item) => Number.isInteger(item) && item >= 0));
}

export async function getHomeSnapshot(now = new Date()): Promise<HomeSnapshot> {
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const supabase = getSupabase();

  if (!supabase) {
    const recentReports = getMemoryReports()
      .filter((report) => !report.hiddenAt && report.createdAt >= start && report.createdAt <= now)
      .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return {
      reportsLastDay: recentReports.length,
      recentReports: recentReports.slice(0, 20),
    };
  }

  const { data, error } = await supabase
    .rpc("dashboard_home_snapshot", {
      input_start: start.toISOString(),
      input_end: now.toISOString(),
      input_limit: 20,
    })
    .single();
  if (error) throw error;

  const row = data as HomeSnapshotRow;
  return {
    reportsLastDay: row.reports_last_day,
    recentReports: (row.recent_reports ?? []).map((report) => ({
      id: report.id,
      line: report.line,
      car: report.car,
      problems: report.problems,
      createdAt: new Date(report.created_at),
      hiddenAt: null,
    })),
  };
}

export async function createReportForRequest(
  input: ReportInput,
  fingerprint: RequestFingerprint | Request | null,
  now = new Date(),
): Promise<CreateResult> {
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

      const noCarWindowStart = new Date(now.getTime() - NO_CAR_ORIGIN_WINDOW_MINUTES * 60_000);
      const hasRecentNoCarReport = memoryReports.some(
        (report) => !report.car && report.abuseKey === abuseKey && report.createdAt >= noCarWindowStart && !report.hiddenAt,
      );
      if (!input.car && hasRecentNoCarReport) {
        return { ok: false, reason: "duplicate" };
      }
    }

    const recentDuplicate = memoryReports.find((report) => isDuplicateCandidate(input, report, now));
    if (recentDuplicate) return { ok: false, reason: "duplicate" };

    const report: MemoryReport = {
      id: crypto.randomUUID(),
      line: input.line as MetroLine,
      car: input.car ?? null,
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
      input_line: input.line,
      input_car: input.car,
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

  if (!data.id || !data.line || !data.problems || !data.created_at) {
    throw new Error("Report creation returned an incomplete row.");
  }

  return {
    ok: true,
    undoToken,
    report: {
      id: data.id,
      line: data.line,
      car: data.car,
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

export async function getCarSuggestions(line: string) {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("cars")
      .select("code")
      .eq("line", line)
      .eq("active", true)
      .order("code", { ascending: true })
      .limit(8);

    if (error) throw error;
    return (data ?? []).map((car) => car.code);
  }

  const reports = getMemoryReports().filter((report) => report.line === line && report.car);
  const counts = new Map<string, number>();
  for (const report of reports) {
    counts.set(report.car!, (counts.get(report.car!) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .toSorted((a, b) => b[1] - a[1])
    .map(([car]) => car)
    .slice(0, 8);
}

export function isMetroLineValue(value: unknown): value is MetroLine {
  return isMetroLine(value);
}

export function normalizeCarSeriesFilter(series: number[] | null | undefined) {
  return normalizeCarSeries(series);
}

void getRangeWindow;
