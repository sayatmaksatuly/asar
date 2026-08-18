import { NextResponse } from "next/server";
import { getAuthContext, jsonError, statusForDatabaseError } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function storagePath(url: string) {
  try {
    const parsed = new URL(url);
    const marker = "/storage/v1/object/public/request-images/";
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
    return path && !path.includes("..") ? path : null;
  } catch { return null; }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getAuthContext();
  if (!context.supabase) return jsonError(context.error, 503);
  if (!context.user || context.profile?.role !== "admin") return jsonError("admin_required", 403);
  const body = (await request.json().catch(() => null)) as { reason?: string } | null;
  const reason = String(body?.reason ?? "").trim();
  if (reason.length < 5) return jsonError("reason_required", 422);
  const { data: before } = await context.supabase.from("help_requests").select("image_url").eq("id", id).maybeSingle();
  const { error } = await context.supabase.rpc("admin_remove_request_image", { p_request_id: id, p_reason: reason });
  if (error) return jsonError(error.message, statusForDatabaseError(error.message));
  if (before?.image_url) {
    const path = storagePath(before.image_url);
    const admin = createSupabaseAdminClient();
    if (path && admin) await admin.storage.from("request-images").remove([path]);
  }
  return NextResponse.json({ removed: true });
}
