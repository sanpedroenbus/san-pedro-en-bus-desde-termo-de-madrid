# San Pedro en Bus

Mobile-first civic PWA for reporting and exploring bus service problems in San Pedro, Costa Rica.

Built on top of [Termo de Madrid](https://github.com/nachoggodino/termometro), a citizen tool for reporting broken air conditioning on Metro de Madrid, with the original creator's (nachoggodino) blessing.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000/es`.

Local development can run without Supabase. In that mode the app uses in-memory seed data from `src/lib/server/seed-data.ts`. Production-like environments require Supabase environment variables and `TERMO_ABUSE_SECRET` unless `TERMO_ALLOW_MEMORY_STORE=1` is set explicitly for a throwaway demo.

## Environment

Copy `.env.example` to `.env.local` when wiring Supabase:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SITE_URL=https://sanpedroenbus.vercel.app
SUPABASE_SERVICE_ROLE_KEY=
TERMO_ABUSE_SECRET=
TERMO_ALLOW_MEMORY_STORE=
```

Use a long random value for `TERMO_ABUSE_SECRET`; it salts private abuse keys and undo token hashes. (These env var names are inherited from the Termo de Madrid fork and are still in active use — see `makeover.md` P3 for the planned rename.)

Set `NEXT_PUBLIC_SITE_URL` to your deployed domain in production so social preview metadata uses absolute public URLs.

## Supabase

When you create the Supabase project, apply every file in `supabase/migrations/` in filename order, then seed optional development data:

```bash
supabase/migrations/*.sql
supabase/seed.sql
```

The schema was rebuilt from scratch for the bus-report model — `supabase/migrations/0001_initial.sql` is the only migration to apply. Earlier Metro de Madrid migrations are preserved for history under `supabase/archived_migrations/` and should not be applied.

Dashboard and unit-inventory reads run only on the server with the service-role key. A unit identifier (bus unit number or licence plate) is stored normalized to uppercase alphanumeric, 1-10 characters, for example `51` or `SJB1234`.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:ui
```

The same verification suite runs in GitHub Actions. See `DEPLOYMENT.md` for Vercel setup.

**Note:** `npm run typecheck` and `npm test` are not currently green — the rebuild from the original Metro de Madrid product is in progress and most test files still target the old model. `npm run build` is the reliable gate for now; see `makeover.md` for the current rebuild status and pending work.
