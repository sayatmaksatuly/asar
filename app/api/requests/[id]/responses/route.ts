import { NextResponse } from "next/server";
import { getAuthContext, jsonError, statusForDatabaseError } from "@/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getAuthContext();
  if (!context.supabase) return jsonError(context.error, 503);
  if (!context.user || !context.profile) return jsonError(context.error ?? "unauthorized", 401);
  if (context.profile.status !== "active" || !context.profile.can_volunteer) return jsonError("volunteer_capability_required", 403);
  const body = (await request.json().catch(() => null)) as { message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.replace(/[\u0000-\u001F<>]/g, " ").trim().slice(0, 1000) : "";
  if (message.length < 10) return jsonError("validation_error", 422);
  const { data, error } = await context.supabase.rpc("create_response", { p_request_id: id, p_message: message });
  if (error || !data) return jsonError(error?.message, statusForDatabaseError(error?.message));
  return NextResponse.json({ id: data }, { status: 201 });
}
