import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { LangAttribute } from "@/components/shell/lang-attribute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServiceWorkerRegistration } from "@/components/shell/service-worker";
import { isLocale, LOCALES } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildPageMetadata } from "@/lib/page-metadata";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

// Home metadata; every subpage exports its own via buildPageMetadata, which
// replaces this one (including the canonical URL) for that page.
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return buildPageMetadata(lang, await getDictionary(lang), "home");
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dictionary = await getDictionary(lang);

  return (
    <TooltipProvider>
      <LangAttribute locale={lang} />
      <ServiceWorkerRegistration />
      <AppShell dictionary={dictionary} locale={lang}>
        {children}
      </AppShell>
    </TooltipProvider>
  );
}
