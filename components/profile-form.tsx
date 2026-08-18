"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/image-upload";
import { Alert, Checkbox, Input, Select, Textarea, buttonStyles } from "@/components/ui/primitives";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { CityOption, DistrictOption, Profile } from "@/types/domain";

interface VolunteerExtras { bio?: string | null; skills?: string[] | null; availability?: string | null }

export function ProfileForm({ profile, volunteer, dictionary, locale, cities, districts }: { profile: Profile; volunteer: VolunteerExtras | null; dictionary: Dictionary; locale: Locale; cities: CityOption[]; districts: DistrictOption[] }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [selectedCityId, setSelectedCityId] = useState(profile.city_id ?? 0);
  const [selectedDistrictId, setSelectedDistrictId] = useState(profile.district_id ?? 0);
  const visibleDistricts = useMemo(() => districts.filter((item) => item.city_id === selectedCityId), [districts, selectedCityId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("loading");
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (response.ok) { setState("success"); router.refresh(); } else setState("error");
  }

  return <form className="grid gap-6" onSubmit={(event) => void submit(event)}>
    {state === "success" ? <Alert tone="success">{dictionary.states.success}</Alert> : null}
    {state === "error" ? <Alert tone="danger">{dictionary.states.error}</Alert> : null}
    <div className="grid gap-4 md:grid-cols-2">
      <label className="field-label md:col-span-2"><span>{dictionary.auth.fullName}</span><Input name="full_name" defaultValue={profile.full_name} required maxLength={100} /></label>
      <label className="field-label"><span>{dictionary.requests.city}</span><Select name="city_id" value={selectedCityId || ""} onChange={(event) => { setSelectedCityId(Number(event.target.value) || 0); setSelectedDistrictId(0); }}><option value="">—</option>{cities.map((city) => <option key={city.id} value={city.id}>{locale === "ru" ? city.name_ru : city.name_kk}</option>)}</Select></label>
      <label className="field-label"><span>{dictionary.requests.district}</span>{visibleDistricts.length ? <Select name="district_id" value={selectedDistrictId || ""} onChange={(event) => setSelectedDistrictId(Number(event.target.value) || 0)}><option value="">—</option>{visibleDistricts.map((district) => <option key={district.id} value={district.id}>{locale === "ru" ? district.name_ru : district.name_kk}</option>)}</Select> : <><Input name="district" defaultValue={profile.district ?? ""} maxLength={100} autoComplete="address-level3" /><input type="hidden" name="district_id" value="" /></>}</label>
      {volunteer ? <><label className="field-label md:col-span-2"><span>{dictionary.profile.aboutMe}</span><Textarea name="bio" defaultValue={volunteer.bio ?? ""} maxLength={1200} /></label><label className="field-label"><span>{dictionary.dashboard.available}</span><Input name="availability" defaultValue={volunteer.availability ?? ""} maxLength={240} /></label><label className="field-label"><span>{dictionary.profile.skills}</span><Input name="skills" defaultValue={volunteer.skills?.join(", ") ?? ""} maxLength={500} /></label></> : null}
      <div className="md:col-span-2"><ImageUpload bucket="avatars" name="avatar_url" dictionary={dictionary} initialUrl={profile.avatar_url ?? ""} /></div>
    </div>
    <fieldset className="privacy-fieldset"><legend>{dictionary.profile.privacy}</legend><p>{dictionary.profile.privacyText}</p><Checkbox name="show_public_name" defaultChecked={profile.show_public_name ?? false} label={dictionary.profile.showName} /><Checkbox name="show_city" defaultChecked={profile.show_city ?? true} label={dictionary.profile.showCity} /><Checkbox name="share_community_activity" defaultChecked={profile.share_community_activity ?? true} label={dictionary.profile.shareActivity} /><Checkbox name="allow_public_profile" defaultChecked={profile.allow_public_profile ?? true} label={dictionary.profile.publicProfile} /><Checkbox name="transactional_email_enabled" defaultChecked={profile.transactional_email_enabled ?? true} label={dictionary.notifications.transactionalEmail ?? dictionary.notifications.title} /><Checkbox name="marketing_email_enabled" defaultChecked={profile.marketing_email_enabled ?? false} label={dictionary.notifications.marketingEmail ?? dictionary.notifications.title} /></fieldset>
    <button className={buttonStyles("primary")} disabled={state === "loading"}>{state === "loading" ? dictionary.states.loading : dictionary.common.save}</button>
  </form>;
}
