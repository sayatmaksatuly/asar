import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Clock3, MapPin, MessageCircle, Phone, ShieldCheck, UserRound } from "lucide-react";
import { AssignmentActions } from "@/components/assignment-actions";
import { Alert, Badge, Rating, UserAvatar, buttonStyles } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/states";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface AssignmentContext {
  assignment: { id: string; status: string; started_at: string | null; volunteer_completed_at: string | null; requester_confirmed_at: string | null; help_minutes: number | null; cancelled_at: string | null; cancellation_reason: string | null };
  request: { id: string; title: string; description: string; category_id: string; category_slug: string; category_name_ru: string; category_name_kk: string; urgency: string; desired_date: string | null; time_from: string | null; time_to: string | null; city: string; district: string; image_url: string | null; reward_type: string; reward_note: string | null };
  private_details: { address: string | null; landmark: string | null; contact_method: string | null; contact_value: string | null; volunteer_instructions: string | null; requester_phone: string | null } | null;
  requester: { id: string; name: string; avatar_url: string | null; rating: number; trust_score: number; trust_level: string };
  volunteer: { id: string; name: string; avatar_url: string | null; rating: number; trust_score: number; trust_level: string };
}

function isContext(value: unknown): value is AssignmentContext {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && "assignment" in value && "request" in value);
}

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const { locale } = await params; const safe: Locale = isLocale(locale) ? locale : "ru"; return { title: getDictionary(safe).assignment.title, robots: { index: false, follow: false } }; }

