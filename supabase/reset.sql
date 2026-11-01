-- reset.sql -- DESTRUCTIVE. Drops every table, view and function in the public
-- schema (all reports, units and collaborator contacts), so migrations/0001
-- can rebuild it from scratch. Supabase's own schemas (auth, storage, ...)
-- and extension-owned objects are left alone. Pre-launch use only.
do $$
declare
  item record;
begin
  for item in
    select c.relname, c.relkind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'v', 'm', 'p')
      and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
  loop
    execute format(
      'drop %s if exists public.%I cascade',
      case item.relkind when 'v' then 'view' when 'm' then 'materialized view' else 'table' end,
      item.relname
    );
  end loop;

  for item in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('drop function if exists %s cascade', item.signature);
  end loop;
end;
$$;
