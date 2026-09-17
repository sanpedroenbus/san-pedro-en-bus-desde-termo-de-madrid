export const THEME_COLORS = {
  lightBackground: "oklch(1 0 0)",
  darkBackground: "oklch(0.105 0 0)",
} as const;

export const CHART_TOKENS = {
  animationDurationMs: 220,
  angledTickFontSizePx: 10,
  angledTickHeightPx: 42,
  barRadius: [6, 6, 0, 0] as [number, number, number, number],
  hourTickFontSizePx: 9,
  hourTickHeightPx: 24,
  moduleHeightClass: "h-56",
  compactMargin: { left: -12, right: 8, top: 8, bottom: 0 },
  tooltipPayloadLimit: 8,
} as const;

export const CATEGORY_COLORS = {
  fiabilidad: "oklch(0.55 0.18 255)",
  paradas: "oklch(0.62 0.14 180)",
  seguridad: "oklch(0.55 0.20 15)",
  condicion: "oklch(0.68 0.15 85)",
  convivencia: "oklch(0.55 0.17 320)",
} as const;

// Repurposed from a since-removed train-series chart. `CATEGORY_COLORS` above is the
// intended replacement for problem-category charts; this stays exported because
// dashboard-charts.tsx (out of scope for this change) still imports it directly.
export const SERIES_CHART_COLORS = [
  "oklch(0.58 0.16 22)",
  "oklch(0.64 0.15 58)",
  "oklch(0.56 0.14 145)",
  "oklch(0.60 0.13 190)",
  "oklch(0.55 0.16 245)",
  "oklch(0.60 0.16 305)",
  "oklch(0.58 0.15 350)",
  "oklch(0.68 0.13 105)",
  "oklch(0.52 0.11 205)",
  "oklch(0.62 0.12 275)",
  "oklch(0.50 0.12 35)",
  "oklch(0.54 0.11 165)",
] as const;

export const FEEDBACK_TOKENS = {
  undoToastDurationMs: 12_000,
} as const;

export const SOCIAL_IMAGE_TOKENS = {
  width: 1200,
  height: 630,
  background: "#fbfaf7",
  surface: "#ffffff",
  ink: "#183027",
  muted: "#5e6a63",
  border: "#dcd8cf",
  primary: "#008b5f",
  accent: "#d99100",
  categoryFiabilidad: "#3d5da8",
  categorySeguridad: "#c23b2e",
  logoContainerPx: 64,
  logoGapPx: 20,
  headerTitlePx: 30,
  headerTextPx: 20,
  descriptionPx: 26,
  navMenuPx: 44,
  navMenuLineWidthPx: 24,
  navMenuLineHeightPx: 3,
  busWidthPx: 330,
  busHeightPx: 100,
  busOpacity: 0.28,
  actionPaddingBlockPx: 10,
  actionPaddingInlinePx: 24,
  actionRowWidthPx: 780,
  actionIconPx: 36,
  actionTitlePx: 22,
  actionDescriptionPx: 16,
  actionGapPx: 10,
  actionBarWidthPx: 7,
  actionBarSmPx: 24,
  actionBarMdPx: 36,
  actionBarLgPx: 30,
  radiusPx: 16,
  markRadiusPx: 12,
  pillRadiusPx: 999,
  paddingPx: 48,
  cardPaddingPx: 18,
  sectionGapPx: 24,
  stackGapPx: 8,
  textMaxWidthPx: 940,
  logoBorderPx: 2,
  descriptionLineHeight: 1.22,
} as const;
