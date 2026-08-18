import { NextResponse } from "next/server";
import { getAuthContext, jsonError, statusForDatabaseError } from "@/lib/api";
export async function POST(_request: Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params; const context=await getAuthContext();
  if(!context.supabase) return jsonError(context.error,503); if(!context.user) return jsonError("unauthorized",401);
  const {data:response}=await context.supabase.from("responses").select("request_id").eq("id",id).maybeSingle();
  if(!response) return jsonError("not_found",404);
  const {data,error}=await context.supabase.rpc("select_volunteer",{p_request_id:response.request_id,p_response_id:id});
  if(error||!data) return jsonError(error?.message,statusForDatabaseError(error?.message,403));
  return NextResponse.json({assignmentId:data});
}
