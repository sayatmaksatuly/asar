import type { Dictionary } from "@/lib/i18n";

export function localizedStatus(value: string | null | undefined, dictionary: Dictionary): string {
  if (!value) return "—";
  const labels: Record<string, string> = {
    ...dictionary.status,
    active: dictionary.admin.statusActive,
    blocked: dictionary.admin.statusBlocked,
    reviewing: dictionary.admin.reportReviewing,
    resolved: dictionary.admin.reportResolved,
    dismissed: dictionary.admin.reportDismissed,
    verified: dictionary.admin.verificationVerified,
    unverified: dictionary.admin.verificationUnverified,
  };
  return labels[value] ?? value;
}

export function localizedRole(value: string | null | undefined, dictionary: Dictionary): string {
  if (!value) return "—";
  return ({ requester: dictionary.admin.roleRequester, volunteer: dictionary.admin.roleVolunteer, admin: dictionary.admin.roleAdmin } as Record<string, string>)[value] ?? value;
}

export function localizedVerificationKind(value: string, dictionary: Dictionary): string {
  return ({ identity: dictionary.verification.identity, community: dictionary.verification.community } as Record<string, string>)[value] ?? value;
}

export function localizedAdminAction(value: string, dictionary: Dictionary): string {
  const labels: Record<string, string> = {
    block_user: dictionary.admin.actionBlockUser,
    unblock_user: dictionary.admin.actionUnblockUser,
    verification_resolution: dictionary.admin.actionVerificationResolution,
    remove_request_image: dictionary.admin.actionRemoveRequestImage,
    resolve_report: dictionary.admin.actionResolveReport,
    resolve_dispute: dictionary.admin.actionResolveDispute,
    verification_identity: dictionary.admin.actionVerificationIdentity,
    verification_community: dictionary.admin.actionVerificationCommunity,
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

export function localizedAdminTarget(value: string | null | undefined, dictionary: Dictionary): string {
  if (!value) return "—";
  const labels: Record<string, string> = {
    profile: dictionary.admin.targetProfile,
    request: dictionary.admin.targetRequest,
    report: dictionary.admin.targetReport,
    dispute: dictionary.admin.targetDispute,
    verification_request: dictionary.admin.targetVerificationRequest,
    assignment: dictionary.admin.targetAssignment,
    response: dictionary.admin.targetResponse,
  };
  return labels[value] ?? value.replaceAll("_", " ");
}
