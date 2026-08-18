"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n";

function sessionId() {
  try {
    const key = "asar_analytics_session";
    let value = sessionStorage.getItem(key);
    if (!value) { value = crypto.randomUUID(); sessionStorage.setItem(key, value); }
    return value;
  } catch { return undefined; }
}

export function ProductAnalyticsEvent({ event, locale, requestId }: { event: "landing_visit" | "request_viewed"; locale: Locale; requestId?: string }) {
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, locale, request_id: requestId, session_id: sessionId() }),
      keepalive: true,
      signal: controller.signal,
    }).catch(() => undefined);
    return () => controller.abort();
  }, [event, locale, requestId]);
  return null;
}
