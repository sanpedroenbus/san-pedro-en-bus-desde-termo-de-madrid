import { Suspense } from "react";
import { ExploreContent } from "@/app/[lang]/explorar/page";
import ExploreLoading from "@/app/[lang]/explorar/loading";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function DemoExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ ruta?: string; rango?: string; unidad?: string; problema?: string }>;
}) {
  const dictionary = await getDictionary(DEFAULT_LOCALE);

  return (
    <Suspense fallback={<ExploreLoading />}>
      <ExploreContent dictionary={dictionary} includeDemo lang={DEFAULT_LOCALE} searchParams={searchParams} />
    </Suspense>
  );
}
