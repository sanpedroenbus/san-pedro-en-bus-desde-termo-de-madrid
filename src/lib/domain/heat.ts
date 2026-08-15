export const PROBLEMS = [
  "no_horario_claro",
  "no_paso_google_maps",
  "duro_toda_la_vida",
  "no_hizo_parada",
  "paro_otro_lado",
  "insegura_parada",
  "hacinados",
  "chofer_trato_mal",
  "pasajero_violento",
  "cucarachas",
  "olia_mal_sucio",
  "volumen_molesto",
  "pasajero_sin_audifonos",
  "acoso",
  "conduccion_temeraria",
  "horario_sin_servicio",
] as const;

export type Problem = (typeof PROBLEMS)[number];

// HeatState se conserva como alias por compatibilidad con el resto del código
// heredado de Termo de Madrid, pero ahora representa "gravedad general" derivada
// de qué problemas se marcaron, no un único estado elegido por la persona.
export const HEAT_STATES = ["fresco", "calor", "infierno"] as const;

export type HeatState = (typeof HEAT_STATES)[number];

// Problemas que se consideran graves (afectan seguridad/integridad de la persona).
// Si el reporte incluye alguno de estos, se clasifica como "infierno" para
// fines de visualización simple en las estadísticas.
const SEVERE_PROBLEMS: Problem[] = [
  "insegura_parada",
  "pasajero_violento",
  "acoso",
  "conduccion_temeraria",
];

export function isProblem(value: unknown): value is Problem {
  return typeof value === "string" && PROBLEMS.includes(value as Problem);
}

export function isHeatState(value: unknown): value is HeatState {
  return typeof value === "string" && HEAT_STATES.includes(value as HeatState);
}

// Deriva un "estado" general a partir de la lista de problemas marcados,
// solo para fines de color/ícono en algunas vistas heredadas.
export function getStateFromProblems(problems: Problem[]): HeatState {
  if (problems.length === 0) return "fresco";
  if (problems.some((p) => SEVERE_PROBLEMS.includes(p))) return "infierno";
  return "calor";
}

export type Confidence = "low" | "medium" | "high";

export function getConfidence(reports: Array<{ createdAt: Date }>): Confidence {
  if (reports.length < 3) return "low";
  if (reports.length >= 10) return "high";
  if (reports.length >= 5) return "medium";
  return "low";
}
