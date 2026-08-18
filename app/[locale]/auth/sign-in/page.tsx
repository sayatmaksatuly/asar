import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const { locale } = await params; const safe: Locale = isLocale(locale) ? locale : "ru"; return { title: getDictionary(safe).auth.signIn }; }
export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) { const { locale: raw } = await params; const locale: Locale = isLocale(raw) ? raw : "ru"; return <section className="section"><div className="shell"><AuthForm mode="sign-in" locale={locale} dictionary={getDictionary(locale)} /></div></section>; }
