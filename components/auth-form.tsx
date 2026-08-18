"use client";

import Link from "next/link";
import Script from "next/script";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, HandHeart, UserRound } from "lucide-react";
import { Alert, Checkbox, Input, buttonStyles } from "@/components/ui/primitives";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Dictionary, Locale } from "@/lib/i18n";

type Mode = "sign-in" | "sign-up" | "forgot-password" | "update-password";
const LEGAL_VERSION = "2026-08-08";

export function AuthForm({ mode, locale, dictionary }: { mode: Mode; locale: Locale; dictionary: Dictionary }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const title = mode === "sign-in" ? dictionary.auth.signInTitle : mode === "sign-up" ? dictionary.auth.signUpTitle : mode === "forgot-password" ? dictionary.auth.forgotTitle : dictionary.auth.updateTitle;
  const intro = mode === "sign-in" ? dictionary.auth.signInText : mode === "sign-up" ? dictionary.auth.signUpText : mode === "forgot-password" ? dictionary.auth.forgotText : dictionary.auth.passwordHint;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setMessage({ tone: "danger", text: dictionary.auth.notConfigured }); return; }
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setLoading(true);

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(`/${locale}/dashboard`); router.refresh();
      } else if (mode === "sign-up") {
        const acceptedTerms = form.get("accept_terms") === "on";
        const acceptedPrivacy = form.get("accept_privacy") === "on";
        const ageConfirmed = form.get("age_consent") === "on";
        if (!acceptedTerms || !acceptedPrivacy || !ageConfirmed) {
          setMessage({ tone: "danger", text: dictionary.auth.consentRequired });
          return;
        }
        const fullName = String(form.get("full_name") ?? "").trim();
        const captchaToken = String(form.get("cf-turnstile-response") ?? "").trim() || undefined;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/${locale}/auth/callback?next=/${locale}/onboarding`,
            captchaToken,
            data: {
              full_name: fullName,
              preferred_language: locale,
              accepted_terms_version: LEGAL_VERSION,
              accepted_privacy_version: LEGAL_VERSION,
              age_confirmed_18: true,
            },
          },
        });
        if (error) throw error;
        if (data.session) { router.push(`/${locale}/onboarding`); router.refresh(); }
        else setMessage({ tone: "success", text: dictionary.auth.checkEmail });
      } else if (mode === "forgot-password") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/${locale}/auth/callback?next=/${locale}/auth/update-password` });
        if (error) throw error;
        setMessage({ tone: "success", text: dictionary.auth.resetSent });
      } else {
        if (password.length < 8) throw new Error("weak_password");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage({ tone: "success", text: dictionary.auth.updated });
        setTimeout(() => router.push(`/${locale}/dashboard`), 900);
      }
    } catch {
      setMessage({ tone: "danger", text: dictionary.auth.genericError });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content-card mx-auto max-w-xl">
      {mode === "sign-up" && turnstileSiteKey ? <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" /> : null}
      <span className="category-icon">{mode === "sign-up" ? <HandHeart /> : <UserRound />}</span>
      <h1 className="mt-6 font-[Georgia] text-4xl font-bold leading-tight">{title}</h1>
      <p className="mt-3 text-[var(--muted)]">{intro}</p>
      <form className="mt-8 grid gap-5" onSubmit={(event) => void submit(event)}>
        {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
        {mode === "sign-up" ? <label className="field-label"><span>{dictionary.auth.fullName}</span><Input name="full_name" autoComplete="name" minLength={2} maxLength={100} required /></label> : null}
        {mode !== "update-password" ? <label className="field-label"><span>{dictionary.auth.email}</span><Input name="email" type="email" autoComplete="email" required /></label> : null}
        {mode !== "forgot-password" ? <label className="field-label"><span>{dictionary.auth.password}</span><div className="relative"><Input name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={8} required /><button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-[var(--muted)]" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={dictionary.auth.password}>{showPassword ? <EyeOff /> : <Eye />}</button></div><small className="font-normal text-[var(--muted)]">{dictionary.auth.passwordHint}</small></label> : null}
        {mode === "sign-up" ? <fieldset className="privacy-fieldset"><legend>{dictionary.legal.termsTitle}</legend><Checkbox name="age_consent" required label={dictionary.auth.ageConsent} /><Checkbox name="accept_terms" required label={dictionary.auth.acceptTerms} /><Link className="text-sm font-bold text-[var(--brand-strong)] underline" target="_blank" href={`/${locale}/terms`}>{dictionary.legal.termsTitle} ↗</Link><Checkbox name="accept_privacy" required label={dictionary.auth.acceptPrivacy} /><Link className="text-sm font-bold text-[var(--brand-strong)] underline" target="_blank" href={`/${locale}/privacy`}>{dictionary.legal.privacyTitle} ↗</Link></fieldset> : null}
        {mode === "sign-up" && turnstileSiteKey ? <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="auto" /> : null}
        <button className={buttonStyles("primary")} disabled={loading} type="submit">{loading ? dictionary.states.loading : mode === "sign-in" ? dictionary.auth.signIn : mode === "sign-up" ? dictionary.auth.signUp : mode === "forgot-password" ? dictionary.auth.sendReset : dictionary.auth.updatePassword}</button>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm font-bold text-[var(--brand-strong)]">
        {mode === "sign-in" ? <><Link href={`/${locale}/auth/forgot-password`}>{dictionary.auth.forgot}</Link><Link href={`/${locale}/auth/sign-up`}>{dictionary.auth.noAccount} {dictionary.auth.signUp}</Link></> : null}
        {mode === "sign-up" ? <Link href={`/${locale}/auth/sign-in`}>{dictionary.auth.haveAccount} {dictionary.auth.signIn}</Link> : null}
        {mode === "forgot-password" ? <Link href={`/${locale}/auth/sign-in`}>{dictionary.common.back}</Link> : null}
      </div>
    </div>
  );
}

export function SignOutButton({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  async function signOut() { const supabase = createSupabaseBrowserClient(); await supabase?.auth.signOut(); router.push(`/${locale}`); router.refresh(); }
  return <button type="button" className={buttonStyles("secondary")} onClick={() => void signOut()}>{label}</button>;
}
