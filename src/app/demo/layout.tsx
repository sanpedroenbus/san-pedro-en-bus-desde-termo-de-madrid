import { AppShell } from "@/components/shell/app-shell";
import { LangAttribute } from "@/components/shell/lang-attribute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServiceWorkerRegistration } from "@/components/shell/service-worker";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

// Mirrors src/app/[lang]/layout.tsx's shell wrapping, hardcoded to the one
// live locale -- /demo sits outside the [lang] segment (it needs a stable
// root path, not /es/demo), so it doesn't inherit that layout automatically.
export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  const dictionary = await getDictionary(DEFAULT_LOCALE);

  return (
    <TooltipProvider>
      <LangAttribute locale={DEFAULT_LOCALE} />
      <ServiceWorkerRegistration />
      <AppShell dictionary={dictionary} locale={DEFAULT_LOCALE}>
        {children}
      </AppShell>
    </TooltipProvider>
  );
}
