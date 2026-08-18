import { NextResponse } from "next/server";
import { getAuthContext, jsonError, statusForDatabaseError } from "@/lib/api";

const targetTypes = new Set(["profile", "request", "response", "assignment"]);
export async function POST(request: Request) {
  const context = await getAuthContext();
  if (!context.supabase) return jsonError(context.error, 503);
  if (!context.user) return jsonError("unauthorized", 401);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const targetType = typeof body?.target_type === "string" ? body.target_type : "";
  const targetId = typeof body?.target_id === "string" ? body.target_id : "";
  const reason = typeof body?.reason === "string" ? body.reason.replace(/[<>]/g, " ").trim().slice(0, 160) : "";
  const description = typeof body?.description === "string" ? body.description.replace(/[<>]/g, " ").trim().slice(0, 1500) : "";
  if (!targetTypes.has(targetType) || !targetId || reason.length < 3) return jsonError("validation_error", 422);
  const { data, error } = await context.supabase.rpc("create_report", { p_target_type: targetType, p_target_id: targetId, p_reason: reason, p_description: description || null });
  if (error || !data) return jsonError(error?.message, statusForDatabaseError(error?.message));
  return NextResponse.json({ id: data }, { status: 201 });
}
