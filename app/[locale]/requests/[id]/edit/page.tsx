import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RequestForm, type RequestFormInitial } from "@/components/request-form";
import { ErrorState } from "@/components/ui/states";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCategories } from "@/services/requests";
import { getLocations } from "@/services/locations";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const safe: Locale = isLocale(locale) ? locale : "ru";
  return { title: getDictionary(safe).dashboard.editRequest };
}

export default async function EditRequestPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params;
  const locale: Locale = isLocale(raw) ? raw : "ru";
  const dictionary = getDictionary(locale);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <section className="section"><div className="shell"><ErrorState title={dictionary.states.notConfigured} text={dictionary.auth.notConfigured} /></div></section>;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/auth/sign-in?next=/${locale}/requests/${id}/edit`);

  const [requestResult, privateResult, categoriesResult, locations] = await Promise.all([
    supabase.from("help_requests").select("id,title,description,content_language,category_id,city,district,city_id,district_id,desired_date,time_from,time_to,urgency,help_format,status,image_url,special_conditions,reward_type,reward_note,reward_points").eq("id", id).maybeSingle(),
    supabase.from("request_private_details").select("address,location_notes,preferred_contact_method,contact_value,volunteer_instructions").eq("request_id", id).maybeSingle(),
    getCategories(),
    getLocations(),
  ]);

  const item = requestResult.data;
  if (!item || !privateResult.data || !["draft", "open"].includes(item.status)) return <section className="section"><div className="shell"><ErrorState title={dictionary.requestDetail.notFound} /></div></section>;
  const initial: RequestFormInitial = { ...item, ...privateResult.data, status: item.status as "draft" | "open" };

  return <section className="section"><div className="wizard-container"><p className="section-kicker">{dictionary.dashboard.myRequests}</p><h1 className="section-title">{dictionary.dashboard.editRequest}</h1><div className="content-card wizard-card mt-8"><RequestForm locale={locale} dictionary={dictionary} categories={categoriesResult.data} cities={locations.cities} districts={locations.districts} configured={categoriesResult.configured && locations.configured} initial={initial} /></div></div></section>;
}
