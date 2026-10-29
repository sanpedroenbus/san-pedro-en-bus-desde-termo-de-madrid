-- Scope duplicate suppression to the sender. Until now the duplicate check
-- matched any rider's report: one no-unit report on a route blocked every
-- other no-unit report on that route, from anyone, for the duplicate window.
-- Now it only matches reports from the same abuse key (origin). With no abuse
-- key there is nothing to match, so no duplicate check runs (the app always
-- sends one in production).
--
-- Same 11-parameter signature as 0002, so applying this alone fixes the live
-- app; no deploy order constraint.

create or replace function public.create_report(
  input_route text,
  input_unit text,
  input_problems text[],
  input_abuse_key text,
  input_undo_token_hash text,
  input_undo_expires_at timestamptz,
  input_now timestamptz,
  input_rate_limit_start timestamptz,
  input_rate_limit_max int,
  input_duplicate_window_start timestamptz,
  input_no_unit_window_start timestamptz
)
returns table (
  ok boolean,
  reason text,
  id uuid,
  route text,
  unit text,
  problems text[],
  created_at timestamptz,
  hidden_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_count int;
  v_duplicate_id uuid;
  v_new_id uuid;
begin
  -- Rate limiting: too many reports in a short window from the same origin.
  if input_abuse_key is not null then
    select count(*) into v_recent_count
    from public.reports r
    where r.abuse_key = input_abuse_key
      and r.created_at >= input_rate_limit_start;

    if v_recent_count >= input_rate_limit_max then
      return query select false, 'rate_limited'::text, null::uuid, null::text, null::text, null::text[], null::timestamptz, null::timestamptz;
      return;
    end if;

    -- One no-unit report per origin across all routes per window (PRODUCT.md).
    if input_unit is null and exists (
      select 1
      from public.reports r
      where r.abuse_key = input_abuse_key
        and r.unit is null
        and r.hidden_at is null
        and r.created_at >= input_no_unit_window_start
    ) then
      return query select false, 'duplicate'::text, null::uuid, null::text, null::text, null::text[], null::timestamptz, null::timestamptz;
      return;
    end if;
  end if;

  -- Duplicate: the same origin sending the same route, same unit (or both
  -- without a unit) with the same problems, within the recent duplicate window.
  -- Scoped to the abuse key so one rider's report never blocks another's.
  select r.id into v_duplicate_id
  from public.reports r
  where r.abuse_key = input_abuse_key
    and r.route = input_route
    and r.created_at >= input_duplicate_window_start
    and r.hidden_at is null
    and (
      (input_unit is null and r.unit is null)
      or (input_unit is not null and r.unit = input_unit and r.problems = input_problems)
    )
  limit 1;

  if v_duplicate_id is not null then
    return query select false, 'duplicate'::text, null::uuid, null::text, null::text, null::text[], null::timestamptz, null::timestamptz;
    return;
  end if;

  insert into public.reports (route, unit, problems, abuse_key, undo_token_hash, undo_expires_at, created_at)
  values (input_route, input_unit, input_problems, input_abuse_key, input_undo_token_hash, input_undo_expires_at, input_now)
  returning reports.id into v_new_id;

  return query
    select true, null::text, r.id, r.route, r.unit, r.problems, r.created_at, r.hidden_at
    from public.reports r
    where r.id = v_new_id;
end;
$$;

revoke all on function public.create_report(text, text, text[], text, text, timestamptz, timestamptz, timestamptz, int, timestamptz, timestamptz) from public;
revoke execute on function public.create_report(text, text, text[], text, text, timestamptz, timestamptz, timestamptz, int, timestamptz, timestamptz) from anon, authenticated;
grant execute on function public.create_report(text, text, text[], text, text, timestamptz, timestamptz, timestamptz, int, timestamptz, timestamptz) to service_role;
