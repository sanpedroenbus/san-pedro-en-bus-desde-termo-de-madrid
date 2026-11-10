import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { LangAttribute } from "@/components/shell/lang-attribute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServiceWorkerRegistration } from "@/components/shell/service-worker";
import { isLocale, LOCALES } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getMetadataBase } from "@/lib/metadata";
import { buildPageMetadata, getPagePath } from "@/lib/page-metadata";
import { SOCIAL_PROFILE_URLS } from "@/lib/social";

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
  const siteUrl = new URL(getPagePath(lang, "home"), getMetadataBase()).toString();
  // Ties the site to its social profiles for search engines (Organization.sameAs).
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: dictionary.common.appName,
        url: siteUrl,
        logo: new URL("/icon-192x192.png", getMetadataBase()).toString(),
        sameAs: SOCIAL_PROFILE_URLS,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        name: dictionary.common.appName,
        url: siteUrl,
        inLanguage: lang,
        publisher: { "@id": `${siteUrl}#organization` },
      },
    ],
  };

  return (
    <TooltipProvider>
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped can't break out of the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <LangAttribute locale={lang} />
      <ServiceWorkerRegistration />
      <AppShell dictionary={dictionary} locale={lang}>
        {children}
      </AppShell>
    </TooltipProvider>
  );
}
