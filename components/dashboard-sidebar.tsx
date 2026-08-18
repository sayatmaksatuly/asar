import Link from "next/link";
import { Award, ClipboardList, History, LayoutDashboard, MessageSquareText, Settings, ShieldCheck, Star, UserRound } from "lucide-react";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { UserRole } from "@/types/domain";

export function DashboardSidebar({ locale, dictionary, role, canRequest, canVolunteer }: { locale: Locale; dictionary: Dictionary; role: UserRole; canRequest: boolean; canVolunteer: boolean }) {
  const items = [
    [dictionary.trust.title, "trust", ShieldCheck],
    [dictionary.reputation.title, "rating", Star],
    [dictionary.dashboard.achievements, "achievements", Award],
    [dictionary.dashboard.profile, "profile", UserRound],
    ...(canRequest ? [[dictionary.dashboard.myRequests, "requests", ClipboardList] as const] : []),
    [dictionary.dashboard.responses, "responses", MessageSquareText],
    [dictionary.dashboard.active, "active", LayoutDashboard],
    [dictionary.dashboard.reviews, "reviews", Star],
    ...(canVolunteer ? [[dictionary.dashboard.history, "history", History] as const] : []),
    [dictionary.dashboard.settings, "account", Settings],
    [dictionary.dashboard.security, "security", ShieldCheck],
  ] as const;

  return (
    <aside className="dashboard-sidebar" aria-label={dictionary.nav.dashboard}>
      {items.map(([label, id, Icon]) => <Link key={id} href={`/${locale}/dashboard#${id}`}><Icon size={20} />{label}</Link>)}
      {role === "admin" ? <Link href={`/${locale}/admin`}><ShieldCheck size={20} />{dictionary.nav.admin}</Link> : null}
    </aside>
  );
}
