// Order here is display order inside each category of the report form.
export const PROBLEMS = [
  "no_horario_claro",
  "duro_toda_la_vida",
  "horario_sin_servicio",
  "nunca_paso",
  "no_hizo_parada",
  "paro_otro_lado",
  "parada_inadecuada",
  "insegura_parada",
  "hacinados",
  "cucarachas",
  "olia_mal_sucio",
  "rampa_no_funciono",
  "sin_accesibilidad",
  "conduccion_temeraria",
  "chofer_trato_mal",
  "pasajero_violento",
  "acoso",
  "discriminacion",
  "volumen_molesto",
  "pasajero_sin_audifonos",
] as const;

export type Problem = (typeof PROBLEMS)[number];

export function isProblem(value: unknown): value is Problem {
  return typeof value === "string" && PROBLEMS.includes(value as Problem);
}

// "fiabilidad" keeps its key (labelled "Horarios"); the old "seguridad"
// category was merged into "convivencia" and "paradas".
export const PROBLEM_CATEGORIES = ["fiabilidad", "paradas", "condicion", "convivencia"] as const;

export type ProblemCategory = (typeof PROBLEM_CATEGORIES)[number];

export const PROBLEM_CATEGORY: Record<Problem, ProblemCategory> = {
  no_horario_claro: "fiabilidad",
  duro_toda_la_vida: "fiabilidad",
  horario_sin_servicio: "fiabilidad",
  nunca_paso: "fiabilidad",
  no_hizo_parada: "paradas",
  paro_otro_lado: "paradas",
  parada_inadecuada: "paradas",
  insegura_parada: "paradas",
  hacinados: "condicion",
  cucarachas: "condicion",
  olia_mal_sucio: "condicion",
  rampa_no_funciono: "condicion",
  sin_accesibilidad: "condicion",
  conduccion_temeraria: "convivencia",
  chofer_trato_mal: "convivencia",
  pasajero_violento: "convivencia",
  acoso: "convivencia",
  discriminacion: "convivencia",
  volumen_molesto: "convivencia",
  pasajero_sin_audifonos: "convivencia",
};
