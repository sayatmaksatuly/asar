import { NextResponse } from "next/server";
import { getAuthContext, jsonError } from "@/lib/api";
export async function GET() {
  const context=await getAuthContext(); if(!context.supabase) return jsonError(context.error,503); if(!context.user) return jsonError("unauthorized",401);
  const {data,error}=await context.supabase.from("notifications").select("id,type,title_key,body_key,link,payload,read_at,created_at,actor_id").eq("user_id",context.user.id).order("created_at",{ascending:false}).limit(100);
  if(error) return jsonError(error.message); return NextResponse.json({notifications:data??[]});
}
