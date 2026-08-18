import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { ErrorState } from "@/components/ui/states";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const { locale } = await params; const safe: Locale = isLocale(locale) ? locale : "ru"; return { title: getDictionary(safe).onboarding.title }; }

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params; const locale: Locale = isLocale(raw) ? raw : "ru"; const dictionary = getDictionary(locale); const supabase = await createSupabaseServerClient();
  if (!supabase) return <section className="section"><div className="shell"><ErrorState title={dictionary.states.notConfigured} text={dictionary.auth.notConfigured} /></div></section>;
  const { data: auth } = await supabase.auth.getUser(); if (!auth.user) redirect(`/${locale}/auth/sign-in?next=/${locale}/onboarding`);
  const { data: profile } = await supabase.from("profiles").select("role,onboarding_step,onboarding_completed_at").eq("id", auth.user.id).maybeSingle();
  if (profile?.onboarding_completed_at && profile.role) redirect(`/${locale}/dashboard`);
  return <OnboardingFlow locale={locale} dictionary={dictionary} initialStep={profile?.onboarding_step ?? 0} />;
}
