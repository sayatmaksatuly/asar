import { NextResponse } from "next/server";
import { getAuthContext, jsonError } from "@/lib/api";
import type { Json } from "@/types/database";

export async function GET() {
  const context = await getAuthContext();
  if (!context.supabase || !context.user || !context.profile) return jsonError(context.error ?? "unauthorized", context.supabase ? 401 : 503);
  const { data, error } = await context.supabase.from("request_drafts").select("id,current_step,payload,updated_at").eq("author_id", context.user.id).is("request_id", null).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ draft: data ?? null });
}

export async function PUT(request: Request) {
  const context = await getAuthContext();
  if (!context.supabase || !context.user || !context.profile) return jsonError(context.error ?? "unauthorized", context.supabase ? 401 : 503);
  if (!context.profile.onboarding_completed_at || !context.profile.role || !["requester","admin"].includes(context.profile.role)) return jsonError("forbidden", 403);
  const body = await request.json().catch(() => null) as { id?: unknown; step?: unknown; payload?: unknown } | null;
  const step = Number(body?.step);
  if (!body || !Number.isInteger(step) || step < 1 || step > 7 || !body.payload || typeof body.payload !== "object") return jsonError("invalid_draft", 422);
  const id = typeof body.id === "string" && body.id ? body.id : null;
  const { data, error } = await context.supabase.rpc("save_request_draft", { p_draft_id: id, p_step: step, p_payload: body.payload as Json });
  if (error || !data) return jsonError(error?.message ?? "draft_failed", 400);
  return NextResponse.json({ id: data, saved: true });
}
