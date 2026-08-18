import type {
  AppLanguage,
  AssignmentStatus,
  HelpFormat,
  RequestStatus,
  ResponseStatus,
  UrgencyLevel,
  UserRole,
  UserStatus,
  VerificationStatus,
} from "@/types/domain";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: UserRole | null;
          city: string | null;
          district: string | null;
          city_id: number | null;
          district_id: number | null;
          preferred_language: AppLanguage;
          status: "active" | "blocked" | "pending";
          rating: number;
          completed_tasks_count: number;
          created_at: string;
          updated_at: string;
          onboarding_step: number;
          onboarding_completed_at: string | null;
          email_verified: boolean;
          phone_verified: boolean;
          identity_verified: boolean;
          community_verified: boolean;
          trust_score: number;
          trust_level: "new_member" | "building_trust" | "trusted_member" | "highly_trusted" | "community_verified";
          trust_score_updated_at: string | null;
          reputation_points: number;
          reputation_level: "new_member" | "kind_neighbor" | "active_helper" | "trusted_volunteer" | "community_supporter" | "community_hero" | "asar_ambassador";
          consistency_streak: number;
          community_contribution_count: number;
          share_community_activity: boolean;
          show_public_name: boolean;
          show_city: boolean;
          allow_public_profile: boolean;
          can_request: boolean;
          can_volunteer: boolean;
          transactional_email_enabled: boolean;
          marketing_email_enabled: boolean;
          last_active_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole | null;
          city?: string | null;
          district?: string | null;
          city_id?: number | null;
          district_id?: number | null;
          preferred_language?: AppLanguage;
          status?: "active" | "blocked" | "pending";
          rating?: number;
          completed_tasks_count?: number;
          created_at?: string;
          updated_at?: string;
          onboarding_step?: number;
          onboarding_completed_at?: string | null;
          email_verified?: boolean;
          phone_verified?: boolean;
          identity_verified?: boolean;
          community_verified?: boolean;
          trust_score?: number;
          trust_level?: "new_member" | "building_trust" | "trusted_member" | "highly_trusted" | "community_verified";
          trust_score_updated_at?: string | null;
          reputation_points?: number;
          reputation_level?: "new_member" | "kind_neighbor" | "active_helper" | "trusted_volunteer" | "community_supporter" | "community_hero" | "asar_ambassador";
          consistency_streak?: number;
          community_contribution_count?: number;
          share_community_activity?: boolean;
          show_public_name?: boolean;
          show_city?: boolean;
          allow_public_profile?: boolean;
          can_request?: boolean;
          can_volunteer?: boolean;
          transactional_email_enabled?: boolean;
          marketing_email_enabled?: boolean;
          last_active_at?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      volunteer_profiles: {
        Row: {
          user_id: string;
          bio: string | null;
          skills: string[];
          availability: string | null;
          verification_status: "unverified" | "pending" | "verified" | "rejected";
          bonus_balance: number;
          level: number;
          created_at: string;
          updated_at: string;
          reputation_points: number;
          reputation_level: string;
          positive_reviews_count: number;
          successful_helps_count: number;
          last_active_at: string | null;
          verification_requested_at: string | null;
        };
        Insert: {
          user_id: string;
          bio?: string | null;
          skills?: string[];
          availability?: string | null;
          verification_status?: "unverified" | "pending" | "verified" | "rejected";
          bonus_balance?: number;
          level?: number;
          created_at?: string;
          updated_at?: string;
          reputation_points?: number;
          reputation_level?: string;
          positive_reviews_count?: number;
          successful_helps_count?: number;
          last_active_at?: string | null;
          verification_requested_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["volunteer_profiles"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name_ru: string;
          name_kk: string;
          description_ru: string | null;
          description_kk: string | null;
          icon: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["categories"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      help_requests: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          description: string;
          content_language: AppLanguage;
          category_id: string;
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
          selected_volunteer_id: string | null;
          created_at: string;
          updated_at: string;
          reward_type: "none" | "thanks" | "bonus_points" | "symbolic";
          reward_note: string | null;
          reward_points: number | null;
          city_id: number | null;
          district_id: number | null;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          description: string;
          content_language: AppLanguage;
          category_id: string;
          city: string;
          district: string;
          desired_date?: string | null;
          time_from?: string | null;
          time_to?: string | null;
          urgency?: UrgencyLevel;
          help_format?: HelpFormat;
          status?: RequestStatus;
          image_url?: string | null;
          special_conditions?: string | null;
          selected_volunteer_id?: string | null;
          created_at?: string;
          updated_at?: string;
          reward_type?: "none" | "thanks" | "bonus_points" | "symbolic";
          reward_note?: string | null;
          reward_points?: number | null;
          city_id?: number | null;
          district_id?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["help_requests"]["Insert"]>;
        Relationships: [];
      };
      request_private_details: {
        Row: {
          request_id: string;
          address: string;
          location_notes: string | null;
          preferred_contact_method: string | null;
          contact_value: string | null;
          created_at: string;
          updated_at: string;
          volunteer_instructions: string | null;
        };
        Insert: {
          request_id: string;
          address: string;
          location_notes?: string | null;
          preferred_contact_method?: string | null;
          contact_value?: string | null;
          created_at?: string;
          updated_at?: string;
          volunteer_instructions?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["request_private_details"]["Insert"]>;
        Relationships: [];
      };
      responses: {
        Row: { id: string; request_id: string; volunteer_id: string; message: string; status: ResponseStatus; created_at: string; updated_at: string };
        Insert: { id?: string; request_id: string; volunteer_id: string; message: string; status?: ResponseStatus; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["responses"]["Insert"]>;
        Relationships: [];
      };
      assignments: {
        Row: { id: string; request_id: string; volunteer_id: string; started_at: string | null; volunteer_completed_at: string | null; requester_confirmed_at: string | null; status: AssignmentStatus; help_minutes: number; cancelled_by: string | null; cancellation_reason: string | null; cancelled_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; request_id: string; volunteer_id: string; status?: AssignmentStatus; started_at?: string | null; volunteer_completed_at?: string | null; requester_confirmed_at?: string | null; help_minutes?: number; cancelled_by?: string | null; cancellation_reason?: string | null; cancelled_at?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["assignments"]["Insert"]>;
        Relationships: [];
      };
      reviews: {
        Row: { id: string; assignment_id: string; author_id: string; receiver_id: string; rating: number; text: string | null; created_at: string };
        Insert: { id?: string; assignment_id: string; author_id: string; receiver_id: string; rating: number; text?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
        Relationships: [];
      };
      bonus_transactions: {
        Row: { id: string; volunteer_id: string; assignment_id: string | null; amount: number; reason: "assignment_completion" | "urgent_completion" | "positive_review" | "admin_adjustment"; note: string | null; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["bonus_transactions"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      reports: {
        Row: { id: string; author_id: string; target_type: "profile" | "request" | "response" | "assignment"; target_id: string; reason: string; description: string | null; status: "open" | "reviewing" | "resolved" | "dismissed"; reviewed_by: string | null; resolution_note: string | null; resolved_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; author_id: string; target_type: "profile" | "request" | "response" | "assignment"; target_id: string; reason: string; description?: string | null; status?: "open" | "reviewing" | "resolved" | "dismissed"; reviewed_by?: string | null; resolution_note?: string | null; resolved_at?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [];
      };
      achievements: {
        Row: { id: string; slug: string; name_ru: string; name_kk: string; description_ru: string | null; description_kk: string | null; icon: string | null; required_completed_tasks: number; category: string; rarity: "common" | "uncommon" | "rare" | "special"; points_reward: number; sort_order: number; criteria: Json; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["achievements"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["achievements"]["Insert"]>;
        Relationships: [];
      };
      volunteer_achievements: {
        Row: { volunteer_id: string; achievement_id: string; awarded_at: string };
        Insert: { volunteer_id: string; achievement_id: string; awarded_at?: string };
        Update: never;
        Relationships: [];
      };
      achievement_progress: {
        Row: { user_id: string; achievement_id: string; progress: number; target: number; unlocked_at: string | null; updated_at: string };
        Insert: { user_id: string; achievement_id: string; progress?: number; target?: number; unlocked_at?: string | null; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["achievement_progress"]["Insert"]>;
        Relationships: [];
      };
      request_drafts: {
        Row: { id: string; author_id: string; request_id: string | null; current_step: number; payload: Json; created_at: string; updated_at: string };
        Insert: { id?: string; author_id: string; request_id?: string | null; current_step?: number; payload?: Json; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["request_drafts"]["Insert"]>;
        Relationships: [];
      };
      community_events: {
        Row: { id: string; event_type: string; actor_id: string | null; target_type: string | null; target_id: string | null; city: string | null; category_slug: string | null; payload: Json; is_anonymous: boolean; is_published: boolean; occurred_at: string; created_at: string };
        Insert: { id?: string; event_type: string; actor_id?: string | null; target_type?: string | null; target_id?: string | null; city?: string | null; category_slug?: string | null; payload?: Json; is_anonymous?: boolean; is_published?: boolean; occurred_at?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["community_events"]["Insert"]>;
        Relationships: [];
      };
      reputation_ledger: {
        Row: { id: string; user_id: string; points: number; reason: string; source_type: string; source_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["reputation_ledger"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      notifications: {
        Row: { id: string; user_id: string; type: string; actor_id: string | null; title_key: string; body_key: string | null; link: string | null; payload: Json; read_at: string | null; created_at: string };
        Insert: { id?: string; user_id: string; type: string; actor_id?: string | null; title_key: string; body_key?: string | null; link?: string | null; payload?: Json; read_at?: string | null; created_at?: string };
        Update: { read_at?: string | null }; Relationships: [];
      };
      email_outbox: {
        Row: { id: string; user_id: string | null; recipient_email: string; event_type: string; locale: AppLanguage; payload: Json; status: "pending" | "processing" | "sent" | "failed" | "cancelled"; attempts: number; last_error: string | null; available_at: string; sent_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id?: string | null; recipient_email: string; event_type: string; locale?: AppLanguage; payload?: Json; status?: "pending" | "processing" | "sent" | "failed" | "cancelled"; attempts?: number; last_error?: string | null; available_at?: string; sent_at?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["email_outbox"]["Insert"]>; Relationships: [];
      };
      disputes: {
        Row: { id: string; request_id: string; assignment_id: string; opened_by: string; reason: string; description: string | null; status: "open" | "reviewing" | "resolved" | "dismissed"; resolution_action: string | null; resolution_note: string | null; resolved_by: string | null; resolved_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; request_id: string; assignment_id: string; opened_by: string; reason: string; description?: string | null; status?: "open" | "reviewing" | "resolved" | "dismissed"; resolution_action?: string | null; resolution_note?: string | null; resolved_by?: string | null; resolved_at?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["disputes"]["Insert"]>; Relationships: [];
      };
      verification_requests: {
        Row: { id: string; user_id: string; kind: string; status: "unverified" | "pending" | "verified" | "rejected"; note: string | null; reviewed_by: string | null; review_reason: string | null; reviewed_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; kind: string; status?: "unverified" | "pending" | "verified" | "rejected"; note?: string | null; reviewed_by?: string | null; review_reason?: string | null; reviewed_at?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["verification_requests"]["Insert"]>; Relationships: [];
      };
      user_consents: {
        Row: { id: string; user_id: string; document_type: string; version: string; request_id: string | null; accepted_at: string; metadata: Json };
        Insert: { id?: string; user_id: string; document_type: string; version: string; request_id?: string | null; accepted_at?: string; metadata?: Json }; Update: never; Relationships: [];
      };
      account_deletion_requests: {
        Row: { id: string; user_id: string; status: string; requested_at: string; anonymized_at: string | null; purged_at: string | null; error_note: string | null };
        Insert: { id?: string; user_id: string; status?: string; requested_at?: string; anonymized_at?: string | null; purged_at?: string | null; error_note?: string | null }; Update: never; Relationships: [];
      };
      product_events: {
        Row: { id: number; user_id: string | null; session_id: string | null; event_name: string; request_id: string | null; assignment_id: string | null; locale: AppLanguage | null; metadata: Json; created_at: string };
        Insert: { user_id?: string | null; session_id?: string | null; event_name: string; request_id?: string | null; assignment_id?: string | null; locale?: AppLanguage | null; metadata?: Json; created_at?: string }; Update: never; Relationships: [];
      };
      regions: { Row: { id: number; code: string; name_ru: string; name_kk: string }; Insert: { code: string; name_ru: string; name_kk: string }; Update: never; Relationships: []; };
      cities: { Row: { id: number; region_id: number | null; slug: string; name_ru: string; name_kk: string; aliases: string[]; is_active: boolean }; Insert: { region_id?: number | null; slug: string; name_ru: string; name_kk: string; aliases?: string[]; is_active?: boolean }; Update: never; Relationships: []; };
      districts: { Row: { id: number; city_id: number; slug: string; name_ru: string; name_kk: string; is_active: boolean }; Insert: { city_id: number; slug: string; name_ru: string; name_kk: string; is_active?: boolean }; Update: never; Relationships: []; };
      moderation_actions: {
        Row: { id: string; admin_id: string; target_user_id: string | null; action_type: string; reason: string; previous_value: Json | null; new_value: Json | null; target_type: string | null; target_id: string | null; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["moderation_actions"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      public_profiles: {
        Row: { id: string; full_name: string; avatar_url: string | null; role: UserRole; can_volunteer: boolean; city: string | null; district: string | null; city_id: number | null; district_id: number | null; city_name_ru: string | null; city_name_kk: string | null; district_name_ru: string | null; district_name_kk: string | null; rating: number; completed_tasks_count: number; trust_score: number; trust_level: string; reputation_points: number; reputation_level: string; community_verified: boolean; created_at: string; email_verified: boolean; phone_verified: boolean; identity_verified: boolean };
        Relationships: [];
      };
      public_help_requests: {
        Row: {
          id: string;
          title: string;
          description: string;
          content_language: AppLanguage;
          category_id: string;
          category_slug: string | null;
          category_name_ru: string | null;
          category_name_kk: string | null;
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
          response_count: number;
          author_name: string | null;
          author_rating: number | null;
          author_avatar_url: string | null;
          viewer_is_author: boolean;
          reward_type: "none" | "thanks" | "symbolic" | "bonus_points";
          reward_note: string | null;
          reward_points: number | null;
          city_id: number | null;
          district_id: number | null;
        };
        Relationships: [];
      };
      public_community_events: {
        Row: { id: string; event_type: string; actor_name: string | null; actor_avatar_url: string | null; city: string | null; category_slug: string | null; payload: Json; occurred_at: string };
        Relationships: [];
      };
      public_reviews: { Row: { id: string; assignment_id: string; rating: number; text: string | null; created_at: string; reviewer_name: string | null; reviewer_avatar_url: string | null }; Relationships: []; };
      participant_profiles: { Row: { id: string; full_name: string; avatar_url: string | null; rating: number; completed_tasks_count: number; trust_score: number; trust_level: string; reputation_points: number; reputation_level: string; community_verified: boolean; email_verified: boolean; phone_verified: boolean; identity_verified: boolean; verification_status: string | null; positive_reviews_count: number | null; successful_helps_count: number | null }; Relationships: []; };
    };
    Functions: {
      create_help_request: { Args: { p_payload: Json }; Returns: string };
      select_volunteer: { Args: { p_request_id: string; p_response_id: string }; Returns: string };
      update_help_request: { Args: { p_request_id: string; p_payload: Json }; Returns: undefined };
      start_assignment: { Args: { p_assignment_id: string }; Returns: undefined };
      confirm_assignment_completion: { Args: { p_assignment_id: string }; Returns: number };
      submit_review: { Args: { p_assignment_id: string; p_rating: number; p_text: string | null }; Returns: string };
      set_onboarding_progress: { Args: { p_step: number }; Returns: number };
      complete_onboarding: { Args: { p_role: "requester" | "volunteer" }; Returns: Database["public"]["Tables"]["profiles"]["Row"] };
      save_request_draft: { Args: { p_draft_id: string | null; p_step: number; p_payload: Json }; Returns: string };
      get_community_impact: { Args: Record<string, never>; Returns: Array<{ requests_completed: number; active_volunteers: number; success_rate: number; cities: number; help_hours: number; positive_reviews: number; people_supported: number; requests_completed_this_week: number }> };
      enable_volunteer_capability: { Args: Record<string, never>; Returns: undefined };
      get_participant_profile: { Args: { p_user_id: string; p_request_id: string }; Returns: Array<Database["public"]["Views"]["participant_profiles"]["Row"]> };
      get_public_profile_reviews: { Args: { p_profile_id:string }; Returns: Array<{id:string;rating:number;text:string|null;created_at:string;reviewer_name:string|null;reviewer_avatar_url:string|null;context_category_ru:string;context_category_kk:string}> };
      get_response_participant_profiles: { Args: Record<string, never>; Returns: Array<{ response_id:string; request_id:string; volunteer_id:string; full_name:string; avatar_url:string|null; rating:number; trust_score:number; trust_level:string; reputation_points:number; reputation_level:string; verification_status:VerificationStatus|null; positive_reviews_count:number|null; successful_helps_count:number|null }> };
      get_my_assignments: { Args: Record<string, never>; Returns: Array<{ id:string; request_id:string; volunteer_id:string; status:AssignmentStatus; started_at:string|null; volunteer_completed_at:string|null; requester_confirmed_at:string|null; help_minutes:number; cancelled_at:string|null; cancellation_reason:string|null; created_at:string; request_title:string; request_status:RequestStatus; requester_id:string }> };
      get_assignment_context: { Args: { p_assignment_id: string }; Returns: Json };
      create_response: { Args: { p_request_id: string; p_message: string }; Returns: string };
      withdraw_response: { Args: { p_response_id: string }; Returns: undefined };
      mark_assignment_done: { Args: { p_assignment_id: string; p_help_minutes?: number | null }; Returns: undefined };
      cancel_assignment: { Args: { p_assignment_id: string; p_reason: string }; Returns: undefined };
      cancel_request: { Args: { p_request_id: string; p_reason?: string | null }; Returns: undefined };
      reopen_request: { Args: { p_request_id: string }; Returns: undefined };
      open_dispute: { Args: { p_assignment_id: string; p_reason: string; p_description?: string | null }; Returns: string };
      create_report: { Args: { p_target_type: string; p_target_id: string; p_reason: string; p_description?: string | null }; Returns: string };
      request_verification: { Args: { p_kind: string; p_note?: string | null }; Returns: string };
      admin_resolve_verification: { Args: { p_request_id: string; p_approve: boolean; p_reason: string }; Returns: undefined };
      admin_set_user_blocked: { Args: { p_user_id: string; p_blocked: boolean; p_reason: string }; Returns: undefined };
      admin_list_users: { Args: { p_search?: string | null; p_role?: string | null; p_status?: string | null; p_verification?: string | null; p_min_trust?: number | null; p_offset?: number; p_limit?: number }; Returns: { id: string; full_name: string; email: string | null; role: UserRole; status: UserStatus; verification_status: VerificationStatus; trust_score: number; created_at: string; completed_tasks_count: number; reports_count: number; total_count: number }[] };
      admin_resolve_dispute: { Args: { p_dispute_id: string; p_action: string; p_reason: string }; Returns: undefined };
      admin_remove_request_image: { Args: { p_request_id: string; p_reason: string }; Returns: string | null };
      admin_resolve_report: { Args: { p_report_id: string; p_status: string; p_reason: string }; Returns: undefined };
      consume_rate_limit: { Args: { p_scope: string; p_limit: number; p_window_seconds: number }; Returns: undefined };
      admin_get_product_metrics: { Args: { p_from?: string; p_to?: string }; Returns: Json };
      purge_expired_sensitive_data: { Args: Record<string, never>; Returns: Json };
      refresh_stale_trust_scores: { Args: { p_limit?: number }; Returns: number };
      record_consent: { Args: { p_document_type: string; p_version: string; p_request_id?: string | null; p_metadata?: Json }; Returns: string };
      request_account_deletion: { Args: Record<string, never>; Returns: string };
      get_my_data_export: { Args: Record<string, never>; Returns: Json };
      track_product_event: { Args: { p_event_name: string; p_session_id?: string | null; p_request_id?: string | null; p_assignment_id?: string | null; p_locale?: string | null; p_metadata?: Json }; Returns: undefined };
      track_public_product_event: { Args: { p_event_name: string; p_session_id?: string | null; p_request_id?: string | null; p_locale?: string | null }; Returns: undefined };
      admin_adjust_trust_score: { Args: { p_user_id: string; p_new_score: number; p_reason: string }; Returns: undefined };
      admin_set_verification: { Args: { p_user_id: string; p_kind: "phone" | "identity" | "community"; p_verified: boolean; p_reason: string }; Returns: undefined };
      admin_set_community_event_visibility: { Args: { p_event_id: string; p_visible: boolean; p_reason: string }; Returns: undefined };
    };
    Enums: Record<string, string>;
    CompositeTypes: Record<string, never>;
  };
}

export type DatabaseJson = Json;
