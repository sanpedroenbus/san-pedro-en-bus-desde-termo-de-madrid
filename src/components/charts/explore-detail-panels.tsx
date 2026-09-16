"use client";

import { LineBadge } from "@/components/ui/line-badge";
import { InfoTooltip } from "@/components/ui/tooltip";
import { type DashboardData, type LineSummary } from "@/lib/domain/dashboard";
import { type MetroLine } from "@/lib/domain/lines";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatNumber, formatRelativeReportAge } from "@/lib/i18n/format";

export function ExploreFleetPanel({
  data,
  dictionary,
  locale,
  rangeLabel,
  selectedLines,
}: {
  data: Pick<DashboardData, "lineSummaries">;
  dictionary: Dictionary;
  locale: Locale;
  rangeLabel: string;
  selectedLines: MetroLine[];
}) {
  const visibleSummaries = data.lineSummaries
    .filter((summary) => (selectedLines.length > 0 ? selectedLines.includes(summary.line) : summary.reports > 0))
    .toSorted((a, b) => b.reports - a.reports);

  return (
    <aside className="flex flex-col gap-4">
      <section className="scroll-mt-[13rem] rounded-md border border-border bg-surface-raised p-4" id="fleet">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">{dictionary.explore.modules.fleet}</h2>
          <InfoTooltip label={dictionary.explore.modules.fleet}>{dictionary.explore.caveats.fleet}</InfoTooltip>
        </div>
        <p className="mt-1 text-xs font-semibold text-muted">
          {dictionary.explore.moduleRange}: {rangeLabel}
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {visibleSummaries.map((summary) => (
            <div className="flex items-center justify-between gap-2 text-sm" key={summary.line}>
              <LineBadge line={summary.line} />
              <span className="font-mono font-semibold">{formatNumber(summary.carsReported, locale)}</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

export function LineDetailCards({
  cards,
  dictionary,
  selectedLines,
  locale,
}: {
  cards: LineSummary[];
  dictionary: Dictionary;
  selectedLines: MetroLine[];
  locale: Locale;
}) {
  const reportSummaryCards = cards
    .filter((summary) => (selectedLines.length > 0 ? selectedLines.includes(summary.line) : summary.reports > 0))
    .toSorted((a, b) => b.reports - a.reports);

  return (
    <section className="scroll-mt-[13rem] pt-4" id="line-details">
      <h2 className="mb-3 text-base font-semibold">{dictionary.explore.modules.lineDetails}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reportSummaryCards.map((summary) => (
          <article className="rounded-md border border-border bg-surface-raised p-4 text-left" key={summary.line}>
            <div className="flex items-center justify-between">
              <LineBadge className="px-2 text-sm" line={summary.line} />
              <span className="font-mono text-2xl font-semibold">{formatNumber(summary.reports, locale)}</span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-muted">{dictionary.explore.carsReportedLabel}</dt>
                <dd className="font-mono font-semibold">{formatNumber(summary.carsReported, locale)}</dd>
              </div>
              <div>
                <dt className="text-muted">{dictionary.explore.latestReport}</dt>
                <dd className="font-mono font-semibold" suppressHydrationWarning>
                  {formatRelativeReportAge(summary.latestReportAt, locale, dictionary.explore.noRecentReport)}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
