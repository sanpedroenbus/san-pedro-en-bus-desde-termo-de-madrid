"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { getConfidence, type Confidence } from "@/lib/domain/confidence";
import { RouteBadge } from "@/components/ui/route-badge";
import { InfoTooltip } from "@/components/ui/tooltip";
import { type RouteProblemBreakdown, type RouteSummary } from "@/lib/domain/dashboard";
import { type Route } from "@/lib/domain/routes";
import type { TimeRange } from "@/lib/domain/ranges";
import { getProblemLabel } from "@/components/report/problem-label";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber, formatRelativeReportAge } from "@/lib/i18n/format";

// Cap the expanded per-route problem list to the top offenders so a card with
// all 16 problem types reported at least once still stays compact.
const ROUTE_PROBLEM_LIST_LIMIT = 5;

type RouteDetailLoadStatus = "idle" | "loading" | "loaded" | "error";

// getConfidence() only reads the length of the array it's given — route
// summaries only carry a report count, not the individual reports, so a
// same-length placeholder array is enough to reuse the shared threshold logic
// instead of duplicating it here.
function confidenceFromCount(count: number): Confidence {
  return getConfidence(Array.from({ length: count }, () => ({ createdAt: new Date(0) })));
}

export function RouteDetailCards({
  cards,
  dictionary,
  selectedRoutes,
  selectedRange,
  locale,
  includeDemo = false,
}: {
  cards: RouteSummary[];
  dictionary: Dictionary;
  selectedRoutes: Route[];
  selectedRange: TimeRange;
  locale: Locale;
  includeDemo?: boolean;
}) {
  const visibleCards = cards
    .filter((summary) => (selectedRoutes.length > 0 ? selectedRoutes.includes(summary.route) : true))
    .toSorted((a, b) => b.reports - a.reports);
  const routesKey = selectedRoutes.toSorted().join(",");

  return (
    <section className="scroll-mt-[13rem] pt-4" id="route-details">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-base font-semibold">{dictionary.explore.modules.routeDetails}</h2>
        <InfoTooltip label={dictionary.explore.modules.routeDetails}>{dictionary.explore.confidenceHelp}</InfoTooltip>
      </div>
      {visibleCards.length === 0 ? (
        <p className="rounded-md bg-surface p-3 text-sm text-muted">{dictionary.explore.routeDetails.empty}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCards.map((summary) => (
            // Remount on range/route-filter change instead of syncing effect
            // deps: it's the same pattern UnitsExplorerChartCards uses to
            // reset per-selection fetch state (see dashboard-charts.tsx).
            <RouteDetailCard
              dictionary={dictionary}
              includeDemo={includeDemo}
              key={`${summary.route}-${selectedRange}-${routesKey}`}
              locale={locale}
              routesKey={routesKey}
              selectedRange={selectedRange}
              summary={summary}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RouteDetailCard({
  summary,
  dictionary,
  locale,
  selectedRange,
  routesKey,
  includeDemo,
}: {
  summary: RouteSummary;
  dictionary: Dictionary;
  locale: Locale;
  selectedRange: TimeRange;
  routesKey: string;
  includeDemo: boolean;
}) {
  const confidence = confidenceFromCount(summary.reports);
  const [expanded, setExpanded] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const [status, setStatus] = useState<RouteDetailLoadStatus>("idle");
  const [breakdown, setBreakdown] = useState<RouteProblemBreakdown | null>(null);

  useEffect(() => {
    // Loading state is set by the caller (toggleExpanded/retryLoad) before
    // this effect runs, not here, so the effect body only ever calls setState
    // from the async fetch callbacks below.
    if (!hasRequested) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ ruta_detalle: summary.route, rango: selectedRange });
    if (routesKey) params.set("ruta", routesKey);
    if (includeDemo) params.set("demo", "1");
    fetch(`/api/dashboard/route-detail?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("route_detail_failed");
        const payload = (await response.json()) as { breakdown: RouteProblemBreakdown | null };
        setBreakdown(payload.breakdown);
        setStatus("loaded");
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setStatus("error");
      });
    return () => controller.abort();
  }, [hasRequested, retryVersion, routesKey, selectedRange, summary.route, includeDemo]);

  function toggleExpanded() {
    setExpanded((current) => !current);
    if (!hasRequested) {
      setStatus("loading");
      setHasRequested(true);
    }
  }

  function retryLoad() {
    setStatus("loading");
    setRetryVersion((version) => version + 1);
  }

  const topProblems = breakdown?.problems.filter((item) => item.reports > 0).slice(0, ROUTE_PROBLEM_LIST_LIMIT) ?? [];

  return (
    <article className="rounded-md border border-border bg-surface-raised p-4 text-left">
      <div className="flex items-center justify-between gap-2">
        <RouteBadge className="px-2 text-sm" route={summary.route} />
        <span className="font-mono text-2xl font-semibold">{formatNumber(summary.reports, locale)}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted">{dictionary.explore.unitsReportedLabel}</dt>
          <dd className="font-mono font-semibold">{formatNumber(summary.unitsReported, locale)}</dd>
        </div>
        <div>
          <dt className="text-muted">{dictionary.explore.latestReport}</dt>
          <dd className="font-mono font-semibold" suppressHydrationWarning>
            {formatRelativeReportAge(summary.latestReportAt, locale, dictionary.explore.noRecentReport)}
          </dd>
        </div>
      </dl>
      <div className="mt-3 flex items-center gap-1.5 text-xs">
        <span className="text-muted">{dictionary.common.confidence}</span>
        <ConfidenceBadge confidence={confidence} dictionary={dictionary} />
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <button
          aria-expanded={expanded}
          className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold text-muted transition duration-200 ease-out hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={toggleExpanded}
          type="button"
        >
          {dictionary.explore.routeDetails.topProblemsTitle}
          <ChevronDown aria-hidden="true" className={`size-4 shrink-0 transition duration-200 ease-out ${expanded ? "rotate-180" : ""}`} />
        </button>
        {expanded ? (
          <div className="mt-2">
            {status === "loading" ? <RouteProblemsSkeleton label={dictionary.explore.routeDetails.loading} /> : null}
            {status === "error" ? (
              <button
                className="text-left text-xs text-danger underline decoration-dotted underline-offset-2"
                onClick={retryLoad}
                type="button"
              >
                {dictionary.explore.routeDetails.loadError}
              </button>
            ) : null}
            {status === "loaded" ? (
              topProblems.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {topProblems.map((item) => (
                    <li className="flex items-center justify-between gap-2 text-xs" key={item.problem}>
                      <span className="truncate text-foreground">{getProblemLabel(dictionary, item.problem)}</span>
                      <span className="font-mono font-semibold tabular-nums">{formatNumber(item.reports, locale)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted">{dictionary.explore.routeDetails.empty}</p>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function RouteProblemsSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1.5" data-testid="route-detail-loading">
      <span className="sr-only">{label}</span>
      {Array.from({ length: 3 }, (_, index) => (
        <span aria-hidden="true" className="h-4 animate-pulse rounded-sm bg-border" key={index} style={{ width: `${70 - index * 15}%` }} />
      ))}
    </div>
  );
}

function ConfidenceBadge({ confidence, dictionary }: { confidence: Confidence; dictionary: Dictionary }) {
  const label = dictionary.common[confidence];
  return (
    <span
      className="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-semibold"
      data-confidence={confidence}
    >
      {label}
    </span>
  );
}
