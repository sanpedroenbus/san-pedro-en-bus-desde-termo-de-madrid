-- Third opt-in interest: riders who want San Pedro en Bus in their own canton.
-- Same table and privacy rules as 0005; only the allowed interest list grows.
alter table public.collaborators drop constraint collaborators_interests_check;
alter table public.collaborators add constraint collaborators_interests_check check (
  cardinality(interests) > 0
  and interests <@ array['mapeo', 'seguimiento', 'canton']::text[]
);
