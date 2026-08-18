import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { extractDatabaseCode, logServerFailure } from "@/lib/observability";

const SAFE_ERROR_CODES = new Set([
  "not_configured", "unauthorized", "profile_missing", "validation_error", "invalid_json", "invalid_action",
  "forbidden", "user_blocked", "onboarding_required", "request_capability_required", "volunteer_capability_required",
  "request_not_accepting_responses", "response_already_exists", "response_not_withdrawable", "request_not_selectable",
  "response_not_found", "active_assignment_exists", "transition_forbidden", "assignment_not_confirmable",
  "confirmation_forbidden", "assignment_not_cancellable", "request_not_cancellable", "request_not_reopenable",
  "dispute_forbidden", "assignment_not_disputable", "invalid_dispute_reason", "review_forbidden",
  "assignment_not_completed", "review_already_exists", "admin_required", "reason_required", "not_found",
  "verification_request_not_found", "invalid_verification_kind", "cancellation_reason_required", "invalid_help_minutes",
  "safety_consent_required", "rate_limited", "operation_failed", "emergency_request_not_supported",
  "prohibited_request_content", "spam_request_content", "unsafe_contact_content", "account_already_deleted",
  "assignment_not_found", "request_update_forbidden", "request_locked", "contact_required",
  "assignment_forbidden", "cannot_block_self", "completed_request_locked", "critical_fields_forbidden",
  "dispute_not_found", "draft_not_found", "event_not_found", "invalid_city", "invalid_district", "invalid_consent", "invalid_event",
  "invalid_rating", "invalid_report", "invalid_resolution", "invalid_response_message", "invalid_role", "invalid_verification",
  "onboarding_already_completed", "onboarding_completed", "invalid_step", "profile_not_available", "profile_not_found", "protected_profile_fields_forbidden",
  "protected_volunteer_fields_forbidden", "report_not_found", "report_target_not_found", "request_not_found",
  "requester_required", "role_change_forbidden", "status_transition_forbidden",
]);

function normalizeError(raw: string | null | undefined): string {
  const text = (raw ?? "operation_failed").toLowerCase();
  for (const code of SAFE_ERROR_CODES) if (text.includes(code)) return code;
  if (text.includes("duplicate key") || text.includes("23505")) return "response_already_exists";
  if (text.includes("row-level security") || text.includes("permission denied") || text.includes("42501")) return "forbidden";
  return "operation_failed";
}

export function jsonError(error: string | null | undefined, status = 400) {
  const code = normalizeError(error);
  if (status >= 500 || code === "operation_failed") {
    logServerFailure({ code, status, databaseCode: extractDatabaseCode(error) });
  }
  return NextResponse.json({ error: code }, { status });
}

export function statusForDatabaseError(message: string | null | undefined, fallback = 400) {
  const code = normalizeError(message);
  if (code === "unauthorized") return 401;
  if (["forbidden", "user_blocked", "admin_required", "request_capability_required", "volunteer_capability_required"].includes(code)) return 403;
  if (["response_already_exists", "active_assignment_exists", "review_already_exists"].includes(code)) return 409;
  if (["not_found", "response_not_found", "verification_request_not_found", "report_target_not_found", "profile_not_found", "request_not_found", "assignment_not_found", "dispute_not_found", "report_not_found", "draft_not_found", "event_not_found"].includes(code)) return 404;
  if (["validation_error", "invalid_json", "invalid_action", "invalid_dispute_reason", "invalid_help_minutes", "cancellation_reason_required", "reason_required", "emergency_request_not_supported", "prohibited_request_content", "spam_request_content", "unsafe_contact_content", "contact_required", "invalid_city", "invalid_district", "invalid_consent", "invalid_rating", "invalid_report", "invalid_resolution", "invalid_response_message", "invalid_role", "invalid_verification", "invalid_step"].includes(code)) return 422;
  if (code === "rate_limited") return 429;
  return fallback;
}

export async function getAuthContext() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null, profile: null, error: "not_configured" } as const;
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { supabase, user: null, profile: null, error: "unauthorized" } as const;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,role,status,onboarding_completed_at,onboarding_step,can_request,can_volunteer,deleted_at")
    .eq("id", auth.user.id)
    .maybeSingle();
  return { supabase, user: auth.user, profile, error: profile ? null : "profile_missing" } as const;
}
