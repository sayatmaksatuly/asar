import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock3, Languages, MapPin, ShieldCheck } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { ProductAnalyticsEvent } from "@/components/product-analytics";
import { EnableVolunteerButton } from "@/components/capability-button";
import { WithdrawResponseButton } from "@/components/dashboard-actions";
import { ResponseForm } from "@/components/response-form";
import { ReportForm } from "@/components/report-form";
import { Alert, Badge, Rating, StatusBadge, UserAvatar, buttonStyles } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/states";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicRequest } from "@/services/requests";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params; const safe: Locale = isLocale(locale) ? locale : "ru"; const result = await getPublicRequest(id); const title = result.data?.title ?? getDictionary(safe).requestDetail.notFound;
  return { title, description: result.data?.description?.slice(0, 160), openGraph: result.data ? { title, description: result.data.description.slice(0, 160), locale: safe === "ru" ? "ru_KZ" : "kk_KZ" } : undefined };
}

export default async function RequestDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params; const locale: Locale = isLocale(raw) ? raw : "ru"; const dictionary = getDictionary(locale); const result = await getPublicRequest(id); const request = result.data;
  if (!request) return <section className="section"><div className="shell"><ErrorState title={dictionary.requestDetail.notFound} text={result.configured ? undefined : dictionary.states.notConfigured} /></div></section>;
  const supabase = await createSupabaseServerClient();
  const { data: auth } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  let viewer: { can_volunteer: boolean | null; role: string | null; status: string | null } | null = null;
  let existingResponse: { id: string; status: string; message: string } | null = null;
  if (supabase && auth.user) {
    const [profileResult, responseResult] = await Promise.all([
      supabase.from("profiles").select("can_volunteer,role,status").eq("id", auth.user.id).maybeSingle(),
      supabase.from("responses").select("id,status,message").eq("request_id", id).eq("volunteer_id", auth.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    viewer = profileResult.data;
    existingResponse = responseResult.data;
  }
  const isAuthor = Boolean(request.viewer_is_author);
  const canRespond = Boolean(auth.user && viewer?.status === "active" && (viewer.can_volunteer || viewer.role === "admin") && !isAuthor && !existingResponse && request.status === "open");
  const date = request.desired_date ? new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "kk-KZ", { dateStyle: "long" }).format(new Date(request.desired_date)) : "—";
  const category = locale === "ru" ? request.category_name_ru : request.category_name_kk;
  return (
    <><ProductAnalyticsEvent event="request_viewed" locale={locale} requestId={request.id} /><section className="section"><div className="shell grid gap-8 lg:grid-cols-[1fr_360px]">
      <article>
        <div className="flex flex-wrap gap-2"><Badge tone={request.urgency === "urgent" ? "danger" : "warning"}>{dictionary.urgency[request.urgency]}</Badge><StatusBadge status={request.status} dictionary={dictionary} /><Badge>{request.content_language.toUpperCase()}</Badge></div>
        <h1 className="section-title mt-5 max-w-4xl">{request.title}</h1>
        <div className="mt-6 flex items-center gap-3"><span className="category-icon"><CategoryIcon name={request.category_slug} /></span><strong>{category}</strong></div>
        {request.image_url ? <div className="mt-8 overflow-hidden rounded-3xl border border-[var(--line)] bg-white"><Image src={request.image_url} alt={request.title} width={1200} height={680} className="max-h-[480px] w-full object-cover" /></div> : null}
        <div className="mt-8 rounded-3xl border border-[var(--line)] bg-white p-6 text-lg shadow-[var(--shadow-sm)]"><p className="whitespace-pre-line">{request.description}</p></div>
        <dl className="mt-6 grid gap-4 rounded-3xl border border-[var(--line)] bg-white p-6 sm:grid-cols-2">
          <div className="meta-row"><MapPin /><div><dt className="text-sm text-[var(--muted)]">{dictionary.requestDetail.location}</dt><dd className="font-bold">{request.city}, {request.district}</dd></div></div>
          <div className="meta-row"><CalendarDays /><div><dt className="text-sm text-[var(--muted)]">{dictionary.requestDetail.desiredDate}</dt><dd className="font-bold">{date}</dd></div></div>
          <div className="meta-row"><Clock3 /><div><dt className="text-sm text-[var(--muted)]">{dictionary.requestDetail.time}</dt><dd className="font-bold">{request.time_from ?? "—"} — {request.time_to ?? "—"}</dd></div></div>
          <div className="meta-row"><Languages /><div><dt className="text-sm text-[var(--muted)]">{dictionary.requests.contentLanguage}</dt><dd className="font-bold">{request.content_language.toUpperCase()}</dd></div></div>
        </dl>
        {request.special_conditions ? <div className="mt-6 content-card"><h2 className="text-xl font-extrabold">{dictionary.requestDetail.specialConditions}</h2><p className="mt-3 text-[var(--muted)]">{request.special_conditions}</p></div> : null}
      </article>
      <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
        <div className="content-card"><h2 className="text-xl font-extrabold">{dictionary.requestDetail.author}</h2><div className="mt-4 flex items-center gap-3"><UserAvatar name={request.author_name ?? "ASAR"} src={request.author_avatar_url} /><div><strong>{request.author_name ?? dictionary.requests.authorSafe}</strong><div><Rating value={request.author_rating ?? 0} /></div></div></div><div className="mt-4 flex gap-2 text-sm text-[var(--muted)]"><ShieldCheck className="shrink-0 text-[var(--brand)]" size={20} /><p>{dictionary.requestDetail.privateNote}</p></div></div>
        <div className="content-card"><h2 className="text-xl font-extrabold">{dictionary.wizard.appreciation}</h2><p className="mt-3 font-bold">{dictionary.wizard.rewards[request.reward_type as keyof typeof dictionary.wizard.rewards]?.title ?? request.reward_type}</p>{request.reward_note ? <p className="mt-2 text-sm text-[var(--muted)]">{request.reward_note}</p> : null}</div>
        <div className="content-card"><h2 className="text-xl font-extrabold">{dictionary.requestDetail.respond}</h2><div className="mt-4">{canRespond ? <ResponseForm requestId={request.id} dictionary={dictionary} configured={result.configured} /> : existingResponse ? <div><p className="font-bold">{dictionary.requestDetail.existingResponse}</p><p className="mt-2 whitespace-pre-line text-[var(--muted)]">{existingResponse.message}</p><div className="mt-3"><Badge tone="brand">{dictionary.status[existingResponse.status as keyof typeof dictionary.status] ?? existingResponse.status}</Badge></div>{existingResponse.status === "pending" ? <div className="mt-4"><WithdrawResponseButton responseId={existingResponse.id} dictionary={dictionary} /></div> : null}</div> : !auth.user ? <div><p className="text-[var(--muted)]">{dictionary.requestDetail.signInToRespond}</p><Link className={`${buttonStyles("primary")} mt-4`} href={`/${locale}/auth/sign-in?next=/${locale}/requests/${request.id}`}>{dictionary.auth.signIn}</Link></div> : isAuthor ? <p className="text-[var(--muted)]">{dictionary.requestDetail.authorCannotRespond}</p> : !viewer?.can_volunteer && viewer?.role !== "admin" ? <div><p className="text-[var(--muted)]">{dictionary.requestDetail.volunteerCapabilityRequired}</p><div className="mt-4"><EnableVolunteerButton dictionary={dictionary} /></div></div> : <p className="text-[var(--muted)]">{dictionary.requestDetail.responseUnavailable}</p>}</div></div>
        <Alert tone="warning" title={dictionary.safety.title}>{dictionary.safety.tips[0]}</Alert>
        {auth.user && !isAuthor ? <ReportForm requestId={request.id} dictionary={dictionary} configured={result.configured} /> : null}
      </aside>
    </div></section></>
  );
}
