import { NextResponse } from "next/server";
import { getAuthContext, jsonError, statusForDatabaseError } from "@/lib/api";
import { validateCreateRequest } from "@/validation/request";
import type { Json } from "@/types/database";
import { removeOwnedPublicAsset } from "@/lib/storage";

export async function PATCH(request: Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params; const context=await getAuthContext();
  if(!context.supabase) return jsonError(context.error,503); if(!context.user||!context.profile) return jsonError("unauthorized",401);
  const body=(await request.json().catch(()=>null)) as Record<string,unknown>|null; if(!body) return jsonError("invalid_json",400);
  if(body.action==="cancel") {
    const reason=typeof body.reason==="string"?body.reason.slice(0,500):null;
    const {error}=await context.supabase.rpc("cancel_request",{p_request_id:id,p_reason:reason});
    if(error) return jsonError(error.message,statusForDatabaseError(error.message));
    return NextResponse.json({id,status:"cancelled"});
  }
  if(body.action==="reopen") {
    const {error}=await context.supabase.rpc("reopen_request",{p_request_id:id});
    if(error) return jsonError(error.message,statusForDatabaseError(error.message));
    return NextResponse.json({id,status:"open"});
  }
  const validated=validateCreateRequest(body); if(!validated.data) return jsonError(validated.error??"validation_error",422);
  const {data:previous}=await context.supabase.from("help_requests").select("image_url,author_id").eq("id",id).maybeSingle();
  const {error}=await context.supabase.rpc("update_help_request",{p_request_id:id,p_payload:validated.data as unknown as Json});
  if(error) return jsonError(error.message,statusForDatabaseError(error.message));
  if(previous?.author_id===context.user.id && previous.image_url && previous.image_url!==validated.data.image_url) await removeOwnedPublicAsset(context.user.id,"request-images",previous.image_url);
  return NextResponse.json({id});
}
