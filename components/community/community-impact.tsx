import { Building2, CheckCircle2, Clock3, Heart, MapPinned, MessageCircleHeart, TrendingUp, UsersRound } from "lucide-react";
import { ImpactStatCard } from "@/components/community/impact-stat-card";
import type { Dictionary } from "@/lib/i18n";
import type { ImpactMetrics } from "@/types/domain";

export function CommunityImpact({ metrics, dictionary, dark = false }: { metrics: ImpactMetrics; dictionary: Dictionary; dark?: boolean }) {
  const stats = [
    [CheckCircle2, metrics.requests_completed, dictionary.impact.requestsCompleted],
    [UsersRound, metrics.active_volunteers, dictionary.impact.activeVolunteers],
    [TrendingUp, `${metrics.success_rate}%`, dictionary.impact.successRate],
    [Building2, metrics.cities, dictionary.impact.cities],
    [Clock3, metrics.help_hours, dictionary.impact.helpHours],
    [MessageCircleHeart, metrics.positive_reviews, dictionary.impact.positiveReviews],
    [Heart, metrics.people_supported, dictionary.impact.peopleSupported],
    [MapPinned, metrics.requests_completed_this_week, dictionary.impact.thisWeek],
  ] as const;
  return <div className={`impact-grid ${dark ? "impact-grid-dark" : ""}`}>{stats.map(([Icon, value, label]) => <ImpactStatCard key={label} icon={Icon} value={value} label={label} />)}</div>;
}
