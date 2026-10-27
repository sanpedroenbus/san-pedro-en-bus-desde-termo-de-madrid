import { ROUTE_LABELS, type Route } from "@/lib/domain/routes";

// External Google Form for open-ended reports that don't fit the fixed
// catalogue -- intentionally outside the reports API and the dashboard (see
// PRODUCT.md). It opens pre-filled with what the rider already picked here;
// the entry ids are the form's "Ruta" and "Placa o Número de unidad" questions.
const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSczJF46OkDbqH11_xVnd9P_ipJmy-PpFJSPCviTKgLMlud3fA/viewform";
const ROUTE_ENTRY = "entry.2001078048";
const UNIT_ENTRY = "entry.15557363";

export function getOpenReportFormUrl(route: Route, unit: string | null) {
  const params = new URLSearchParams({ usp: "pp_url", [ROUTE_ENTRY]: ROUTE_LABELS[route] });
  if (unit) params.set(UNIT_ENTRY, unit);
  return `${FORM_URL}?${params}`;
}
