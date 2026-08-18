import type { LucideIcon } from "lucide-react";

export function ImpactStatCard({ icon: Icon, value, label, detail }: { icon: LucideIcon; value: string | number; label: string; detail?: string }) {
  return (
    <article className="impact-card">
      <span className="impact-icon" aria-hidden="true"><Icon size={22} /></span>
      <strong>{value}</strong>
      <span>{label}</span>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}
