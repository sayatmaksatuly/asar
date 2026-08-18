"use client";

import { useState } from "react";
import { Alert, Textarea, buttonStyles } from "@/components/ui/primitives";
import type { Dictionary } from "@/lib/i18n";

export function ResponseForm({ requestId, dictionary, configured }: { requestId: string; dictionary: Dictionary; configured: boolean }) {
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) { setState("error"); return; }
    setState("loading");
    const response = await fetch(`/api/requests/${requestId}/responses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
    if (response.ok) { setState("success"); setMessage(""); } else { setState("error"); }
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
      {state === "success" ? <Alert tone="success">{dictionary.requestDetail.responseSent}</Alert> : null}
      {state === "error" ? <Alert tone="danger">{configured ? dictionary.auth.genericError : dictionary.states.notConfigured}</Alert> : null}
      <label className="field-label"><span>{dictionary.requestDetail.responseMessage}</span><Textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={1000} required /></label>
      <button className={buttonStyles("primary")} disabled={state === "loading" || !configured} type="submit">{state === "loading" ? dictionary.states.loading : dictionary.requestDetail.respond}</button>
    </form>
  );
}
