import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RequestForm } from "@/components/request-form";
import { ErrorState } from "@/components/ui/states";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCategories } from "@/services/requests";
import { getLocations } from "@/services/locations";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const { locale } = await params; const safe: Locale = isLocale(locale) ? locale : "ru"; const d = getDictionary(safe); return { title: d.requests.new }; }

export default async function NewRequestPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params; const locale: Locale = isLocale(raw) ? raw : "ru"; const dictionary = getDictionary(locale); const supabase = await createSupabaseServerClient();
  let initialDraft = null;
  if (supabase) { const { data } = await supabase.auth.getUser(); if (!data.user) redirect(`/${locale}/auth/sign-in?next=/${locale}/requests/new`); const { data: profile } = await supabase.from("profiles").select("role,onboarding_completed_at,can_request").eq("id", data.user.id).maybeSingle(); if (!profile?.role || !profile.onboarding_completed_at) redirect(`/${locale}/onboarding`); if (!profile.can_request && profile.role !== "admin") redirect(`/${locale}/dashboard`); const { data: draft } = await supabase.from("request_drafts").select("id,current_step,payload").eq("author_id", data.user.id).is("request_id", null).order("updated_at", { ascending: false }).limit(1).maybeSingle(); initialDraft = draft ? { ...draft, payload: (draft.payload ?? {}) as Record<string, unknown> } : null; }
  const [categories, locations] = await Promise.all([getCategories(), getLocations()]);
  return <section className="section"><div className="wizard-container"><p className="section-kicker">{dictionary.createRequest.eyebrow}</p><h1 className="section-title">{dictionary.createRequest.title}</h1><p className="section-lead">{dictionary.createRequest.subtitle}</p><div className="mt-10 content-card wizard-card">{categories.configured ? <RequestForm locale={locale} dictionary={dictionary} categories={categories.data} cities={locations.cities} districts={locations.districts} configured={locations.configured} initialDraft={initialDraft} /> : <ErrorState title={dictionary.states.notConfigured} text={dictionary.auth.notConfigured} />}</div></div></section>;
}
