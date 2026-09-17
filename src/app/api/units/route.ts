import { NextResponse } from "next/server";
import { getUnitSuggestions } from "@/lib/server/reports-repository";
import { isRoute, ROUTES } from "@/lib/domain/routes";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedRoute = url.searchParams.get("route");
  const route = isRoute(requestedRoute) ? requestedRoute : ROUTES[0];
  try {
    const suggestions = await getUnitSuggestions(route);
    return NextResponse.json(
      { suggestions },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("Failed to load unit suggestions", error);
    return NextResponse.json({ suggestions: [], error: "server_error" }, { status: 500 });
  }
}
