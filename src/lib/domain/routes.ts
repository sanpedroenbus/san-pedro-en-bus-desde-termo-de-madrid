export const ROUTES = [
  "LA_CAMPINA",
  "GRANADILLA",
  "SAN_RAMON",
  "SABANILLA",
  "SALITRILLOS",
  "VARGAS_ARAYA",
  "BARRIO_PINTO",
  "CEDROS",
  "LA_EUROPA",
] as const;

export type Route = (typeof ROUTES)[number];

export type RouteColor = {
  fill: string;
  textOnFill: "black" | "white";
  ring: string;
};

// Distinct hues spaced ~40deg apart around the wheel so all 9 routes stay
// tellable apart on a chart legend in both light and dark themes. Lightness
// is tuned per hue (yellows/oranges read lighter than blues/purples at the
// same chroma) so textOnFill keeps comfortable contrast against fill.
export const ROUTE_COLORS: Record<Route, RouteColor> = {
  LA_CAMPINA: { fill: "oklch(0.52 0.17 250)", textOnFill: "white", ring: "oklch(0.85 0.06 250)" },
  GRANADILLA: { fill: "oklch(0.55 0.20 10)", textOnFill: "white", ring: "oklch(0.86 0.08 10)" },
  SAN_RAMON: { fill: "oklch(0.55 0.15 145)", textOnFill: "white", ring: "oklch(0.87 0.07 145)" },
  SABANILLA: { fill: "oklch(0.75 0.15 95)", textOnFill: "black", ring: "oklch(0.92 0.06 95)" },
  SALITRILLOS: { fill: "oklch(0.50 0.18 300)", textOnFill: "white", ring: "oklch(0.84 0.07 300)" },
  VARGAS_ARAYA: { fill: "oklch(0.55 0.12 190)", textOnFill: "white", ring: "oklch(0.86 0.06 190)" },
  BARRIO_PINTO: { fill: "oklch(0.70 0.16 60)", textOnFill: "black", ring: "oklch(0.91 0.07 60)" },
  CEDROS: { fill: "oklch(0.58 0.19 340)", textOnFill: "white", ring: "oklch(0.87 0.08 340)" },
  LA_EUROPA: { fill: "oklch(0.50 0.15 220)", textOnFill: "white", ring: "oklch(0.84 0.06 220)" },
};

export const ROUTE_LABELS: Record<Route, string> = {
  LA_CAMPINA: "La Campiña",
  GRANADILLA: "Granadilla",
  SAN_RAMON: "San Ramón",
  SABANILLA: "Sabanilla",
  SALITRILLOS: "Salitrillos",
  VARGAS_ARAYA: "Vargas Araya",
  BARRIO_PINTO: "Barrio Pinto",
  CEDROS: "Cedros",
  LA_EUROPA: "La Europa",
};

export function isRoute(value: unknown): value is Route {
  return typeof value === "string" && ROUTES.includes(value as Route);
}
