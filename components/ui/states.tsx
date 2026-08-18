import { CircleCheck, CloudOff, HeartHandshake, Inbox, LoaderCircle, MapPin, SearchX, TriangleAlert } from "lucide-react";

function StateShell({ icon, title, text, children }: { icon: React.ReactNode; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="state-card" role="status">
      <span className="state-icon" aria-hidden="true">{icon}</span>
      <h2 className="text-xl font-extrabold text-[var(--ink)]">{title}</h2>
      {text ? <p className="max-w-xl text-[var(--muted)]">{text}</p> : null}
      {children}
    </div>
  );
}

export function LoadingState({ title }: { title: string }) {
  return <StateShell icon={<LoaderCircle className="animate-spin" />} title={title} />;
}

export function EmptyState({ title, text, children, variant = "search" }: { title: string; text?: string; children?: React.ReactNode; variant?: "search" | "requests" | "activity" | "community" }) {
  const icons = { search: SearchX, requests: MapPin, activity: Inbox, community: HeartHandshake };
  const Icon = icons[variant];
  return <StateShell icon={<Icon />} title={title} text={text}>{children}</StateShell>;
}

export function ErrorState({ title, text }: { title: string; text?: string }) {
  return <StateShell icon={<TriangleAlert />} title={title} text={text} />;
}

export function SuccessState({ title, text }: { title: string; text?: string }) {
  return <StateShell icon={<CircleCheck />} title={title} text={text} />;
}

export function OfflineState({ title, text }: { title: string; text?: string }) {
  return <StateShell icon={<CloudOff />} title={title} text={text} />;
}
