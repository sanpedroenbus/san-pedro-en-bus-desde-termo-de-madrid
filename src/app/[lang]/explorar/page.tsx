import { Suspense } from "react";
import { CategoriesChartCard, ProblemsChartCard, RouteVolumeChartCard, TrendChartCard, UnitsExplorerChartCards } from "@/components/charts/dashboard-charts";
import { RouteDetailCards } from "@/components/charts/explore-detail-panels";
import { FilterBar } from "@/components/charts/filter-bar";
import { ExploreActionIcon } from "@/components/ui/action-icons";
import { getCachedExplorePageData, normalizeDashboardCacheKey } from "@/lib/server/dashboard-cache";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/config";
import { parseDashboardRange, parseSelectedRoutes } from "@/lib/domain/dashboard-query";
import { normalizeUnitCode } from "@/lib/domain/reports";
import { notFound } from "next/navigation";
import ExploreLoading from "./loading";

export default async function ExplorePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ ruta?: string; rango?: string; unidad?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dictionary = await getDictionary(lang);

  return (
    <Suspense fallback={<ExploreLoading />}>
      <ExploreContent dictionary={dictionary} includeDemo={false} lang={lang} searchParams={searchParams} />
    </Suspense>
  );
}

// Exported so /demo can render the exact same dashboard with includeDemo set,
// instead of duplicating this page's logic.
export async function ExploreContent({
  dictionary,
  lang,
  searchParams,
  includeDemo,
}: {
  dictionary: Awaited<ReturnType<typeof getDictionary>>;
  lang: "es";
  searchParams: Promise<{ ruta?: string; rango?: string; unidad?: string }>;
  includeDemo: boolean;
}) {
  const search = await searchParams;
  const selectedRange = parseDashboardRange(search.rango);
  const selectedRoutes = parseSelectedRoutes(search.ruta);
  const selectedUnit = search.unidad ? normalizeUnitCode(search.unidad) : null;
  const rangeLabel = dictionary.explore.ranges[selectedRange];
  const cacheKey = normalizeDashboardCacheKey({ range: selectedRange, routes: selectedRoutes });
  const data = await getCachedExplorePageData(cacheKey.rangeKey, cacheKey.routesKey, includeDemo);

  return (
    <main className="min-h-dvh">
      <div className="mx-auto max-w-3xl px-4 pb-5">
        <FilterBar demoMode={includeDemo} dictionary={dictionary} locale={lang} selectedRoutes={selectedRoutes} selectedRange={selectedRange} />

        <section className="py-6">
          <div className="flex items-center justify-center gap-2">
            <ExploreActionIcon className="h-6 w-8" />
            <h1 className="text-center text-2xl font-[650] tracking-[-0.015em]">{dictionary.explore.title}</h1>
          </div>
          <p className="mx-auto mt-1 max-w-md text-center text-sm text-muted">{dictionary.explore.subtitle}</p>
        </section>

        <div className="flex flex-col gap-4">
          <RouteVolumeChartCard data={data} dictionary={dictionary} locale={lang} rangeLabel={rangeLabel} selectedRoutes={selectedRoutes} />
          <ProblemsChartCard data={data} dictionary={dictionary} locale={lang} rangeLabel={rangeLabel} />
          <CategoriesChartCard data={data} dictionary={dictionary} locale={lang} rangeLabel={rangeLabel} />
          <TrendChartCard data={data} dictionary={dictionary} locale={lang} rangeLabel={rangeLabel} selectedRange={selectedRange} />
          <UnitsExplorerChartCards
            data={data}
            dictionary={dictionary}
            includeDemo={includeDemo}
            initialUnit={selectedUnit}
            routes={selectedRoutes}
            locale={lang}
            rangeLabel={rangeLabel}
            selectedRange={selectedRange}
          />
        </div>

        <RouteDetailCards
          cards={data.routeSummaries}
          dictionary={dictionary}
          includeDemo={includeDemo}
          locale={lang}
          selectedRange={selectedRange}
          selectedRoutes={selectedRoutes}
        />
      </div>
    </main>
  );
}
