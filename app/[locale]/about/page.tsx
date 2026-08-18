import type { Metadata } from "next";
import Link from "next/link";
import { Heart, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { buttonStyles } from "@/components/ui/primitives";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; const safe: Locale = isLocale(locale) ? locale : "ru"; const d = getDictionary(safe); return { title: d.nav.about, description: d.about.lead };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params; const locale: Locale = isLocale(raw) ? raw : "ru"; const dictionary = getDictionary(locale);
  return (
    <>
      <section className="section"><div className="shell"><p className="section-kicker">{dictionary.about.eyebrow}</p><h1 className="section-title max-w-4xl">{dictionary.about.title}</h1><p className="section-lead text-xl">{dictionary.about.lead}</p></div></section>
      <section className="pb-20"><div className="shell grid gap-5 md:grid-cols-2"><article className="content-card bg-[var(--brand)] text-white"><Heart className="text-[var(--mint)]" size={38} /><h2 className="mt-8 font-[Georgia] text-4xl font-bold">{dictionary.about.missionTitle}</h2><p className="mt-4 text-lg text-white/80">{dictionary.about.missionText}</p></article><article className="content-card"><UsersRound className="text-[var(--brand)]" size={38} /><h2 className="mt-8 font-[Georgia] text-4xl font-bold">{dictionary.about.problemTitle}</h2><p className="mt-4 text-lg text-[var(--muted)]">{dictionary.about.problemText}</p></article></div></section>
      <section className="section bg-white"><div className="shell"><p className="section-kicker">{dictionary.about.valuesTitle}</p><h2 className="section-title">{dictionary.about.valuesTitle}</h2><div className="category-grid mt-10">{dictionary.about.values.map((value, index) => <article className="feature-card" key={value.title}><span className="category-icon">{index % 2 ? <ShieldCheck /> : <Sparkles />}</span><h3 className="mt-5 text-xl font-extrabold">{value.title}</h3><p className="mt-2 text-[var(--muted)]">{value.text}</p></article>)}</div></div></section>
      <section className="section" id="privacy"><div className="narrow text-center"><h2 className="section-title mx-auto">{dictionary.about.teamTitle}</h2><p className="section-lead mx-auto">{dictionary.about.teamText}</p><h3 className="mt-10 text-2xl font-extrabold">{dictionary.about.joinTitle}</h3><div className="mt-6 flex flex-wrap justify-center gap-3"><Link href={`/${locale}/auth/sign-up`} className={buttonStyles("primary")}>{dictionary.home.becomeVolunteer}</Link><Link href={`/${locale}/requests/new`} className={buttonStyles("secondary")}>{dictionary.home.getHelp}</Link></div></div></section>
    </>
  );
}
