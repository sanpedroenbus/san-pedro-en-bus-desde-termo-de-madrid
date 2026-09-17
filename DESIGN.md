---
name: "San Pedro en Bus"
description: "A mobile-first civic PWA for reporting and exploring bus service problems in San Pedro, Costa Rica."
colors:
  bg: "oklch(0.985 0.012 92)"
  bg-dark: "oklch(0.145 0.036 252)"
  surface: "oklch(0.957 0.011 96)"
  surface-dark: "oklch(0.205 0.034 250)"
  surface-raised: "oklch(0.997 0.006 96)"
  surface-raised-dark: "oklch(0.255 0.037 248)"
  ink: "oklch(0.190 0.018 160)"
  ink-dark: "oklch(0.955 0.000 0)"
  muted: "oklch(0.450 0.014 160)"
  muted-dark: "oklch(0.730 0.028 245)"
  border: "oklch(0.860 0.014 96)"
  border-dark: "oklch(0.360 0.040 248)"
  primary: "oklch(0.520 0.125 160)"
  primary-contrast: "oklch(0.990 0.000 0)"
  success: "oklch(0.555 0.130 150)"
  warning: "oklch(0.710 0.160 76)"
  danger: "oklch(0.565 0.210 30)"
typography:
  display:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 680
    lineHeight: 1.04
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 650
    lineHeight: 1.12
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 620
    lineHeight: 1.25
    letterSpacing: "0"
  body:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 580
    lineHeight: 1.2
    letterSpacing: "0"
  data:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.875rem"
    fontWeight: 560
    lineHeight: 1.25
    letterSpacing: "0"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-contrast}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px"
---

# Design System: San Pedro en Bus

<!-- SEED -->

> **Pending rename.** This document describes the target design language. The live CSS
> (`src/app/globals.css`) and `src/lib/design/tokens.ts` still carry Termo de Madrid-era variable
> names — `--metro-red`, `--metro-blue`, `--heat-fresco/calor/infierno`, `SOCIAL_IMAGE_TOKENS`'
> Metro-branded fields — that this document's colour semantics have already moved past. That rename
> is tracked as `makeover.md` P5 (Phase 7, brand and design tokens). Until it lands, treat the
> variable *names* in code as stale but their current hue values as still-valid neutral/primary
> tokens unless this document says otherwise.

## 1. Overview

**Creative North Star: "Flighty Status, Raycast Action"**

San Pedro en Bus should feel like a sharp public evidence tool built for someone standing on a bus with one hand free: fast to read, easy to share, and calm enough to trust. The product combines Flighty-like mobile status intelligence with Raycast-like action clarity: a confident current-state surface first, then two obvious actions.

The default interface is light because people will use and screenshot it on phones outdoors and inside buses. Dark mode is supported from v1, but it should be a true theme switch, not the main visual identity. A restrained page glow is part of the current app shell, but it must stay quiet and never become decorative wallpaper.

The system rejects official-transit-company mimicry, generic complaint-counter dashboards, glassmorphism, oversized rounded cards, and single average metrics that let a bad route disappear into a network-wide score. The dashboard leads with route-level report volume, never a single indicator.

**Key Characteristics:**

