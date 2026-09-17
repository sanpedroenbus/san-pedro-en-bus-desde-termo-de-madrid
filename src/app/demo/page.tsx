import { HomePageContent } from "@/app/[lang]/page";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function DemoHomePage() {
  const dictionary = await getDictionary(DEFAULT_LOCALE);
  return <HomePageContent dictionary={dictionary} includeDemo lang={DEFAULT_LOCALE} />;
}
