export const METRO_LINES = [
  "LA_CAMPINA",
  "GRANADILLA",
  "SAN_RAMON",
  "SABANILLA",
  "SALITRILLOS",
  "VARGAS_ARAYA",
  "BARRIO_PINTO",
] as const;

export type MetroLine = (typeof METRO_LINES)[number];

export type LineColor = {
  fill: string;
  textOnFill: "black" | "white";
  ring: string;
};

export const LINE_COLORS: Record<MetroLine, LineColor> = {
  LA_CAMPINA: { fill: "oklch(0.24 0.01 95)", textOnFill: "white", ring: "oklch(0.78 0.12 85)" },
  GRANADILLA: { fill: "oklch(0.30 0.01 95)", textOnFill: "white", ring: "oklch(0.78 0.12 85)" },
  SAN_RAMON: { fill: "oklch(0.20 0.01 95)", textOnFill: "white", ring: "oklch(0.78 0.12 85)" },
  SABANILLA: { fill: "oklch(0.35 0.01 95)", textOnFill: "white", ring: "oklch(0.78 0.12 85)" },
  SALITRILLOS: { fill: "oklch(0.27 0.01 95)", textOnFill: "white", ring: "oklch(0.78 0.12 85)" },
  VARGAS_ARAYA: { fill: "oklch(0.22 0.01 95)", textOnFill: "white", ring: "oklch(0.78 0.12 85)" },
  BARRIO_PINTO: { fill: "oklch(0.33 0.01 95)", textOnFill: "white", ring: "oklch(0.78 0.12 85)" },
};

export const LINE_LABELS: Record<MetroLine, string> = {
  LA_CAMPINA: "La Campiña",
  GRANADILLA: "Granadilla",
  SAN_RAMON: "San Ramón",
  SABANILLA: "Sabanilla",
  SALITRILLOS: "Salitrillos",
  VARGAS_ARAYA: "Vargas Araya",
  BARRIO_PINTO: "Barrio Pinto",
};

export function isMetroLine(value: unknown): value is MetroLine {
  return typeof value === "string" && METRO_LINES.includes(value as MetroLine);
}
