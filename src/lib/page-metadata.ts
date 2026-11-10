import type { Metadata } from "next";
import { SOCIAL_IMAGE_TOKENS } from "@/lib/design/tokens";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Public, indexable pages and their path after the /{lang} prefix. Slugs are
// stable (AGENTS.md); this is the single list the sitemap and metadata use.
export const PAGE_PATHS = {
  home: "",
  report: "/reportar",
  explore: "/explorar",
  schedules: "/horarios",
  methodology: "/metodologia",
  collaborate: "/colaborar",
} as const;

export type PageKey = keyof typeof PAGE_PATHS;

export function getPagePath(lang: Locale, page: PageKey) {
  return `/${lang}${PAGE_PATHS[page]}`;
}

const SOCIAL_LOCALES: Record<Locale, string> = { es: "es_ES" };

// Full metadata for one page. Next merges metadata shallowly, so a page that
// sets openGraph replaces the layout's openGraph entirely -- this always builds
// the complete object (title, url and image) rather than a partial override.
export function buildPageMetadata(lang: Locale, dictionary: Dictionary, page: PageKey): Metadata {
  const copy = dictionary.meta.pages[page];
  const title = page === "home" ? copy.title : `${copy.title} · ${dictionary.common.appName}`;
  const path = getPagePath(lang, page);
  const socialImagePath = `/api/og?lang=${lang}`;
  const images = [{ url: socialImagePath, alt: dictionary.meta.socialImageAlt }];
  // The home link is what gets shared most; keep its established share copy.
  const socialTitle = page === "home" ? dictionary.meta.socialTitle : title;
  const socialDescription = page === "home" ? dictionary.meta.socialDescription : copy.description;

  return {
    title,
    description: copy.description,
    alternates: {
      canonical: path,
      languages: Object.fromEntries(LOCALES.map((locale) => [locale, getPagePath(locale, page)])),
    },
    openGraph: {
      title: socialTitle,
      description: socialDescription,
      url: path,
      siteName: dictionary.common.appName,
      images: images.map((image) => ({ ...image, width: SOCIAL_IMAGE_TOKENS.width, height: SOCIAL_IMAGE_TOKENS.height })),
      locale: SOCIAL_LOCALES[lang],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: socialDescription,
      images,
    },
  };
}
