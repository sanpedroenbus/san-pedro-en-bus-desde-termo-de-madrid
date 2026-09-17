import { ROUTE_COLORS } from "@/lib/domain/routes";
import type { Report } from "@/lib/domain/reports";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatReportDateTime } from "@/lib/i18n/format";
import { getProblemLabel } from "./problem-label";

const MAX_VISIBLE_PROBLEMS = 2;

export function RecentReportRow({
  dictionary,
  locale,
  report,
}: {
  dictionary: Dictionary;
  locale: Locale;
  report: Report;
}) {
  const visibleProblems = report.problems.slice(0, MAX_VISIBLE_PROBLEMS);
  const hiddenCount = report.problems.length - visibleProblems.length;

  return (
    <div className="flex flex-col gap-1.5 py-3">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <span
          className="rounded-sm px-1.5 py-1 text-xs font-bold"
          style={{
            background: ROUTE_COLORS[report.route].fill,
            color: ROUTE_COLORS[report.route].textOnFill,
          }}
        >
          {report.route}
        </span>
        <p className="min-w-0 truncate font-mono text-sm font-semibold">{report.unit ?? dictionary.explore.noUnit}</p>
        <time className="whitespace-nowrap font-mono text-xs text-muted">{formatReportDateTime(report.createdAt, locale)}</time>
      </div>
      <div className="flex flex-wrap gap-1">
        {visibleProblems.map((problem) => (
          <span
            className="max-w-full truncate rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[0.6875rem] leading-4 text-muted"
            key={problem}
          >
            {getProblemLabel(dictionary, problem)}
          </span>
        ))}
        {hiddenCount > 0 ? (
          <span className="shrink-0 rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[0.6875rem] leading-4 text-muted">
            +{hiddenCount}
          </span>
        ) : null}
      </div>
    </div>
  );
}
