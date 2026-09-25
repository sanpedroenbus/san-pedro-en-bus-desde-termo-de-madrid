# Product

## Register

product

## Users

San Pedro en Bus is for bus riders in San Pedro, Costa Rica, primarily on mobile phones, who want to report and expose recurring problems with the buses that serve their neighbourhood: unreliable schedules, drivers who skip stops, overcrowding, unsafe or disrespectful behaviour, unsanitary units. Users are often mid-trip, frustrated, and short on patience, so reporting must be fast, anonymous, and low-friction.

Secondary users include journalists, community organizers, and people sharing evidence on social media. For them, the dashboard should make the scale and pattern of the problem legible without hiding a bad route behind a network-wide average.

## Product Purpose

San Pedro en Bus is a citizen-run PWA that collects crowdsourced problem reports for San Pedro bus routes. It exists to turn scattered individual complaints — the kind that used to go to a transit company's internal comment box and disappear — into a public, accumulating record that is harder to ignore.

The product has two primary actions:

- Reportar: submit a report for the current trip with route, one or more problems, and an optional unit identifier.
- Explorar: browse charts, route/unit detail, and filters (route, problem, time range) built from those reports.

A report is not one state chosen from a scale. It is **one or more problems** selected from a fixed catalogue, grouped into five categories:

- Fiabilidad y horarios: unclear schedule, didn't pass on time, took forever, no service at the needed hour.
- Paradas: didn't stop, stopped somewhere else.
- Seguridad: unsafe at the stop, violent passenger, harassment, reckless driving.
- Condición de la unidad: overcrowded, cockroaches, smelled bad or dirty.
- Convivencia: driver mistreatment, disruptive volume, a passenger without headphones.

There is no severity scale, no weighted score, and no single number that claims to summarize "how bad" a route is. Counts are plain and unweighted: how many reports, on which route, about which problems, over which range. The Termo de Madrid original this app was forked from built a weighted heat index; that entire mechanism is intentionally absent here.

Reports are evidence, not absolute truth. Dashboards should show recency and per-route breakdown. The product should let patterns emerge from real data (some routes will look worse) without hardcoding conclusions as facts.

The app does not compute or display a "confidence" score. It was dropped: with reporting still early and few reports accumulated, every report added mechanically lowers a naive sample-size confidence measure rather than validating anything, and no route or unit has enough history yet to earn a "high confidence" label that would mean anything. Report counts, latest-report recency, and the explicit low-volume caveat in the methodology copy carry that "this is early data" signal instead of a computed badge.

Success means people can submit a report in seconds, understand the situation on their route at a glance, and share a concrete pattern of neglect that pressures the transit company to improve.

## Brand Personality

Direct, civic, personal. Sharp where it needs to be, never a novelty site.

The product's voice comes from lived frustration — the mission text on the methodology page is written in the first person, by someone who reported the same problems through official channels for years and got nothing. That directness is the brand; it does not need satire or dry humor layered on top of it. Core navigation, form labels, data labels, validation, and methodology must stay clear and credible throughout.

Public-facing name:

- Spanish UI: San Pedro en Bus.
- Short name: San Pedro en Bus (no separate short form).
- Technical names, slugs, package names, and code identifiers should use ASCII: `sanpedroenbus`.

## Anti-references

The product must not look affiliated with any transit company. The company that operates San Pedro's routes is never named in the product — copy refers to it generically as "la empresa de transportes." A small disclaimer is mandatory: `Proyecto ciudadano, no afiliado a ninguna empresa de transporte`.

The app should visibly credit its origin: it is built on top of Termo de Madrid, a citizen tool for reporting broken air conditioning on Metro de Madrid, with the original creator's blessing. That attribution (`nachoggodino`) stays prominent in the mission text and footer credit.

Avoid:

- A generic complaint counter that treats raw complaint volume as truth.
- A dashboard that averages all routes into a harmless-looking network score.
- Any weighted scoring index, decay model, or fleet-coverage percentage — this product counts plainly, on record in its own methodology copy.
- A marketing-heavy landing page that delays the two main actions.
- Open free-text comments *in the app's own reports table* in v1, because they increase moderation and abuse risk and would need their own validation/sanitization/moderation story. See "Open-ended reports" below for the narrow, deliberate exception.
- GPS/location permission in v1, because it adds friction and most riders won't grant it mid-trip.
- Offline submission in v1, because reports must represent current conditions.
- Login, accounts, profiles, or public user identities.

### Open-ended reports

Riders sometimes have something to report that doesn't fit the fixed 16-problem catalogue. Rather than adding an open-text field to the reports table (which the app deliberately avoids — see above), /reportar links out to an external form (currently a placeholder Google Form URL in `report-form.tsx`, pending the real link) for that kind of report.

This form is intentionally outside the app's own data model:

- It is not wired into the reports API, the reports table, or duplicate/rate-limit logic.
- Submissions through it are **not** counted in any dashboard chart, aggregate, or per-route/per-problem total — the "counts are plain and unweighted" promise above only ever applies to the fixed-catalogue reports table.
- If these open-ended submissions are ever surfaced in the product (e.g. a lightweight list on /explorar with date, route, and comment), they must be visually and structurally separate from the counted statistics, never blended into them, and still respect the no-PII/no-accounts rules above.



