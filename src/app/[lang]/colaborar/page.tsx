import { HandHeart } from "lucide-react";
import { notFound } from "next/navigation";
import { CollaborateForm } from "@/components/collaborate/collaborate-form";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function CollaboratePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dictionary = await getDictionary(lang);

  return (
    <main className="min-h-dvh">
      <section className="mx-auto max-w-xl px-4 pb-6 pt-6">
        <div className="flex items-center justify-center gap-2 text-center">
          <HandHeart aria-hidden="true" className="size-5 shrink-0 text-muted sm:size-6" />
          <h1 className="text-xl font-[650] tracking-[-0.015em] sm:text-2xl">{dictionary.collaborate.title}</h1>
        </div>
        <p className="mx-auto mt-3 max-w-md text-center text-sm leading-6 text-muted">{dictionary.collaborate.intro}</p>
        <div className="mt-6 rounded-md border border-border bg-surface-raised p-4">
          <CollaborateForm dictionary={dictionary} />
        </div>
        <p className="mt-8 text-center text-xs text-muted">{dictionary.common.disclaimer}</p>
      </section>
    </main>
  );
}
