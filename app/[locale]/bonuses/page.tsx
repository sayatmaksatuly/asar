import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Award, Gift, Sparkles, Star } from "lucide-react";
import { Alert, Badge } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; const safe: Locale = isLocale(locale) ? locale : "ru";
  return { title: getDictionary(safe).reputation.title, robots: { index: false, follow: false } };
}

export default async function BonusesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params; const locale: Locale = isLocale(raw) ? raw : "ru"; const dictionary = getDictionary(locale);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/auth/sign-in?next=/${locale}/bonuses`);
  const [profileResult, historyResult] = await Promise.all([
    supabase.from("profiles").select("can_volunteer,reputation_points,reputation_level").eq("id", auth.user.id).single(),
    supabase.from("reputation_ledger").select("id,points,reason,created_at").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(30),
  ]);
  const profile = profileResult.data;
  const transactions = historyResult.data ?? [];

  return <section className="section"><div className="shell">
    <p className="section-kicker">{dictionary.bonus.eyebrow}</p><h1 className="section-title">{dictionary.bonus.title}</h1><p className="section-lead">{dictionary.bonus.subtitle}</p>
    {!profile?.can_volunteer ? <div className="mt-8"><Alert tone="info">{dictionary.requestDetail.volunteerCapabilityRequired}</Alert></div> : null}
    <div className="mt-10 grid gap-5 lg:grid-cols-3">
      <article className="content-card bg-[var(--brand)] text-white"><Award className="text-[var(--mint)]" size={42} /><span className="mt-8 block text-white/70">{dictionary.reputation.title}</span><strong className="mt-2 block font-[Georgia] text-6xl">{profile?.reputation_points ?? 0}</strong><span>{dictionary.reputation.points}</span></article>
      <article className="content-card"><Star className="text-[var(--sun)]" /><h2 className="mt-6 text-2xl font-extrabold">{dictionary.bonus.rules}</h2><ul className="mt-4 grid gap-3">{dictionary.bonus.ruleItems.map((item) => <li className="flex gap-2" key={item}><Sparkles className="mt-1 shrink-0 text-[var(--brand)]" size={17} />{item}</li>)}</ul></article>
      <article className="content-card"><Gift className="text-[var(--brand)]" /><h2 className="mt-6 text-2xl font-extrabold">{dictionary.bonus.levels}</h2><ul className="mt-4 grid gap-3">{dictionary.bonus.levelItems.map((item) => <li key={item}><Badge tone="brand">{item}</Badge></li>)}</ul><Alert tone="info">{dictionary.bonus.future}</Alert></article>
    </div>
    <div className="mt-8 content-card overflow-x-auto">{transactions.length ? <table className="data-table"><thead><tr><th>{dictionary.admin.action}</th><th>{dictionary.reputation.points}</th><th>{dictionary.requests.date}</th></tr></thead><tbody>{transactions.map((item) => <tr key={item.id}><td>{item.reason}</td><td className="font-bold">{item.points > 0 ? `+${item.points}` : String(item.points)}</td><td>{new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "kk-KZ").format(new Date(item.created_at))}</td></tr>)}</tbody></table> : <EmptyState title={dictionary.states.empty} />}</div>
  </div></section>;
}
