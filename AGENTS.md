# Agent Instructions

This repository is for **San Pedro en Bus**, a mobile-first civic PWA for reporting and exploring bus service problems in San Pedro, Costa Rica.

Before making product, UI, data, or architecture changes, read:

- `PRODUCT.md`
- `DESIGN.md`

Those files are project constraints, not background notes. Do not contradict them without explicitly updating them.

If you are picking up a rebuild task, also read `makeover.md` in the repo root — it tracks phase status and a live list of open pendings (`P1`, `P2`, ...). Update it as you go; it is meant to stay current, not be a one-time snapshot.

## Product Rules

- The app is Spanish-only in v1. Do not hardcode user-facing strings in components. Put copy in the locale dictionary (`src/lib/i18n/messages/es.ts`). Keep the `[lang]` route structure and dictionary architecture intact so English can return cheaply later — do not collapse them just because there is currently one locale.
- Keep route slugs stable: `/es/reportar`, `/es/explorar`, `/es/horarios`, `/es/colaborar`, `/es/metodologia`.
- The public UI must not imply affiliation with any transit company. The company is never named in-product. Always preserve the disclaimer: `Proyecto ciudadano, no afiliado a ninguna empresa de transporte`.
- Keep the origin-project attribution (Termo de Madrid, `nachoggodino`) prominent in the mission copy and footer credit.
- Reports are anonymous publicly. Do not expose IPs, device hashes, user agents, or abuse keys.
- The `/es/colaborar` opt-in is the only place the app collects personal contact data (email/WhatsApp). It lives in `public.collaborators`, which has RLS on and no policies or anon/authenticated grants: write-only through the server, readable only by project admins. Never join it to reports (its abuse key is derived in a separate scope for that reason), never expose it through an API or page, and don't add fields beyond contact, interests and consent time without revising `PRODUCT.md`.
- Do not add accounts, GPS prompts, open text comments, backdating, or offline submission unless `PRODUCT.md` is intentionally revised first.
- Treat reports as signals, not truth. Dashboards must show confidence and recency where relevant.
- Do not lead dashboards with a single network average that hides a bad route. Reports-per-route is the lead module.
- Do not reintroduce a weighted scoring index, time decay, or fleet-coverage percentage. This product counts plainly and unweighted — the methodology copy commits to this publicly.
- A bus report carries **one or more problems** from the fixed 20-item catalogue, grouped into 4 categories (`fiabilidad` — labelled "Horarios", `paradas`, `condicion`, `convivencia`; the former `seguridad` category was merged into `paradas` and `convivencia`). It is not a single state chosen from a severity scale.
- A "unit" is either a bus unit number (1-3 digits) or a licence plate (4-6 digits, `SJB` prefix optional on input) — either is valid in the same optional field. Plates are stored as `SJB` + digits without leading zeros so the official zero-padded format (`SJB014285`) and what riders read on the bus (`SJB 14285`) match; `normalizeUnitCode` in `src/lib/domain/reports.ts` is the single source of that rule. Do not reintroduce the old Metro car-code format (`^[A-Z][0-9]{4,5}$`) or any car-series concept; neither has a bus equivalent.

## Design Rules

- Follow `DESIGN.md` tokens and component rules. If a new style is needed, add a token or documented component variant first.
- Use OKLCH for project color tokens.
- Do not hardcode colors, spacing, radii, z-index, animation durations, or typography values inside components. Extract them to tokens, constants, theme config, or component variants.
- Use 8px cards/controls by default; 12px only for larger panels/share cards; never exceed 16px radii for cards, panels, or inputs.
- Do not use glassmorphism, gradient text, decorative grid backgrounds, stripe backgrounds, or large decorative page backgrounds.
- Route colors identify routes; do not reuse them to encode anything else (severity, category, or status).
- No problem in the report form may be visually baited or ranked before selection — all 20 stay equal weight until chosen, grouped by category for scannability only, not by severity.
- Motion must convey state, prefer 150-250ms transitions for controls, allow longer structural drawer transitions when they improve spatial clarity, and support `prefers-reduced-motion`.
- All interactive states need default, hover, focus, active, disabled, loading/error where applicable.
- Use tooltips/help popovers for methodology details instead of bloating primary UI text.

## Code Organization

