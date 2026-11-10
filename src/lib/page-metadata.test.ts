import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildPageMetadata, PAGE_PATHS, type PageKey } from "./page-metadata";

const pages = Object.keys(PAGE_PATHS) as PageKey[];

describe("buildPageMetadata", () => {
  it("gives every page its own canonical URL, never the home page's", async () => {
    const dictionary = await getDictionary("es");
    const canonicals = pages.map((page) => buildPageMetadata("es", dictionary, page).alternates?.canonical);
    expect(canonicals).toEqual(["/es", "/es/reportar", "/es/explorar", "/es/horarios", "/es/metodologia", "/es/colaborar"]);
  });

  it("gives every page a distinct title and description", async () => {
    const dictionary = await getDictionary("es");
    const metadata = pages.map((page) => buildPageMetadata("es", dictionary, page));
    expect(new Set(metadata.map((m) => m.title)).size).toBe(pages.length);
    expect(new Set(metadata.map((m) => m.description)).size).toBe(pages.length);
  });

  it("suffixes subpage titles with the app name and keeps the home title as-is", async () => {
    const dictionary = await getDictionary("es");
    expect(buildPageMetadata("es", dictionary, "home").title).toBe(dictionary.meta.pages.home.title);
    expect(buildPageMetadata("es", dictionary, "schedules").title).toBe("Horarios y reglas de los buses de San Pedro · San Pedro en Bus");
  });

  it("only lists hreflang alternates for locales that exist", async () => {
    const dictionary = await getDictionary("es");
    expect(buildPageMetadata("es", dictionary, "explore").alternates?.languages).toEqual({ es: "/es/explorar" });
  });

  it("keeps the established share copy on home and page copy elsewhere, always with the share image", async () => {
    const dictionary = await getDictionary("es");
    const home = buildPageMetadata("es", dictionary, "home");
    const report = buildPageMetadata("es", dictionary, "report");
    expect(home.openGraph?.title).toBe(dictionary.meta.socialTitle);
    expect(report.openGraph?.title).toBe(report.title);
    expect(report.openGraph?.url).toBe("/es/reportar");
    expect(report.openGraph?.images).toEqual([expect.objectContaining({ url: "/api/og?lang=es" })]);
  });
});
