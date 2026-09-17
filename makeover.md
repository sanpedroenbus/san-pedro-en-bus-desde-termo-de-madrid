# Makeover: San Pedro en Bus

A rebuild plan for turning this repository from a half-migrated fork of **Termo de Madrid**
into a real **San Pedro en Bus** product.

This document is spec only. No code. Work through it in order; each phase leaves the repo in a
state that still builds.

---

## 0. Status

| Wave | Contents | State |
|---|---|---|
| 0 | Docs (PRODUCT / DESIGN / AGENTS / README / DEPLOYMENT) **DONE**; brand assets, config cleanup **NOT STARTED** |
| 1 | Phase 1 domain core · Phase 2 database schema | **DONE** |
| 2 | Phase 3 server · Phase 4 report UI · Phase 5 explore UI · Phase 6 i18n · domain half of Phase 8 | **DONE** |
| 3 | Server/component tests (P7a) · e2e tests (P7b/P13) · brand/config (P5) · route-detail wiring (P12) | **DONE** |

Wave 1 verification: `build` green, `lint` green (0 errors), `tsc --noEmit` excluding test files
green. Route ids, problem ids and the `create_report` RPC signature were cross-checked between the
TypeScript and the SQL and match exactly.

Wave 2 verification: `build` exit 0, `lint` 0 errors, `tsc --noEmit` excluding tests clean,
`vitest run src/lib/domain` 77/77 passing at 100% domain coverage. Report submission was driven
end-to-end through the real UI, and route filtering was confirmed by request against a running
dev server. Nothing is committed.

Two defects were found during wave 2 and fixed at integration: the unit-detail leak (P11) and a
route filter that silently did nothing on the in-memory path — `getMemoryDashboard()` accepted no
`routes` argument, so with no Supabase credentials configured (the current state everywhere,
including the live deploy) selecting a route left problems, categories, trend and the unit explorer
unfiltered. Both now have regression coverage.

**Wave 0's docs are now done** (`PRODUCT.md`, `DESIGN.md`, `AGENTS.md`, `README.md`,
`DEPLOYMENT.md` all rewritten to the bus model — P4 resolved). `DESIGN.md` documents the *target*
colour semantics; the live CSS/token variable names haven't caught up yet (still P5). Brand assets
and config cleanup (the other half of wave 0) remain open.

---

## 1. Where the project actually stands

### 1.1 What it was forked from

Termo de Madrid is a civic PWA where people report **air conditioning conditions on Metro de
Madrid trains**. Its whole architecture is shaped by that one idea:

- A report is a **single heat state** (`fresco` / `calor` / `infierno`) on a **metro line**
  (`L1`–`L12`) and optionally a **train car** (`M2001`, `R4110` — letter + 4-5 digits).
- The dashboard's centerpiece is the **Termo Indicator**: a 0-100 weighted index combining
  exponential time decay (3-day half-life), report-volume saturation, and **fleet coverage** —
  what share of a line's estimated train cars have been reported hot.
- "Summer" is a first-class time range (Apr 15 → Sep 16), because AC complaints are seasonal.
- Everything is on **Europe/Madrid** time.
- Confidence/disagreement metrics exist to measure whether reporters agree that a car is hot,
  treating `calor` + `infierno` as one signal against `fresco`.

That is a coherent product. Almost none of it transfers to buses.

### 1.2 What the pivot actually changed

The bus migration (Aug 15 2026, plus a Sep 6 session) rewrote roughly **one third** of the
system — the innermost domain layer and the Spanish copy — and stopped:

| Layer | State |
|---|---|
| Spanish copy (`es.ts`) | Migrated. Says "San Pedro en Bus", "empresa de transportes", bus problems |
| Problem model (`heat.ts`) | Migrated. 16 bus problems replace 3 heat states |
| Routes (`lines.ts`) | Migrated. 7 San Pedro neighbourhoods replace L1–L12 |
| Report shape (`reports.ts`) | Migrated. `problems: Problem[]` replaces `state` |
| Dashboard aggregates (`dashboard.ts`) | Half-migrated, then left truncated mid-file |
| Dashboard server modules | Half-migrated, contract broken against its own callers |
| Charts / Explore UI | **Not migrated** — still built for heat scores and fleet coverage |
| English copy (`en.ts`) | **Not migrated at all** — 100% Termo de Madrid |
| Database schema | **Not migrated** — see 2.2, this is the serious one |
| Tests | **Not migrated** — ~130 type errors, still test the Termo Indicator |
| PRODUCT.md / DESIGN.md / AGENTS.md | **Not migrated** — still describe Metro AC as binding constraints |

The migration also left the *naming* everywhere in Madrid terms even where behaviour changed:
`MetroLine`, `METRO_LINES`, `isMetroLine`, `heat.ts` (which now holds bus problems), `HeatState`,
`HeatSelector`, `HeatTrendChartCard`, `car` (meaning a bus unit), `carSeries`, `TERMO_*` env vars,
package name `termo-de-madrid`.

### 1.3 What was patched on Sep 16-17 to get it deploying

Three commits, all emergency triage, not design:

| Commit | What it did |
|---|---|
| `1835361` | Completed the two truncated files; deleted/trimmed all chart + server code that referenced removed fields so the build passes |
| `036ebd8` | Disabled the production safety check that requires `TERMO_ABUSE_SECRET` |
| `2490787` | Made `getSupabase()` always return `null` — app runs entirely on in-memory mock data |

**Two of these are deliberate temporary regressions that must be reversed** (see 5.9):

- `report-security.ts` → `shouldRequirePersistentStore()` hardcoded to `false`. Side effect:
  abuse keys fall back to a hardcoded `"development-only-abuse-secret"`, so rate limiting and
  duplicate suppression are effectively disabled in production.
- `reports-repository.ts` → `getSupabase()` hardcoded to `null`. No persistence at all; submitted
  reports live in one serverless process's memory and vanish on cold start.

