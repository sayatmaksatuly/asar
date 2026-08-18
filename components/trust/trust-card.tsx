import { CalendarDays, CheckCircle2, ShieldCheck, Sparkles, Star } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress";
import { VerificationBadge } from "@/components/trust/verification-badge";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { Profile } from "@/types/domain";

export function TrustCard({ profile, dictionary, locale }: { profile: Profile; dictionary: Dictionary; locale: Locale }) {
  const score = profile.trust_score ?? 0;
  const level = profile.trust_level ?? "new_member";
  const forming = score < 25;
  return (
    <article className="trust-card">
      <div className="trust-card-header">
        <div><span className="trust-kicker"><ShieldCheck aria-hidden="true" />{dictionary.trust.title}</span><h2>{forming ? dictionary.trust.forming : dictionary.trust.levels[level]}</h2><p>{dictionary.trust.subtitle}</p></div>
        <div className="trust-score" aria-label={`${dictionary.trust.score}: ${score} / 100`}><strong>{score}</strong><span>/100</span></div>
      </div>
      <ProgressBar value={score} label={dictionary.trust.score} />
      <div className="verification-grid">
        <VerificationBadge verified={Boolean(profile.email_verified)} label={dictionary.trust.email} />
        <VerificationBadge verified={Boolean(profile.phone_verified)} label={dictionary.trust.phone} />
        <VerificationBadge verified={Boolean(profile.identity_verified)} label={dictionary.trust.identity} />
        <VerificationBadge verified={Boolean(profile.community_verified)} label={dictionary.trust.communityVerified} />
      </div>
      <div className="trust-facts">
        <span><CalendarDays /><strong>{dictionary.trust.memberSince}</strong>{new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "kk-KZ", { month: "long", year: "numeric" }).format(new Date((profile as Profile & { created_at?: string }).created_at ?? new Date()))}</span>
        <span><CheckCircle2 /><strong>{dictionary.trust.completed}</strong>{profile.completed_tasks_count}</span>
        <span><Star /><strong>{dictionary.trust.positiveReviews}</strong>{profile.rating ? `${profile.rating.toFixed(1)} / 5` : dictionary.trust.notYet}</span>
      </div>
      {forming ? <div className="trust-note"><Sparkles />{dictionary.trust.newMemberNote}</div> : null}
    </article>
  );
}