export default async function AssignmentPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params; const locale: Locale = isLocale(raw) ? raw : "ru"; const dictionary = getDictionary(locale);
  const supabase = await createSupabaseServerClient(); if (!supabase) return <section className="section"><div className="shell"><ErrorState title={dictionary.states.notConfigured} /></div></section>;
  const { data: auth } = await supabase.auth.getUser(); if (!auth.user) redirect(`/${locale}/auth/sign-in?next=/${locale}/assignments/${id}`);
  const { data, error } = await supabase.rpc("get_assignment_context", { p_assignment_id: id });
  if (error || !isContext(data)) return <section className="section"><div className="shell"><ErrorState title={dictionary.states.error} text={dictionary.states.unauthorized} /></div></section>;
  const context = data as AssignmentContext;
  const isRequester = context.requester.id === auth.user.id; const isVolunteer = context.volunteer.id === auth.user.id;
  const participant = isRequester ? context.volunteer : context.requester;
  const date = context.request.desired_date ? new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "kk-KZ", { dateStyle: "long" }).format(new Date(context.request.desired_date)) : "—";
  const contactValue = context.private_details?.contact_value ?? context.private_details?.requester_phone ?? "";
  const phone = contactValue.replace(/[^+\d]/g, "");
  const telegram = context.private_details?.contact_method === "telegram" ? contactValue.replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "") : "";
  const whatsapp = context.private_details?.contact_method === "whatsapp" ? contactValue.replace(/\D/g, "") : "";
  return <section className="section"><div className="shell max-w-5xl">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="section-kicker">{dictionary.assignment.eyebrow}</p><h1 className="section-title">{context.request.title}</h1></div><Badge tone={context.assignment.status === "disputed" ? "danger" : "brand"}>{dictionary.status[context.assignment.status as keyof typeof dictionary.status] ?? context.assignment.status}</Badge></div>
    <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_340px]">
      <div className="grid gap-6">
        {context.request.image_url ? <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white"><Image src={context.request.image_url} alt={context.request.title} width={1200} height={640} className="max-h-[420px] w-full object-cover" /></div> : null}
        <article className="content-card"><div className="mb-5 flex flex-wrap gap-2"><Badge>{locale === "ru" ? context.request.category_name_ru : context.request.category_name_kk}</Badge><Badge tone={context.request.urgency === "urgent" ? "danger" : context.request.urgency === "high" ? "warning" : "neutral"}>{dictionary.urgency[context.request.urgency as keyof typeof dictionary.urgency] ?? context.request.urgency}</Badge></div><p className="whitespace-pre-line text-lg">{context.request.description}</p><dl className="mt-6 grid gap-4 sm:grid-cols-2"><div className="meta-row"><MapPin /><div><dt className="text-sm text-[var(--muted)]">{dictionary.requestDetail.location}</dt><dd className="font-bold">{context.request.city}, {context.request.district}</dd></div></div><div className="meta-row"><CalendarDays /><div><dt className="text-sm text-[var(--muted)]">{dictionary.requestDetail.desiredDate}</dt><dd className="font-bold">{date}</dd></div></div><div className="meta-row"><Clock3 /><div><dt className="text-sm text-[var(--muted)]">{dictionary.requestDetail.time}</dt><dd className="font-bold">{context.request.time_from ?? "—"} — {context.request.time_to ?? "—"}</dd></div></div></dl><div className="mt-5 border-t border-[var(--line)] pt-5"><small className="text-[var(--muted)]">{dictionary.wizard.appreciation}</small><strong className="mt-1 block">{dictionary.wizard.rewards[context.request.reward_type as keyof typeof dictionary.wizard.rewards]?.title ?? context.request.reward_type}</strong>{context.request.reward_note ? <p className="mt-1 text-sm text-[var(--muted)]">{context.request.reward_note}</p> : null}</div></article>
        <article className="content-card"><div className="flex items-center gap-3"><ShieldCheck className="text-[var(--brand)]" /><h2 className="text-2xl font-extrabold">{dictionary.assignment.privateDetails}</h2></div><p className="mt-2 text-sm text-[var(--muted)]">{dictionary.assignment.privateNotice}</p>{context.private_details ? <dl className="mt-5 grid gap-4"><div><dt className="text-sm text-[var(--muted)]">{dictionary.assignment.address}</dt><dd className="font-bold">{context.private_details.address ?? "—"}</dd></div><div><dt className="text-sm text-[var(--muted)]">{dictionary.assignment.landmark}</dt><dd>{context.private_details.landmark ?? "—"}</dd></div><div><dt className="text-sm text-[var(--muted)]">{dictionary.assignment.instructions}</dt><dd className="whitespace-pre-line">{context.private_details.volunteer_instructions ?? "—"}</dd></div><div><dt className="text-sm text-[var(--muted)]">{dictionary.assignment.contact}</dt><dd className="font-bold">{context.private_details.contact_method ? dictionary.createRequest.contactMethods[context.private_details.contact_method as keyof typeof dictionary.createRequest.contactMethods] ?? context.private_details.contact_method : "—"}{contactValue ? ` · ${contactValue}` : ""}</dd></div></dl> : <Alert tone="warning">{dictionary.assignment.noPrivate}</Alert>}{isVolunteer && context.private_details?.contact_method === "phone" && phone ? <a className={`${buttonStyles("primary")} mt-5`} href={`tel:${phone}`}><Phone size={18} />{dictionary.assignment.contact}</a> : null}{isVolunteer && whatsapp ? <a className={`${buttonStyles("primary")} mt-5`} href={`https://wa.me/${whatsapp}`} rel="noreferrer"><MessageCircle size={18} />WhatsApp</a> : null}{isVolunteer && telegram ? <a className={`${buttonStyles("primary")} mt-5`} href={`https://t.me/${telegram}`} rel="noreferrer"><MessageCircle size={18} />Telegram</a> : null}</article>
        <AssignmentActions assignmentId={context.assignment.id} status={context.assignment.status} isRequester={isRequester} isVolunteer={isVolunteer} dictionary={dictionary} />
      </div>
      <aside className="space-y-5"><div className="content-card"><div className="flex items-center gap-3"><UserAvatar name={participant.name} src={participant.avatar_url} /><div><strong>{participant.name}</strong><Rating value={participant.rating ?? 0} /></div></div><div className="mt-4 flex items-center gap-2 text-sm text-[var(--muted)]"><UserRound size={18} /><span>{dictionary.trust.score}: {participant.trust_score}</span></div><Link className={`${buttonStyles("secondary")} mt-5`} href={`/${locale}/profile/${participant.id}`}>{dictionary.profile.publicSafeTitle}</Link></div><Link className={buttonStyles("ghost")} href={`/${locale}/dashboard`}>{dictionary.common.back}</Link></aside>
    </div>
  </div></section>;
}