- Flighty-style live status surface with Raycast-style primary actions: Reportar and Explorar.
- Restrained light surfaces, crisp borders, 8px cards, and compact data density.
- Route colors identify routes; problem-category colors identify what kind of problem was reported. Neither is reused for the other's job.
- Dashboard modules are self-contained, screenshot-friendly evidence blocks.
- Copy is direct and personal (see `PRODUCT.md`'s Brand Personality), not satirical.

### Reference Pass

- **Observable Plot** (`https://observablehq.com/plot/`): Primary chart inspiration. Adopt the grammar mindset: compose bars, lines, dots, scales, small multiples, and transforms deliberately. Even though v1 uses Recharts, chart components should be designed as reusable visual grammar, not one-off pictures.
- **Linear** (`https://linear.app/`): Adopt the precision: dense but calm layouts, compact labels, clear hierarchy, subtle separators, and highly consistent component vocabulary. Avoid copying its dark SaaS mood or product-management structure.
- **Raycast** (`https://www.raycast.com/`): Core action reference. Adopt centered action clarity and command-palette discipline: one obvious next action, compact rows, fast feedback, and utility controls that do not compete with the primary task.
- **Flighty** (`https://www.flighty.com/`): Core mobile-status reference. Adopt one strong current-state panel, crisp status details, restrained delight, and share/export affordances that feel native.
- **Citymapper** (`https://citymapper.com/`): Adopt small transport-specific personality: obvious route chips, local transit character. Avoid the busy map/search surface; this is not a route planner.
- **Datawrapper** (`https://www.datawrapper.de/`): Adopt chart discipline: mobile exports, non-overlapping labels, accessible colors, brand consistency, and responsive preview thinking. Every dashboard module should be checked as a shareable mobile artifact.
- **FixMyStreet** (`https://www.fixmystreet.com/`): Functional reference only, not a visual reference. Keep the civic directness and recent-activity proof, but do not inherit its visual style or location-heavy flow.

## 2. Colors

The palette is creamy civic utility with a quiet green primary, a blue-black dark theme, distinct route-identity colors, and a five-category problem palette.

### Primary

- **Civic Green** (`oklch(0.520 0.125 160)`): Primary actions, selected neutral controls, focus affordances, and links when route or problem-category meaning is not in play.

### Route identity

Nine routes, each a genuinely distinct hue spaced roughly 40° apart around the wheel, tuned so lightness and `textOnFill` stay legible against each fill in both themes. Defined in `src/lib/domain/routes.ts` as `ROUTE_COLORS`, not duplicated in CSS — components should import from there, not hardcode hex/oklch values.

| Route | Fill |
|---|---|
| La Campiña | `oklch(0.52 0.17 250)` |
| Granadilla | `oklch(0.55 0.20 10)` |
| San Ramón | `oklch(0.55 0.15 145)` |
| Sabanilla | `oklch(0.75 0.15 95)` |
| Salitrillos | `oklch(0.50 0.18 300)` |
| Vargas Araya | `oklch(0.55 0.12 190)` |
| Barrio Pinto | `oklch(0.70 0.16 60)` |
| Cedros | `oklch(0.58 0.19 340)` |
| La Europa | `oklch(0.50 0.15 220)` |

Two routes (La Europa at 220° and La Campiña at 250°) sit only 30° apart in the blue range — check they read distinctly in a chart legend before calling this final (`makeover.md` P6).

### Problem categories

Five categories, used only for the reports-per-category dashboard module — never for the problem-selector UI in the report form, which keeps all 16 problems equal-weight (see Named Rules). Currently drawn from the existing `SERIES_CHART_COLORS` palette in `src/lib/design/tokens.ts` (originally built for a since-removed car-series chart, now repurposed). A dedicated `CATEGORY_COLORS` token keyed by `fiabilidad` / `paradas` / `seguridad` / `condicion` / `convivencia` should replace that repurposing once Phase 7 lands, so the naming stops implying an unrelated concept.

### Neutral

- **Civic Cream** (`oklch(0.985 0.012 92)`): Default light background. Keep it close to neutral.
- **Quiet Panel** (`oklch(0.957 0.011 96)`): App shell panels, dashboard bands, table headers, and quiet section backgrounds.
- **Raised Surface** (`oklch(0.997 0.006 96)`): Cards, share modules, form groups, and popovers.
- **Ink Green-Black** (`oklch(0.190 0.018 160)`): Primary text on light surfaces.
- **Muted Green-Gray** (`oklch(0.450 0.014 160)`): Secondary text that must remain readable; never use pale placeholder gray.
- **Border Mist** (`oklch(0.860 0.014 96)`): Dividers, input borders, chip outlines, and chart grid lines.
- **Tech Blue Black** (`oklch(0.145 0.036 252)`): Dark theme background, blue-black panels, no white radial wash.

### Named Rules

**The Meaning Separation Rule.** Route colors identify routes; problem-category colors identify categories. Do not make one color do both jobs in the same chart mark, and do not use either to imply severity or ranking.

**The Selected Fill Rule.** Unselected chips stay neutral with a colored dot or short mark. Selected chips may use the identity color as a fill with contrast-correct white or black text plus a check icon or outline.

**The No Bait Rule.** In the problem selector, all 16 problems stay equal visual weight until selected. Grouping by category is for scannability only — never color-code or rank problems by severity within the form.

**The No Decorative Wallpaper Rule.** Color belongs in data, selected states, and primary action motion, not in the global page background. The global app glow is allowed only as a subtle neutral shell treatment.

## 3. Typography

**Display Font:** Geist, with Inter and system sans fallbacks
**Body Font:** Geist, with Inter and system sans fallbacks
**Label/Mono Font:** Geist Mono for timestamps, unit identifiers, report IDs, and compact data

**Character:** One product sans keeps the interface credible and fast. Distinction comes from weight, tabular numbers, spacing, and data composition rather than a second display font.

### Hierarchy

- **Display** (680, 2.25rem, 1.04): Home title and major share-card titles only. Keep letter spacing at `-0.025em`; never tighter than `-0.04em`.
- **Headline** (650, 1.5rem, 1.12): Dashboard module headings, route titles, and major empty states.
- **Title** (620, 1rem, 1.25): Card titles, form group labels, chart captions, and table headings.
- **Body** (400, 0.9375rem, 1.5): Descriptions, methodology, and summaries. Cap prose around 65-75ch.
- **Label** (580, 0.8125rem, 1.2): Buttons, chips, control labels, confidence labels, and compact legends. Do not use all-caps tracking as a default style.
- **Data** (560, 0.875rem, 1.25): Unit identifiers, timestamps, numeric counts, ranges, and table values. Use tabular numbers.

### Named Rules

**The Data First Rule.** Numbers, route names, unit identifiers, and confidence labels must align cleanly and use tabular settings. If a chart label wraps badly on mobile, wrap or shorten the label before shrinking the type below readable size — see the 16-problem chart's wrapped-tick approach in `dashboard-charts.tsx`.

**The No Display Labels Rule.** Buttons, nav items, chips, form controls, and chart labels always use the UI scale, never display typography.

## 4. Elevation

The system is flat by default. Depth comes from tonal layering, borders, spacing, and state changes rather than decorative drop shadows. Shadows are reserved for floating elements that must detach from the page: popovers, tooltips, toasts, autocomplete menus, and share/export previews.

### Shadow Vocabulary

- **Popover Shadow** (`0 6px 14px oklch(0.190 0.018 160 / 0.12)`): Autocomplete menus, tooltips, and small floating panels.
- **Toast Shadow** (`0 8px 18px oklch(0.190 0.018 160 / 0.16)`): Undoable submission feedback and temporary confirmations.
- **Share Preview Shadow** (`0 8px 8px oklch(0.190 0.018 160 / 0.10)`): Optional preview lift only; do not pair with a decorative border-and-wide-shadow card style.

### Named Rules

**The Flat-By-Default Rule.** Cards at rest use border or tonal surface, not heavy shadows.

**The No Ghost Card Rule.** Do not combine `border: 1px solid` with a soft shadow blur greater than 8px on cards or buttons.

## 5. Components

### Buttons

- **Shape:** Compact rectangle with 8px radius. Full pill only for tiny status badges or segmented controls.
- **Primary:** Civic Green fill, white text, 12px x 16px padding, medium weight label.
- **Hover / Focus:** 150-200ms color/outline transition. Focus ring is 2px outside using Civic Green, plus a neutral offset.
- **Secondary / Ghost:** Neutral surface with ink text and a visible border. Ghost buttons are for low-risk utility actions only.
- **Disabled / Loading:** Preserve dimensions. Loading uses inline progress text or skeleton affordance, not a centered spinner that shifts layout.

### Chips

- **Route Chips:** Fixed-size compact buttons, 9 across a 2-column grid on mobile. Unselected chips use neutral background, route-colored dot/short bar, ink label, and border. Selected chips use route-color fill, contrast-correct text, check icon, and strong outline.
- **Range Chips:** Neutral segmented controls for `Hoy`, `7 días`, `30 días`, `Todo`. Selected state uses Civic Green or neutral dark fill, not a route or category color.

### Cards / Containers

- **Corner Style:** 8px for cards and dashboard modules, 12px only for larger share cards or app-level panels.
- **Background:** Raised Surface on light theme, raised neutral in dark theme.
- **Shadow Strategy:** Flat at rest. Use border or tonal contrast. Floating overlays may use Popover Shadow.
- **Border:** 1px solid Border Mist. No colored side stripes thicker than 1px.
- **Internal Padding:** 16px on mobile modules, 20-24px for desktop panels and share-card exports.

### Inputs / Fields

- **Style:** Neutral background, 1px border, 8px radius, 12px padding, full-width on mobile.
- **Focus:** Border shifts to Civic Green with a 2px outline.
- **Placeholder:** Must pass contrast; use Muted Green-Gray, not default browser gray.
- **Error / Disabled:** Error uses Danger with text explanation. Disabled state reduces contrast only within WCAG limits and never hides labels.
- **Unit Field:** Optional field with helper tooltip; do not mark it as optional in the visible label. Accepts either a bus unit number or a licence plate — 1-10 alphanumeric characters, normalized uppercase. Suggestions filter by selected route. Submitting without a unit opens an accessible confirmation dialog whose primary action returns focus to this field; the secondary action confirms submission without a unit.

### Navigation

- **Home:** Compact civic landing with title, mission sentence, live snapshot, two large action buttons, theme switch, and mandatory disclaimer. No language switch in v1 — the app is Spanish-only (see `PRODUCT.md`).
- **App Header:** Small logo mark, current route title, theme utility, and clear back/home affordance on `/reportar`.
- **Raycast-Style Nav:** A compact floating or inset top utility bar with crisp active states, icon+label actions where useful, and fast state transitions.
- **Dashboard Filters:** Sticky or near-sticky route and range controls on mobile. The active filter summary should include selected routes and the active range. Filters should never cover chart content. Filter popovers must be scroll-contained, lock page scroll while open, keep an accessible dialog title, and retain a visible close button.

### Problem Selector

Sixteen problems grouped into five categories (`fiabilidad`, `paradas`, `seguridad`, `condicion`, `convivencia`) as nested `<fieldset>`/`<legend>` sections under one outer "¿Qué pasó?" fieldset. Multi-select — a single trip commonly has more than one problem. Every option is an equal-weight toggle button regardless of category or position; grouping exists purely to make 16 options scannable on a phone, never to imply one problem matters more than another (see the No Bait Rule in §2).

### Dashboard Modules

Dashboard modules are evidence blocks, not generic metric cards. The fixed module order:

1. **Reports per route** — the lead module, horizontal bars in route-identity color, all 9 routes shown, never truncated. Never replaced or preceded by a single network-wide number.
2. **Reports per problem** — horizontal bars across all 16 problems, single accent fill (not route or category color), value labels rather than relying on hover (mobile has no hover).
3. **Reports per category** — the 5-category rollup, a more scannable summary of #2, using the problem-category palette from §2.
4. **Report volume over time** — line chart for the selected range, with a computed tick interval so long ranges (`Todo`, hundreds of daily buckets) don't produce overlapping date labels.
5. **Most-reported units** — ranked list, clicking a row opens the unit explorer below.
6. **Unit explorer** — search or select a reported unit; show total reports, routes it runs, and a history chart for the active range.
7. **Route detail cards** — per-route reports, units reported, latest report, and a confidence badge. (Per-route problem breakdown inside these cards is planned but not yet wired — `makeover.md` P12.)

There is no Termo Indicator, fleet-coverage percentage, or any other weighted score. Modules should include compact helper tooltips for confidence and range definitions where useful, per the Do's/Don'ts below.

### Logo / App Icon

The current mark (a red diamond behind a blue thermometer, inherited from Termo de Madrid) is a placeholder pending a San Pedro en Bus-specific identity (`makeover.md` P5). No logo motion.

## 6. Do's and Don'ts

### Do:

- **Do** use a mostly light creamy interface with dark mode support from v1.
- **Do** use 8px cards, 8px controls, and 12px only for larger app panels or share cards.
- **Do** keep the dashboard vertical on mobile; no chart carousel for v1.
- **Do** make every major dashboard module screenshot-friendly with title, range, legend, data, and takeaway.
- **Do** use tooltips/help popovers for methodology details instead of bloating the main UI with explanatory text.
- **Do** show confidence as simple labels (`baja`, `media`, `alta`) with tap/hover explanation.
- **Do** distinguish route-identity colors from problem-category colors.
- **Do** include the mandatory disclaimer: `Proyecto ciudadano, no afiliado a ninguna empresa de transporte`
- **Do** keep Spanish copy complete and centralized in the locale dictionary, even with one locale live.

### Don't:

- **Don't** make the app look affiliated with any transit company. Never name the company in-product.
- **Don't** build a generic complaint counter that treats raw complaint volume as truth.
- **Don't** lead with a single network average that hides a bad route.
- **Don't** reintroduce a weighted scoring index, time decay, or fleet-coverage percentage.
- **Don't** rank or color-code the 16 problems by severity in the report form.
- **Don't** use glassmorphism as a default surface treatment.
- **Don't** use border radii above 16px on cards, panels, or inputs.
- **Don't** combine a 1px card border with soft shadows above 8px blur.
- **Don't** use colored side-stripe borders thicker than 1px on cards, list items, alerts, or callouts.
- **Don't** use gradient text, decorative grid backgrounds, repeating stripe backgrounds, or tiny uppercase tracked eyebrows as section scaffolding.
- **Don't** expose open free-text comments in v1.
- **Don't** request GPS/location permission in v1.
- **Don't** support offline submission in v1.
- **Don't** hide confidence caveats when a metric is based on a small sample.
