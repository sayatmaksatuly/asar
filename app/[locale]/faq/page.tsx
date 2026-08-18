import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; const safe: Locale = isLocale(locale) ? locale : "ru"; const d = getDictionary(safe); return { title: d.nav.faq, description: d.faq.title };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params; const locale: Locale = isLocale(raw) ? raw : "ru"; const dictionary = getDictionary(locale);
  return <section className="section"><div className="narrow"><p className="section-kicker">{dictionary.faq.eyebrow}</p><h1 className="section-title">{dictionary.faq.title}</h1><div className="mt-10 grid gap-3">{dictionary.faq.items.map((item, index) => <details className="group rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-sm)]" key={item.q} open={index === 0}><summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-4 font-extrabold"><span>{item.q}</span><ChevronDown className="shrink-0 transition group-open:rotate-180" /></summary><p className="mt-4 border-t border-[var(--line)] pt-4 text-[var(--muted)]">{item.a}</p></details>)}</div></div></section>;
}
