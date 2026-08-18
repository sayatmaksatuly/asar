import Link from "next/link";
import { CalendarDays, Languages, MapPin, MessageSquareText } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { Badge, Rating, StatusBadge, UserAvatar, buttonStyles } from "@/components/ui/primitives";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { HelpRequestSummary } from "@/types/domain";

export function HelpRequestCard({ request, locale, dictionary }: { request: HelpRequestSummary; locale: Locale; dictionary: Dictionary }) {
  const categoryName = locale === "ru" ? request.category_name_ru : request.category_name_kk;
  const date = request.desired_date ? new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "kk-KZ", { day: "numeric", month: "long" }).format(new Date(request.desired_date)) : "—";

  return (
    <article className="request-card">
      <div className="flex items-start justify-between gap-4">
        <span className="category-icon"><CategoryIcon name={request.category_slug} /></span>
        <div className="flex flex-wrap justify-end gap-2"><Badge tone={request.urgency === "urgent" ? "danger" : request.urgency === "high" ? "warning" : "neutral"}>{dictionary.urgency[request.urgency]}</Badge><StatusBadge status={request.status} dictionary={dictionary} /></div>
      </div>
      <div>
        <p className="text-sm font-bold text-[var(--brand-strong)]">{categoryName}</p>
        <h2 className="mt-2 line-clamp-2 text-xl font-extrabold leading-tight text-[var(--ink)]">{request.title}</h2>
        <p className="mt-3 line-clamp-3 text-[var(--muted)]">{request.description}</p>
      </div>
      <dl className="grid gap-2 text-sm text-[var(--ink-soft)] sm:grid-cols-2">
        <div className="meta-row"><MapPin size={17} /><span>{request.city}, {request.district}</span></div>
        <div className="meta-row"><CalendarDays size={17} /><span>{date}</span></div>
        <div className="meta-row"><Languages size={17} /><span>{request.content_language.toUpperCase()}</span></div>
        <div className="meta-row"><MessageSquareText size={17} /><span>{request.response_count ?? 0} {dictionary.common.responses}</span></div>
      </dl>
      <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar name={request.author_name ?? "ASAR"} src={request.author_avatar_url} size="sm" />
          <div className="min-w-0"><p className="truncate text-sm font-bold">{request.author_name ?? dictionary.requests.authorSafe}</p><Rating value={request.author_rating ?? 0} /></div>
        </div>
        <Link href={`/${locale}/requests/${request.id}`} className={`${buttonStyles("secondary")} shrink-0 px-4`}>{dictionary.common.view}</Link>
      </div>
    </article>
  );
}
