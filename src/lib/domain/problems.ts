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

export function isProblem(value: unknown): value is Problem {
  return typeof value === "string" && PROBLEMS.includes(value as Problem);
}

export const PROBLEM_CATEGORIES = ["fiabilidad", "paradas", "seguridad", "condicion", "convivencia"] as const;

export type ProblemCategory = (typeof PROBLEM_CATEGORIES)[number];

export const PROBLEM_CATEGORY: Record<Problem, ProblemCategory> = {
  no_horario_claro: "fiabilidad",
  no_paso_google_maps: "fiabilidad",
  duro_toda_la_vida: "fiabilidad",
  horario_sin_servicio: "fiabilidad",
  no_hizo_parada: "paradas",
  paro_otro_lado: "paradas",
  insegura_parada: "seguridad",
  pasajero_violento: "seguridad",
  acoso: "seguridad",
  conduccion_temeraria: "seguridad",
  hacinados: "condicion",
  cucarachas: "condicion",
  olia_mal_sucio: "condicion",
  chofer_trato_mal: "convivencia",
  volumen_molesto: "convivencia",
  pasajero_sin_audifonos: "convivencia",
};
