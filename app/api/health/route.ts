import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function GET() {
  const started=Date.now(); const supabase=await createSupabaseServerClient();
  if(!supabase) return NextResponse.json({status:"degraded",database:"not_configured"},{status:503,headers:{"Cache-Control":"no-store"}});
  const {error}=await supabase.from("categories").select("id",{head:true,count:"exact"}).limit(1);
  const ok=!error; return NextResponse.json({status:ok?"ok":"degraded",database:ok?"ok":"unavailable",latency_ms:Date.now()-started},{status:ok?200:503,headers:{"Cache-Control":"no-store"}});
}
