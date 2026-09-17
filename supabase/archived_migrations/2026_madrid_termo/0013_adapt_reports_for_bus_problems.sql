-- 0013_adapt_reports_for_bus_problems.sql
-- Adapta la tabla "reports" (originalmente pensada para "state" único de calor)
-- para que soporte una lista de problemas ("problems") por reporte, según el
-- nuevo modelo de San Pedro en Bus.

-- 1. Agregar la nueva columna "problems" como array de texto.
alter table public.reports
  add column if not exists problems text[] not null default '{}';

-- 2. Migrar cualquier dato existente de "state" a "problems" como fallback
--    (si existía algún reporte de prueba con "state", lo convertimos a un
--    array de un solo elemento para no perder el dato).
update public.reports
set problems = array[state]
where problems = '{}' and state is not null;

-- 3. Crear (o reemplazar) la función RPC create_report para que acepte
--    "input_problems" (array) en vez de "input_state" (texto único).
create or replace function public.create_report(
  input_line text,
  input_car text,
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
  line text,
  car text,
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
  -- Rate limiting: demasiados reportes en poco tiempo desde el mismo origen.
  if input_abuse_key is not null then
    select count(*) into v_recent_count
    from public.reports
    where abuse_key = input_abuse_key
      and created_at >= input_rate_limit_start;

    if v_recent_count >= input_rate_limit_max then
      return query select false, 'rate_limited'::text, null::uuid, null::text, null::text, null::text[], null::timestamptz, null::timestamptz;
      return;
    end if;
  end if;

  -- Duplicado: mismo origen, misma ruta, mismos problemas, mismo número de unidad, en la ventana reciente.
  select r.id into v_duplicate_id
  from public.reports r
  where r.line = input_line
    and r.created_at >= input_duplicate_window_start
    and r.hidden_at is null
    and (
      (input_car is null and r.car is null)
      or (input_car is not null and r.car = input_car and r.problems = input_problems)
    )
  limit 1;

  if v_duplicate_id is not null then
    return query select false, 'duplicate'::text, null::uuid, null::text, null::text, null::text[], null::timestamptz, null::timestamptz;
    return;
  end if;

  -- Inserción del nuevo reporte.
  insert into public.reports (line, car, problems, abuse_key, undo_token_hash, undo_expires_at, created_at)
  values (input_line, input_car, input_problems, input_abuse_key, input_undo_token_hash, input_undo_expires_at, input_now)
  returning reports.id into v_new_id;

  return query
    select true, null::text, r.id, r.line, r.car, r.problems, r.created_at, r.hidden_at
    from public.reports r
    where r.id = v_new_id;
end;
$$;

-- 4. Actualizar la función de snapshot del home para que devuelva "problems"
--    en vez de "state" en los reportes recientes.
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
    select id, line, car, problems, created_at
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
