# Deployment Readiness

San Pedro en Bus is intended to deploy on Vercel with Supabase Postgres.

## Preview / Production On Vercel

Use a Vercel Preview deployment first when validating a change before promoting to production.

1. Push the repository to GitHub.
2. Import the repository in Vercel (or use the existing project deployed at `sanpedroenbus.vercel.app`).
3. Set these Vercel environment variables for Preview and Production:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SITE_URL` (the deployed domain)
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TERMO_ABUSE_SECRET`
4. Apply `supabase/migrations/0001_initial.sql` to the Supabase project. It is the only migration — the schema was rebuilt from scratch for the bus-report model rather than patched forward from the Metro de Madrid original. See `supabase/archived_migrations/` for the preserved history.
5. Seed non-production data with `supabase/seed.sql` if the environment should have dashboard data immediately.
6. Deploy and verify:
   - `npm run lint`
   - `npm run build`
   - (see the note on `npm run typecheck` / `npm test` below — they are not currently part of a reliable gate)

The app is designed to fail loudly in production-like environments if Supabase env vars or `TERMO_ABUSE_SECRET` are missing, instead of silently falling back to in-memory seed data. `TERMO_ALLOW_MEMORY_STORE=1` exists only for throwaway demos and must not be set in real public production — **it is currently set on the live Vercel deployment** while the rebuild finishes and real Supabase credentials aren't yet configured there. Remove it only once Supabase is wired up end to end (see Current Gaps below).

## Current Gaps Before Public Production

This product is mid-rebuild from a forked Metro de Madrid app into its own bus-reporting identity; see `makeover.md` for the full plan and status.

- **No live Supabase project is configured yet.** The deployment currently runs entirely on in-memory seed data via `TERMO_ALLOW_MEMORY_STORE=1`. Submitted reports do not persist reliably across serverless cold starts. Setting up a real Supabase project, applying `0001_initial.sql`, and removing that env var is the top deployment gap.
- `npm run typecheck` and `npm test` are red — most test files still assert the old Metro de Madrid model (heat states, `L1`-`L12`, weighted scoring). `npm run build` and `npm run lint` are the reliable gates until the test suite is rebuilt (`makeover.md` P7/P8).
- The documentation, brand assets (icons, OG card, share image), and some internal naming (`TERMO_*` env vars, `termoReports` global) still reference Termo de Madrid — tracked in `makeover.md` (P3, P5, P9).
- CI is configured in `.github/workflows/ci.yml`; require it as a branch protection check before public launch, once it reflects the gates above accurately.
- Playwright specs (`tests/e2e/*.spec.ts`) reference selectors from before the bus-model rebuild and need rewriting before they're trustworthy (`makeover.md` P13).
- Live Supabase verification is required for RLS, RPC rate limiting, duplicate suppression, undo, and hidden-report filtering, once a real project exists.