Features **deleted** to make the build pass, which a rebuild must consciously re-decide:
line-evolution chart, total-reports chart, car-series chart, worst-hours chart, the per-line car
detail modal, the `/api/dashboard/line` route, the car-series filter, and the fleet-estimates
module (`fleet-estimates.ts`, deleted — it hardcoded L1–L12).

### 1.4 What is still broken right now

- `npm run build` ✅ passes. `npm run lint` ✅ passes.
- `npm run typecheck` ❌ and `npm test` ❌ fail: ~130 errors across 6 test files
  (`dashboard.test.ts` alone has 101). They still assert on the Termo Indicator, `L1`/`L5`, and
  heat states. Next's build-time checker doesn't walk test files, which is the only reason the
  build is green.
- The Explore page renders, but its remaining charts are semantically wrong: the "trend" chart
  draws one series per route from data that has no per-route breakdown, so it renders nothing
  meaningful.
- `es.ts` carries orphaned keys from the old model (`constants.*` all set to `"N/A"`,
  `scoreFormulas: []`, `fleetTable`, `modules.lineEvolution` / `totalReports` / `carSeries` /
  `worstHours` pointing at deleted charts).
- The Explore nav popover still links to anchors for charts that no longer exist.

---

## 2. Why this needs a rebuild, not more patching

### 2.1 The models don't map

| Termo de Madrid | Direct translation attempt | Why it fails for buses |
|---|---|---|
| One heat state per report | One problem per report | A bus trip has **several simultaneous** problems (crowded *and* reckless *and* late). Already modelled as an array — but everything downstream still assumes one value |
| Heat severity scale 0/60/100 | Problem severity | Problems aren't ordinal. "Cockroaches" vs "harassment" isn't a scale, it's **categories with different kinds of seriousness** |
| Fleet coverage % | Buses reported / fleet size | Nobody publishes a San Pedro concessionaire's fleet size. Deleted already |
| Termo Indicator (weighted 0-100) | Bus index | The Spanish methodology copy **already commits to the opposite**: "un conteo ciudadano simple… sin ponderaciones ni ajustes." Honour that — drop weighted scoring entirely |
| Agreement/disagreement | Same | Meaningless. Two riders reporting different problems aren't disagreeing; both are true |
| "Summer" range, Madrid timezone | Same | Bus problems aren't seasonal in this way, and San Pedro is `America/Costa_Rica` (no DST) |
| Car code `^[A-Z][0-9]{4,5}$` | Bus unit number | CR bus units are short numerics (`51`, `99`). Regex rejects them |

### 2.2 The database would reject every single San Pedro report

The bus migration `0013_adapt_reports_for_bus_problems.sql` added a `problems` column and new RPCs,
but never touched the original constraints. Against the current schema:

1. **`line` CHECK constraint** only allows `'L1'…'L12'`. Every San Pedro route (`LA_CAMPINA`, …)
   is rejected on insert.
2. **`car` CHECK constraint** is `^[A-Z][0-9]{4,5}$`. Bus unit `51` is rejected.
3. **`state public.heat_state NOT NULL`** still exists and has no default. The new bus
   `create_report` RPC never sets it → NOT NULL violation on every insert.
4. **Public read grant** is `grant select (id, line, car, state, created_at, hidden_at)` — it
   exposes `state` and **not** `problems`. Anonymous reads can't see the actual data.
5. **Migration ordering is broken.** `0013_` sorts *before* the timestamped migrations
   (`20260805…`, `20260809…`), which re-`create or replace` `create_report` with the old
   `input_state heat_state` signature and re-add Madrid-specific constraints. Applying in filename
   order (as `DEPLOYMENT.md` instructs) partially undoes the bus migration.
6. `20260809212720_block_series_1000_reports.sql` adds a constraint rejecting any unit numbered
   1000-1999 — a Madrid rolling-stock rule that would silently block legitimate CR bus units.
7. `line_fleet_estimates` table + `seed.sql` are pure Madrid data.

**Conclusion:** the Supabase layer never worked for buses and can't be salvaged by another patch
migration. Squash to a fresh schema (5.2).

---

## 3. Target definition

### 3.1 One-line definition

> San Pedro en Bus is a Spanish-first civic PWA where bus riders in San Pedro, Costa Rica report
> concrete problems on a trip, and where those reports accumulate publicly as a simple, unweighted
> count that the transit company and public can't ignore.

### 3.2 Vocabulary to standardise on

Pick these names once and apply them everywhere — the current half-and-half naming is the single
biggest source of confusion in the codebase.

| Current | Target | Notes |
|---|---|---|
| `MetroLine`, `METRO_LINES`, `isMetroLine` | `Route`, `ROUTES`, `isRoute` | "ruta" in Spanish copy already |
| `line` (field, param, query key) | `route` / `ruta` | Query param `?linea=` → `?ruta=` |
| `car`, `carCode`, `normalizeCarCode` | `unit`, `unitCode`, `normalizeUnitCode` | Spanish copy already says "número de unidad" |
| `carSeries` | *(delete)* | Madrid train-series concept, no CR equivalent |
| `heat.ts`, `HeatState`, `HEAT_STATES` | `problems.ts`, *(delete the state alias)* | `getStateFromProblems` is a compatibility shim; remove it |
| `HeatSelector`, `HeatTrendChartCard`, `heat-report-counts` | `ProblemSelector`, `ReportTrendChartCard`, *(delete)* | |
| `TERMO_ABUSE_SECRET`, `TERMO_ALLOW_MEMORY_STORE`, `TERMO_REQUIRE_SUPABASE` | `SPB_*` or `SANPEDRO_*` | Also `.env.example`, Vercel, CI |
| `APP_TIME_ZONE = Europe/Madrid`, `getMadridStartOfDay` | `America/Costa_Rica`, `getLocalStartOfDay` | CR has no DST — the double-offset dance in `time.ts` can be simplified |
| Intl locale `es-ES` | `es-CR` | Dates/numbers currently format Spanish-from-Spain |

### 3.3 Data model

A report is:

