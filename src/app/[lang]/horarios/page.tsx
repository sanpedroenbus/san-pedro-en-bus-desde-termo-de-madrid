import { Clock, FileText } from "lucide-react";
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
  summarizeFrequencies,
  type FrequencySummary,
} from "@/lib/domain/authorized-service";
import { ROUTE_LABELS, ROUTES } from "@/lib/domain/routes";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { formatLongDate, formatNumber } from "@/lib/i18n/format";

export default async function SchedulesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dictionary = await getDictionary(lang);
  const copy = dictionary.schedules;
  const source = AUTHORIZED_SERVICE_SOURCE;
  const routesWithSchedule = ROUTES.filter((route) => AUTHORIZED_SERVICE[route]);
  const routesWithoutSchedule = ROUTES.filter((route) => !AUTHORIZED_SERVICE[route]);
  const rules = [
    copy.rules.routes,
    copy.rules.frequencies,
    copy.rules.fleet.replace("{count}", String(source.authorizedFleet)),
    copy.rules.ramps,
    copy.rules.validity.replace("{date}", formatLongDate(source.permitExpiresOn, lang)),
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
            <div className="grid gap-3 sm:grid-cols-2">
              {routesWithSchedule.map((route) => {
                const service = AUTHORIZED_SERVICE[route]!;
                return (
                  <section className="rounded-md border border-border bg-background p-3" data-testid="schedule-route" key={route}>
                    <div className="flex items-center justify-between gap-2">
                      <RouteBadge className="px-2 text-sm" route={route} />
                      <span className="text-xs tabular-nums">
                        {service.fleet === 1 ? copy.fleetOne : copy.fleetMany.replace("{count}", String(service.fleet))}
                      </span>
                    </div>
                    <dl className="mt-3 flex flex-col gap-2">
                      {DAY_TYPES.map((day) => (
                        <div className="flex items-baseline justify-between gap-3" key={day}>
                          <dt>{copy.dayTypes[day]}</dt>
                          <dd className="text-right font-mono font-semibold tabular-nums text-foreground">
                            <FrequencyValue copy={copy} lang={lang} summary={summarizeFrequencies(service.schedule[day])} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                );
              })}
            </div>
            {routesWithoutSchedule.length > 0 ? (
              <p className="text-xs">
                {copy.notInDocument.replace("{routes}", routesWithoutSchedule.map((route) => ROUTE_LABELS[route]).join(", "))}
              </p>
            ) : null}
          </Section>

          <Section id="reportar" title={copy.ctaTitle}>
            <p>{copy.ctaBody}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild>
                <Link href={`/${lang}/reportar`}>{copy.ctaReport}</Link>
              </Button>
              <ShareLinkButton copiedLabel={dictionary.common.shareLinkCopied} label={copy.ctaShare} title={copy.title} />
            </div>
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
  const range =
    summary.minMinutes === summary.maxMinutes
      ? copy.single.replace("{min}", formatNumber(summary.minMinutes, lang))
      : copy.range.replace("{min}", formatNumber(summary.minMinutes, lang)).replace("{max}", formatNumber(summary.maxMinutes, lang));
  return (
    <>
      {range}
      {summary.minMinutes !== summary.maxMinutes ? (
        <span className="block font-sans text-xs font-normal text-muted">
          {copy.average.replace("{average}", formatNumber(summary.averageMinutes, lang))}
        </span>
      ) : null}
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
