import { MethodologyNavigation } from "@/components/methodology/methodology-navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";
import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";

const ORIGIN_PROJECT_URL = "https://github.com/nachoggodino/termometro";

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

