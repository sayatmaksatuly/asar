import { NextResponse } from "next/server";
import { getAuthContext, jsonError } from "@/lib/api";
import { validateCreateRequest } from "@/validation/request";
import { moderateRequestText } from "@/lib/moderation";
import type { Json } from "@/types/database";

export async function POST(request: Request) {
  const context = await getAuthContext();
  if (!context.supabase) return jsonError(context.error, 503);
  if (!context.user || !context.profile) return jsonError(context.error ?? "unauthorized", 401);
  if (context.profile.status !== "active" || (!context.profile.can_request && context.profile.role !== "admin")) return jsonError("forbidden", 403);

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("invalid_json"); }
  const validated = validateCreateRequest(body);
  if (!validated.data) return jsonError(validated.error ?? "validation_error", 422);
  const moderation = moderateRequestText([validated.data.title, validated.data.description, validated.data.special_conditions, validated.data.volunteer_instructions]);
  if (!moderation.ok) return jsonError(moderation.code, 422);

  const { data, error } = await context.supabase.rpc("create_help_request", { p_payload: validated.data as unknown as Json });
  if (error || !data) return jsonError(error?.message ?? "create_failed", 400);
  return NextResponse.json({ id: data }, { status: 201 });
}
