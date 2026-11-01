-- Opt-in contact list for riders who want to help map stops or test bus
-- tracking. This is personal data: the app only ever writes to it through the
-- service role, and nobody can read it except project admins (dashboard /
-- service role). RLS is on with no policies, and anon/authenticated have no
-- grants, so the public API can neither read nor write it.

create table public.collaborators (
  id uuid primary key default gen_random_uuid(),
  email text check (email is null or (length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  whatsapp text check (whatsapp is null or whatsapp ~ '^\+[0-9]{8,15}$'),
  interests text[] not null check (
    cardinality(interests) > 0
    and interests <@ array['mapeo', 'seguimiento']::text[]
  ),
  consented_at timestamptz not null,
  created_at timestamptz not null default now(),
  -- Private abuse-control key, same derivation as reports. Never exposed.
  abuse_key text,
  check (email is not null or whatsapp is not null)
);

create unique index collaborators_email_key on public.collaborators (email) where email is not null;
create unique index collaborators_whatsapp_key on public.collaborators (whatsapp) where whatsapp is not null;
create index collaborators_abuse_idx on public.collaborators (abuse_key, created_at desc) where abuse_key is not null;

alter table public.collaborators enable row level security;
revoke all on public.collaborators from anon, authenticated;
grant all on public.collaborators to service_role;
