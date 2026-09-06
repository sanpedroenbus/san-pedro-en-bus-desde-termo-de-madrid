import { MethodologyNavigation } from "@/components/methodology/methodology-navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";
import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";

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

          <MethodologySection id="confidence" title={dictionary.methodology.confidenceTitle}>
            <p>
              <strong>{dictionary.methodology.confidenceLead}</strong>
            </p>
            <p>{dictionary.methodology.confidenceBody}</p>
            
