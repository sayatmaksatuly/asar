import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";
export async function POST(request:Request) {
  const supabase=await createSupabaseServerClient(); if(!supabase) return jsonError("not_configured",503);
  const body=(await request.json().catch(()=>null)) as {event?:string;session_id?:string;request_id?:string;locale?:string}|null;
  if(!body?.event) return jsonError("validation_error",422);
  const {error}=await supabase.rpc("track_public_product_event",{p_event_name:body.event,p_session_id:body.session_id??null,p_request_id:body.request_id??null,p_locale:body.locale??null});
  if(error) return jsonError(error.message,422); return NextResponse.json({recorded:true},{status:202});
}
