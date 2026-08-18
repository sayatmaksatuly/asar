import type { Metadata } from "next";
import { CalendarDays, HeartHandshake, MapPin, ShieldCheck } from "lucide-react";
import { TrustCard } from "@/components/trust/trust-card";
import { ReputationCard } from "@/components/reputation/reputation-card";
import { Badge, Rating, UserAvatar } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/states";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ASAR" };

export default async function PublicProfilePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params; const locale: Locale = isLocale(raw) ? raw : "ru"; const dictionary = getDictionary(locale); const supabase = await createSupabaseServerClient();
  if (!supabase) return <section className="section"><div className="shell"><ErrorState title={dictionary.states.notConfigured} /></div></section>;
  const [{ data }, { data: reviews }] = await Promise.all([supabase.from("public_profiles").select("id,full_name,avatar_url,role,can_volunteer,city,district,city_id,district_id,city_name_ru,city_name_kk,district_name_ru,district_name_kk,rating,completed_tasks_count,trust_score,trust_level,reputation_points,reputation_level,community_verified,created_at,email_verified,phone_verified,identity_verified").eq("id", id).maybeSingle(), supabase.rpc("get_public_profile_reviews", { p_profile_id: id })]);
  if (!data) return <section className="section"><div className="shell"><ErrorState title={dictionary.profile.notFound} text={dictionary.profile.notFoundText} /></div></section>;
  const profile = { ...data, city: locale === "ru" ? (data.city_name_ru ?? data.city) : (data.city_name_kk ?? data.city), district: locale === "ru" ? (data.district_name_ru ?? data.district) : (data.district_name_kk ?? data.district), preferred_language: locale, status: "active" } as Profile;
  return <section className="section public-profile"><div className="shell"><header className="public-profile-header"><UserAvatar name={profile.full_name} src={profile.avatar_url} size="lg" /><div><div className="flex flex-wrap gap-2"><Badge tone="brand">{data.can_volunteer ? dictionary.auth.volunteer : dictionary.profile.member}</Badge>{profile.community_verified ? <Badge tone="success"><ShieldCheck size={14} />{dictionary.trust.communityVerified}</Badge> : null}</div><h1>{profile.full_name}</h1><div className="profile-meta">{profile.city ? <span><MapPin />{profile.city}{profile.district ? `, ${profile.district}` : ""}</span> : null}<span><CalendarDays />{dictionary.trust.memberSince} {new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "kk-KZ", { month: "long", year: "numeric" }).format(new Date(profile.created_at ?? new Date()))}</span></div></div></header><div className="public-profile-grid"><TrustCard profile={profile} dictionary={dictionary} locale={locale} /><ReputationCard profile={profile} dictionary={dictionary} /></div><section className="content-card mt-6"><h2 className="text-2xl font-extrabold">{dictionary.dashboard.reviews}</h2>{reviews?.length ? <div className="mt-5 grid gap-4">{reviews.map((review) => <article className="rounded-2xl border border-[var(--line)] p-4" key={review.id}><div className="flex flex-wrap items-center justify-between gap-3"><Rating value={review.rating}/><time className="text-sm text-[var(--muted)]">{new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "kk-KZ").format(new Date(review.created_at))}</time></div><p className="mt-3 whitespace-pre-line">{review.text ?? "—"}</p><p className="mt-2 text-sm text-[var(--muted)]">{locale === "ru" ? review.context_category_ru : review.context_category_kk}{review.reviewer_name ? ` · ${review.reviewer_name}` : ""}</p></article>)}</div> : <p className="mt-4 text-[var(--muted)]">{dictionary.states.empty}</p>}</section><div className="privacy-note-card"><HeartHandshake /><div><strong>{dictionary.profile.publicSafeTitle}</strong><p>{dictionary.profile.publicSafeText}</p></div></div></div></section>;
}
