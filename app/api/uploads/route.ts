import { NextResponse } from "next/server";
import { getAuthContext, jsonError, statusForDatabaseError } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const allowed = new Map([
  ["image/jpeg", { ext: "jpg", check: (b: Uint8Array) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff }],
  ["image/png", { ext: "png", check: (b: Uint8Array) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 }],
  ["image/webp", { ext: "webp", check: (b: Uint8Array) => b.length > 12 && new TextDecoder().decode(b.slice(0, 4)) === "RIFF" && new TextDecoder().decode(b.slice(8, 12)) === "WEBP" }],
]);
const buckets = new Set(["avatars", "request-images"]);
const maxSize = 5 * 1024 * 1024;

function ownedPathFromUrl(url: string, bucket: string, userId: string) {
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
    return path.startsWith(`${userId}/`) && !path.includes("..") ? path : null;
  } catch { return null; }
}

export async function POST(request: Request) {
  const context = await getAuthContext();
  if (!context.supabase) return jsonError(context.error, 503);
  if (!context.user || !context.profile) return jsonError("unauthorized", 401);
  if (context.profile.status !== "active") return jsonError("user_blocked", 403);
  const admin = createSupabaseAdminClient(); if (!admin) return jsonError("not_configured", 503);
  const rate = await context.supabase.rpc("consume_rate_limit", { p_scope: "image_upload", p_limit: 20, p_window_seconds: 3600 });
  if (rate.error) return jsonError(rate.error.message, statusForDatabaseError(rate.error.message, 429));
  const form = await request.formData().catch(() => null); if (!form) return jsonError("invalid_json", 400);
  const file = form.get("file"); const bucket = String(form.get("bucket") ?? "");
  if (!(file instanceof File) || !buckets.has(bucket) || file.size <= 0 || file.size > maxSize) return jsonError("validation_error", 422);
  const rule = allowed.get(file.type); if (!rule) return jsonError("validation_error", 422);
  const bytes = new Uint8Array(await file.arrayBuffer()); if (!rule.check(bytes)) return jsonError("validation_error", 422);
  const path = `${context.user.id}/${crypto.randomUUID()}.${rule.ext}`;
  const { error } = await admin.storage.from(bucket).upload(path, bytes, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) return jsonError("operation_failed", 500);
  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}

export async function DELETE(request: Request) {
  const context = await getAuthContext();
  if (!context.supabase) return jsonError(context.error, 503);
  if (!context.user) return jsonError("unauthorized", 401);
  const admin = createSupabaseAdminClient(); if (!admin) return jsonError("not_configured", 503);
  const body = (await request.json().catch(() => null)) as { bucket?: string; url?: string } | null;
  const bucket = String(body?.bucket ?? ""); if (!buckets.has(bucket)) return jsonError("validation_error", 422);
  const path = ownedPathFromUrl(String(body?.url ?? ""), bucket, context.user.id); if (!path) return jsonError("forbidden", 403);
  const { error } = await admin.storage.from(bucket).remove([path]); if (error) return jsonError("operation_failed", 500);
  return NextResponse.json({ deleted: true });
}
