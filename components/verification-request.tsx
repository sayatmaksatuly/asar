"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Select, Textarea, buttonStyles } from "@/components/ui/primitives";
import type { Dictionary } from "@/lib/i18n";

export function VerificationRequest({ dictionary, pending }: { dictionary: Dictionary; pending: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("loading");
    const response = await fetch("/api/verification/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: String(form.get("kind") ?? "identity"), note: String(form.get("note") ?? "") }),
    });
    if (response.ok) { setState("success"); router.refresh(); }
    else setState("error");
  }

  if (pending) return <Alert tone="info">{dictionary.verification.pending}</Alert>;
  return <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
    {state === "success" ? <Alert tone="success">{dictionary.verification.sent}</Alert> : null}
    {state === "error" ? <Alert tone="danger">{dictionary.states.error}</Alert> : null}
    <label className="field-label"><span>{dictionary.verification.kind}</span><Select name="kind" defaultValue="identity"><option value="identity">{dictionary.verification.identity}</option><option value="community">{dictionary.verification.community}</option></Select></label>
    <label className="field-label"><span>{dictionary.verification.note}</span><Textarea name="note" maxLength={1000} placeholder={dictionary.verification.notePlaceholder} /></label>
    <button className={buttonStyles("secondary")} disabled={state === "loading"}>{state === "loading" ? dictionary.states.loading : dictionary.verification.request}</button>
  </form>;
}
