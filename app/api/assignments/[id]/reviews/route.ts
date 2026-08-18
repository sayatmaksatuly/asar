import { NextResponse } from "next/server";
import { getAuthContext, jsonError } from "@/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const context = await getAuthContext();
  if (!context.supabase) return jsonError(context.error, 503); if (!context.user) return jsonError("unauthorized", 401);
  const body = (await request.json().catch(() => null)) as { rating?: unknown; text?: unknown } | null;
  const rating = Number(body?.rating); const text = typeof body?.text === "string" ? body.text.replace(/[\u0000-\u001F<>]/g, " ").trim().slice(0, 1200) : "";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return jsonError("invalid_rating", 422);
  const { data, error } = await context.supabase.rpc("submit_review", { p_assignment_id: id, p_rating: rating, p_text: text || null });
  if (error) return jsonError(error.message, 403);
  return NextResponse.json({ id: data }, { status: 201 });
}
