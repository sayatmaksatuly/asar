import { NextResponse } from "next/server";
import { getAuthContext, jsonError, statusForDatabaseError } from "@/lib/api";

export async function POST(request: Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params; const context=await getAuthContext();
  if(!context.supabase) return jsonError(context.error,503); if(!context.user) return jsonError("unauthorized",401);
  const body=(await request.json().catch(()=>null)) as {action?:string;help_minutes?:number;reason?:string;description?:string}|null;
  let error: { message: string } | null = null; let status=""; let points:number|undefined;
  if(body?.action==="start") { ({error}=await context.supabase.rpc("start_assignment",{p_assignment_id:id})); status="in_progress"; }
  else if(body?.action==="mark_done") { ({error}=await context.supabase.rpc("mark_assignment_done",{p_assignment_id:id,p_help_minutes:Number.isFinite(body.help_minutes)?Number(body.help_minutes):null})); status="awaiting_confirmation"; }
  else if(body?.action==="confirm") { const result=await context.supabase.rpc("confirm_assignment_completion",{p_assignment_id:id}); error=result.error; points=result.data??undefined; status="completed"; }
  else if(body?.action==="cancel") { ({error}=await context.supabase.rpc("cancel_assignment",{p_assignment_id:id,p_reason:String(body.reason??"")})); status="cancelled"; }
  else if(body?.action==="dispute") { const result=await context.supabase.rpc("open_dispute",{p_assignment_id:id,p_reason:String(body.reason??"other"),p_description:body.description??null}); error=result.error; status="disputed"; }
  else return jsonError("invalid_action",422);
  if(error) return jsonError(error.message,statusForDatabaseError(error.message,403));
  return NextResponse.json({status,points});
}
