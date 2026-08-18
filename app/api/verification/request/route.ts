import { NextResponse } from "next/server";
import { getAuthContext, jsonError, statusForDatabaseError } from "@/lib/api";
export async function POST(request:Request) {
  const context=await getAuthContext(); if(!context.supabase) return jsonError(context.error,503); if(!context.user) return jsonError("unauthorized",401);
  const body=(await request.json().catch(()=>null)) as {kind?:string;note?:string}|null;
  const {data,error}=await context.supabase.rpc("request_verification",{p_kind:String(body?.kind??"identity"),p_note:body?.note?.slice(0,1000)??null});
  if(error||!data) return jsonError(error?.message,statusForDatabaseError(error?.message)); return NextResponse.json({id:data},{status:201});
}
