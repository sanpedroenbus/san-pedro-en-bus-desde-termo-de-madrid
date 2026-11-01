-- Problem catalogue simplification (20 -> 13).
--
-- Merged into the surviving id (its label now covers them all):
--   paro_otro_lado    -> no_hizo_parada
--   cucarachas        -> olia_mal_sucio
--   rampa_no_funciono -> sin_accesibilidad
--   discriminacion    -> acoso
--   chofer_trato_mal  -> acoso
--   pasajero_violento -> acoso
-- Retired: nunca_paso.
--
-- The problems constraint is left as-is: it still allows every older id, so
-- hidden reports keep their original value for audit (same as 0003/0006).

-- 1. Rewrite merged ids. Arrays are rebuilt distinct and sorted, the same
--    canonical form the server writes (reports-repository normalizeProblems),
--    so duplicate detection's array equality keeps working.
update public.reports
set problems = array(
  select distinct case problem
    when 'paro_otro_lado' then 'no_hizo_parada'
    when 'cucarachas' then 'olia_mal_sucio'
    when 'rampa_no_funciono' then 'sin_accesibilidad'
    when 'discriminacion' then 'acoso'
    when 'chofer_trato_mal' then 'acoso'
    when 'pasajero_violento' then 'acoso'
    else problem
  end
  from unnest(problems) as problem
  order by 1
)
where problems && array['paro_otro_lado', 'cucarachas', 'rampa_no_funciono', 'discriminacion', 'chofer_trato_mal', 'pasajero_violento']::text[];

-- 2. Retire nunca_paso: hide (never delete) reports where it was the only
--    problem, and strip it from the rest.
update public.reports
set hidden_at = coalesce(hidden_at, now()),
    hidden_reason = coalesce(hidden_reason, 'problem_retired')
where problems = array['nunca_paso']::text[];

update public.reports
set problems = array_remove(problems, 'nunca_paso')
where 'nunca_paso' = any(problems)
  and cardinality(problems) > 1;
