"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type UnitExplorerOption, type UnitExplorerSelection, type DashboardData } from "@/lib/domain/dashboard";
import { CHART_TOKENS, SERIES_CHART_COLORS } from "@/lib/design/tokens";
import { ROUTE_COLORS, ROUTE_LABELS, type Route } from "@/lib/domain/routes";
import type { Problem, ProblemCategory } from "@/lib/domain/problems";
import type { TimeRange } from "@/lib/domain/ranges";
import { normalizeUnitCode } from "@/lib/domain/reports";
import { getProblemLabel } from "@/components/report/problem-label";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { RouteBadge } from "@/components/ui/route-badge";
import { Button } from "@/components/ui/button";
import { ChartCard } from "./chart-card";

const WORST_UNIT_COLLAPSED_COUNT = 5;
const WORST_UNIT_COUNT = 20;

// Horizontal ranked-bar layout constants (route volume, problems, categories).
// Kept local to this file because src/lib/** is out of scope for this phase.
const RANKED_BAR_ROW_HEIGHT_PX = 40;
const RANKED_BAR_MIN_HEIGHT_PX = 96;
const RANKED_BAR_LABEL_WIDTH_PX = 132;
const RANKED_BAR_MARGIN = { top: 4, right: 40, bottom: 4, left: 0 };
const RANKED_BAR_RADIUS: [number, number, number, number] = [0, 4, 4, 0];
const WRAP_MAX_CHARS = 20;
const WRAP_MAX_LINES = 2;
const WRAP_LINE_HEIGHT_PX = 12;

type ChartModuleBaseProps = {
  dictionary: Dictionary;
  locale: Locale;
  rangeLabel: string;
  selectedRange: TimeRange;
  selectedRoutes: Route[];
};

type RankedBarItem = {
  key: string;
  label: string;
  value: number;
  fill?: string;
};

export function RouteVolumeChartCard({
  data,
  dictionary,
  locale,
  rangeLabel,
  selectedRoutes,
}: Omit<ChartModuleBaseProps, "selectedRange"> & {
  data: Pick<DashboardData, "routeSummaries">;
}) {
  const visibleRoutes = data.routeSummaries
    .filter((summary) => (selectedRoutes.length > 0 ? selectedRoutes.includes(summary.route) : true))
    .toSorted((a, b) => b.reports - a.reports);

  const items: RankedBarItem[] = visibleRoutes.map((summary) => ({
    key: summary.route,
    label: ROUTE_LABELS[summary.route],
    value: summary.reports,
    fill: ROUTE_COLORS[summary.route].fill,
  }));

  return (
    <ChartCard
      dictionary={dictionary}
      id="report-volume"
      rangeLabel={rangeLabel}
      takeaway={dictionary.explore.chartTakeaways.volume}
      title={dictionary.explore.modules.volume}
    >
      <RankedBarChart items={items} locale={locale} valueName={dictionary.common.reports} />
    </ChartCard>
  );
}

export function ProblemsChartCard({
  data,
  dictionary,
  locale,
  rangeLabel,
}: Omit<ChartModuleBaseProps, "selectedRange" | "selectedRoutes"> & {
  data: Pick<DashboardData, "problemSummaries">;
}) {
  const items: RankedBarItem[] = data.problemSummaries.map((summary) => ({
    key: summary.problem,
    label: getProblemLabel(dictionary, summary.problem),
    value: summary.reports,
  }));

  return (
    <ChartCard
      dictionary={dictionary}
      id="problems"
      rangeLabel={rangeLabel}
      takeaway={dictionary.explore.chartTakeaways.problems}
      title={dictionary.explore.modules.problems}
    >
      <RankedBarChart items={items} locale={locale} valueName={dictionary.common.reports} />
    </ChartCard>
  );
}

const CATEGORY_COLORS: Record<ProblemCategory, string> = {
  fiabilidad: SERIES_CHART_COLORS[0],
  paradas: SERIES_CHART_COLORS[1],
  seguridad: SERIES_CHART_COLORS[2],
  condicion: SERIES_CHART_COLORS[3],
  convivencia: SERIES_CHART_COLORS[4],
};

