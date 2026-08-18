export type UserRole = "requester" | "volunteer" | "admin";
export type AppLanguage = "ru" | "kk";
export type UserStatus = "active" | "blocked" | "pending";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export type RequestStatus =
  | "draft"
  | "open"
  | "volunteer_selected"
  | "in_progress"
  | "awaiting_confirmation"
  | "completed"
  | "cancelled"
  | "disputed";
export type ResponseStatus = "pending" | "accepted" | "rejected" | "withdrawn";
export type AssignmentStatus =
  | "volunteer_selected"
  | "in_progress"
  | "awaiting_confirmation"
  | "completed"
  | "cancelled"
  | "disputed";
export type UrgencyLevel = "low" | "normal" | "high" | "urgent";
export type HelpFormat = "in_person" | "remote" | "delivery" | "transport";

export interface Category {
  id: string;
  slug: string;
  name_ru: string;
  name_kk: string;
  description_ru?: string | null;
  description_kk?: string | null;
  icon?: string | null;
}

export interface HelpRequestSummary {
  id: string;
  title: string;
  description: string;
  content_language: AppLanguage;
  category_id: string;
  category_slug?: string | null;
  category_name_ru?: string | null;
  category_name_kk?: string | null;
  city: string;
  district: string;
  desired_date: string | null;
  time_from: string | null;
  time_to: string | null;
  urgency: UrgencyLevel;
  help_format: HelpFormat;
  status: RequestStatus;
  image_url: string | null;
  special_conditions: string | null;
  created_at: string;
  response_count?: number;
  author_name?: string | null;
  author_rating?: number | null;
  author_avatar_url?: string | null;
  viewer_is_author?: boolean;
  reward_type?: "none" | "thanks" | "symbolic" | "bonus_points";
  reward_note?: string | null;
  reward_points?: number | null;
  city_id?: number | null;
  district_id?: number | null;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole | null;
  city: string | null;
  district: string | null;
  city_id?: number | null;
  district_id?: number | null;
  preferred_language: AppLanguage;
  status: "active" | "blocked" | "pending";
  rating: number;
  completed_tasks_count: number;
  avatar_url: string | null;
  created_at?: string;
  onboarding_step?: number;
  onboarding_completed_at?: string | null;
  email_verified?: boolean;
  phone_verified?: boolean;
  identity_verified?: boolean;
  community_verified?: boolean;
  trust_score?: number;
  trust_level?: TrustLevel;
  trust_score_updated_at?: string | null;
  reputation_points?: number;
  reputation_level?: ReputationLevel;
  consistency_streak?: number;
  community_contribution_count?: number;
  show_public_name?: boolean;
  show_city?: boolean;
  share_community_activity?: boolean;
  allow_public_profile?: boolean;
  can_request?: boolean;
  can_volunteer?: boolean;
  transactional_email_enabled?: boolean;
  marketing_email_enabled?: boolean;
  last_active_at?: string | null;
  deleted_at?: string | null;
}

export type TrustLevel = "new_member" | "building_trust" | "trusted_member" | "highly_trusted" | "community_verified";
export type ReputationLevel = "new_member" | "kind_neighbor" | "active_helper" | "trusted_volunteer" | "community_supporter" | "community_hero" | "asar_ambassador";

export interface ImpactMetrics {
  requests_completed: number;
  active_volunteers: number;
  success_rate: number;
  cities: number;
  help_hours: number;
  positive_reviews: number;
  people_supported: number;
  requests_completed_this_week: number;
}

export interface CommunityEvent {
  id: string;
  event_type: "help_completed" | "new_volunteer" | "achievement_unlocked" | "community_milestone" | "verified_story" | "weekly_impact" | "new_city" | "badge_received" | "initiative";
  actor_name: string | null;
  actor_avatar_url: string | null;
  city: string | null;
  category_slug: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
}

export interface NotificationItem {
  id: string; type: string; title_key: string; body_key: string | null; link: string | null; payload: Record<string, unknown>; read_at: string | null; created_at: string; actor_id: string | null;
}
export interface CityOption { id: number; slug: string; name_ru: string; name_kk: string; region_id: number | null; }
export interface DistrictOption { id: number; city_id: number; slug: string; name_ru: string; name_kk: string; }
