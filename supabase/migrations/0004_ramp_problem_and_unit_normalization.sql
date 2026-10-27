-- 1. Allow the new 'rampa_no_funciono' problem. The retired 'no_paso_google_maps'
--    stays allowed so the reports 0003 hid (kept for audit) remain valid rows.
alter table public.reports drop constraint reports_problems_check;
alter table public.reports add constraint reports_problems_check check (
  cardinality(problems) > 0
  and problems <@ array[
      'no_horario_claro',
      'duro_toda_la_vida',
      'no_hizo_parada',
      'paro_otro_lado',
      'insegura_parada',
      'hacinados',
      'chofer_trato_mal',
      'pasajero_violento',
      'cucarachas',
      'olia_mal_sucio',
      'volumen_molesto',
      'pasajero_sin_audifonos',
      'acoso',
      'conduccion_temeraria',
      'horario_sin_servicio',
      'rampa_no_funciono',
      'no_paso_google_maps'
    ]::text[]
);

-- 2. Normalize stored unit codes to the app's format (normalizeUnitCode in
--    src/lib/domain/reports.ts): 4-6 digits, with or without 'SJB', is a plate
--    stored as 'SJB' + digits without leading zeros; 1-3 digits is a unit
--    number without leading zeros. Codes in any other format are left as-is.
update public.reports
set unit = 'SJB' || ltrim(regexp_replace(unit, '^SJB', ''), '0')
where unit ~ '^(SJB)?[0-9]+$'
  and length(ltrim(regexp_replace(unit, '^SJB', ''), '0')) between 4 and 6;

update public.reports
set unit = ltrim(unit, '0')
where unit ~ '^0+[0-9]{1,3}$'
  and length(ltrim(unit, '0')) between 1 and 3;