export function CategoriesChartCard({
  data,
  dictionary,
  locale,
  rangeLabel,
}: Omit<ChartModuleBaseProps, "selectedRange" | "selectedRoutes"> & {
  data: Pick<DashboardData, "categorySummaries">;
}) {
  const items: RankedBarItem[] = data.categorySummaries.map((summary) => ({
    key: summary.category,
    label: dictionary.problemCategories[summary.category],
    value: summary.reports,
    fill: CATEGORY_COLORS[summary.category],
  }));

  return (
    <ChartCard
      dictionary={dictionary}
      id="categories"
      rangeLabel={rangeLabel}
      takeaway={dictionary.explore.chartTakeaways.categories}
      title={dictionary.explore.modules.categories}
    >
      <RankedBarChart items={items} locale={locale} valueName={dictionary.common.reports} />
    </ChartCard>
  );
}

export function TrendChartCard({
  data,
  dictionary,
  locale,
  rangeLabel,
  selectedRange,
}: Omit<ChartModuleBaseProps, "selectedRoutes"> & {
  data: Pick<DashboardData, "trend">;
}) {
  const xAxisInterval = getTimeAxisTickInterval(data.trend.length, selectedRange);

  return (
    <ChartCard
      dictionary={dictionary}
      id="trend"
      rangeLabel={rangeLabel}
      takeaway={dictionary.explore.chartTakeaways.trend}
      title={dictionary.explore.modules.trend}
    >
      <div className={CHART_TOKENS.moduleHeightClass}>
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={data.trend} margin={CHART_TOKENS.compactMargin}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis axisLine={false} dataKey="label" interval={xAxisInterval} tickLine={false} />
            <YAxis axisLine={false} allowDecimals={false} tickFormatter={(value) => formatNumber(Number(value), locale)} tickLine={false} />
            <Tooltip content={<LocalizedTooltip labelName={dictionary.common.reports} locale={locale} />} />
            <Line
              animationDuration={CHART_TOKENS.animationDurationMs}
              dataKey="reports"
              dot={false}
              name={dictionary.common.reports}
              stroke="var(--accent)"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function UnitsExplorerChartCards({
  data,
  dictionary,
  locale,
  rangeLabel,
  selectedRange,
  initialUnit,
  routes,
  problems,
  includeDemo = false,
}: Omit<ChartModuleBaseProps, "selectedRoutes"> & {
  data: { unitExplorer: { options: UnitExplorerOption[] } };
  initialUnit?: string | null;
  routes: Route[];
  problems: Problem[];
  includeDemo?: boolean;
}) {
  const initialSelectionUnit = initialUnit ?? data.unitExplorer.options[0]?.unit ?? null;
  const [selectedUnit, setSelectedUnit] = useState(initialSelectionUnit);
  const [activeSelection, setActiveSelection] = useState<UnitExplorerSelection | null>(null);
  const [isChartPending, setIsChartPending] = useState(Boolean(initialSelectionUnit));
  const [loadError, setLoadError] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  const routesKey = routes.join(",");
  const problemsKey = problems.join(",");

  useEffect(() => {
    if (!selectedUnit) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ unidad: selectedUnit, rango: selectedRange });
    if (routesKey) params.set("ruta", routesKey);
    if (problemsKey) params.set("problema", problemsKey);
    if (includeDemo) params.set("demo", "1");
    fetch(`/api/dashboard/unit?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("unit_detail_failed");
        const payload = (await response.json()) as { selection: UnitExplorerSelection | null };
        setActiveSelection(payload.selection);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsChartPending(false);
      });
    return () => controller.abort();
  }, [routesKey, problemsKey, requestVersion, selectedUnit, selectedRange, includeDemo]);

  function selectUnit(unit: string) {
    setActiveSelection(null);
    setIsChartPending(true);
    setLoadError(false);
    setSelectedUnit(unit);
    setRequestVersion((version) => version + 1);
  }

  return (
    <>
      <ChartCard
        dictionary={dictionary}
        id="worst-units"
        rangeLabel={rangeLabel}
        takeaway={dictionary.explore.chartTakeaways.worstUnits}
        title={dictionary.explore.modules.worstUnits}
      >
        <MostReportedUnitsList
          data={data}
          dictionary={dictionary}
          collapsedCount={WORST_UNIT_COLLAPSED_COUNT}
          expandedCount={WORST_UNIT_COUNT}
          onSelectUnit={(unit) => {
            selectUnit(unit);
            window.requestAnimationFrame(() => {
              document.getElementById("unit-explorer")?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          }}
        />
      </ChartCard>

      <ChartCard dictionary={dictionary} id="unit-explorer" rangeLabel={rangeLabel} title={dictionary.explore.modules.unitExplorer}>
        <UnitExplorer
          data={data}
          dictionary={dictionary}
          key={`${selectedRange}-${selectedUnit ?? "none"}-${data.unitExplorer.options.length}`}
          locale={locale}
          selectedUnit={selectedUnit}
          activeSelection={activeSelection}
          isChartPending={isChartPending}
          loadError={loadError}
          onSelectUnit={selectUnit}
          selectedRange={selectedRange}
        />
      </ChartCard>
    </>
  );
}

function UnitExplorer({
  data,
  dictionary,
  locale,
  selectedUnit,
  onSelectUnit,
  selectedRange,
  activeSelection,
  isChartPending,
  loadError,
}: {
  data: { unitExplorer: { options: UnitExplorerOption[] } };
  dictionary: Dictionary;
  locale: Locale;
  selectedUnit: string | null;
  onSelectUnit: (unit: string) => void;
  selectedRange: TimeRange;
  activeSelection: UnitExplorerSelection | null;
  isChartPending: boolean;
  loadError: boolean;
}) {
  const activeUnit = selectedUnit ?? data.unitExplorer.options[0]?.unit ?? null;
  const [draftUnit, setDraftUnit] = useState(activeUnit ?? "");
  const [error, setError] = useState<string | null>(null);
  const options = data.unitExplorer.options;
  const optionUnits = useMemo(() => new Set([...options.map((option) => option.unit), ...(activeUnit ? [activeUnit] : [])]), [activeUnit, options]);

  function submitSelection() {
    const normalized = normalizeUnitCode(draftUnit);
    if (!normalized || !optionUnits.has(normalized)) {
      setError(dictionary.explore.unitExplorer.invalid);
      return;
    }
    setDraftUnit(normalized);
    setError(null);
    if (normalized === activeUnit) return;
    onSelectUnit(normalized);
  }

  if (!activeUnit) {
    return <p className="rounded-md bg-surface p-3 text-sm text-muted">{dictionary.explore.unitExplorer.empty}</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div>
          <label className="sr-only" htmlFor="unit-explorer-input">
            {dictionary.explore.unitExplorer.label}
          </label>
          <input
            className="min-h-11 w-full rounded-md border border-border bg-background px-3 font-mono text-sm font-semibold outline-none transition duration-200 ease-out placeholder:text-muted focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            id="unit-explorer-input"
            list="unit-explorer-options"
            onChange={(event) => {
              setDraftUnit(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitSelection();
              }
            }}
            placeholder={dictionary.explore.unitExplorer.placeholder}
            suppressHydrationWarning
            value={draftUnit}
          />
          <datalist id="unit-explorer-options">
            {options.map((option) => (
              <option key={option.unit} value={option.unit} />
            ))}
          </datalist>
        </div>
        <Button aria-label={dictionary.explore.unitExplorer.search} className="size-11 min-h-0 px-0 py-0" onClick={submitSelection} type="button" variant="secondary">
          <Search aria-hidden="true" className="size-4" />
        </Button>
      </div>
      {error ? <p className="mt-2 text-[0.6875rem] font-semibold leading-4 text-danger">{error}</p> : null}
      {loadError ? <p className="mt-2 rounded-md bg-surface p-3 text-sm text-danger">{dictionary.explore.unitExplorer.loadError}</p> : null}

      {isChartPending ? (
        <UnitExplorerChartSkeleton />
      ) : activeSelection ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-md border border-border bg-surface p-3">
              <p className="text-xs font-semibold text-muted">{dictionary.explore.unitExplorer.reportedRoutes}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {activeSelection.routes.map((route) => (
                  <RouteBadge key={route} route={route} />
                ))}
              </div>
            </div>
            <div className="rounded-md border border-border bg-surface p-3">
              <p className="text-xs font-semibold text-muted">{dictionary.explore.unitExplorer.totalReports}</p>
              <div className="mt-1 flex items-center justify-end">
                <span className="font-mono text-3xl font-semibold leading-none tabular-nums">{formatNumber(activeSelection.reports, locale)}</span>
              </div>
            </div>
          </div>
          <div className={`${CHART_TOKENS.moduleHeightClass} mt-4`} data-testid="unit-explorer-chart">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={activeSelection.history} margin={CHART_TOKENS.compactMargin}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  interval={getTimeAxisTickInterval(activeSelection.history.length, selectedRange)}
                  tickLine={false}
                />
                <YAxis axisLine={false} allowDecimals={false} tickLine={false} />
                <Tooltip content={<LocalizedTooltip labelName={dictionary.common.reports} locale={locale} />} cursor={{ fill: "var(--surface)" }} />
                <Bar animationDuration={CHART_TOKENS.animationDurationMs} dataKey="reports" fill="var(--accent)" name={dictionary.common.reports} radius={CHART_TOKENS.barRadius} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : null}
    </div>
  );
}

function UnitExplorerChartSkeleton() {
  return (
    <div className={`${CHART_TOKENS.moduleHeightClass} mt-4 rounded-md bg-surface p-3`} data-testid="unit-explorer-loading">
      <div className="flex h-full items-end gap-2">
        {Array.from({ length: 12 }, (_, index) => (
          <span
            aria-hidden="true"
            className="flex-1 animate-pulse rounded-sm bg-border"
            key={index}
            style={{ height: `${28 + ((index * 17) % 56)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// Recharts' "preserveStartEnd" interval keeps thinning ticks as the axis
// gets crowded, but it never collapses hard enough for the "all" range's
// hundreds of daily buckets on a phone-width axis, so labels overlap. Target
// a fixed tick count instead and derive a plain numeric interval from it.
function getTimeAxisTickInterval(bucketCount: number, range: TimeRange): number {
  // "today" buckets are short hour labels ("05"); "sevenDays" buckets are
  // short weekday abbreviations ("mié") that always fit at their natural
  // count. "thirtyDays"/"all" buckets are longer "17 sept" labels, so they
  // need a much lower tick target to avoid overlapping on a phone-width axis.
  const maxTicks = range === "today" ? 8 : range === "sevenDays" ? 7 : 4;
  if (bucketCount <= maxTicks) return 0;
  return Math.ceil(bucketCount / maxTicks) - 1;
}

function RankedBarChart({
  items,
  locale,
  valueName,
  defaultFill = "var(--accent)",
}: {
  items: RankedBarItem[];
  locale: Locale;
  valueName: string;
  defaultFill?: string;
}) {
  const height = Math.max(RANKED_BAR_MIN_HEIGHT_PX, items.length * RANKED_BAR_ROW_HEIGHT_PX);

  return (
    <div style={{ height }}>
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={items} layout="vertical" margin={RANKED_BAR_MARGIN}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis allowDecimals={false} axisLine={false} tickLine={false} type="number" />
          <YAxis axisLine={false} dataKey="label" tick={<WrappedAxisTick />} tickLine={false} type="category" width={RANKED_BAR_LABEL_WIDTH_PX} />
          <Tooltip content={<LocalizedTooltip labelName={valueName} locale={locale} />} cursor={{ fill: "var(--surface)" }} />
          <Bar animationDuration={CHART_TOKENS.animationDurationMs} dataKey="value" name={valueName} radius={RANKED_BAR_RADIUS}>
            {items.map((item) => (
              <Cell fill={item.fill ?? defaultFill} key={item.key} />
            ))}
            <LabelList
              dataKey="value"
              fill="var(--foreground)"
              fontSize={12}
              formatter={(value: unknown) => formatNumber(Number(value), locale)}
              position="right"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function wrapLabel(label: string): string[] {
  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > WRAP_MAX_CHARS && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  if (lines.length > WRAP_MAX_LINES) {
    const visible = lines.slice(0, WRAP_MAX_LINES);
    const lastIndex = WRAP_MAX_LINES - 1;
    visible[lastIndex] = `${visible[lastIndex].slice(0, Math.max(0, WRAP_MAX_CHARS - 1))}…`;
    return visible;
  }
  return lines;
}

function WrappedAxisTick({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const lines = wrapLabel(payload?.value ?? "");
  const firstLineOffset = -((lines.length - 1) * WRAP_LINE_HEIGHT_PX) / 2 + 4;

  return (
    <text fill="var(--muted)" fontSize={11} textAnchor="end" x={x - 8} y={y}>
      {lines.map((line, index) => (
        <tspan dy={index === 0 ? firstLineOffset : WRAP_LINE_HEIGHT_PX} key={`${line}-${index}`} x={x - 8}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function LocalizedTooltip({
  active,
  payload,
  label,
  labelName,
  locale,
  footer,
}: Partial<TooltipContentProps<number, string>> & {
  labelName: string;
  locale: Locale;
  footer?: string;
}) {
  if (!active || !payload?.length) return null;
  const visiblePayload = payload
    .filter((item) => typeof item.value === "number")
    .toSorted((a, b) => Number(b.value) - Number(a.value))
    .slice(0, CHART_TOKENS.tooltipPayloadLimit);

  return (
    <div className="max-w-64 rounded-md border border-border bg-surface-raised px-3 py-2 text-xs text-foreground shadow-[var(--shadow-popover)]">
      <p className="mb-2 font-semibold">{label}</p>
      <div className="flex flex-col gap-1">
        {visiblePayload.map((item) => (
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2" key={`${item.name}-${item.dataKey}`}>
            <span aria-hidden="true" className="size-2 rounded-full" style={{ background: item.color }} />
            <span className="text-muted">{String(item.name ?? labelName)}</span>
            <span className="font-mono font-semibold tabular-nums">{formatNumber(Number(item.value), locale)}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 border-t border-border pt-2 leading-4 text-muted">{footer ?? labelName}</p>
    </div>
  );
}

function MostReportedUnitsList({
  data,
  dictionary,
  collapsedCount,
  expandedCount,
  onSelectUnit,
}: {
  data: Pick<DashboardData, "unitExplorer">;
  dictionary: Dictionary;
  collapsedCount: number;
  expandedCount: number;
  onSelectUnit: (unit: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const mostReportedUnits = data.unitExplorer.options;

  if (mostReportedUnits.length === 0) {
    return <p className="rounded-md bg-surface p-3 text-sm text-muted">{dictionary.explore.noRecentReport}</p>;
  }

  const visibleUnits = mostReportedUnits.slice(0, expanded ? expandedCount : collapsedCount);
  const canToggle = mostReportedUnits.length > collapsedCount;

  return (
    <div className="flex flex-col gap-2">
      {visibleUnits.map((unit) => (
        <button
          className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-border bg-surface p-3 text-left transition duration-200 ease-out hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          data-testid="worst-unit-row"
          key={unit.unit}
          onClick={() => onSelectUnit(unit.unit)}
          type="button"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex flex-wrap gap-1.5">
                {unit.routes.map((route) => (
                  <RouteBadge key={route} route={route} />
                ))}
              </span>
              <span className="font-mono text-sm font-semibold">{unit.unit}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="block font-mono text-2xl font-semibold leading-none tabular-nums">{unit.reports}</span>
            <span className="mt-1 block text-[0.68rem] font-semibold leading-none text-muted">{dictionary.explore.reportsLabel}</span>
          </div>
        </button>
      ))}
      {canToggle ? (
        <Button className="mt-1 min-h-10 py-2" onClick={() => setExpanded((current) => !current)} type="button" variant="secondary">
          {expanded ? dictionary.explore.showLess : dictionary.explore.showMore}
          <ChevronDown aria-hidden="true" className={`size-4 transition duration-200 ease-out ${expanded ? "rotate-180" : ""}`} />
        </Button>
      ) : null}
    </div>
  );
}
