import { BadgeCheck, CircleDashed } from "lucide-react";

export function VerificationBadge({ verified, label }: { verified: boolean; label: string }) {
  return <span className={`verification-badge ${verified ? "is-verified" : ""}`}>{verified ? <BadgeCheck aria-hidden="true" /> : <CircleDashed aria-hidden="true" />}<span>{label}</span></span>;
}
