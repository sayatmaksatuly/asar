import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/domain";

export interface DashboardResponse {
  id: string;
  request_id: string;
  volunteer_id: string;
  message: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  created_at: string;
  volunteer_name?: string;
  volunteer_rating?: number;
  volunteer_trust_score?: number;
  volunteer_verification_status?: string;
  volunteer_successful_helps_count?: number;
  request_title?: string;
}

export interface DashboardAssignment {
  id: string; request_id: string; volunteer_id: string; status: string; started_at: string | null; volunteer_completed_at: string | null; requester_confirmed_at: string | null; help_minutes: number; cancelled_at: string | null; cancellation_reason: string | null; created_at: string; request_title: string; request_status: string; requester_id: string;
}

export async function getDashboardData(userId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const [profileResult, volunteerResult, requestsResult, responsesResult, assignmentsResult, bonusResult, reviewsResult, achievementsResult, progressResult, verificationResult] = await Promise.all([
    supabase.from("profiles").select("id,full_name,role,city,district,city_id,district_id,preferred_language,status,rating,completed_tasks_count,avatar_url,created_at,onboarding_step,onboarding_completed_at,email_verified,phone_verified,identity_verified,community_verified,trust_score,trust_level,trust_score_updated_at,reputation_points,reputation_level,consistency_streak,community_contribution_count,show_public_name,show_city,share_community_activity,allow_public_profile,can_request,can_volunteer,transactional_email_enabled,marketing_email_enabled,last_active_at,deleted_at").eq("id", userId).single(),
    supabase.from("volunteer_profiles").select("bonus_balance,level,bio,skills,availability,verification_status,reputation_points,reputation_level,positive_reviews_count,successful_helps_count,last_active_at").eq("user_id", userId).maybeSingle(),
    supabase.from("help_requests").select("id,title,status,urgency,city,district,created_at,selected_volunteer_id").eq("author_id", userId).order("created_at", { ascending: false }).limit(30),
    supabase.from("responses").select("id,request_id,volunteer_id,message,status,created_at").order("created_at", { ascending: false }).limit(50),
    supabase.rpc("get_my_assignments"),
    supabase.from("bonus_transactions").select("id,amount,reason,note,created_at,assignment_id").eq("volunteer_id", userId).order("created_at", { ascending: false }).limit(30),
    supabase.from("reviews").select("id,rating,text,created_at,author_id,receiver_id,assignment_id").or(`author_id.eq.${userId},receiver_id.eq.${userId}`).order("created_at", { ascending: false }).limit(40),
    supabase.from("achievements").select("id,slug,name_ru,name_kk,description_ru,description_kk,rarity,required_completed_tasks,sort_order").order("sort_order").limit(20),
    supabase.from("achievement_progress").select("achievement_id,progress,target,unlocked_at").eq("user_id", userId),
    supabase.from("verification_requests").select("id,kind,status,note,review_reason,created_at,reviewed_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
  ]);

  const responses = (responsesResult.data ?? []) as DashboardResponse[];
  const ownRequestTitles = new Map((requestsResult.data ?? []).map((request) => [request.id, request.title]));
  const missingRequestIds = [...new Set(responses.map((response) => response.request_id).filter((requestId) => !ownRequestTitles.has(requestId)))];
  if (missingRequestIds.length) {
    const { data: visibleRequests } = await supabase.from("public_help_requests").select("id,title").in("id", missingRequestIds);
    (visibleRequests ?? []).forEach((request) => ownRequestTitles.set(request.id, request.title));
  }
  responses.forEach((response) => { response.request_title = ownRequestTitles.get(response.request_id); });
  // Request authors receive a participant-safe profile even when a volunteer has disabled
  // their public community profile. This RPC never exposes contact/private profile fields.
  const { data: participantProfiles } = await supabase.rpc("get_response_participant_profiles");
  const participantByResponse = new Map((participantProfiles ?? []).map((profile) => [profile.response_id, profile]));
  responses.forEach((response) => {
    const participant = participantByResponse.get(response.id);
    if (participant) {
      response.volunteer_name = participant.full_name;
      response.volunteer_rating = participant.rating;
      response.volunteer_trust_score = participant.trust_score;
      response.volunteer_verification_status = participant.verification_status ?? undefined;
      response.volunteer_successful_helps_count = participant.successful_helps_count ?? undefined;
    }
  });

  return {
    profile: profileResult.data as Profile | null,
    volunteer: volunteerResult.data,
    requests: requestsResult.data ?? [],
    responses,
    assignments: (assignmentsResult.data ?? []) as DashboardAssignment[],
    bonusTransactions: bonusResult.data ?? [],
    reviews: reviewsResult.data ?? [],
    achievements: achievementsResult.data ?? [],
    achievementProgress: progressResult.data ?? [],
    verificationRequests: verificationResult.data ?? [],
  };
}
