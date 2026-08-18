"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Gift, ImagePlus, MapPin, Save, Send, Sparkles, Tag, TextQuote } from "lucide-react";
import { Alert, Checkbox, Input, Select, Textarea, buttonStyles } from "@/components/ui/primitives";
import { Stepper } from "@/components/ui/progress";
import { ImageUpload } from "@/components/image-upload";
import type { Dictionary, Locale } from "@/lib/i18n";
import { localizedApiError } from "@/lib/client-errors";
import type { Category, CityOption, DistrictOption } from "@/types/domain";

export interface RequestFormInitial {
  id: string; title: string; description: string; content_language: "ru" | "kk"; category_id: string; city: string; district: string; city_id?: number | null; district_id?: number | null; address: string; location_notes: string | null; desired_date: string | null; time_from: string | null; time_to: string | null; urgency: string; help_format: string; image_url: string | null; special_conditions: string | null; preferred_contact_method: string | null; contact_value?: string | null; volunteer_instructions?: string | null; reward_type?: string; reward_note?: string | null; reward_points?: number | null; status: "draft" | "open";
}

export interface RequestDraftInitial { id: string; current_step: number; payload: Record<string, unknown> }

const stepIcons = [Tag, TextQuote, MapPin, ImagePlus, Gift, CheckCircle2, Send];

