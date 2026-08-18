import { NextResponse } from "next/server";
import { getAuthContext, jsonError, statusForDatabaseError } from "@/lib/api";
export async function POST() {
  const context = await getAuthContext();
  if (!context.supabase) return jsonError(context.error, 503);
  if (!context.user) return jsonError("unauthorized", 401);
  const { error } = await context.supabase.rpc("enable_volunteer_capability");
  if (error) return jsonError(error.message, statusForDatabaseError(error.message, 403));
  return NextResponse.json({ enabled: true });
}
