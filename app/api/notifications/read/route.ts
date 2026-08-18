import { NextResponse } from "next/server";
import { getAuthContext, jsonError } from "@/lib/api";
export async function POST(request:Request) {
  const context=await getAuthContext(); if(!context.supabase) return jsonError(context.error,503); if(!context.user) return jsonError("unauthorized",401);
  const body=(await request.json().catch(()=>null)) as {id?:string;all?:boolean}|null;
  let query=context.supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("user_id",context.user.id).is("read_at",null);
  if(!body?.all) { if(!body?.id) return jsonError("validation_error",422); query=query.eq("id",body.id); }
  const {error}=await query; if(error) return jsonError(error.message); return NextResponse.json({updated:true});
}
