import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { ErrorState } from "@/components/ui/states";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; const safe: Locale = isLocale(locale) ? locale : "ru";
  return { title: getDictionary(safe).admin.analytics, robots: { index: false, follow: false } };
}

type Metrics = {
  requests_published?: number; response_rate_percent?: number; avg_time_to_first_response_seconds?: number | null;
  assignments_created?: number; completion_rate_percent?: number; funnel?: Record<string,{events:number;actors:number}>;
  retention?: { d1_percent?: number|null; d7_percent?: number|null; d30_percent?: number|null; requester_repeat_users?: number; volunteer_repeat_users?: number };
};

export default async function AdminAnalyticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params; const locale: Locale = isLocale(raw) ? raw : "ru"; const dictionary = getDictionary(locale);
  const supabase = await createSupabaseServerClient(); if (!supabase) return <section className="section"><div className="shell"><ErrorState title={dictionary.states.notConfigured}/></div></section>;
  const { data: auth } = await supabase.auth.getUser(); if (!auth.user) redirect(`/${locale}/auth/sign-in?next=/${locale}/admin/analytics`);
  const [{ data: profile }, { data: aal }] = await Promise.all([supabase.from("profiles").select("role").eq("id",auth.user.id).maybeSingle(),supabase.auth.mfa.getAuthenticatorAssuranceLevel()]);
  if (profile?.role !== "admin") return <section className="section"><div className="shell"><ErrorState title={dictionary.admin.accessDenied}/></div></section>;
  if (aal?.currentLevel !== "aal2") redirect(`/${locale}/admin/mfa`);
  const { data, error } = await supabase.rpc("admin_get_product_metrics", {});
  if (error) return <section className="section"><div className="shell"><ErrorState title={dictionary.states.error}/></div></section>;
  const metrics = (data ?? {}) as Metrics;
  const cards = [
    [dictionary.admin.requestsPublished, metrics.requests_published ?? 0],
    [dictionary.admin.responseRate, `${metrics.response_rate_percent ?? 0}%`],
    [dictionary.admin.assignmentsCreated, metrics.assignments_created ?? 0],
    [dictionary.admin.completionRate, `${metrics.completion_rate_percent ?? 0}%`],
    [dictionary.admin.timeToFirstResponse, metrics.avg_time_to_first_response_seconds == null ? "—" : `${metrics.avg_time_to_first_response_seconds} ${dictionary.admin.seconds}`],
  ] as const;
  return <section className="section"><div className="shell"><AdminNav locale={locale} dictionary={dictionary}/><p className="section-kicker mt-8">ASAR</p><h1 className="section-title">{dictionary.admin.analytics}</h1><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label,value])=><article className="content-card" key={label}><span className="text-sm text-[var(--muted)]">{label}</span><strong className="mt-3 block text-3xl">{value}</strong></article>)}</div><div className="mt-8 grid gap-6 lg:grid-cols-2"><article className="content-card"><h2 className="text-2xl font-extrabold">{dictionary.admin.retention}</h2><dl className="mt-5 grid gap-3"><div className="flex justify-between"><dt>D1</dt><dd>{metrics.retention?.d1_percent == null ? "—" : `${metrics.retention.d1_percent}%`}</dd></div><div className="flex justify-between"><dt>D7</dt><dd>{metrics.retention?.d7_percent == null ? "—" : `${metrics.retention.d7_percent}%`}</dd></div><div className="flex justify-between"><dt>D30</dt><dd>{metrics.retention?.d30_percent == null ? "—" : `${metrics.retention.d30_percent}%`}</dd></div></dl></article><article className="content-card"><h2 className="text-2xl font-extrabold">{dictionary.admin.funnel}</h2><div className="mt-5 overflow-x-auto"><table className="data-table"><thead><tr><th>{dictionary.admin.action}</th><th>{dictionary.admin.events}</th><th>{dictionary.admin.actors}</th></tr></thead><tbody>{Object.entries(metrics.funnel ?? {}).map(([event,row])=><tr key={event}><td>{event}</td><td>{row.events}</td><td>{row.actors}</td></tr>)}</tbody></table></div></article></div></div></section>;
}