- `id`
- `route` — one of the defined San Pedro routes
- `unit` — optional short code identifying the bus
- `problems` — **1..n** from the fixed problem catalogue
- `createdAt` — **server** timestamp, never client-supplied
- `hiddenAt` / `hiddenReason` — moderation fields, kept even without admin UI

The 16 problems currently defined in `heat.ts` are good and clearly authored from real experience.
Worth grouping them into **categories** for the dashboard, since flat 16-way bars won't read well
on a phone. Suggested grouping (confirm with the owner):

| Category | Problems |
|---|---|
| Reliability / schedule | `no_horario_claro`, `no_paso_google_maps`, `duro_toda_la_vida`, `horario_sin_servicio` |
| Stops / route behaviour | `no_hizo_parada`, `paro_otro_lado` |
| Safety | `insegura_parada`, `pasajero_violento`, `acoso`, `conduccion_temeraria` |
| Comfort / condition | `hacinados`, `cucarachas`, `olia_mal_sucio` |
| Conduct / noise | `chofer_trato_mal`, `volumen_molesto`, `pasajero_sin_audifonos` |

Category assignment is a **product decision, not a technical one** — it determines what the
dashboard claims. Get the owner to sign off.

### 3.4 What replaces the Termo Indicator

Per the methodology copy already written in Spanish: **plain counts, no weighting, no decay, no
index.** The dashboard answers:

1. How many reports, in this time range?
2. Which routes get the most reports?
3. Which problems are most reported? (and by category)
4. How does report volume move over time?
5. Which specific units are reported most?
6. For a given route: which problems dominate *there*?

Keep `getConfidence()` (a simple <3 / ≥5 / ≥10 report-count threshold) as an honesty signal on
small samples. **Drop** agreement/disagreement entirely — it doesn't apply.

The one editorial rule from AGENTS.md that still matters: **do not lead with a single network-wide
average that hides a bad route.** Lead with per-route breakdown.

---

## 4. Decisions — SETTLED

These are final and encoded in wave 1. Changing any of them now costs a migration plus a code sweep.

| # | Decision |
|---|---|
| D1 | **9 routes**: `LA_CAMPINA` "La Campiña", `GRANADILLA` "Granadilla", `SAN_RAMON` "San Ramón", `SABANILLA` "Sabanilla", `SALITRILLOS` "Salitrillos", `VARGAS_ARAYA` "Vargas Araya", `BARRIO_PINTO` "Barrio Pinto", `CEDROS` "Cedros", `LA_EUROPA` "La Europa" |
| D2 | **Unit = bus unit number *or* placa**, either in one optional field. `^[A-Z0-9]{1,10}$`, uppercased, whitespace stripped. A unit↔placa mapping table is explicitly deferred |
| D3 | All 16 problems kept unchanged |
| D4 | 5 categories: `fiabilidad`, `paradas`, `seguridad`, `condicion`, `convivencia` |
| D5 | Ranges `today` / `sevenDays` / `thirtyDays` / `all`. Timezone `America/Costa_Rica`, Intl locale `es-CR` |
| D6 | The transit company is never named — "la empresa de transportes" |
| D7 | **Spanish only for v1.** `[lang]` routing and the dictionary architecture stay so English can return cheaply |
| D8 | Brand is **sanpedroenbus**, deployed at `sanpedroenbus.vercel.app` |
| D9 | Termo de Madrid + `nachoggodino` attribution stays, but **relocated**: the site-wide footer badge is removed; a brief credit line linking to `https://github.com/nachoggodino/termometro` now lives on `/metodologia` only, alongside the existing mission-text paragraph |

## 4b. Open pendings

Things deliberately deferred or still needing a human call. **This is the list to work from.**

