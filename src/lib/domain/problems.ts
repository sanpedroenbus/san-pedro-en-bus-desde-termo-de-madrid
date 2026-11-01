// Order here is display order inside each category of the report form.
export const PROBLEMS = [
  "no_horario_claro",
  "duro_toda_la_vida",
  "horario_sin_servicio",
  "no_hizo_parada",
  "parada_inadecuada",
  "insegura_parada",
  "hacinados",
  "olia_mal_sucio",
  "sin_accesibilidad",
  "conduccion_temeraria",
  "acoso",
  "volumen_molesto",
  "pasajero_sin_audifonos",
] as const;

export type Problem = (typeof PROBLEMS)[number];

export function isProblem(value: unknown): value is Problem {
  return typeof value === "string" && PROBLEMS.includes(value as Problem);
}

// Merged ids (paro_otro_lado, cucarachas, rampa_no_funciono, discriminacion,
// chofer_trato_mal, pasajero_violento)
// were folded into the surviving key by migration 0008; nunca_paso was retired.
// "fiabilidad" keeps its key (labelled "Horarios"); the old "seguridad"
// category was merged into "convivencia" and "paradas".
export const PROBLEM_CATEGORIES = ["fiabilidad", "paradas", "condicion", "convivencia"] as const;

export type ProblemCategory = (typeof PROBLEM_CATEGORIES)[number];

export const PROBLEM_CATEGORY: Record<Problem, ProblemCategory> = {
  no_horario_claro: "fiabilidad",
  duro_toda_la_vida: "fiabilidad",
  horario_sin_servicio: "fiabilidad",
  no_hizo_parada: "paradas",
  parada_inadecuada: "paradas",
  insegura_parada: "paradas",
  hacinados: "condicion",
  olia_mal_sucio: "condicion",
  sin_accesibilidad: "condicion",
  conduccion_temeraria: "convivencia",
  acoso: "convivencia",
  volumen_molesto: "convivencia",
  pasajero_sin_audifonos: "convivencia",
};