export function RequestForm({ locale, dictionary, categories, cities, districts, configured, initial, initialDraft }: { locale: Locale; dictionary: Dictionary; categories: Category[]; cities: CityOption[]; districts: DistrictOption[]; configured: boolean; initial?: RequestFormInitial; initialDraft?: RequestDraftInitial | null }) {
  const router = useRouter(); const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(initial ? 1 : Math.max(1, Math.min(7, initialDraft?.current_step ?? 1)));
  const [draftId, setDraftId] = useState(initialDraft?.id ?? "");
  const [preview, setPreview] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ tone: "success" | "danger" | "info"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const draftPayload = initialDraft?.payload ?? {};
  const initialCityId = Number(initial?.city_id ?? draftPayload.city_id ?? 0) || 0;
  const initialDistrictId = Number(initial?.district_id ?? draftPayload.district_id ?? 0) || 0;
  const [selectedCityId, setSelectedCityId] = useState(initialCityId);
  const [selectedDistrictId, setSelectedDistrictId] = useState(initialDistrictId);
  const selectedCity = cities.find((item) => item.id === selectedCityId);
  const visibleDistricts = districts.filter((item) => item.city_id === selectedCityId);
  const selectedDistrict = visibleDistricts.find((item) => item.id === selectedDistrictId);
  const value = (name: string, fallback: string | number | null | undefined = "") => String(draftPayload[name] ?? fallback ?? "");

  function snapshot(): Record<string, string> {
    if (!formRef.current) return {};
    const data = Object.fromEntries([...new FormData(formRef.current).entries()].filter(([, item]) => typeof item === "string")) as Record<string, string>;
    data.safety_consent = String(Boolean(formRef.current.elements.namedItem("safety_consent") && (formRef.current.elements.namedItem("safety_consent") as HTMLInputElement).checked));
    return data;
  }

  function validateCurrent() {
    const panel = formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    const fields = panel?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select") ?? [];
    for (const field of fields) if (!field.checkValidity()) { field.reportValidity(); return false; }
    return true;
  }

  async function saveDraft(nextStep = step, announce = false) {
    if (initial || !configured) return;
    const response = await fetch("/api/request-drafts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: draftId || null, step: nextStep, payload: snapshot() }) });
    const result = await response.json().catch(() => ({})) as { id?: string };
    if (response.ok && result.id) { setDraftId(result.id); if (announce) setNotice({ tone: "success", text: dictionary.wizard.draftSaved }); }
    else if (announce) setNotice({ tone: "danger", text: dictionary.wizard.draftError });
  }

  async function next() {
    if (!validateCurrent()) { setNotice({ tone: "danger", text: dictionary.createRequest.validation }); return; }
    const nextStep = Math.min(7, step + 1); setNotice(null); setPreview(snapshot()); setStep(nextStep); await saveDraft(nextStep);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(".request-wizard-title")?.focus());
  }

  async function publish() {
    if (!validateCurrent() || !formRef.current) return;
    setLoading(true); setNotice(null); const payload: Record<string, string | boolean> = snapshot();
    payload.status = "open"; payload.safety_consent = (formRef.current.elements.namedItem("safety_consent") as HTMLInputElement)?.checked === true; payload.draft_id = draftId;
    try {
      const response = await fetch(initial ? `/api/requests/${initial.id}` : "/api/requests", { method: initial ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.clone().json().catch(() => ({})) as { id?: string };
      if (!response.ok || (!initial && !result.id)) { setNotice({ tone: "danger", text: await localizedApiError(response, dictionary) }); setLoading(false); return; }
      router.push(`/${locale}/dashboard?created=1`); router.refresh();
    } catch { setNotice({ tone: "danger", text: dictionary.auth.genericError }); setLoading(false); }
  }

  const steps = dictionary.wizard.steps;
  const Icon = stepIcons[step - 1];
  const field = (name: string, fallback?: string | number | null) => initial ? String((initial as unknown as Record<string, unknown>)[name] ?? fallback ?? "") : value(name, fallback);
  return <form ref={formRef} className="request-wizard" onSubmit={(event) => { event.preventDefault(); if (step === 7) void publish(); }} noValidate>
    <Stepper steps={steps} current={step} label={dictionary.wizard.progressLabel} />
    <div className="request-wizard-heading"><span className="wizard-icon" aria-hidden="true"><Icon /></span><div><p className="section-kicker">{dictionary.wizard.step} {step} / 7</p><h2 className="request-wizard-title" tabIndex={-1}>{steps[step - 1]}</h2><p>{dictionary.wizard.intros[step - 1]}</p></div></div>
    {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}
    <section data-step="1" hidden={step !== 1} className="wizard-panel"><fieldset><legend>{dictionary.wizard.chooseCategory}</legend><div className="category-choice-grid">{categories.map((category) => <label key={category.id} className="choice-card"><input type="radio" name="category_id" value={category.id} defaultChecked={field("category_id") === category.id} required /><span className="category-icon"><Tag /></span><strong>{locale === "ru" ? category.name_ru : category.name_kk}</strong><small>{locale === "ru" ? category.description_ru : category.description_kk}</small></label>)}</div></fieldset></section>
    <section data-step="2" hidden={step !== 2} className="wizard-panel grid gap-5"><label className="field-label"><span>{dictionary.createRequest.requestTitle}</span><Input name="title" defaultValue={field("title")} minLength={5} maxLength={120} placeholder={dictionary.createRequest.requestTitleHint} required /></label><label className="field-label"><span>{dictionary.createRequest.description}</span><Textarea name="description" defaultValue={field("description")} minLength={20} maxLength={3000} placeholder={dictionary.createRequest.descriptionHint} required /></label><div className="grid gap-4 sm:grid-cols-2"><label className="field-label"><span>{dictionary.requests.contentLanguage}</span><Select name="content_language" defaultValue={field("content_language", locale)}><option value="ru">{dictionary.common.languageRussian}</option><option value="kk">{dictionary.common.languageKazakh}</option></Select></label><label className="field-label"><span>{dictionary.requests.format}</span><Select name="help_format" defaultValue={field("help_format", "in_person")}>{Object.entries(dictionary.helpFormat).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></label></div><label className="field-label"><span>{dictionary.createRequest.conditions}</span><Textarea name="special_conditions" defaultValue={field("special_conditions")} maxLength={1000} /></label></section>
    <section data-step="3" hidden={step !== 3} className="wizard-panel grid gap-5"><div className="grid gap-4 sm:grid-cols-2"><label className="field-label"><span>{dictionary.requests.city}</span><Select name="city_id" value={selectedCityId || ""} onChange={(event) => { setSelectedCityId(Number(event.target.value)); setSelectedDistrictId(0); }} required><option value="">—</option>{cities.map((city) => <option key={city.id} value={city.id}>{locale === "ru" ? city.name_ru : city.name_kk}</option>)}</Select><input type="hidden" name="city" value={selectedCity ? (locale === "ru" ? selectedCity.name_ru : selectedCity.name_kk) : field("city")} /></label><label className="field-label"><span>{dictionary.requests.district}</span>{visibleDistricts.length ? <><Select name="district_id" value={selectedDistrictId || ""} onChange={(event) => setSelectedDistrictId(Number(event.target.value))} required><option value="">—</option>{visibleDistricts.map((district) => <option key={district.id} value={district.id}>{locale === "ru" ? district.name_ru : district.name_kk}</option>)}</Select><input type="hidden" name="district" value={selectedDistrict ? (locale === "ru" ? selectedDistrict.name_ru : selectedDistrict.name_kk) : ""} /></> : <><Input name="district" defaultValue={field("district")} autoComplete="address-level3" required /><input type="hidden" name="district_id" value="" /></>}</label></div><Alert tone="info" title={dictionary.wizard.publicLocation}>{dictionary.wizard.publicLocationHint}</Alert><label className="field-label"><span>{dictionary.createRequest.address}</span><Input name="address" defaultValue={field("address")} autoComplete="street-address" required /><small>{dictionary.createRequest.addressHint}</small></label><label className="field-label"><span>{dictionary.createRequest.landmark}</span><Input name="location_notes" defaultValue={field("location_notes")} /></label><label className="field-label"><span>{dictionary.wizard.privateInstructions}</span><Textarea name="volunteer_instructions" defaultValue={field("volunteer_instructions")} maxLength={1000} /></label><div className="grid gap-4 sm:grid-cols-3"><label className="field-label"><span>{dictionary.requests.date}</span><Input name="desired_date" defaultValue={field("desired_date")} type="date" min={new Date().toISOString().slice(0, 10)} /></label><label className="field-label"><span>{dictionary.createRequest.timeFrom}</span><Input name="time_from" defaultValue={field("time_from").slice(0, 5)} type="time" /></label><label className="field-label"><span>{dictionary.createRequest.timeTo}</span><Input name="time_to" defaultValue={field("time_to").slice(0, 5)} type="time" /></label></div><label className="field-label"><span>{dictionary.requests.urgency}</span><Select name="urgency" defaultValue={field("urgency", "normal")}>{Object.entries(dictionary.urgency).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></label><div className="grid gap-4 sm:grid-cols-2"><label className="field-label"><span>{dictionary.createRequest.contact}</span><Select name="preferred_contact_method" defaultValue={field("preferred_contact_method", "phone")}><option value="phone">{dictionary.createRequest.contactMethods.phone}</option><option value="whatsapp">{dictionary.createRequest.contactMethods.whatsapp}</option><option value="telegram">{dictionary.createRequest.contactMethods.telegram}</option><option value="other">{dictionary.createRequest.contactMethods.other}</option></Select></label><label className="field-label"><span>{dictionary.createRequest.contactValue}</span><Input name="contact_value" defaultValue={field("contact_value")} maxLength={200} required placeholder={dictionary.createRequest.contactValueHint} /></label></div></section>
    <section data-step="4" hidden={step !== 4} className="wizard-panel"><ImageUpload dictionary={dictionary} initialUrl={field("image_url")} /><p className="wizard-encouragement"><Sparkles />{dictionary.wizard.photoOptional}</p></section>
    <section data-step="5" hidden={step !== 5} className="wizard-panel"><fieldset><legend>{dictionary.wizard.appreciation}</legend><div className="reward-grid">{Object.entries(dictionary.wizard.rewards).filter(([key]) => key !== "bonus_points").map(([key, item]) => <label key={key} className="choice-card"><input type="radio" name="reward_type" value={key} defaultChecked={field("reward_type", "none") === key} /><Gift /><strong>{item.title}</strong><small>{item.text}</small></label>)}</div></fieldset><label className="field-label mt-5"><span>{dictionary.wizard.rewardNote}</span><Input name="reward_note" defaultValue={field("reward_note")} maxLength={240} /></label></section>
    <section data-step="6" hidden={step !== 6} className="wizard-panel"><div className="request-preview"><span className="badge badge-brand">{dictionary.wizard.preview}</span><h3>{preview.title || field("title")}</h3><p>{preview.description || field("description")}</p><div className="preview-meta"><span><MapPin />{preview.city || field("city")}, {preview.district || field("district")}</span><span><Clock3 />{preview.desired_date || field("desired_date") || dictionary.wizard.flexibleTime}</span></div><Alert tone="info">{dictionary.wizard.previewPrivacy}</Alert></div></section>
    <section data-step="7" hidden={step !== 7} className="wizard-panel publish-panel"><span className="publish-icon"><CheckCircle2 /></span><h3>{dictionary.wizard.readyTitle}</h3><p>{dictionary.wizard.readyText}</p><Alert tone="warning" title={dictionary.safety.title}>{dictionary.safety.warning}</Alert><Checkbox name="safety_consent" required label={dictionary.createRequest.safetyConsent} /></section>
    <div className="wizard-actions"><button type="button" className={buttonStyles("ghost")} disabled={step === 1 || loading} onClick={() => setStep((current) => Math.max(1, current - 1))}><ArrowLeft />{dictionary.common.back}</button>{!initial ? <button type="button" className={buttonStyles("secondary")} disabled={loading} onClick={() => void saveDraft(step, true)}><Save />{dictionary.createRequest.draft}</button> : null}{step < 7 ? <button type="button" className={buttonStyles("primary")} onClick={() => void next()}>{dictionary.wizard.continue}<ArrowRight /></button> : <button type="submit" className={buttonStyles("primary")} disabled={loading}>{loading ? dictionary.states.loading : dictionary.common.publish}<Send /></button>}</div>
  </form>;
}
