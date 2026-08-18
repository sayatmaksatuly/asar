import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AsarImageBucket = "avatars" | "request-images";

export function ownedPublicPath(url: string | null | undefined, bucket: AsarImageBucket, userId: string) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
    if (!path.startsWith(`${userId}/`) || path.includes("..")) return null;
    return path;
  } catch { return null; }
}

export async function removeOwnedPublicAsset(userId: string, bucket: AsarImageBucket, url: string | null | undefined) {
  const path = ownedPublicPath(url, bucket, userId); if (!path) return false;
  const admin = createSupabaseAdminClient(); if (!admin) return false;
  const { error } = await admin.storage.from(bucket).remove([path]);
  return !error;
}

export async function removeAllOwnedAssets(userId: string) {
  const admin = createSupabaseAdminClient(); if (!admin) return false;
  for (const bucket of ["avatars", "request-images"] as const) {
    const { data, error } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
    if (error) continue;
    const paths = (data ?? []).filter((item) => item.name && item.name !== ".emptyFolderPlaceholder").map((item) => `${userId}/${item.name}`);
    if (paths.length) await admin.storage.from(bucket).remove(paths);
  }
  return true;
}
