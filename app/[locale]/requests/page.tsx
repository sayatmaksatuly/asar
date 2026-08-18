import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { FilterPanel } from "@/components/filter-panel";
import { HelpRequestCard } from "@/components/help-request-card";
import { Pagination } from "@/components/pagination";
import { buttonStyles } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getCategories, getPublicRequests } from "@/services/requests";
import { getLocations } from "@/services/locations";
import type { AppLanguage, HelpFormat, UrgencyLevel } from "@/types/domain";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; const safe: Locale = isLocale(locale) ? locale : "ru"; const d = getDictionary(safe); return { title: d.nav.requests, description: d.requests.subtitle };
}

export default async function RequestsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale: raw } = await params; const locale: Locale = isLocale(raw) ? raw : "ru"; const dictionary = getDictionary(locale); const rawSearch = await searchParams;
  const values = Object.fromEntries(Object.entries(rawSearch).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
  const page = Math.max(1, Number(values.page ?? "1") || 1);
  const [categories, locations, result] = await Promise.all([getCategories(), getLocations(), getPublicRequests({ search: values.q, category: values.category, cityId: Number(values.city_id) || undefined, districtId: Number(values.district_id) || undefined, urgency: values.urgency as UrgencyLevel | undefined, date: values.date, format: values.format as HelpFormat | undefined, language: values.language as AppLanguage | undefined, page })]);
  const pages = Math.max(1, Math.ceil(result.count / 9));
  return (
    <section className="section">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="section-kicker">{dictionary.requests.eyebrow}</p><h1 className="section-title">{dictionary.requests.title}</h1><p className="section-lead">{dictionary.requests.subtitle}</p></div><Link href={`/${locale}/requests/new`} className={buttonStyles("primary")}><Plus size={19} />{dictionary.requests.new}</Link></div>
        <div className="mt-10 grid gap-7 lg:grid-cols-[290px_1fr]">
          <div><FilterPanel locale={locale} dictionary={dictionary} categories={categories.data} cities={locations.cities} districts={locations.districts} values={values} /></div>
          <div>
            <p className="mb-5 font-bold text-[var(--muted)]">{dictionary.requests.found}: {result.count}</p>
            {result.error ? <ErrorState title={dictionary.states.error} text={dictionary.states.offline} /> : null}
            {!result.error && result.data.length ? <div className="grid gap-5 xl:grid-cols-2">{result.data.map((request) => <HelpRequestCard key={request.id} request={request} locale={locale} dictionary={dictionary} />)}</div> : null}
            {!result.error && !result.data.length ? <EmptyState title={dictionary.requests.emptyTitle} text={result.configured ? dictionary.requests.emptyText : dictionary.requests.configuredEmpty} /> : null}
            <Pagination current={page} total={pages} pathname={`/${locale}/requests`} searchParams={values} dictionary={dictionary} />
          </div>
        </div>
      </div>
    </section>
  );
}
