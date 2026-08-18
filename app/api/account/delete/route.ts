import { NextResponse } from "next/server";
import { getAuthContext, jsonError, statusForDatabaseError } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { removeAllOwnedAssets } from "@/lib/storage";
export async function POST(request:Request) {
  const context=await getAuthContext(); if(!context.supabase) return jsonError(context.error,503); if(!context.user) return jsonError("unauthorized",401);
  const body=(await request.json().catch(()=>null)) as {confirm?:string}|null; if(body?.confirm!=="DELETE") return jsonError("validation_error",422);
  const {data,error}=await context.supabase.rpc("request_account_deletion"); if(error||!data) return jsonError(error?.message,statusForDatabaseError(error?.message));
  await removeAllOwnedAssets(context.user.id);
  const admin=createSupabaseAdminClient();
  if(admin) await admin.auth.admin.updateUserById(context.user.id,{email:`deleted-${context.user.id}@invalid.local`,email_confirm:true,user_metadata:{},ban_duration:"876000h"}).catch(()=>null);
  await context.supabase.auth.signOut(); return NextResponse.json({id:data,status:"anonymized"});
}
