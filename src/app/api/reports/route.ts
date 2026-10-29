import { after, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createReportForRequest } from "@/lib/server/reports-repository";
import { sendReportAlerts } from "@/lib/server/report-alerts";
import { readBoundedJson } from "@/lib/server/request-json";
import { parseReportInput } from "@/lib/domain/reports";

export async function POST(request: Request) {
  const body = await readBoundedJson(request);
  if (!body.ok) return NextResponse.json({ ok: false, reason: "invalid" }, { status: body.status });
  const parsed = parseReportInput(body.value);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const result = await createReportForRequest(parsed.data, request).catch((error: unknown) => {
    console.error("Failed to create report", error);
    return { ok: false as const, reason: "server_error" as const };
  });
  if (!result.ok) {
    const status = result.reason === "duplicate" ? 409 : result.reason === "rate_limited" ? 429 : result.reason === "server_error" ? 500 : 400;
    return NextResponse.json(result, { status });
  }

  revalidateTag("reports", "max");
  // After the response, so a slow or failing push never delays or breaks a report.
  const route = result.report.route;
  after(() => sendReportAlerts(route).catch((error: unknown) => console.error("Failed to send report alerts", error)));

  return NextResponse.json({
    ok: true,
    undoToken: result.undoToken,
    // Build the public report explicitly rather than spreading result.report:
    // the memory-store path returns an object that also carries private
    // abuseKey/undoTokenHash/undoExpiresAt fields, typed as Report but not
    // actually stripped of them at runtime.
    report: {
      id: result.report.id,
      route: result.report.route,
      unit: result.report.unit,
      problems: result.report.problems,
      createdAt: result.report.createdAt.toISOString(),
      hiddenAt: result.report.hiddenAt ? result.report.hiddenAt.toISOString() : null,
    },
  });
}

