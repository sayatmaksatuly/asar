import { NextResponse } from "next/server";
import { getAuthContext, jsonError } from "@/lib/api";

export async function POST(request: Request) {
  const context = await getAuthContext();
  if (!context.supabase || !context.user || !context.profile) return jsonError(context.error ?? "unauthorized", context.supabase ? 401 : 503);
  const body = await request.json().catch(() => null) as { role?: unknown } | null;
  if (body?.role !== "requester" && body?.role !== "volunteer") return jsonError("invalid_role", 422);
  const { data, error } = await context.supabase.rpc("complete_onboarding", { p_role: body.role });
  if (error || !data) return jsonError(error?.message ?? "onboarding_failed", 400);
  return NextResponse.json({ completed: true, role: body.role });
}
