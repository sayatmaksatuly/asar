import { NextResponse } from "next/server";
import { getAuthContext, jsonError } from "@/lib/api";

export async function PATCH(request: Request) {
  const context = await getAuthContext();
  if (!context.supabase || !context.user || !context.profile) return jsonError(context.error ?? "unauthorized", context.supabase ? 401 : 503);
  if (context.profile.role || context.profile.onboarding_completed_at) return jsonError("onboarding_completed", 409);
  const body = await request.json().catch(() => null) as { step?: unknown } | null;
  const step = Number(body?.step);
  if (!Number.isInteger(step) || step < 0 || step > 4) return jsonError("invalid_step", 422);
  const { error } = await context.supabase.rpc("set_onboarding_progress", { p_step: step });
  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ step });
}
