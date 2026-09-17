-- 0001_initial.sql
-- Fresh schema for San Pedro en Bus. Replaces the archived Metro de Madrid
-- schema entirely (see supabase/archived_migrations/2026_madrid_termo/).
--
-- A report is: a route, an optional bus unit (unit number or licence plate),
-- and one or more reported problems. There is no single "state" or severity
-- scale -- problems are a plain, unweighted set of categories.

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  route text not null check (
    route in (
      'LA_CAMPINA',
      'GRANADILLA',
      'SAN_RAMON',
      'SABANILLA',
      'SALITRILLOS',
      'VARGAS_ARAYA',
      'BARRIO_PINTO',
      'CEDROS',
      'LA_EUROPA'
    )
  ),
  unit text check (unit is null or unit ~ '^[A-Z0-9]{1,10}$'),
  problems text[] not null check (
    cardinality(problems) > 0
    and problems <@ array[
      'no_horario_claro',
      'no_paso_google_maps',
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
      'horario_sin_servicio'
    ]::text[]
  ),
  -- Server timestamp only. Never trust a client-supplied creation time.
  created_at timestamptz not null default now(),
  -- Private abuse-control columns. Never exposed to anon/authenticated.
  abuse_key text,
  undo_token_hash text,
  undo_expires_at timestamptz,
  -- Moderation columns, kept even though there is no admin UI in v1.
  review_status text not null default 'accepted',
  hidden_at timestamptz,
  hidden_reason text
);

create index reports_created_at_idx on public.reports (created_at desc);
create index reports_route_created_at_idx on public.reports (route, created_at desc);
create index reports_unit_idx on public.reports (unit) where unit is not null;
create index reports_abuse_idx on public.reports (abuse_key, created_at desc) where abuse_key is not null;

-- ---------------------------------------------------------------------------
-- units (optional autocomplete suggestions for the report form)
-- ---------------------------------------------------------------------------

create table public.units (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[A-Z0-9]{1,10}$'),
  route text not null check (
    route in (
      'LA_CAMPINA',
      'GRANADILLA',
      'SAN_RAMON',
      'SABANILLA',
      'SALITRILLOS',
      'VARGAS_ARAYA',
      'BARRIO_PINTO',
      'CEDROS',
      'LA_EUROPA'
    )
  ),
  active boolean not null default true,
  verified boolean not null default false,
  source text,
  created_at timestamptz not null default now(),
  unique (code, route)
);

create index units_route_idx on public.units (route) where active = true;

-- ---------------------------------------------------------------------------
-- Row level security + grants
-- ---------------------------------------------------------------------------

alter table public.reports enable row level security;
alter table public.units enable row level security;

revoke all on public.reports from anon, authenticated;
revoke all on public.units from anon, authenticated;

-- Public reads see the report content, never the abuse/undo columns.
grant select (id, route, unit, problems, created_at, hidden_at) on public.reports to anon, authenticated;
grant select (id, code, route, active, verified, source, created_at) on public.units to anon, authenticated;

grant all on public.reports to service_role;
grant all on public.units to service_role;

create policy "Public reports are readable"
on public.reports for select
to anon, authenticated
using (hidden_at is null);

create policy "Known units are readable"
on public.units for select
to anon, authenticated
using (active = true);

-- ---------------------------------------------------------------------------
-- create_report: rate limiting + duplicate suppression, then insert.
-- ---------------------------------------------------------------------------

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
  input_duplicate_window_start timestamptz
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
  end if;

  -- Duplicate: same route, same unit (or both without a unit) with the same
  -- problems, within the recent duplicate window.
  select r.id into v_duplicate_id
  from public.reports r
  where r.route = input_route
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

revoke all on function public.create_report(text, text, text[], text, text, timestamptz, timestamptz, timestamptz, int, timestamptz) from public;
revoke execute on function public.create_report(text, text, text[], text, text, timestamptz, timestamptz, timestamptz, int, timestamptz) from anon, authenticated;
grant execute on function public.create_report(text, text, text[], text, text, timestamptz, timestamptz, timestamptz, int, timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- dashboard_home_snapshot: recent report count + most recent N reports.
-- ---------------------------------------------------------------------------

create or replace function public.dashboard_home_snapshot(
  input_start timestamptz,
  input_end timestamptz,
  input_limit int
)
returns table (
  reports_last_day int,
  recent_reports jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_recent jsonb;
begin
  select count(*) into v_count
  from public.reports
  where created_at >= input_start
    and created_at <= input_end
    and hidden_at is null;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_recent
  from (
    select id, route, unit, problems, created_at
    from public.reports
    where created_at >= input_start
      and created_at <= input_end
      and hidden_at is null
    order by created_at desc
    limit input_limit
  ) t;

  return query select v_count, v_recent;
end;
$$;

revoke all on function public.dashboard_home_snapshot(timestamptz, timestamptz, int) from public;
revoke execute on function public.dashboard_home_snapshot(timestamptz, timestamptz, int) from anon, authenticated;
grant execute on function public.dashboard_home_snapshot(timestamptz, timestamptz, int) to service_role;
