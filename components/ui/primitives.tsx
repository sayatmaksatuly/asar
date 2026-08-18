import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Star } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import type { RequestStatus, ResponseStatus } from "@/types/domain";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export function buttonStyles(variant: ButtonVariant = "primary"): string {
  const base = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-bold transition focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary: "bg-[var(--brand)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--brand-strong)]",
    secondary: "border border-[var(--line-strong)] bg-white text-[var(--ink)] hover:bg-[var(--surface-soft)]",
    ghost: "text-[var(--brand-strong)] hover:bg-[var(--brand-wash)]",
    danger: "bg-[var(--danger)] text-white hover:opacity-90",
  };
  return `${base} ${variants[variant]}`;
}

export function Button({ className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={`${buttonStyles(variant)} ${className}`} {...props} />;
}

export function IconButton({ className = "", label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button className={`icon-button ${className}`} aria-label={label} {...props}>{children}</button>;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`field ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`field appearance-none bg-[linear-gradient(45deg,transparent_50%,var(--muted)_50%),linear-gradient(135deg,var(--muted)_50%,transparent_50%)] bg-[position:calc(100%-18px)_50%,calc(100%-13px)_50%] bg-[size:5px_5px,5px_5px] bg-no-repeat pr-10 ${className}`} {...props}>{children}</select>;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`field min-h-32 resize-y ${className}`} {...props} />;
}

export function Checkbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[var(--ink-soft)]">
      <input type="checkbox" className="mt-1 size-5 rounded border-[var(--line-strong)] accent-[var(--brand)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--focus)]" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "brand" | "warning" | "success" | "danger" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Alert({ title, children, tone = "info" }: { title?: string; children: React.ReactNode; tone?: "info" | "warning" | "danger" | "success" }) {
  return (
    <div className={`alert alert-${tone}`} role={tone === "danger" ? "alert" : "status"}>
      {title ? <strong className="block text-[var(--ink)]">{title}</strong> : null}
      <div>{children}</div>
    </div>
  );
}

export function UserAvatar({ name, src, size = "md" }: { name: string; src?: string | null; size?: "sm" | "md" | "lg" }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
  const sizes = { sm: "size-9 text-xs", md: "size-12 text-sm", lg: "size-20 text-xl" };
  return src ? (
    // A plain image keeps Supabase Storage URLs usable before a host is known.
    // eslint-disable-next-line @next/next/no-img-element
    <img className={`${sizes[size]} rounded-full object-cover ring-2 ring-white`} src={src} alt={name} />
  ) : (
    <span className={`${sizes[size]} inline-flex items-center justify-center rounded-full bg-[var(--brand-wash)] font-extrabold text-[var(--brand-strong)] ring-2 ring-white`} aria-label={name}>{initials}</span>
  );
}

export function Rating({ value, label }: { value: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-bold" aria-label={label ?? `${value} / 5`}>
      <Star aria-hidden="true" size={17} fill="currentColor" className="text-[var(--sun)]" />
      {Number(value || 0).toFixed(1)}
    </span>
  );
}

export function StatusBadge({ status, dictionary }: { status: RequestStatus | ResponseStatus; dictionary: Dictionary }) {
  const tone = status === "completed" || status === "accepted" ? "success" : status === "disputed" ? "danger" : status === "in_progress" || status === "volunteer_selected" ? "brand" : status === "cancelled" || status === "rejected" || status === "withdrawn" ? "neutral" : "warning";
  return <Badge tone={tone}>{dictionary.status[status]}</Badge>;
}
