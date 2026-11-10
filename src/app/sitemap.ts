import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n/config";
import { getMetadataBase } from "@/lib/metadata";
import { getPagePath, PAGE_PATHS, type PageKey } from "@/lib/page-metadata";

// /demo is left out on purpose: it shows seed data and is marked noindex.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getMetadataBase();
  return LOCALES.flatMap((lang) =>
    (Object.keys(PAGE_PATHS) as PageKey[]).map((page) => ({
      url: new URL(getPagePath(lang, page), base).toString(),
    })),
  );
}
