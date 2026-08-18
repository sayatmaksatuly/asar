"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, HeartHandshake, Home, MapPin, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { Alert, buttonStyles } from "@/components/ui/primitives";
import type { Dictionary, Locale } from "@/lib/i18n";

const sceneIcons = [UsersRound, Home, MapPin, HeartHandshake];

export function OnboardingFlow({ locale, dictionary, initialStep = 0 }: { locale: Locale; dictionary: Dictionary; initialStep?: number }) {
  const router = useRouter();
  const [step, setStep] = useState(Math.max(0, Math.min(4, initialStep)));
  const [choice, setChoice] = useState<"requester" | "volunteer" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function move(next: number) {
    const safe = Math.max(0, Math.min(4, next));
    setStep(safe);
    await fetch("/api/onboarding/progress", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: safe }) }).catch(() => undefined);
  }

  async function complete() {
    if (!choice) return;
    setLoading(true); setError("");
    const response = await fetch("/api/onboarding/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: choice }) });
    if (response.ok) { router.replace(`/${locale}/dashboard`); router.refresh(); return; }
    setError(dictionary.auth.genericError); setLoading(false);
  }

  if (step < 4) {
    const item = dictionary.onboarding.slides[step];
    const Icon = sceneIcons[step];
    return <main className="onboarding-shell" id="main"><div className="onboarding-progress" aria-label={dictionary.onboarding.progress}>{dictionary.onboarding.slides.map((slide, index) => <span key={slide.title} className={index <= step ? "is-active" : ""}><span className="sr-only">{index + 1}</span></span>)}</div><section className={`onboarding-scene scene-${step + 1}`}><div className="onboarding-visual" aria-hidden="true"><span className="visual-orbit" /><span className="visual-main"><Icon /></span><span className="visual-chip chip-one"><Sparkles /></span><span className="visual-chip chip-two"><ShieldCheck /></span></div><div className="onboarding-copy"><span className="section-kicker">ASAR · {step + 1}/4</span><h1>{item.title}</h1><p>{item.text}</p><div className="onboarding-actions">{step > 0 ? <button type="button" className={buttonStyles("ghost")} onClick={() => void move(step - 1)}><ArrowLeft />{dictionary.common.back}</button> : <span />}<button type="button" className={buttonStyles("primary")} onClick={() => void move(step + 1)}>{step === 3 ? dictionary.onboarding.join : dictionary.onboarding.next}<ArrowRight /></button></div></div></section></main>;
  }

  return <main className="onboarding-shell" id="main"><section className="role-selection"><div className="role-selection-heading"><span className="section-kicker">{dictionary.onboarding.stepLabel}</span><h1>{dictionary.onboarding.chooseTitle}</h1><p>{dictionary.onboarding.chooseText}</p></div>{error ? <Alert tone="danger">{error}</Alert> : null}<div className="role-grid">{(["requester", "volunteer"] as const).map((role) => { const data = dictionary.onboarding.roles[role]; const Icon = role === "requester" ? Home : HeartHandshake; return <button key={role} type="button" className={`role-card ${choice === role ? "is-selected" : ""}`} aria-pressed={choice === role} onClick={() => setChoice(role)}><span className="role-illustration"><Icon /><span><Sparkles /></span></span><span className="role-card-copy"><strong>{data.title}</strong><span>{data.text}</span><span className="role-features">{data.features.map((feature) => <span key={feature}><Check />{feature}</span>)}</span></span><span className="role-select-label">{choice === role ? dictionary.onboarding.selected : data.button}</span></button>; })}</div><div className="role-confirm"><p><ShieldCheck />{choice ? dictionary.onboarding.confirmation[choice] : dictionary.onboarding.chooseHint}</p><div className="flex flex-wrap justify-between gap-3"><button type="button" className={buttonStyles("ghost")} onClick={() => void move(3)}><ArrowLeft />{dictionary.common.back}</button><button type="button" className={buttonStyles("primary")} disabled={!choice || loading} onClick={() => void complete()}>{loading ? dictionary.states.loading : dictionary.onboarding.confirm}<ArrowRight /></button></div></div></section></main>;
}
