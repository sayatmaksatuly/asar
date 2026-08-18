import { AuthForm } from "@/components/auth-form";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) { const { locale: raw } = await params; const locale: Locale = isLocale(raw) ? raw : "ru"; return <section className="section"><div className="shell"><AuthForm mode="forgot-password" locale={locale} dictionary={getDictionary(locale)} /></div></section>; }
