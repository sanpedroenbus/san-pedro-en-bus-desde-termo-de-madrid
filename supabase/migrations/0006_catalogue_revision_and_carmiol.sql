-- Problem catalogue revision and the Carmiol route.
--
-- 1. Four new problems: nunca_paso, parada_inadecuada, sin_accesibilidad,
--    discriminacion. Categories live in app code (src/lib/domain/problems.ts),
--    so merging "seguridad" into "convivencia"/"paradas" needs no SQL. Every
--    older id stays allowed, including the retired 'no_paso_google_maps'
--    (reports hidden by 0003 are kept for audit).
alter table public.reports drop constraint reports_problems_check;
alter table public.reports add constraint reports_problems_check check (
  cardinality(problems) > 0
  and problems <@ array[
      'no_horario_claro',
      'duro_toda_la_vida',
      'horario_sin_servicio',
      'nunca_paso',
      'no_hizo_parada',
      'paro_otro_lado',
      'parada_inadecuada',
      'insegura_parada',
      'hacinados',
      'cucarachas',
      'olia_mal_sucio',
      'rampa_no_funciono',
      'sin_accesibilidad',
      'conduccion_temeraria',
      'chofer_trato_mal',
      'pasajero_violento',
      'acoso',
      'discriminacion',
      'volumen_molesto',
      'pasajero_sin_audifonos',
      'no_paso_google_maps'
    ]::text[]
);

-- 2. Allow the Carmiol route on reports and units.
alter table public.reports drop constraint reports_route_check;
alter table public.reports add constraint reports_route_check check (
  route in (
    'LA_CAMPINA',
    'GRANADILLA',
    'SAN_RAMON',
    'SABANILLA',
    'SALITRILLOS',
    'VARGAS_ARAYA',
    'BARRIO_PINTO',
    'CEDROS',
    'LA_EUROPA',
    'CARMIOL'
  )
);

alter table public.units drop constraint units_route_check;
alter table public.units add constraint units_route_check check (
  route in (
    'LA_CAMPINA',
    'GRANADILLA',
    'SAN_RAMON',
    'SABANILLA',
    'SALITRILLOS',
    'VARGAS_ARAYA',
    'BARRIO_PINTO',
    'CEDROS',
    'LA_EUROPA',
    'CARMIOL'
  )
);