1. Never let one route hide behind an average.
   The dashboard leads with per-route report volume. Route-level detail, per-route problem breakdown, and unit-level evidence stay prominent; there is no single network-wide score to lead with instead.

2. Treat reports as signals, not verdicts.
   Use recency and raw report counts to communicate uncertainty honestly — show the numbers plainly (a route with 3 reports this week vs. one with 30) rather than collapsing them into a computed confidence label.

3. Keep reporting fast enough for someone standing on a moving bus.
   Route and at least one problem are the only required fields. Unit is optional — either a unit number or a licence plate, whichever the rider actually noticed. Avoid dates, comments, accounts, and location prompts. When a user submits without a unit identifier, confirm the choice and offer a direct return to the unit field before sending.

4. Be honest about what the data is and isn't.
   Show recency and report counts plainly, and be explicit that the project is early and low-volume, and about the citizen-run, non-official nature of the project. This is a tracking tool, not an emergency-services channel, and the copy should not imply otherwise.

5. Accept some false rejections in exchange for simplicity.
   Duplicate suppression and rate limiting favor stopping spam over guaranteeing every distinct report survives. A future stronger bot-check (for example, a Cloudflare-fronted human-verification layer) is an open idea, not a v1 requirement.

## Accessibility & Inclusion

The app should target WCAG AA. It must be mobile-first, keyboard-accessible, screen-reader-friendly, and readable in bright daylight or inside a moving bus.

Specific requirements:

- Do not rely on color alone for route or problem selection.
- Provide visible focus states and accessible selected states.
- Support reduced motion for all transitions.
- Ensure text contrast meets accessibility requirements, including helper and placeholder text.
- Spanish only in v1 (see Core Product Scope). Keep the `[lang]` route structure and locale-dictionary architecture intact so English can return cheaply later, rather than inlining Spanish strings into components.
- Keep route slugs stable: `/es/reportar`, `/es/explorar`, `/es/metodologia`.

## Data Trust & Abuse Controls

Reports are anonymous publicly. The system may store short-lived private technical abuse keys derived server-side for rate limiting and duplicate suppression, but must not expose user identifiers in dashboards.

V1 abuse controls:

- Server timestamp only; no backdating field.
- Open anonymous submission without accounts.
- Client and server validation.
- Unit identifiers accept 1-10 alphanumeric characters (a bus unit number or a licence plate, either is valid), normalized to uppercase.
- Rate limiting by private abuse key.
- Soft duplicate suppression, in two layers. Reports with a unit identifier are suppressed within a short window when route, unit, and problem set match. Reports without a unit identifier are suppressed against any other recent no-unit report on the same route within that same short window, regardless of which problems were selected. Separately, an origin (by private abuse key) may submit at most one no-unit report across *all* routes every 30 minutes, regardless of route or problems. Both layers deliberately favor spam protection over completeness — this is a signal-tracking tool, not an emergency-services replacement, and an occasional false rejection is an acceptable cost. A stronger bot/human check (for example, fronting the report endpoint with Cloudflare) is a future idea, not committed for v1.
- Friendly duplicate feedback such as "Ya registramos este reporte hace un momento."
- Short undo window after submission, dismissible by the user.
- Moderation fields in the database, but no admin UI in v1.

Users should be reminded lightly near submission to report only what they are experiencing now. The methodology page should explain that false reports weaken the pressure for real improvements.

## Core Product Scope

V1 routes:

- Home: compact civic landing with title, mission sentence, two visible actions, live snapshot, and disclaimer.
- /reportar: dedicated report screen with easy exit, route picker, grouped problem selector (multi-select, five categories), optional unit field, success feedback, and an outbound link to an external open-text form for anything that doesn't fit the fixed catalogue (see "Open-ended reports" below).
- /explorar: dashboard with route, problem, and time-range filters, charts, unit/route detail.
- /metodologia: lightweight methodology, privacy, abuse-control, and low-volume-data explanation, plus the affiliation disclaimer and origin-project attribution.

V1 dashboard modules — the six questions the dashboard must answer, and nothing framed as a single score:

1. Reports per route (the lead module — never collapsed into an average).
2. Reports per problem, across all 16.
3. Reports per problem category, as a more scannable rollup of the above.
4. Report volume over time, for the selected range.
5. Most-reported units, ranked, linking into a unit explorer with total reports, routes served, and history.
6. Per-route detail: report count, units reported, and latest report.

Time ranges:

- Hoy.
- 7 días.
- 30 días.
- Todo (in practice bounded to a fixed recent lookback window rather than true unlimited history — see engineering notes).

Locale: Spanish only in v1 (see Accessibility & Inclusion).

Backend and deploy target:

- Supabase Postgres for persistence.
- Next.js App Router with TypeScript for the app.
- Vercel for deployment, at `sanpedroenbus.vercel.app` unless a custom domain is added later.
- PWA from v1 with installable shell and cached last dashboard view, but no offline submission.

Local development should include realistic seed data that makes two routes visibly worse than the rest, includes varied unit identifiers (both unit numbers and plate-style codes), a meaningful share of reports with no unit, and reports spread across all five problem categories.
