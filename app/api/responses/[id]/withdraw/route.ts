import { NextResponse } from "next/server";
import { getAuthContext, jsonError, statusForDatabaseError } from "@/lib/api";
export async function POST(_request: Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params; const context=await getAuthContext();
  if(!context.supabase) return jsonError(context.error,503); if(!context.user) return jsonError("unauthorized",401);
  const {error}=await context.supabase.rpc("withdraw_response",{p_response_id:id});
  if(error) return jsonError(error.message,statusForDatabaseError(error.message));
  return NextResponse.json({status:"withdrawn"});
}
