import { NextResponse } from "next/server";
import { parseDashboardRange, parseSelectedRoutes } from "@/lib/domain/dashboard-query";
import { normalizeUnitCode } from "@/lib/domain/reports";
import { getCachedUnitDetail, normalizeDashboardCacheKey } from "@/lib/server/dashboard-cache";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const unit = normalizeUnitCode(params.get("unidad") ?? "");
  if (!unit) return NextResponse.json({ selection: null, reason: "invalid" }, { status: 400 });

  const key = normalizeDashboardCacheKey({
    range: parseDashboardRange(params.get("rango")),
    routes: parseSelectedRoutes(params.get("ruta")),
  });
  const includeDemo = params.get("demo") === "1";
  try {
    const selection = await getCachedUnitDetail(key.rangeKey, key.routesKey, unit, includeDemo);
    return NextResponse.json({ selection }, { status: selection ? 200 : 404 });
  } catch (error) {
    console.error("Failed to load unit dashboard detail", error);
    return NextResponse.json({ selection: null, reason: "server_error" }, { status: 500 });
  }
}
