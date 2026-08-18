"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Select, Textarea, buttonStyles } from "@/components/ui/primitives";
import type { Dictionary } from "@/lib/i18n";

function ActionButton({ endpoint, body, label, dictionary, variant = "primary", method = "POST" }: { endpoint: string; body: Record<string, string>; label: string; dictionary: Dictionary; variant?: "primary" | "secondary" | "danger"; method?: "POST" | "PATCH" }) {
  const router = useRouter(); const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  async function run() { if (!window.confirm(dictionary.states.confirmation)) return; setState("loading"); const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (response.ok) { router.refresh(); setState("idle"); } else setState("error"); }
  return <div>{state === "error" ? <p className="mb-2 text-sm font-bold text-[var(--danger)]" role="alert">{dictionary.states.error}</p> : null}<button type="button" className={buttonStyles(variant)} onClick={() => void run()} disabled={state === "loading"}>{state === "loading" ? dictionary.states.loading : label}</button></div>;
}


export function WithdrawResponseButton({ responseId, dictionary }: { responseId: string; dictionary: Dictionary }) { return <ActionButton endpoint={`/api/responses/${responseId}/withdraw`} body={{}} label={dictionary.dashboard.withdrawResponse} dictionary={dictionary} variant="secondary" />; }

export function SelectVolunteerButton({ responseId, dictionary }: { responseId: string; dictionary: Dictionary }) { return <ActionButton endpoint={`/api/responses/${responseId}/select`} body={{}} label={dictionary.dashboard.selectVolunteer} dictionary={dictionary} />; }
export function CancelRequestButton({ requestId, dictionary }: { requestId: string; dictionary: Dictionary }) {
  return <ActionButton endpoint={`/api/requests/${requestId}`} body={{ action: "cancel" }} label={dictionary.dashboard.cancelRequest} dictionary={dictionary} variant="danger" method="PATCH" />;
}

export function ReopenRequestButton({ requestId, dictionary }: { requestId: string; dictionary: Dictionary }) {
  const router = useRouter(); const [loading, setLoading] = useState(false);
  async function reopen() { setLoading(true); const response = await fetch(`/api/requests/${requestId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reopen" }) }); setLoading(false); if (response.ok) router.refresh(); }
  return <button type="button" className={buttonStyles("secondary")} onClick={() => void reopen()} disabled={loading}>{loading ? dictionary.states.loading : dictionary.dashboard.reopenRequest}</button>;
}

export function ReviewForm({ assignmentId, dictionary }: { assignmentId: string; dictionary: Dictionary }) {
  const router = useRouter(); const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); setState("loading"); const response = await fetch(`/api/assignments/${assignmentId}/reviews`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating: Number(form.get("rating")), text: String(form.get("text") ?? "") }) }); if (response.ok) { setState("success"); router.refresh(); } else setState("error"); }
  return <form className="mt-4 grid gap-3" onSubmit={(event) => void submit(event)}>{state === "success" ? <Alert tone="success">{dictionary.states.success}</Alert> : null}{state === "error" ? <Alert tone="danger">{dictionary.states.error}</Alert> : null}<label className="field-label"><span>{dictionary.dashboard.rating}</span><Select name="rating" defaultValue="5">{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} / 5</option>)}</Select></label><label className="field-label"><span>{dictionary.dashboard.reviews}</span><Textarea name="text" maxLength={1200} /></label><button className={buttonStyles("primary")} disabled={state === "loading"}>{dictionary.dashboard.leaveReview}</button></form>;
}
