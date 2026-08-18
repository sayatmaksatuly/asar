import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CommunityEvent, ImpactMetrics } from "@/types/domain";

const emptyImpact: ImpactMetrics = {
  requests_completed: 0,
  active_volunteers: 0,
  success_rate: 0,
  cities: 0,
  help_hours: 0,
  positive_reviews: 0,
  people_supported: 0,
  requests_completed_this_week: 0,
};

export async function getCommunitySnapshot(limit = 12): Promise<{ impact: ImpactMetrics; events: CommunityEvent[]; configured: boolean }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { impact: emptyImpact, events: [], configured: false };
  const [impactResult, eventsResult] = await Promise.all([
    supabase.rpc("get_community_impact"),
    supabase.from("public_community_events").select("id,event_type,actor_name,actor_avatar_url,city,category_slug,payload,occurred_at").order("occurred_at", { ascending: false }).limit(limit),
  ]);
  const impact = (Array.isArray(impactResult.data) ? impactResult.data[0] : impactResult.data) as ImpactMetrics | null;
  return {
    impact: impact ?? emptyImpact,
    events: (eventsResult.data ?? []) as CommunityEvent[],
    configured: !impactResult.error && !eventsResult.error,
  };
}