- Prefer small, typed modules with clear ownership.
- Extract shared constants for routes, problems, problem categories, time ranges, locale keys, chart options, validation limits, and duplicate windows.
- Do not duplicate confidence, date-range, validation, or normalization logic across UI, API routes, and tests. Put shared domain logic in `src/lib/domain/**`.
- Keep Supabase access behind server-side helpers/repositories (`src/lib/server/**`). Client components should not contain raw database query logic for mutations.
- Initialize service clients lazily, not at module scope, when environment variables are required.
- Keep chart implementations behind app-owned abstractions such as `ChartCard`. Recharts is the v1 chart library, but do not spread raw chart configuration everywhere.
- Do not put large business logic inside React components. Components compose state and presentation; domain modules (`src/lib/domain/dashboard.ts`) compute.

## Data And Backend Rules

- Use Supabase Postgres from the beginning, including local development and seed data. When no Supabase credentials are configured, the app falls back to an in-memory seed store (`src/lib/server/seed-data.ts`) for local/demo use — this fallback must never be the silent behaviour in a real production deployment (see `report-security.ts`'s `shouldRequirePersistentStore()`).
- Schema changes must be represented as migrations under `supabase/migrations/`. The schema was squashed to a single fresh `0001_initial.sql` during the bus-model rebuild; older Metro de Madrid migrations are preserved for history under `supabase/archived_migrations/`, not deleted.
- Enable RLS on exposed tables and keep public write access constrained through server-side validation/rate limiting.
- Store server timestamps for reports. Do not trust client timestamps for report creation.
- Rate limiting and duplicate suppression use short-lived private abuse keys only.
- Include moderation fields in the schema even if no admin UI exists in v1.
- Seed data must be realistic and dashboard-ready: two routes visibly worse than the rest, varied units (both numbers and plate-style codes), a meaningful share of reports with no unit, and coverage across all four problem categories.

## Testing And Verification

- Domain logic (`src/lib/domain/**`) should stay at or near 100% coverage — it is the layer every other part of the app depends on, and it is small enough that full coverage is realistic. Broaden component/server/e2e coverage incrementally; if a file cannot reasonably meet the repo-wide threshold yet, say so explicitly rather than silently letting it slide.
- Test domain logic thoroughly: confidence thresholds, time ranges, duplicate suppression, validation, i18n lookup, unit-code normalization, and dashboard aggregation (including hidden-report and range-window exclusion — the aggregation is the app's evidentiary core, get it right).
- Add component or Playwright tests for important UI states: selected route, selected problems, validation errors, loading, success, duplicate feedback, undo toast, empty dashboard, and dark mode.
- Use Playwright for every user-facing feature flow: home actions, report submission, undo submission, explore filters, theme switch, dashboard chart rendering, and mobile viewport behavior.
- Capture and review Playwright screenshots for mobile and desktop before calling UI work complete.
- At the end of UI-facing development sessions, make the local dev server reachable from a real phone when practical, report the exact phone URL, and document any firewall, WSL, or network limitation if phone access cannot be verified.
- Check accessibility with automated tooling where available and manual keyboard traversal for core flows.
- Verify chart performance on mobile-sized viewports. If animations cause jank, reduce or disable them.
- **`npm run typecheck` scope caution:** `tsconfig.json`'s `include` currently covers test files, but `next build`'s own type-checking does not walk them — so a broken test file can sit red for a long time without blocking deploys, while `npm run typecheck` fails outright. When judging whether a change is safe to ship, prefer `npx tsc --noEmit 2>&1 | grep -v '\.test\.'` as the practical gate until the test suite is fully rebuilt, and say explicitly which gate you used.
- Do not mark work complete while tests, typecheck, lint, or Playwright verification are failing unless the failure is explicitly documented as unrelated and pre-existing.

## Review Checklist

Before finalizing a change, review:

- No user-facing hardcoded strings outside the locale dictionary.
- No un-tokenized colors, radii, spacing, z-index, animation duration, or chart colors.
- No duplicated domain logic.
- No accidental transit-company affiliation signals.
- No hidden accessibility regressions: contrast, focus, labels, reduced motion, keyboard navigation.
- No dashboard average that hides route-level severity, and no reintroduced weighted score.
- No unbounded public data exposure.
- Tests and screenshots cover the changed behavior.

## Documentation

- Update `PRODUCT.md` when product scope or policy changes.
- Update `DESIGN.md` when visual tokens, component vocabulary, motion rules, or chart language change.
- Update `makeover.md`'s status and pendings tables as phases complete or new issues surface, while the rebuild is in progress.
- Update this file when implementation discipline changes.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
