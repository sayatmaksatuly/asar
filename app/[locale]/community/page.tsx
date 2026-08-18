import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HeartHandshake, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { CommunityEventCard } from "@/components/community/community-event-card";
import { CommunityImpact } from "@/components/community/community-impact";
import { buttonStyles } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getCommunitySnapshot } from "@/services/community";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const { locale } = await params; const safe: Locale = isLocale(locale) ? locale : "ru"; const d = getDictionary(safe); return { title: d.community.title, description: d.community.subtitle }; }

export default async function CommunityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params; const locale: Locale = isLocale(raw) ? raw : "ru"; const dictionary = getDictionary(locale); const snapshot = await getCommunitySnapshot(24);
  return <>
    <section className="community-hero"><div className="shell community-hero-grid"><div><span className="section-kicker">{dictionary.community.eyebrow}</span><h1>{dictionary.community.title}</h1><p>{dictionary.community.subtitle}</p><div className="mt-8 flex flex-wrap gap-3"><Link href={`/${locale}/requests`} className={buttonStyles("primary")}>{dictionary.community.findHelp}<ArrowRight /></Link><Link href={`/${locale}/auth/sign-up`} className={buttonStyles("secondary")}>{dictionary.community.join}</Link></div></div><div className="community-hero-art" aria-hidden="true"><span><UsersRound /></span><span><HeartHandshake /></span><span><Sparkles /></span></div></div></section>
    <section className="section impact-section"><div className="shell"><span className="section-kicker">{dictionary.impact.eyebrow}</span><h2 className="section-title">{dictionary.impact.title}</h2><p className="section-lead">{dictionary.impact.subtitle}</p><div className="mt-9"><CommunityImpact metrics={snapshot.impact} dictionary={dictionary} /></div></div></section>
    <section className="section bg-[var(--surface-soft)]"><div className="shell"><div className="section-heading-row"><div><span className="section-kicker">{dictionary.community.feedEyebrow}</span><h2 className="section-title">{dictionary.community.feedTitle}</h2><p className="section-lead">{dictionary.community.feedText}</p></div><span className="privacy-note"><ShieldCheck />{dictionary.community.privacy}</span></div>{snapshot.events.length ? <div className="community-feed mt-10">{snapshot.events.map((event) => <CommunityEventCard key={event.id} event={event} locale={locale} dictionary={dictionary} />)}</div> : <div className="mt-10"><EmptyState variant="community" title={dictionary.community.emptyTitle} text={snapshot.configured ? dictionary.community.emptyText : dictionary.community.connectText}><Link href={`/${locale}/requests`} className={buttonStyles("secondary")}>{dictionary.nav.requests}</Link></EmptyState></div>}</div></section>
  </>;
}
