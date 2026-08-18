"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Alert, Input, Textarea, buttonStyles } from "@/components/ui/primitives";
import type { Dictionary } from "@/lib/i18n";

export function ReportForm({ requestId, dictionary, configured }: { requestId: string; dictionary: Dictionary; configured: boolean }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) { setError(dictionary.states.notConfigured); return; }
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_type: "request", target_id: requestId, reason: form.get("reason"), description: form.get("description") }),
      });
      if (!response.ok) throw new Error("report_failed");
      setSent(true);
      event.currentTarget.reset();
    } catch {
      setError(dictionary.states.unauthorized);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      title={dictionary.requestDetail.report}
      closeLabel={dictionary.common.cancel}
      trigger={<button type="button" className={buttonStyles("ghost")} disabled={!configured}><Flag size={18} />{dictionary.requestDetail.report}</button>}
    >
      {sent ? <Alert tone="success">{dictionary.requestDetail.reportSent}</Alert> : (
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <label className="field-label"><span>{dictionary.requestDetail.reportReason}</span><Input name="reason" minLength={3} maxLength={160} required /></label>
          <label className="field-label"><span>{dictionary.requestDetail.reportDetails}</span><Textarea name="description" maxLength={1500} /></label>
          <button type="submit" className={buttonStyles("primary")} disabled={loading}>{loading ? dictionary.states.loading : dictionary.common.send}</button>
        </form>
      )}
    </Modal>
  );
}
