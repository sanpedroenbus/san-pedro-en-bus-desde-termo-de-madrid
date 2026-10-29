import { MethodologyNavigation } from "@/components/methodology/methodology-navigation";
import { REPORT_COOLDOWN_MS } from "@/components/report/report-cooldown";
import {
  DUPLICATE_WINDOW_MINUTES,
  NO_UNIT_ORIGIN_WINDOW_MINUTES,
  RATE_LIMIT_MAX_REPORTS,
  RATE_LIMIT_WINDOW_MINUTES,
  UNDO_WINDOW_SECONDS,
} from "@/lib/domain/reports";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";
import { ChevronDown, CircleHelp } from "lucide-react";
import type { ReactNode } from "react";

const ORIGIN_PROJECT_URL = "https://github.com/nachoggodino/termometro";

// Filled from the real constants so the published rules can't drift from what the app enforces.
const LIMIT_VALUES: Record<string, number> = {
  cooldown: REPORT_COOLDOWN_MS / 60_000,
  noUnit: NO_UNIT_ORIGIN_WINDOW_MINUTES,
  duplicate: DUPLICATE_WINDOW_MINUTES,
  max: RATE_LIMIT_MAX_REPORTS,
  window: RATE_LIMIT_WINDOW_MINUTES,
  undo: UNDO_WINDOW_SECONDS,
};

function fillLimits(template: string) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in LIMIT_VALUES ? String(LIMIT_VALUES[key]) : match));
}

export default async function MethodologyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dictionary = await getDictionary(lang);

  return (
    <main className="min-h-dvh">
      <article className="mx-auto max-w-3xl px-4 pb-6">
        <MethodologyNavigation dictionary={dictionary} />

        <div className="flex items-center justify-center gap-2 pt-6 text-center">
          <CircleHelp aria-hidden="true" className="size-5 text-muted sm:size-6" />
          <h1 className="text-xl font-[650] tracking-[-0.015em] sm:text-2xl">{dictionary.methodology.title}</h1>
        </div>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-muted">{dictionary.methodology.intro}</p>
        <p className="mt-2 text-center text-xs text-muted">
          {dictionary.methodology.originCredit}{" "}
          <a
            className="font-semibold text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href={ORIGIN_PROJECT_URL}
            rel="noreferrer"
            target="_blank"
          >
            {dictionary.methodology.originCreditLinkLabel}
          </a>
        </p>

        <div className="mt-8 flex flex-col gap-5">
          <MethodologySection id="mission" title={dictionary.methodology.missionTitle}>
            {dictionary.methodology.missionBody.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </MethodologySection>

          <MethodologySection id="score" title={dictionary.methodology.scoreTitle}>
            <p>
              <strong>{dictionary.methodology.scoreLead}</strong>
            </p>
            <p>{dictionary.methodology.scoreBody}</p>
            <ul className="list-disc space-y-2 pl-5">
              {dictionary.methodology.scoreBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </MethodologySection>

          <MethodologySection id="fleet" title={dictionary.methodology.fleetTitle}>
            <p>
              <strong>{dictionary.methodology.fleetLead}</strong>
            </p>
            <p>{dictionary.methodology.fleetBody}</p>
            <p>
              <em>{dictionary.methodology.fleetCorrection}</em>
            </p>
          </MethodologySection>

          <details className="group scroll-mt-32 rounded-md border border-border bg-surface-raised p-4" id="limits">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
              <h2 className="text-lg font-semibold tracking-[-0.01em]">{dictionary.methodology.limitsTitle}</h2>
              <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-muted transition-transform duration-200 ease-out group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="mt-3 space-y-4 text-sm leading-6 text-muted">
              <p>{dictionary.methodology.limitsLead}</p>
              <ul className="list-disc space-y-2 pl-5">
                {dictionary.methodology.limitsBullets.map((item) => (
                  <li key={item}>{fillLimits(item)}</li>
                ))}
              </ul>
              <p>
                <em>{dictionary.methodology.limitsPrivacy}</em>
              </p>
            </div>
          </details>
        </div>
        <p className="mt-8 text-center text-xs text-muted">{dictionary.common.disclaimer}</p>
      </article>
    </main>
  );
}

function MethodologySection({ children, id, title }: { children: ReactNode; id: string; title: string }) {
  return (
    <section className="scroll-mt-32 rounded-md border border-border bg-surface-raised p-4" id={id}>
      <h2 className="text-lg font-semibold tracking-[-0.01em]">{title}</h2>
      <div className="mt-3 space-y-4 text-sm leading-6 text-muted">{children}</div>
    </section>
  );
}

