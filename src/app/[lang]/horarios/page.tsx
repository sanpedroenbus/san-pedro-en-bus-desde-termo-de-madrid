import { ChevronDown, Clock, FileText, Moon, SquareArrowOutUpRight, Sun, Sunset, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RouteBadge } from "@/components/ui/route-badge";
import { ShareLinkButton } from "@/components/ui/share-link-button";
import { InfoTooltip } from "@/components/ui/tooltip";
import {
  AUTHORIZED_SERVICE,
  AUTHORIZED_SERVICE_SOURCE,
  DAY_TYPES,
  MOOVIT_FREQUENCIES,
  MOOVIT_SOURCE,
  summarizeFrequencies,
  TIMES_OF_DAY,
  type DayType,
  type FrequencySummary,
  type TimeOfDay,
} from "@/lib/domain/authorized-service";
import { ROUTE_LABELS, ROUTES, type Route } from "@/lib/domain/routes";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { formatLongDate, formatNumber } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return buildPageMetadata(lang, await getDictionary(lang), "schedules");
}

export default async function SchedulesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dictionary = await getDictionary(lang);
  const copy = dictionary.schedules;
  const source = AUTHORIZED_SERVICE_SOURCE;
  const routesWithSchedule = ROUTES.filter((route) => AUTHORIZED_SERVICE[route]);
  const routesFromMoovit = ROUTES.filter((route) => !AUTHORIZED_SERVICE[route] && MOOVIT_FREQUENCIES[route]);
  const routesWithoutSchedule = ROUTES.filter((route) => !AUTHORIZED_SERVICE[route] && !MOOVIT_FREQUENCIES[route]);
  const routeList = (routes: Route[]) => routes.map((route) => ROUTE_LABELS[route]).join(", ");
  const rules = [
    copy.rules.fleet.replace("{count}", String(source.authorizedFleet)),
    copy.rules.routes,
    copy.rules.ramps,
    copy.rules.validity.replace("{date}", formatLongDate(source.permitExpiresOn, lang)),
    copy.rules.frequencies,
  ];

  return (
    <main className="min-h-dvh">
      <article className="mx-auto max-w-3xl px-4 pb-6">
        <div className="flex items-center justify-center gap-2 pt-6 text-center">
          <Clock aria-hidden="true" className="size-5 shrink-0 text-muted sm:size-6" />
          <h1 className="text-xl font-[650] tracking-[-0.015em] sm:text-2xl">{copy.title}</h1>
        </div>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-muted">{copy.intro}</p>

        <div className="mt-8 flex flex-col gap-5">
          <Section id="reglas" title={copy.rulesTitle}>
            <ul className="list-disc space-y-2 pl-5">
              {rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </Section>

          <Section
            id="frecuencias"
            title={copy.frequencyTitle}
            titleAddon={<InfoTooltip label={copy.frequencyHelp}>{copy.frequencyHelp}</InfoTooltip>}
          >
            <p>{copy.frequencyIntro}</p>
            <div className="grid items-start gap-3 sm:grid-cols-2">
              {routesWithSchedule.map((route) => {
                const service = AUTHORIZED_SERVICE[route]!;
                return (
                  <ScheduleCard
                    aside={service.fleet === 1 ? copy.fleetOne : copy.fleetMany.replace("{count}", String(service.fleet))}
                    copy={copy}
                    key={route}
                    renderDay={(day) => <FrequencyValue copy={copy} lang={lang} summary={summarizeFrequencies(service.schedule[day])} />}
                    route={route}
                  />
                );
              })}
              {routesFromMoovit.map((route) => {
                const { url, frequencies: days } = MOOVIT_FREQUENCIES[route]!;
                return (
                  <ScheduleCard
                    aside={
                      <a
                        className="hit-slop inline-flex items-center gap-1 underline decoration-border underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        href={url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {copy.moovitLabel}
                        <SquareArrowOutUpRight aria-hidden="true" className="size-3" />
                      </a>
                    }
                    copy={copy}
                    key={route}
                    renderDay={(day) => {
                      const [min, max] = days[day];
                      return min === max
                        ? copy.single.replace("{min}", formatNumber(min, lang))
                        : copy.range.replace("{min}", formatNumber(min, lang)).replace("{max}", formatNumber(max, lang));
                    }}
                    route={route}
                  />
                );
              })}
            </div>
            {routesFromMoovit.length > 0 ? (
              <p className="text-xs">
                {copy.moovitNote.replace("{routes}", routeList(routesFromMoovit)).replace("{date}", formatLongDate(MOOVIT_SOURCE.checkedOn, lang))}
              </p>
            ) : null}
            {routesWithoutSchedule.length > 0 ? (
              <p className="text-xs">{copy.notInDocument.replace("{routes}", routeList(routesWithoutSchedule))}</p>
            ) : null}
          </Section>

          <Section id="reportar" title={copy.ctaTitle}>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild>
                <Link href={`/${lang}/reportar`}>{copy.ctaReport}</Link>
              </Button>
              <ShareLinkButton copiedLabel={dictionary.common.shareLinkCopied} label={copy.ctaShare} title={copy.title} />
            </div>
            <p className="border-t border-border pt-4">
              {copy.collaborateTeaser}{" "}
              <Link
                className="inline-flex min-h-11 items-center font-semibold text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                href={`/${lang}/colaborar?interes=seguimiento`}
              >
                {copy.collaborateLink}
              </Link>
            </p>
          </Section>
        </div>

        <footer className="mt-8 border-t border-border pt-4 text-center text-xs leading-5 text-muted">
          <p className="font-semibold text-foreground">{copy.sourceTitle}</p>
          <p className="mt-1">
            {copy.sourceBody.replace("{id}", source.documentId).replace("{date}", formatLongDate(source.issuedOn, lang))}
          </p>
          <a
            className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-semibold text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href={source.pdfPath}
            rel="noreferrer"
            target="_blank"
          >
            <FileText aria-hidden="true" className="size-4" />
            {copy.sourceLink.replace("{size}", formatNumber(source.pdfSizeMb, lang))}
          </a>
          <p className="mt-4">{dictionary.common.disclaimer}</p>
        </footer>
      </article>
    </main>
  );
}