| # | Pending | Owner / when |
|---|---|---|
| P1 | ~~**No-unit duplicate rule rejects legitimate reports.**~~ Resolved: this is a tracking tool, not an emergency-services channel — favoring spam protection over completeness is an acceptable tradeoff. No code change needed. **Correction found at wave 3**: there are actually two separate no-unit suppression mechanisms, not one — `isDuplicateCandidate` (route-scoped, 12-min window) and a second, previously undocumented one in `createReportForRequest` (`NO_UNIT_ORIGIN_WINDOW_MINUTES`): an abuse-key origin may submit at most **one no-unit report across *all* routes every 30 minutes**. The resolution covers both; `PRODUCT.md` was fixed to describe both accurately (it had only captured the first) | **RESOLVED — keep current behaviour, doc corrected** |
| P2 | **`"all"` range is really "last 730 days."** There is no natural start date and unbounded daily bucketing would walk to the epoch, so it is capped. Flagged in-code | Revisit when real data volume is known |
| P3 | **Env vars still named `TERMO_*`.** Renaming to `SPB_*` would break the live Vercel deploy, which currently depends on `TERMO_ALLOW_MEMORY_STORE=1`. Deferred deliberately | Phase 9, alongside real Supabase setup |
| P4 | ~~**Wave 0 never ran.**~~ **RESOLVED** — `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, `README.md`, `DEPLOYMENT.md` rewritten to the bus model. `DESIGN.md` documents target colour semantics; code hasn't caught up (P5) | Done |
| P5 | ~~**Brand assets are still Madrid.**~~ **MOSTLY RESOLVED** at wave 3: new bus icon set (SVG + regenerated PNGs, including `favicon.ico`), `landing-bus.svg` replaces the train silhouette, `SOCIAL_IMAGE_TOKENS` re-skinned (no more `metroRed`/`metroBlue`/`heat*`), OG card re-skinned, `sw.js` cache names renamed, `.env.example`/`package.json` already had `sanpedroenbus` naming in place. **Two things deliberately left**, both because their consumers are owned by other work: `--heat-fresco/calor/infierno(-soft)` CSS tokens are still live and still consumed directly by `action-icons.tsx`, `app-header.tsx`, and the home/reportar pages as Tailwind classes (`bg-heat-infierno` etc.) — renaming would have broken those out-of-scope files. `SERIES_CHART_COLORS` in `tokens.ts` is still imported by `dashboard-charts.tsx`; a `CATEGORY_COLORS` token now exists as its intended replacement but nothing consumes it yet | New: fold the heat-token migration into whoever next touches the report-flow icons; wire `CATEGORY_COLORS` into `dashboard-charts.tsx` |
| P6 | Two route colours sit 30° apart in the blues (`oklch(… 220)` and `oklch(… 250)`) — check they're distinguishable in a chart legend | Phase 5/7 eyeball |
| P7a | ~~**Server/component tests broken.**~~ **RESOLVED** at wave 3 — `reports-repository.test.ts`, `report-security.test.ts`, `supabase-migrations.test.ts`, `api-routes.test.ts`, `i18n.test.ts`, `report-components.test.tsx` rewritten; `chart-card.test.tsx`/`request-json.test.ts` verified already-current. 94/94 passing, independently re-run. `reports-repository.ts` memory-path is the tested surface (62.99% stmts) — the Supabase/RPC branch is untested, no live Postgres available; not a regression, was already untestable | Done |
| P7b | ~~**E2E tests still broken.**~~ **RESOLVED** at wave 3 — see P13 | Done |
| P8 | ~~**`tsconfig.json` includes test files but `next build` doesn't check them.**~~ **MOOT as of wave 3** — `npm run typecheck` now passes cleanly, full repo, zero exclusions needed (tests were actually fixed, not excluded). The underlying gate-mismatch risk this pending described is still real in principle for the *next* time a test file goes stale silently — worth keeping the practice of running `npm run typecheck` (not just `npm run build`) before calling work done | Resolved by outcome, not by policy decision |
| P9 | ~~`globalForReports.termoReports` in `reports-repository.ts` still carries the old brand name~~ **RESOLVED** — renamed to `sanPedroReports` | Done |
| P10 | Vercel currently has `TERMO_ALLOW_MEMORY_STORE=1` set. **Leave it set** until P3 and Phase 9 land together, or production starts throwing again | Ongoing |
| P11 | ~~**BUG — hidden and out-of-range reports leak into unit detail.**~~ `buildUnitExplorerSelection()` in `dashboard.ts` filters by unit only; it applies neither the `hiddenAt` filter nor the range window, while `buildDashboardData()` applies both before aggregating. Affects **both** data paths: `getMemoryUnitDetail()` passes the whole in-memory list, and `dashboard-modules.ts:93` passes rows that still include `hidden_at`. Concretely: 1 visible + 1 hidden + 1 out-of-range report for unit `51` yields `reports: 3` instead of `1`, and the hidden report's problem leaks into `history`. This means an **undone or moderated report still shows publicly** in the unit view. Exposed by a test in `dashboard.test.ts`. | **FIXED** at wave 2 integration — filters `!hiddenAt` + range inside `buildUnitExplorerSelection`; test now asserts the correct behaviour |
| P12 | ~~**`buildRouteProblemBreakdown()` is still unwired.**~~ **RESOLVED** at wave 3 — `getMemoryRouteDetail()` + `getRouteDetailModule()` + `getCachedRouteDetail()` added additively (no existing export changed), new `/api/dashboard/route-detail` route, route detail cards now have an accordion showing top problems per route. Verified live: `SAN_RAMON` returns 19 real reports with a real problem ranking. Confirmed a real gap in the frozen domain function while wiring it: `buildRouteProblemBreakdown(route, reports)` takes no `now`/`range` at all and only filters `hiddenAt` — every caller must pre-filter the range window itself before calling it, unlike `buildUnitExplorerSelection` which does this internally. Both call sites (Supabase query bounds, memory-path explicit filter) now do this correctly, verified by reading the source directly | Done |
| P13 | ~~**E2E specs reference dead selectors.**~~ **RESOLVED** at wave 3 — both specs rewritten against the real live app (selectors verified live, not guessed). Independently re-run: **27 passed, 5 failed** (worker reported 28/4 — 1 test, the route-filter regression check, is flaky under full-suite parallel load but passes reliably in isolation; not investigated further). The 4 consistent failures are all `visual.spec.ts` dark-theme variants and are a real bug, not a test defect — see **P17** below | Done |
| P16 | One e2e test (`explore filters narrow the dashboard to a single route`) is flaky under full Playwright suite parallelism, passes standalone. Likely dev-server/cache contention between concurrent browser contexts, not an app bug (the cache key already includes range+routes) — not root-caused | Low priority, revisit if it recurs |
| P17 | **BUG — theme toggle hydration mismatch on dark mode + hard navigation.** `ThemeSegmentedSwitch` (`src/components/shell/theme-toggle.tsx`) reads `useTheme().resolvedTheme` with no `mounted`-guard, so on server render `resolvedTheme` is `undefined` (renders as light) while the client then hydrates with the real persisted theme — a real React hydration warning for any dark-mode user who hard-refreshes or opens a new tab. Visually harmless (screenshots confirm dark mode still renders correctly) but a genuine console error. Confirmed by reading the component directly: no `useState`/`useEffect` mount-guard exists. Pre-existing, not introduced by this rebuild. Standard fix: gate the theme-dependent render behind a `mounted` flag | Small, quick fix whenever someone touches `theme-toggle.tsx` |
| P18 | ~~**BUG (security) — `POST /api/reports` leaked private abuse-control fields.**~~ **FIXED at wave 3 integration.** The memory-store path constructs a `MemoryReport` (extends `Report` with `abuseKey`, `undoTokenHash`, `undoExpiresAt`) and returned it typed as `Report` — TypeScript's structural typing allowed this at compile time, but the extra fields survived at runtime, and the API route spread the whole object (`...result.report`) straight into the public JSON response. **Live in production on every successful submission** since production currently runs entirely on the memory-store path (no Supabase configured, P10). Found by the e2e worker while driving the real app, verified by reading source, fixed by building the public response object explicitly field-by-field in `api/reports/route.ts` instead of spreading. Checked every other API route for the same pattern (`/api/units`, `/api/dashboard/unit`, `/api/dashboard/route-detail`, undo) — all construct fresh summary objects already, this was the only spread. Also checked whether raw reports ever reach a Client Component prop on the explore page (which would leak the same fields to every visitor, not just submitters) — confirmed `DashboardData.recentReports` is only consumed by Server Components (`page.tsx`, `RecentReportRow`), never serialized across the RSC client boundary, so that path was already safe | **Done — verified live via curl, response now contains only public fields** |
| P19 | **Duplicate suppression is not scoped per requester** — `isDuplicateCandidate` matches on route+unit+problems (or route+no-unit) across *all* reports regardless of `abuseKey`, so two different riders reporting the same real event within the window collapse to one report, not just repeat submissions from the same device. This is inherited from Termo de Madrid and mirrored identically in the SQL RPC, so it's consistent cross-layer intended behavior, not an implementation bug — but it's a real product tradeoff in the same family as P1 (favors simple counting over completeness) and wasn't explicitly called out when P1 was resolved | Documented for awareness, no action needed unless revisited alongside P1 |
| P20 | **New feature: client-side report cooldown.** In addition to the server-side abuse-key rate limit, `report-form.tsx` now enforces one report per 5 minutes per browser via a `localStorage` timestamp (`src/components/report/report-cooldown.ts`). Explicitly a soft deterrent, not a security control — trivially cleared by the "average Joe" it's aimed at, not a determined actor. Resets automatically if the report is undone within the undo window. Submit button reflects the cooldown as a real disabled state per `DESIGN.md`'s interactive-state rules | Done |
| P21 | ~~**Hardening — missing `server-only` guards on secret-handling server files.**~~ **FIXED.** While answering a question about whether the Supabase secret key could leak to the client, found `reports-repository.ts` (constructs the Supabase client with the secret key), `report-security.ts` (handles `TERMO_ABUSE_SECRET`), and `dashboard-modules.ts` were missing the `import "server-only"` guard that `dashboard-cache.ts` already had. Not an active leak — none of these were actually reachable from a `"use client"` file — but without the guard, a future accidental client-side import would fail at runtime instead of being caught at build time. Added the guard to all three | Done |
| P24 | ~~**BUG — nav drawer renders expanded on first paint.**~~ **FIXED.** `AppHeader`'s open/close animation measures `panelHeight` via `useLayoutEffect` (client-only, runs after mount); until it does, `panelHeight` is `null`, so the outer panel's `style` is `undefined` — no height constraint at all. The drawer body had no independent collapse of its own, relying entirely on the outer wrapper's JS-measured pixel height to hide it, so the server-rendered HTML (what the browser paints immediately, before any JS runs) showed the full expanded menu covering page content. Fixed by collapsing the drawer body via a CSS class keyed directly on `isOpen` (`true` from the very first render, server-side included) instead of on the measured height — verified by checking the actual server-rendered HTML: the drawer div now ships with `max-h-0` from the server, before any JS executes | Done — verified in raw SSR HTML |
| P23 | **New feature: `/demo`.** A root-level route (`src/app/demo/**`, sibling to `[lang]`, exempted from locale redirect in `proxy.ts`) mirrors home and explorar with the same components (no duplicated page logic — `HomePageContent`/`ExploreContent` exported and reused). Live routes only ever show reports on/after `DEMO_DATA_CUTOFF` (`src/lib/domain/demo.ts`, currently 2026-09-16 Costa Rica time); `/demo` shows everything, seed data included. Threaded `includeDemo` through the full server chain (`dashboard-modules.ts`, `reports-repository.ts`, `dashboard-cache.ts`, both client-fetching chart components, `FilterBar`'s internal links). Verified live against real Supabase: `/es/explorar` shows only today's test submissions, `/demo/explorar` shows the full ~95-row seed set. **One real bug caught during verification, not just assumed correct:** the home page's "reports in the last day" is a rolling *real* 24h window, which by construction never reaches back to demo-era data — the naive cutoff-floor approach was a no-op there (both live and demo showed the same count, 7=7). Fixed by anchoring demo mode's window to the latest demo-era report's own timestamp instead of real `now`, for both the Supabase and memory paths; re-verified live (7 vs 4, with demo showing Sept 14-15 timestamps and live showing Sept 17) | Done — verified live |
| P22 | ~~**BUG — `create_report` RPC failed on every real submission against live Postgres.**~~ **FIXED.** First real-database test (`makeover.md` P7a had flagged this RPC as never run against live Postgres) immediately hit `42702: column reference "created_at" is ambiguous`. Root cause: the rate-limiting query queried `public.reports` with no table alias and an unqualified `created_at`; the function's `RETURNS TABLE(..., created_at timestamptz, ...)` implicitly declares `created_at` as a PL/pgSQL variable scoped to the whole function body, colliding with the unqualified column. Fired on every submission with an abuse key (i.e. every real request). Fixed by aliasing the table (`from public.reports r`, `r.created_at`), matching the pattern the duplicate-check query right below it already used correctly. Checked `dashboard_home_snapshot` for the same class of bug — its `RETURNS TABLE` names (`reports_last_day`, `recent_reports`) don't collide with anything it queries, so it's safe as-is. Verified: real report submission against live Supabase now succeeds | Done — confirmed working live |
| P15 | **Domain API inconsistency.** `buildUnitExplorerSelection(unit, reports, now, range)` filters hidden/range internally; `buildRouteProblemBreakdown(route, reports)` takes no `now`/`range` and only filters hidden — callers must pre-filter the window themselves (currently done correctly, but the asymmetry invites a future mistake). Consider aligning the two signatures | Low priority cleanup |
| P14 | **Idea, not a decision yet: a Cloudflare-fronted bot/human check** as a stronger layer than the abuse-key rate limiting, given P1 accepts some false rejections in exchange for simplicity now. Explicitly deferred — no design work started | Future, post-launch |

### Deviations from the original plan, for the record

- `formatCarCode` deleted (was a no-op passthrough), `DashboardRange` / `"last24Hours"` dropped as dead code, default range fallback moved from `"summer"` to `"all"`.
- Wave 1 renamed some component exports beyond the strictly mechanical: `HeatTrendChartCard`→`TrendChartCard`, `LineCarsChartCard`→`RouteUnitsChartCard`, `WorstCarsExplorerChartCards`→`WorstUnitsExplorerChartCards`, `ExploreFleetPanel`→`ExploreUnitsPanel`, `getCarSuggestions`→`getUnitSuggestions`. **§6 below is stale in places as a result.**
- The new database has **no aggregate RPCs**. Dashboards aggregate in TypeScript from plain row selection, which is what keeps the schema independent of `DashboardData`.

---

## 5. Step-by-step rebuild

Each phase should end with `npm run build`, `npm run lint`, `npm run typecheck` green.
Phases 0-4 + 6 alone produce a **shippable report-only app**; the dashboard (5.5) can follow.

**Phase status:** 0 ✗ not started · 1 ✓ done · 2 ✓ done · 3 ⟳ wave 2 · 4 ⟳ wave 2 · 5 ⟳ wave 2 ·
6 ⟳ wave 2 · 7 ✗ not started · 8 ⟳ domain tests only, rest pending (P7) · 9 ✗ not started

A note on the verification bar: `npm run typecheck` **cannot** be green until Phase 8 finishes,
because the stale test files carry ~130 errors that `next build` never sees. The working gate for
every phase before that is `npx tsc --noEmit 2>&1 | grep -v "\.test\."` — see P8.

### Phase 0 — Rewrite the governing documents *(do this first)*

`AGENTS.md` forbids contradicting `PRODUCT.md` / `DESIGN.md`. Right now both describe a Metro AC
product, so *any* bus work technically violates the repo's own rules. Fix the constitution before
the code.

1. `PRODUCT.md` — full rewrite: purpose, users (San Pedro riders), the two actions, the problems
   model, anti-references (no affiliation with the transit company), core scope, v1 dashboard
   module list, time ranges.
2. `DESIGN.md` — rewrite the header (`Design System: Termo de Madrid`), replace the "Heat State
   Selector" component section with "Problem Selector", redefine colour semantics (see Phase 7),
   and define route colour identity.
3. `AGENTS.md` — replace Metro rules with bus rules: route slug stability, the disclaimer string,
   problems-not-heat-states, no single-average dashboards, naming conventions from 3.2.
4. `README.md`, `DEPLOYMENT.md` — rewrite; `DEPLOYMENT.md` still documents a Madrid
   "database CPU migration rollout" that will not exist after Phase 2.

### Phase 1 — Domain core

Pure TypeScript, no UI, fully unit-testable. Do the full rename here in one sweep so the rest of
the work happens in the target vocabulary.

1. `lines.ts` → routes module. Rename types/constants. **Give routes real distinct colours** —
   the current 7 are near-identical dark greys (`oklch(0.20–0.35 0.01 95)`), clearly a placeholder,
   and they're the primary way routes are identified in every chart.
2. `heat.ts` → `problems.ts`. Keep `PROBLEMS`, `Problem`, `isProblem`. Add categories (D4).
   **Delete** `HEAT_STATES`, `HeatState`, `isHeatState`, `getStateFromProblems`, `SEVERE_PROBLEMS`.
   Move `getConfidence` to its own `confidence.ts`.
3. `reports.ts` — rename `car`→`unit`; revisit `normalizeCarCode` (20-char limit and passthrough
   `formatCarCode` are Madrid leftovers) against D2; re-check duplicate/rate-limit windows for bus
   context.
4. `time.ts` — `America/Costa_Rica`; rename the Madrid-named helpers; simplify the DST
   double-offset logic (CR has no DST).
5. `ranges.ts` — implement D5; delete `getSummerEnd` and the Apr-15 season logic.
6. `dashboard-query.ts` — delete car-series parsing; rename `linea`→`ruta` query key.
7. `dashboard.ts` — rebuild aggregates for the 3.4 questions: route summaries, problem summaries,
   problem-by-category, per-route problem breakdown, volume trend, unit ranking.

### Phase 2 — Database, from scratch

Do **not** add migration #14. Squash.

1. Move all existing `supabase/migrations/*` to `supabase/archived_migrations/` (a
   `2026_launch_reset` precedent already exists there).
2. Write one fresh `0001_initial.sql`: `reports` (route CHECK against the D1 list, `unit` with a
   CR-appropriate format check, `problems text[]` with a CHECK that every element is in the
   catalogue and the array is non-empty, server `created_at default now()`, moderation columns),
   optional `units` table for suggestions, RLS enabled, grants that expose `problems` and **not**
   abuse keys/undo hashes.
3. Rewrite the RPCs — `create_report` (rate limit + duplicate detection + insert) and the
   dashboard aggregate functions — in problems terms. Drop everything fleet/heat-state related.
4. New `seed.sql`: realistic San Pedro data. Per AGENTS.md's spirit — make **two routes visibly
   worse**, vary units, include reports with no unit, and spread across problem categories so the
   dashboard has something honest to render.
5. Delete `line_fleet_estimates` and its seed block entirely.

### Phase 3 — Server layer

1. `reports-repository.ts` — **remove the `getSupabase() → null` hack**; restore real client
   construction (lazily, per AGENTS.md) against the Phase 2 schema. Rewrite every query/RPC call.
2. `report-security.ts` — **restore `shouldRequirePersistentStore()`**; rename env vars (3.2).
3. `dashboard-modules.ts` — define the module set matching 3.4; one function per dashboard module.
4. `dashboard-cache.ts` — align to that set; drop the car-series cache key dimension.
5. `seed-data.ts` — the in-memory mirror of the new `seed.sql` (currently placeholder data I wrote
   to unblock the build).

### Phase 4 — Report flow

1. `line-picker.tsx` → `route-picker.tsx`.
2. `heat-selector.tsx` → `problem-selector.tsx`. It's already a multi-select checklist, which is
   right — but 16 flat options is a long phone form. Consider grouping by category (D4) with
   collapsed sections.
3. `report-form.tsx` — update wiring, validation messages, the no-unit confirmation dialog.
4. `recent-report-row.tsx` — show **problem chips**, not a derived heat badge.
5. Delete `heat-state-badge.tsx` and `heat-report-counts.tsx`.
6. `api/reports/route.ts` + `api/reports/[id]/route.ts` — align payloads; `api/cars/` → `api/units/`.

### Phase 5 — Explore / dashboard

The biggest phase; it's near-empty right now after triage. Build to the D3/D4-approved module list.
Suggested v1 modules:

- Reports per route (bar, route-coloured) — the lead module, never a single average
- Reports per problem, and per problem category (bar)
- Report volume over time (line)
- Most-reported units (list → unit detail)
- Per-route problem breakdown (route detail)
- Confidence badge wherever a sample is small

Also: `filter-bar.tsx` (drop car-series remnants, fix the stale `EXPLORE_SECTIONS` anchors),
`explore-detail-panels.tsx` (rebuild), `chart-card.tsx` (keep — it's a good abstraction),
`loading.tsx` skeletons to match the new module set.

### Phase 6 — i18n

1. `es.ts` — clean orphaned keys (1.4); add keys for new modules.
2. `en.ts` — per D7, either full rewrite or delete the locale. **It is currently 100% Termo de
   Madrid**: Metro lines, CRTM fleet PDFs, `termodemadrid@gmail.com`. Note the dictionary type is
   a union of both locales, so any key present in one and missing in the other becomes a type
   error at the usage site — that's exactly what broke `heat-selector.tsx`.
3. `format.ts` — `es-ES` → `es-CR`.
4. `config.ts` — `localeNames.en` is `"Inglés"`; should be `"English"` in the EN dictionary sense.

### Phase 7 — Brand and design tokens

1. `globals.css` — replace `--heat-fresco/calor/infierno` (and the `--report-particle-*` set) with
   problem/category tokens. Keep OKLCH per AGENTS.md.
2. `tokens.ts` — `SOCIAL_IMAGE_TOKENS` still has `metroRed`, `metroBlue`, `heatFresco/Calor/
   Infierno`, and train dimensions. `SERIES_CHART_COLORS` (12 colours for train series) becomes the
   category palette.
3. `public/landing-train.svg` → a bus. Referenced by `api/og/route.tsx` **and** by the asset
   caching header in `next.config.ts` — update both.
4. `public/icon.svg`, `icon-192`, `icon-512`, `apple-touch-icon`, `favicon-48x48` — new mark.
5. `api/og/route.tsx` — rebuild the share card.
6. `manifest.ts` — name/short_name/description flow from `app-copy.ts`; verify `start_url: "/es"`.

### Phase 8 — Tests

Currently the weakest area and the reason `typecheck`/`test` are red.

1. Rewrite or delete: `dashboard.test.ts` (101 errors), `heat.test.ts`, `reports.test.ts`,
   `reports-repository.test.ts`, `report-components.test.tsx`, `api-routes.test.ts`,
   `supabase-migrations.test.ts`, `dashboard-query.test.ts`, `ranges.test.ts`, `i18n.test.ts`.
2. `tests/e2e/mvp.spec.ts` and `visual.spec.ts` — rewrite flows for the bus report path.
3. `vitest.config.ts` keeps a 90% coverage threshold; either meet it on the new domain modules or
   consciously lower it and say so.
4. Consider excluding `*.test.ts` from `tsconfig.json`'s `include` so `npm run typecheck` reflects
   the same scope the build checks — the mismatch is what hid these errors for weeks.

### Phase 9 — Real deployment

1. Reverse both temporary hacks (5.3 step 1, 5.3 step 2) — nothing below matters until they're back.
2. Create the Supabase project; apply Phase 2 migrations; verify RLS actually blocks anonymous
   writes and that abuse keys/undo hashes are not publicly selectable.
3. Set env vars in Vercel for Preview **and** Production; redeploy (Vercel does not apply env
   changes to existing deployments).
4. Verify rate limiting, duplicate suppression, and undo against the live database.
5. Re-check: no IPs, device hashes, user agents, or abuse keys exposed in any public payload.

---

## 6. File worklist

`R` = rewrite · `M` = modify · `D` = delete · `N` = new · `K` = keep as-is

> **Stale in places.** The Domain and Database sections below are complete (wave 1). Wave 1 also
> renamed several component exports that this list still refers to by their old names — see the
> deviations note in §4b. Current names: `TrendChartCard`, `RouteUnitsChartCard`,
> `WorstUnitsExplorerChartCards`, `ExploreUnitsPanel`, `getUnitSuggestions`. Files already renamed
> on disk: `lines.ts`→`routes.ts`, `heat.ts`→`problems.ts`, plus new `confidence.ts`.
> `heat-state-badge.tsx` and `fleet-estimates.ts` are deleted.

### Docs
| File | | Note |
|---|---|---|
| `PRODUCT.md` | R | Entirely Metro AC today |
| `DESIGN.md` | R | Header, heat-state component, colour semantics |
| `AGENTS.md` | R | The rules that govern all other work |
| `README.md` | R | |
| `DEPLOYMENT.md` | R | Documents a Madrid DB rollout that won't exist |
| `makeover.md` | K | This file; delete when done |

### Domain — `src/lib/domain/`
| File | | Note |
|---|---|---|
| `lines.ts` → `routes.ts` | R | Rename; **real route colours** |
| `heat.ts` → `problems.ts` | R | Drop heat-state shims; add categories |
| `confidence.ts` | N | Extracted from `heat.ts` |
| `reports.ts` | M | `car`→`unit`; revisit validation + windows |
| `dashboard.ts` | R | Rebuild aggregates |
| `dashboard-query.ts` | M | Drop car-series; `linea`→`ruta` |
| `ranges.ts` | M | Replace "summer" (D5) |
| `time.ts` | M | Costa Rica TZ; simplify (no DST) |
| `dashboard.test.ts`, `heat.test.ts`, `reports.test.ts`, `dashboard-query.test.ts`, `ranges.test.ts` | R | All 5 still assert on the Termo Indicator / L1–L12 |

### Server — `src/lib/server/`
| File | | Note |
|---|---|---|
| `reports-repository.ts` | R | **Undo `getSupabase() → null`**; rewrite queries |
| `report-security.ts` | M | **Restore `shouldRequirePersistentStore()`**; rename env vars |
| `dashboard-modules.ts` | R | New module set |
| `dashboard-cache.ts` | R | Align keys + modules |
| `seed-data.ts` | R | Mirror new `seed.sql` |
| `request-json.ts` | K | Generic, fine (`request-json.test.ts` can stay too) |
| `reports-repository.test.ts`, `report-security.test.ts`, `supabase-migrations.test.ts` | R | Last one asserts against the old schema files |

### Database — `supabase/`
| File | | Note |
|---|---|---|
| `migrations/*` (13 files) | D | Archive; **do not patch** |
| `migrations/0001_initial.sql` | N | Fresh bus schema + RPCs |
| `seed.sql` | R | San Pedro data; drop fleet estimates |

### App — `src/app/`
| File | | Note |
|---|---|---|
| `[lang]/page.tsx` | M | Home snapshot |
| `[lang]/reportar/page.tsx` | M | |
| `[lang]/explorar/page.tsx` | R | Rebuild module composition |
| `[lang]/explorar/loading.tsx` | M | Skeletons per new modules |
| `[lang]/metodologia/page.tsx` | M | Finalise after triage trim |
| `[lang]/layout.tsx`, `layout.tsx`, `page.tsx` | M | Metadata/branding |
| `api/reports/route.ts`, `api/reports/[id]/route.ts` | M | Payload alignment |
| `api/cars/` → `api/units/` | R | |
| `api/dashboard/car/` → `api/dashboard/unit/` | R | |
| `api/dashboard/line/` | N | Re-add only if route detail is in scope (deleted in triage) |
| `api/og/route.tsx` | R | Metro colours + train art |
| `manifest.ts` | M | |
| `proxy.ts` | K | Locale routing is sound |
| `globals.css` | M | Heat tokens → category tokens |

### Components — `src/components/`
| File | | Note |
|---|---|---|
| `report/heat-selector.tsx` → `problem-selector.tsx` | R | Consider category grouping |
| `report/line-picker.tsx` → `route-picker.tsx` | M | |
| `report/report-form.tsx` | M | |
| `report/recent-report-row.tsx` | M | Problem chips, not heat badge |
| `report/heat-state-badge.tsx` | D | |
| `report/heat-report-counts.tsx` | D | |
| `charts/dashboard-charts.tsx` | R | Gutted in triage |
| `charts/explore-detail-panels.tsx` | R | Gutted in triage |
| `charts/filter-bar.tsx` | M | Car-series remnants, stale anchors |
| `charts/chart-card.tsx` | K | Good abstraction, keep |
| `ui/line-badge.tsx` → `route-badge.tsx` | M | |
| `ui/app-logo.tsx`, `ui/action-icons.tsx` | M | Bus iconography |
| `shell/*` | K | Header/theme/lang/SW are domain-agnostic |
| `methodology/methodology-navigation.tsx` | M | Section list follows new page |

### i18n — `src/lib/i18n/`
| File | | Note |
|---|---|---|
| `messages/es.ts` | M | Clean orphaned keys, add new |
| `messages/en.ts` | R or D | 100% Termo de Madrid today (D7) |
| `format.ts` | M | `es-ES` → `es-CR` |
| `config.ts`, `app-copy.ts`, `dictionaries.ts` | K/M | Minor |

### Design / assets / config
| File | | Note |
|---|---|---|
| `lib/design/tokens.ts` | M | Metro colours, train dims, series palette |
| `public/landing-train.svg` | R | → bus; also update `next.config.ts` header |
| `public/icon*.png/svg`, `apple-touch-icon.png` | R | New mark |
| `public/sw.js` | M | Check cache names/branding |
| `package.json` | M | `name: "termo-de-madrid"` |
| `.env.example` | R | `TERMO_*` vars, `termodemadrid.es` |
| `next.config.ts` | M | Asset header filename list |
| `tsconfig.json` | M | Consider excluding tests (Phase 8.4) |
| `vitest.config.ts` | M | Coverage threshold decision |
| `.github/workflows/ci.yml` | K | lint/typecheck/test/build is the right gate |
| `tests/e2e/*.spec.ts` | R | |

---

## 7. What's worth keeping

Not everything needs replacing. Inherited from Termo de Madrid and genuinely good:

- **The anonymity model.** No accounts, no GPS, no free-text comments. Server timestamps only.
  Abuse keys are short-lived and private. This is a well-reasoned privacy posture — keep it.
- **Abuse controls design**: rate limiting, duplicate-window suppression, undo tokens with a
  90-second expiry, moderation columns present from day one.
- **The i18n architecture**: locale dictionaries, stable route slugs, no hardcoded UI strings.
- **The shell**: theme switching, language switcher, PWA manifest, service worker.
- **`ChartCard`** as an app-owned abstraction over Recharts.
- **The "signals, not truth" editorial stance**, including confidence on small samples.
- **The mission copy in `es.ts`** — it's specific, personal, and credible. Don't sand it down.

## 8. Done means

- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all green
- [ ] Playwright covers: report submission, undo, route filter, language switch, theme switch,
      dashboard render, mobile viewport
- [ ] Both temporary hacks reversed and verified against a real Supabase project
- [ ] No Madrid/Metro identifiers left: `grep -ri "metro\|madrid\|termo\|heat\|carSeries" src/`
      returns only intentional attribution
- [ ] Public payloads carry no IPs, device hashes, user agents, or abuse keys
- [ ] Dashboard leads with per-route breakdown, not a single average
- [ ] Disclaimer present: the app doesn't imply affiliation with the transit company
- [ ] Verified on a real phone on the local network
