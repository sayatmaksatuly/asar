import { NextResponse } from "next/server";
import { getAuthContext, jsonError, statusForDatabaseError } from "@/lib/api";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params; const context=await getAuthContext();
  if(!context.supabase) return jsonError(context.error,503); if(!context.user) return jsonError("unauthorized",401);
  const {data,error}=await context.supabase.rpc("get_assignment_context",{p_assignment_id:id});
  if(error||!data) return jsonError(error?.message??"not_found",statusForDatabaseError(error?.message,404));
  return NextResponse.json(data);
}