const [WEEKDAY, ...WEEKEND] = DAY_TYPES;

// Mon-Fri always visible; weekends behind a per-card toggle.
function ScheduleCard({
  aside,
  copy,
  renderDay,
  route,
}: {
  aside: ReactNode;
  copy: Dictionary["schedules"];
  renderDay: (day: DayType) => ReactNode;
  route: Route;
}) {
  return (
    <section className="min-w-0 rounded-md border border-border bg-background p-3" data-testid="schedule-route">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RouteBadge className="px-2 text-sm" route={route} />
        <span className="text-xs tabular-nums">{aside}</span>
      </div>
      <DayRows className="mt-3" copy={copy} days={[WEEKDAY]} renderDay={renderDay} />
      <details className="group mt-2">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-sm text-muted transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
          {copy.weekendToggle}
          <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-muted transition-transform duration-200 ease-out group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <DayRows copy={copy} days={WEEKEND} renderDay={renderDay} />
      </details>
    </section>
  );
}

function DayRows({
  className,
  copy,
  days,
  renderDay,
}: {
  className?: string;
  copy: Dictionary["schedules"];
  days: readonly DayType[];
  renderDay: (day: DayType) => ReactNode;
}) {
  return (
    <dl className={cn("flex flex-col gap-2", className)}>
      {days.map((day) => (
        <div key={day}>
          <dt>{copy.dayTypes[day]}</dt>
          <dd className="font-mono font-semibold tabular-nums text-foreground">{renderDay(day)}</dd>
        </div>
      ))}
    </dl>
  );
}

const TIME_OF_DAY_ICONS: Record<TimeOfDay, LucideIcon> = { morning: Sun, afternoon: Sunset, night: Moon };

function FrequencyValue({
  copy,
  lang,
  summary,
}: {
  copy: Dictionary["schedules"];
  lang: Locale;
  summary: FrequencySummary | null;
}) {
  if (!summary) return <span className="font-sans font-normal text-muted">{copy.noService}</span>;
  return (
    <>
      <span className="flex flex-wrap gap-x-4 gap-y-1">
        {TIMES_OF_DAY.map((band) => {
          const Icon = TIME_OF_DAY_ICONS[band];
          const minutes = summary.averageMinutes[band];
          return (
            <span className="inline-flex items-center gap-1" key={band} title={copy.timesOfDay[band]}>
              <Icon aria-hidden="true" className="size-4 shrink-0 text-muted" />
              <span className="sr-only">{copy.timesOfDay[band]}:</span>
              {minutes === null ? (
                <span className="font-sans font-normal text-muted">{copy.noService}</span>
              ) : (
                copy.minutes.replace("{minutes}", formatNumber(minutes, lang))
              )}
            </span>
          );
        })}
      </span>
      {summary.hasGaps ? <span className="block font-sans text-xs font-normal text-muted">{copy.serviceGaps}</span> : null}
    </>
  );
}

function Section({ children, id, title, titleAddon }: { children: ReactNode; id: string; title: string; titleAddon?: ReactNode }) {
  return (
    <section className="scroll-mt-32 rounded-md border border-border bg-surface-raised p-4" id={id}>
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-[-0.01em]">
        {title}
        {titleAddon}
      </h2>
      <div className="mt-3 space-y-4 text-sm leading-6 text-muted">{children}</div>
    </section>
  );
}
