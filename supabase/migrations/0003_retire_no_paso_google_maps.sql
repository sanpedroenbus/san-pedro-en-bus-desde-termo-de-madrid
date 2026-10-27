-- Retire the 'no_paso_google_maps' problem: San Pedro riders don't use Google
-- Maps timetables, so it was never a meaningful signal here. The app no longer
-- offers or accepts it; this cleans up reports already stored with it.

-- Reports where it was the only problem have nothing left to count. Hide them
-- (moderation fields, not delete) so the original row stays auditable.
update public.reports
set hidden_at = coalesce(hidden_at, now()),
    hidden_reason = coalesce(hidden_reason, 'problem_retired')
where problems = array['no_paso_google_maps']::text[];

-- Reports with other problems keep those; only the retired id is removed.
update public.reports
set problems = array_remove(problems, 'no_paso_google_maps')
where 'no_paso_google_maps' = any(problems)
  and cardinality(problems) > 1;
