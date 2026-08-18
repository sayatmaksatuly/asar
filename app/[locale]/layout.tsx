import { notFound } from "next/navigation";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Alert } from "@/components/ui/primitives";
import { getDictionary, isLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LocaleDocumentLanguage } from "@/components/locale-document-language";
import { StructuredData } from "@/components/structured-data";

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const dictionary = getDictionary(rawLocale);
  const supabase = await createSupabaseServerClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <div lang={rawLocale}>
      <LocaleDocumentLanguage locale={rawLocale} />
      <StructuredData locale={rawLocale} />
      <Navbar locale={rawLocale} dictionary={dictionary} signedIn={Boolean(data.user)} />
      <main id="main">{children}</main>
      <div className="shell mt-16" id="safety"><Alert tone="warning" title={dictionary.safety.title}>{dictionary.safety.warning}</Alert></div>
      <Footer locale={rawLocale} dictionary={dictionary} />
    </div>
  );
}
