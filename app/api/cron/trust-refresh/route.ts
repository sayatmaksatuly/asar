import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { data, error } = await admin.rpc("refresh_stale_trust_scores", { p_limit: 2000 });
  if (error) return NextResponse.json({ error: "operation_failed" }, { status: 500 });
  return NextResponse.json({ refreshed: data ?? 0 });
}
