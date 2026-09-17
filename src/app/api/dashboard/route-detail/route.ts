import { NextResponse } from "next/server";
import { parseDashboardRange, parseSelectedRoutes } from "@/lib/domain/dashboard-query";
import { isRoute } from "@/lib/domain/routes";
import { getCachedRouteDetail, normalizeDashboardCacheKey } from "@/lib/server/dashboard-cache";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const targetRoute = params.get("ruta_detalle");
  if (!isRoute(targetRoute)) return NextResponse.json({ breakdown: null, reason: "invalid" }, { status: 400 });

  const key = normalizeDashboardCacheKey({
    range: parseDashboardRange(params.get("rango")),
    routes: parseSelectedRoutes(params.get("ruta")),
  });
  const includeDemo = params.get("demo") === "1";
  try {
    const breakdown = await getCachedRouteDetail(key.rangeKey, key.routesKey, targetRoute, includeDemo);
    return NextResponse.json({ breakdown }, { status: 200 });
  } catch (error) {
    console.error("Failed to load route dashboard detail", error);
    return NextResponse.json({ breakdown: null, reason: "server_error" }, { status: 500 });
  }
}
