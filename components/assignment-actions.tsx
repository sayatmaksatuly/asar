"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Input, Select, Textarea, buttonStyles } from "@/components/ui/primitives";
import type { Dictionary } from "@/lib/i18n";

type AssignmentAction = "start" | "mark_done" | "confirm" | "cancel" | "dispute";

async function postTransition(assignmentId: string, payload: Record<string, unknown>) {
  return fetch(`/api/assignments/${assignmentId}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function AssignmentActions({ assignmentId, status, isRequester, isVolunteer, dictionary }: { assignmentId: string; status: string; isRequester: boolean; isVolunteer: boolean; dictionary: Dictionary }) {
  const router = useRouter();
  const [busy, setBusy] = useState<AssignmentAction | null>(null);
  const [error, setError] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [disputeReason, setDisputeReason] = useState("other");
  const [description, setDescription] = useState("");
  const [minutes, setMinutes] = useState("30");

  async function run(action: AssignmentAction, extra: Record<string, unknown> = {}) {
    if (!window.confirm(dictionary.states.confirmation)) return;
    setBusy(action); setError(false);
    const response = await postTransition(assignmentId, { action, ...extra });
    if (response.ok) { router.refresh(); }
    else setError(true);
    setBusy(null);
  }

  const active = !["completed", "cancelled"].includes(status);
  return <div className="grid gap-5">
    {error ? <Alert tone="danger">{dictionary.auth.genericError}</Alert> : null}
    <div className="flex flex-wrap gap-3">
      {isVolunteer && status === "volunteer_selected" ? <button className={buttonStyles("primary")} type="button" disabled={busy !== null} onClick={() => void run("start")}>{busy === "start" ? dictionary.states.loading : dictionary.assignment.start}</button> : null}
      {isRequester && status === "awaiting_confirmation" ? <button className={buttonStyles("primary")} type="button" disabled={busy !== null} onClick={() => void run("confirm")}>{busy === "confirm" ? dictionary.states.loading : dictionary.assignment.confirm}</button> : null}
    </div>
    {isVolunteer && status === "in_progress" ? <div className="rounded-2xl border border-[var(--line)] p-4"><label className="field-label"><span>{dictionary.assignment.duration}</span><Input type="number" min={5} max={1440} step={5} value={minutes} onChange={(event) => setMinutes(event.target.value)} /></label><button className={`${buttonStyles("primary")} mt-3`} type="button" disabled={busy !== null} onClick={() => void run("mark_done", { help_minutes: Math.max(5, Math.min(1440, Number(minutes) || 30)) })}>{busy === "mark_done" ? dictionary.states.loading : dictionary.assignment.finish}</button></div> : null}
    {isVolunteer && ["volunteer_selected", "in_progress"].includes(status) ? <div className="rounded-2xl border border-[var(--line)] p-4"><label className="field-label"><span>{dictionary.assignment.cancelReason}</span><Input maxLength={240} minLength={3} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></label><button className={`${buttonStyles("secondary")} mt-3`} type="button" disabled={busy !== null || cancelReason.trim().length < 3} onClick={() => void run("cancel", { reason: cancelReason })}>{busy === "cancel" ? dictionary.states.loading : dictionary.assignment.cancel}</button></div> : null}
    {active && (isRequester || isVolunteer) ? <div className="rounded-2xl border border-[var(--line)] p-4"><label className="field-label"><span>{dictionary.assignment.problemReason}</span><Select value={disputeReason} onChange={(event) => setDisputeReason(event.target.value)}>{Object.entries(dictionary.assignment.reasons).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</Select></label><label className="field-label mt-3"><span>{dictionary.assignment.problemDescription}</span><Textarea maxLength={1500} value={description} onChange={(event) => setDescription(event.target.value)} /></label><button className={`${buttonStyles("danger")} mt-3`} type="button" disabled={busy !== null} onClick={() => void run("dispute", { reason: disputeReason, description })}>{busy === "dispute" ? dictionary.states.loading : dictionary.assignment.dispute}</button></div> : null}
  </div>;
}
